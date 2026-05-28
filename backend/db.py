"""Supabase client — PubMed cache, search history, error logging."""

import asyncio
import hashlib
import logging
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import telemetry

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
    started = time.monotonic()
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
        telemetry.record_db_call(time.monotonic() - started)
        if result.data:
            logger.info("cache_hit query=%s", query[:60])
            telemetry.record_cache_hit()
            return result.data[0]["results_json"]
        telemetry.record_cache_miss()
    except Exception as e:
        telemetry.record_db_call(time.monotonic() - started)
        logger.warning("cache_get_failed err=%s", e)
    return None


def _set_cache_sync(query: str, results: list[dict]) -> None:
    client = _get_client()
    if client is None:
        return
    started = time.monotonic()
    try:
        h = _query_hash(query)
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
        client.table("pubmed_cache").upsert({
            "query_hash": h,
            "query_text": query,
            "results_json": results,
            "expires_at": expires_at,
        }).execute()
        telemetry.record_db_call(time.monotonic() - started)
        logger.info("cache_set query=%s count=%d", query[:60], len(results))
        _refresh_cache_count_sync()
    except Exception as e:
        telemetry.record_db_call(time.monotonic() - started)
        logger.warning("cache_set_failed err=%s", e)


def _refresh_cache_count_sync() -> None:
    """Recompute total cached query count for the dashboard."""
    client = _get_client()
    if client is None:
        return
    try:
        res = (
            client.table("pubmed_cache")
            .select("query_hash", count="exact", head=True)
            .execute()
        )
        total = getattr(res, "count", None)
        if total is None and getattr(res, "data", None) is not None:
            total = len(res.data)
        if total is not None:
            telemetry.set_cached_queries_count(int(total))
    except Exception as e:
        logger.warning("cache_count_refresh_failed err=%s", e)


async def refresh_cache_count() -> None:
    await asyncio.to_thread(_refresh_cache_count_sync)


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
