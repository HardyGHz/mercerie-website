"""Novu Research — FastAPI backend."""

import logging
import logging.config
from contextlib import asynccontextmanager
from typing import Any

import dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

dotenv.load_dotenv()

# ─── Logging setup ───────────────────────────────────────────────────────────

logging.config.dictConfig({
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "format": '{"ts":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","msg":"%(message)s"}',
            "datefmt": "%Y-%m-%dT%H:%M:%S",
        }
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "json"},
    },
    "root": {"level": "INFO", "handlers": ["console"]},
})

logger = logging.getLogger("novu.api")

# ─── Models ─────────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    max_results: int = Field(default=10, ge=1, le=20)

class Article(BaseModel):
    pmid: str
    title: str | None
    authors: list[str]
    journal: str | None
    pubdate: str | None
    doi: str | None

class VariantInfo(BaseModel):
    id: str
    freq: str
    status: str
    cls: str

class VariantEnrichRequest(BaseModel):
    gene: str | None = None
    variants: list[str]  # variant ID-k, pl. ["R175H", "G245S"]

class ResearchContext(BaseModel):
    gene: str | None
    variants: list[VariantInfo]
    protein_name: str | None

class SearchResponse(BaseModel):
    results: list[Article]
    query: str
    count: int
    research_context: ResearchContext

# ─── App ────────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("Novu Research API starting...")
    yield
    logger.info("Novu Research API stopped.")

app = FastAPI(title="Novu Research API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routes ─────────────────────────────────────────────────────────────────

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/search", response_model=SearchResponse)
async def search(req: SearchRequest) -> Any:
    """Search PubMed via Gemini agent with function calling."""
    try:
        from agent import run_search
        result = await run_search(req.query)
        return result
    except RuntimeError as e:
        import db
        await db.log_error("backend", "RuntimeError", str(e), {"query": req.query})
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        import db
        await db.log_error("backend", type(e).__name__, str(e), {"query": req.query})
        raise HTTPException(status_code=500, detail=f"Search failed: {e}")


@app.post("/api/enrichment", response_model=list[VariantInfo])
async def enrichment(req: VariantEnrichRequest) -> Any:
    """Enrich variant IDs with ClinVar pathogenicity data."""
    if not req.variants:
        return []
    try:
        from agent import run_enrichment
        return await run_enrichment(req.gene, req.variants)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enrichment failed: {e}")


@app.post("/api/search/direct", response_model=SearchResponse)
async def search_direct(req: SearchRequest) -> Any:
    """Direct PubMed search without AI agent (for testing)."""
    from tools.pubmed import search_pubmed, fetch_article_abstracts
    from agent import _slim_articles, _EMPTY_CONTEXT
    pmids = await search_pubmed(req.query, req.max_results)
    articles = await fetch_article_abstracts(pmids)
    return {"results": _slim_articles(articles), "query": req.query, "count": len(articles), "research_context": _EMPTY_CONTEXT}
