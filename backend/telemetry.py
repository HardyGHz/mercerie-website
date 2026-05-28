"""In-memory runtime telemetry for the SystemMonitor dashboard.

Each subsystem keeps a small rolling window of recent samples plus the last
computed value. /api/system/stats reads the snapshot — when nothing is
happening, values simply persist from the last call.
"""

from __future__ import annotations

import time
from collections import deque
from contextlib import asynccontextmanager, contextmanager
from threading import Lock
from typing import Any

_lock = Lock()

# ─── BRAIN (Gemini agent) ─────────────────────────────────────────────────────
_brain: dict[str, Any] = {
    "tokens_per_sec": 0,
    "latency_ms": 0,
    "active_sessions": 0,
    "total_queries": 0,
    "model": "gemini-3.1-flash-lite",
    "percent": 0.0,
    "_recent_tps": deque(maxlen=10),
}

# ─── DATA BUS (entity extraction throughput) ──────────────────────────────────
_bus: dict[str, Any] = {
    "events_per_sec": 0.0,
    "extraction_latency_ms": 0.0,
    "genes_extracted": 0,
    "active_bindings": 8,  # tool declarations in agent.py
    "status": "IDLE",
    "percent": 0.0,
}

# ─── PUBMED (NCBI E-utilities) ────────────────────────────────────────────────
_pubmed: dict[str, Any] = {
    "latency_ms": 0,
    "requests_per_hour": 0,
    "error_rate": 0.0,
    "uptime": "100.00%",
    "percent": 0.0,
    "_recent_latencies": deque(maxlen=10),
    "_call_timestamps": deque(maxlen=200),
    "_errors": 0,
    "_total": 0,
}

# ─── DB (Supabase) ────────────────────────────────────────────────────────────
_db: dict[str, Any] = {
    "latency_ms": 0,
    "provider": "Supabase",
    "queue_items": 0,
    "status": "OFFLINE",
    "percent": 0.0,
    "_recent_latencies": deque(maxlen=10),
}

# ─── CACHE ────────────────────────────────────────────────────────────────────
_cache: dict[str, Any] = {
    "hit_rate": 0.0,
    "allocated_mb": 0.0,
    "capacity_mb": 128.0,
    "cached_queries": 0,
    "percent": 0.0,
    "_hits": 0,
    "_misses": 0,
}


# ─── Recorders ────────────────────────────────────────────────────────────────

def record_brain_call(output_tokens: int, latency_s: float) -> None:
    """Record one Gemini API call (one chat.send_message round-trip)."""
    if latency_s <= 0:
        return
    tps = (output_tokens / latency_s) if output_tokens > 0 else 0.0
    with _lock:
        if tps > 0:
            _brain["_recent_tps"].append(tps)
            avg = sum(_brain["_recent_tps"]) / len(_brain["_recent_tps"])
            _brain["tokens_per_sec"] = int(avg)
            _brain["percent"] = round(min(100.0, avg / 5.0), 1)  # 500 t/s == 100%
        _brain["latency_ms"] = int(latency_s * 1000)
        _brain["total_queries"] += 1


def brain_session_start() -> None:
    with _lock:
        _brain["active_sessions"] += 1


def brain_session_end() -> None:
    with _lock:
        _brain["active_sessions"] = max(0, _brain["active_sessions"] - 1)


def record_data_api_call(latency_s: float, error: bool = False) -> None:
    """Record any external data-API call (PubMed/UniProt/ClinVar/gnomAD/AlphaFold/PDB/CT.gov)."""
    now = time.time()
    with _lock:
        _pubmed["_total"] += 1
        _pubmed["_call_timestamps"].append(now)
        if error:
            _pubmed["_errors"] += 1
        else:
            _pubmed["_recent_latencies"].append(int(latency_s * 1000))
        if _pubmed["_recent_latencies"]:
            avg = sum(_pubmed["_recent_latencies"]) / len(_pubmed["_recent_latencies"])
            _pubmed["latency_ms"] = int(avg)
        _pubmed["error_rate"] = round(_pubmed["_errors"] / _pubmed["_total"], 4)
        _pubmed["uptime"] = f"{(1 - _pubmed['error_rate']) * 100:.2f}%"
        # requests/hour, extrapolated from last 5 minutes of activity
        cutoff = now - 300
        recent = [t for t in _pubmed["_call_timestamps"] if t > cutoff]
        if len(recent) >= 2:
            span = max(now - recent[0], 1.0)
            _pubmed["requests_per_hour"] = int(len(recent) * 3600 / span)
        elif _pubmed["_total"] > 0:
            _pubmed["requests_per_hour"] = max(_pubmed["requests_per_hour"], 1)
        # percent: latency-based — typical external APIs 200-2000ms; 3s == 100%
        _pubmed["percent"] = round(min(100.0, _pubmed["latency_ms"] / 30.0), 1)


