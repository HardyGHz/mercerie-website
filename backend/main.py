"""Novu Research — FastAPI backend."""

import logging
import logging.config
from contextlib import asynccontextmanager
from typing import Any

import dotenv
import httpx
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

class ClinicalSearchRequest(BaseModel):
    condition: str | None = Field(default=None, max_length=200)
    intervention: str | None = Field(default=None, max_length=200)
    gene: str | None = Field(default=None, max_length=64)
    status: str | None = Field(default=None, max_length=64)
    phase: str | None = Field(default=None, max_length=32)
    limit: int = Field(default=20, ge=1, le=100)


class InterventionShort(BaseModel):
    type: str | None = None
    name: str | None = None


class ClinicalTrialSummary(BaseModel):
    nct_id: str | None
    brief_title: str | None
    overall_status: str | None
    phases: list[str] = []
    study_type: str | None = None
    conditions: list[str] = []
    interventions: list[InterventionShort] = []
    lead_sponsor: str | None = None
    enrollment_count: int | None = None
    start_date: str | None = None
    primary_completion_date: str | None = None
    countries: list[str] = []
    site_count: int = 0


class ClinicalSearchResponse(BaseModel):
    total_count: int | None = None
    studies: list[ClinicalTrialSummary] = []
    next_page_token: str | None = None


class InterventionFull(BaseModel):
    type: str | None = None
    name: str | None = None
    description: str | None = None


class TrialSite(BaseModel):
    facility: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    status: str | None = None


class TrialOutcome(BaseModel):
    measure: str | None = None
    time_frame: str | None = None


class ClinicalTrialDetail(BaseModel):
    nct_id: str | None
    brief_title: str | None
    official_title: str | None = None
    overall_status: str | None
    phases: list[str] = []
    study_type: str | None = None
    brief_summary: str | None = None
    detailed_description: str | None = None
    conditions: list[str] = []
    interventions: list[InterventionFull] = []
    lead_sponsor: str | None = None
    enrollment_count: int | None = None
    start_date: str | None = None
    primary_completion_date: str | None = None
    completion_date: str | None = None
    eligibility_criteria: str | None = None
    minimum_age: str | None = None
    maximum_age: str | None = None
    sex: str | None = None
    std_ages: list[str] = []
    healthy_volunteers: bool | None = None
    sites: list[TrialSite] = []
    primary_outcomes: list[TrialOutcome] = []
    secondary_outcomes: list[TrialOutcome] = []


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


@app.post("/api/clinical/search", response_model=ClinicalSearchResponse)
async def clinical_search(req: ClinicalSearchRequest) -> Any:
    """Search ClinicalTrials.gov v2 with filter combinators."""
    import requests as _req
    from tools.clinical_trials import search_studies, slim_study_summary
    try:
        raw = await search_studies(
            condition=req.condition,
            intervention=req.intervention,
            gene=req.gene,
            status=req.status,
            phase=req.phase,
            limit=req.limit,
        )
    except _req.HTTPError as e:
        sc = e.response.status_code if e.response is not None else 502
        raise HTTPException(status_code=502, detail=f"ClinicalTrials.gov returned {sc}")
    except Exception as e:
        import db
        await db.log_error("backend", type(e).__name__, str(e), {"req": req.model_dump()})
        raise HTTPException(status_code=500, detail=f"Clinical search failed: {e}")
    studies = [slim_study_summary(s) for s in raw.get("studies", [])]
    return {
        "total_count": raw.get("totalCount"),
        "studies": studies,
        "next_page_token": raw.get("nextPageToken"),
    }


@app.get("/api/clinical/trial/{nct_id}", response_model=ClinicalTrialDetail)
async def clinical_trial(nct_id: str) -> Any:
    """Fetch a single ClinicalTrials.gov trial by NCT ID."""
    import requests as _req
    from tools.clinical_trials import get_study, slim_study_detail
    try:
        raw = await get_study(nct_id)
    except _req.HTTPError as e:
        sc = e.response.status_code if e.response is not None else 502
        if sc == 404:
            raise HTTPException(status_code=404, detail=f"Trial {nct_id} not found")
        raise HTTPException(status_code=502, detail=f"ClinicalTrials.gov returned {sc}")
    except Exception as e:
        import db
        await db.log_error("backend", type(e).__name__, str(e), {"nct_id": nct_id})
        raise HTTPException(status_code=500, detail=f"Trial fetch failed: {e}")
    return slim_study_detail(raw)


@app.post("/api/search/direct", response_model=SearchResponse)
async def search_direct(req: SearchRequest) -> Any:
    """Direct PubMed search without AI agent (for testing)."""
    from tools.pubmed import search_pubmed, fetch_article_abstracts
    from agent import _slim_articles, _EMPTY_CONTEXT
    pmids = await search_pubmed(req.query, req.max_results)
    articles = await fetch_article_abstracts(pmids)
    return {"results": _slim_articles(articles), "query": req.query, "count": len(articles), "research_context": _EMPTY_CONTEXT}
