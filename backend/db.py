"""Supabase client — PubMed cache, search history, error logging."""

import asyncio
import hashlib
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger("novu.db")

_client = None


def _get_client():
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_KEY", "")
        if not url or not key:
            return None  # Supabase not configured — logging/cache disabled
        from supabase import create_client
        _client = create_client(url, key)
    return _client


def _query_hash(query: str) -> str:
    return hashlib.sha256(query.lower().strip().encode()).hexdigest()


# ─── Cache ────────────────────────────────────────────────────────────────────

def _get_cache_sync(query: str) -> list[dict] | None:
    client = _get_client()
    if client is None:
        return None
    try:
        h = _query_hash(query)
        now = datetime.now(timezone.utc).isoformat()
        result = (
            client.table("pubmed_cache")
            .select("results_json")
            .eq("query_hash", h)
            .gt("expires_at", now)
            .limit(1)
            .execute()
        )
        if result.data:
            logger.info("cache_hit query=%s", query[:60])
            return result.data[0]["results_json"]
    except Exception as e:
        logger.warning("cache_get_failed err=%s", e)
    return None


def _set_cache_sync(query: str, results: list[dict]) -> None:
    client = _get_client()
    if client is None:
        return
    try:
        h = _query_hash(query)
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        client.table("pubmed_cache").upsert({
            "query_hash": h,
            "query_text": query,
            "results_json": results,
            "expires_at": expires_at,
        }).execute()
        logger.info("cache_set query=%s count=%d", query[:60], len(results))
    except Exception as e:
        logger.warning("cache_set_failed err=%s", e)


async def get_cache(query: str) -> list[dict] | None:
    return await asyncio.to_thread(_get_cache_sync, query)


async def set_cache(query: str, results: list[dict]) -> None:
    asyncio.create_task(asyncio.to_thread(_set_cache_sync, query, results))


# ─── Search log ───────────────────────────────────────────────────────────────

def _log_search_sync(query: str, count: int, latency_ms: int, cached: bool) -> None:
    client = _get_client()
    if client is None:
        return
    try:
        client.table("searches").insert({
            "query": query,
            "results_count": count,
            "latency_ms": latency_ms,
            "cached": cached,
        }).execute()
    except Exception as e:
        logger.warning("log_search_failed err=%s", e)


async def log_search(query: str, count: int, latency_ms: int, cached: bool = False) -> None:
    asyncio.create_task(asyncio.to_thread(_log_search_sync, query, count, latency_ms, cached))


# ─── Error log ────────────────────────────────────────────────────────────────

def _log_error_sync(source: str, error_type: str, message: str, context: dict) -> None:
    client = _get_client()
    if client is None:
        return
    try:
        client.table("error_logs").insert({
            "source": source,
            "error_type": error_type,
            "message": message[:2000],
            "context_json": context,
        }).execute()
    except Exception as e:
        logger.warning("log_error_failed err=%s", e)


async def log_error(source: str, error_type: str, message: str, context: dict | None = None) -> None:
    asyncio.create_task(asyncio.to_thread(_log_error_sync, source, error_type, message, context or {}))