# Backwards-compat alias — older code paths still call record_pubmed_call.
record_pubmed_call = record_data_api_call


@asynccontextmanager
async def track_data_api_call():
    """Async context that records a Data-APIs call (success+latency, or error)."""
    started = time.monotonic()
    try:
        yield
    except Exception:
        record_data_api_call(time.monotonic() - started, error=True)
        raise
    else:
        record_data_api_call(time.monotonic() - started, error=False)


@contextmanager
def track_data_api_call_sync():
    """Sync flavor of track_data_api_call (for requests-based tools)."""
    started = time.monotonic()
    try:
        yield
    except Exception:
        record_data_api_call(time.monotonic() - started, error=True)
        raise
    else:
        record_data_api_call(time.monotonic() - started, error=False)


def record_db_call(latency_s: float) -> None:
    with _lock:
        _db["_recent_latencies"].append(int(latency_s * 1000))
        avg = sum(_db["_recent_latencies"]) / len(_db["_recent_latencies"])
        _db["latency_ms"] = int(avg)
        # Supabase from EU is typically 400-700ms — 1500ms == 100%
        _db["percent"] = round(min(100.0, avg / 15.0), 1)


def set_db_status(status: str) -> None:
    with _lock:
        _db["status"] = status


def record_cache_hit() -> None:
    with _lock:
        _cache["_hits"] += 1
        _recompute_cache_locked()


def record_cache_miss() -> None:
    with _lock:
        _cache["_misses"] += 1
        _recompute_cache_locked()


def set_cached_queries_count(n: int) -> None:
    with _lock:
        _cache["cached_queries"] = n
        # ~6 KB per cached query is a fair rough estimate
        _cache["allocated_mb"] = round(n * 0.006, 2)


def _recompute_cache_locked() -> None:
    total = _cache["_hits"] + _cache["_misses"]
    if total > 0:
        _cache["hit_rate"] = round(_cache["_hits"] / total * 100, 1)
        # Percent tracks cache effectiveness, not buffer fill
        _cache["percent"] = _cache["hit_rate"]


def record_bus_extraction(genes_count: int, latency_s: float) -> None:
    with _lock:
        latency_ms = max(latency_s * 1000, 1.0)
        _bus["extraction_latency_ms"] = round(latency_ms, 2)
        _bus["genes_extracted"] = genes_count
        # Throughput: entities processed per second during the extraction
        if latency_s > 0:
            eps = max(genes_count, 1) / latency_s
            _bus["events_per_sec"] = round(eps, 2)
            _bus["percent"] = round(min(100.0, eps * 5.0), 1)  # 20 ev/s == 100%
        _bus["status"] = "ONLINE"


def snapshot() -> dict[str, Any]:
    with _lock:
        return {
            "brain": {
                "percent": _brain["percent"],
                "tokens_per_sec": _brain["tokens_per_sec"],
                "model": _brain["model"],
                "latency_ms": _brain["latency_ms"],
                "active_sessions": _brain["active_sessions"],
                "total_queries": _brain["total_queries"],
            },
            "bus": {
                "percent": _bus["percent"],
                "events_per_sec": _bus["events_per_sec"],
                "active_bindings": _bus["active_bindings"],
                "extraction_latency_ms": _bus["extraction_latency_ms"],
                "genes_extracted": _bus["genes_extracted"],
                "status": _bus["status"],
            },
            "pubmed": {
                "percent": _pubmed["percent"],
                "latency_ms": _pubmed["latency_ms"],
                "requests_per_hour": _pubmed["requests_per_hour"],
                "error_rate": _pubmed["error_rate"],
                "uptime": _pubmed["uptime"],
            },
            "db": {
                "percent": _db["percent"],
                "latency_ms": _db["latency_ms"],
                "provider": _db["provider"],
                "queue_items": _db["queue_items"],
                "status": _db["status"],
            },
            "cache": {
                "percent": _cache["percent"],
                "hit_rate": _cache["hit_rate"],
                "allocated_mb": _cache["allocated_mb"],
                "capacity_mb": _cache["capacity_mb"],
                "cached_queries": _cache["cached_queries"],
            },
        }
