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

class GenomicsRequest(BaseModel):
    gene: str = Field(..., min_length=1, max_length=32)
    variants: list[str] = Field(..., min_length=1, max_length=20)

class PopulationFreq(BaseModel):
    id: str | None
    af: float | None

class GenomicsVariant(BaseModel):
    id: str
    freq: str
    af: float | None
    gnomad_variant_id: str | None
    populations: list[PopulationFreq]
    status: str
    cls: str

class GenomicsResponse(BaseModel):
    gene: str
    variants: list[GenomicsVariant]

class ProteinRequest(BaseModel):
    gene: str = Field(..., min_length=1, max_length=32)
    variant: str | None = Field(default=None, max_length=32)

class AlphaFoldInfo(BaseModel):
    uniprot_id: str | None = None
    cif_url: str | None = None
    pdb_url: str | None = None
    pae_url: str | None = None
    sequence: str | None = None
    sequence_length: int | None = None
    mean_plddt: float | None = None
    confidence_band: str | None = None
    model_created_date: str | None = None
    organism_name: str | None = None
    gene_symbol: str | None = None
    uniprot_description: str | None = None
    entry_id: str | None = None
    error: str | None = None

class PdbEntry(BaseModel):
    pdb_id: str
    title: str | None = None
    resolution_a: float | None = None
    method: str | None = None
    chain_count: int | None = None
    residue_count: int | None = None
    cif_url: str | None = None
    pdb_url: str | None = None

class ProteinResponse(BaseModel):
    gene: str
    uniprot_id: str | None = None
    alphafold: AlphaFoldInfo | None = None
    pdb_entries: list[PdbEntry] = []
    variant: str | None = None
    residue_position: int | None = None
    error: str | None = None

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
    # Seed the dashboard with the current cache size so it isn't 0 on first paint.
    try:
        from db import refresh_cache_count
        await refresh_cache_count()
    except Exception as e:
        logger.warning("cache_count_seed_failed err=%s", e)
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


import telemetry


@app.get("/api/system/stats")
async def system_stats() -> dict[str, Any]:
    """Return real-time Novu OS telemetry (Brain, Data Bus, PubMed, DB, Cache).

    Values come from in-memory counters populated by the agent, PubMed tools,
    and the Supabase cache layer. Between activity, the last observed values
    persist so the dashboard picks up exactly where it left off.
    """
    from db import _get_client
    telemetry.set_db_status("CONNECTED" if _get_client() is not None else "OFFLINE")
    return telemetry.snapshot()



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
    """Enrich variant IDs with ClinVar pathogenicity + gnomAD frequency."""
    if not req.variants:
        return []
    try:
        from agent import run_enrichment
        return await run_enrichment(req.gene, req.variants)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enrichment failed: {e}")


@app.post("/api/genomics", response_model=GenomicsResponse)
async def genomics(req: GenomicsRequest) -> Any:
    """Full genomics enrichment for the GenomicsExplorer page (ClinVar + gnomAD with detail)."""
    try:
        from agent import run_genomics_lookup
        return await run_genomics_lookup(req.gene, req.variants)
    except Exception as e:
        import db
        await db.log_error("backend", type(e).__name__, str(e), {"gene": req.gene, "variants": req.variants})
        raise HTTPException(status_code=500, detail=f"Genomics lookup failed: {e}")


@app.post("/api/protein", response_model=ProteinResponse)
async def protein(req: ProteinRequest) -> Any:
    """Resolve gene → UniProt → AlphaFold + PDB. Used by the ProteinViewer page."""
    try:
        from agent import run_protein_lookup
        return await run_protein_lookup(req.gene, req.variant)
    except Exception as e:
        import db
        await db.log_error("backend", type(e).__name__, str(e), {"gene": req.gene, "variant": req.variant})
        raise HTTPException(status_code=500, detail=f"Protein lookup failed: {e}")


@app.post("/api/search/direct", response_model=SearchResponse)
async def search_direct(req: SearchRequest) -> Any:
    """Direct PubMed search without AI agent (for testing)."""
    from tools.pubmed import search_pubmed, fetch_article_abstracts
    from agent import _slim_articles, _EMPTY_CONTEXT
    pmids = await search_pubmed(req.query, req.max_results)
    articles = await fetch_article_abstracts(pmids)
    return {"results": _slim_articles(articles), "query": req.query, "count": len(articles), "research_context": _EMPTY_CONTEXT}
