"""Gemini 3.1 Flash Lite agent with PubMed function calling."""

import asyncio
import json
import logging
import os
import time
from typing import Any

import google.generativeai as genai
from tools.pubmed import search_pubmed, fetch_article_abstracts
from tools.clinvar import lookup_variant as lookup_clinvar
from tools.gnomad import lookup_variant_frequency as lookup_gnomad
from tools.uniprot import gene_to_uniprot
from tools.alphafold import fetch_alphafold_metadata
from tools.pdb import search_pdb_by_gene, fetch_pdb_metadata
import db
import telemetry

logger = logging.getLogger("novu.agent")

# ─── Tool declarations ───────────────────────────────────────────────────────

_SEARCH_PUBMED_DECL = genai.protos.FunctionDeclaration(
    name="search_pubmed",
    description="Search PubMed for biomedical literature. Returns a list of article PMIDs.",
    parameters=genai.protos.Schema(
        type=genai.protos.Type.OBJECT,
        properties={
            "query": genai.protos.Schema(
                type=genai.protos.Type.STRING,
                description="PubMed query. Supports boolean operators, MeSH terms, field tags [tiab], date ranges.",
            ),
            "max_results": genai.protos.Schema(
                type=genai.protos.Type.INTEGER,
                description="Maximum number of results (default 10, max 20).",
            ),
        },
        required=["query"],
    ),
)

_FETCH_ABSTRACTS_DECL = genai.protos.FunctionDeclaration(
    name="fetch_article_abstracts",
    description="Fetch full metadata and abstracts for a list of PubMed IDs (PMIDs).",
    parameters=genai.protos.Schema(
        type=genai.protos.Type.OBJECT,
        properties={
            "pmids": genai.protos.Schema(
                type=genai.protos.Type.ARRAY,
                items=genai.protos.Schema(type=genai.protos.Type.STRING),
                description="List of PubMed IDs to fetch.",
            ),
        },
        required=["pmids"],
    ),
)

_LOOKUP_CLINVAR_DECL = genai.protos.FunctionDeclaration(
    name="lookup_clinvar_variant",
    description=(
        "Look up the clinical significance of a genetic variant in ClinVar. "
        "Returns {status: PATHOGENIC|VUS|BENIGN, cls: ...}. Use to assess pathogenicity of known variants."
    ),
    parameters=genai.protos.Schema(
        type=genai.protos.Type.OBJECT,
        properties={
            "gene": genai.protos.Schema(
                type=genai.protos.Type.STRING,
                description="Gene symbol (e.g. 'TP53'). Optional but improves accuracy.",
            ),
            "variant": genai.protos.Schema(
                type=genai.protos.Type.STRING,
                description="Variant identifier (e.g. 'R175H', 'p.Arg175His', 'c.524G>A').",
            ),
        },
        required=["variant"],
    ),
)

_LOOKUP_GNOMAD_DECL = genai.protos.FunctionDeclaration(
    name="lookup_gnomad_frequency",
    description=(
        "Look up the population allele frequency of a variant in gnomAD (r4). "
        "Returns {freq: str, af: float, variant_id, populations}. "
        "Use to assess how common a variant is in the general population. "
        "Prefer passing 'rsid' when known (more reliable than protein-level identifiers)."
    ),
    parameters=genai.protos.Schema(
        type=genai.protos.Type.OBJECT,
        properties={
            "gene": genai.protos.Schema(
                type=genai.protos.Type.STRING,
                description="Gene symbol (e.g. 'TP53'). Optional.",
            ),
            "variant": genai.protos.Schema(
                type=genai.protos.Type.STRING,
                description="Variant identifier (HGVS notation, or protein change like 'R175H'). Used as fallback when rsid is not provided.",
            ),
            "rsid": genai.protos.Schema(
                type=genai.protos.Type.STRING,
                description="dbSNP rsID (e.g. 'rs28934578'). When provided, used directly for the most reliable lookup.",
            ),
        },
        required=["variant"],
    ),
)

_GENE_TO_UNIPROT_DECL = genai.protos.FunctionDeclaration(
    name="gene_to_uniprot",
    description=(
        "Resolve a human gene symbol (e.g. 'TP53') to its canonical reviewed UniProt accession (e.g. 'P04637'). "
        "Use this first when you need protein-level data for a gene."
    ),
    parameters=genai.protos.Schema(
        type=genai.protos.Type.OBJECT,
        properties={
            "gene": genai.protos.Schema(type=genai.protos.Type.STRING, description="Gene symbol (e.g. 'TP53')."),
        },
        required=["gene"],
    ),
)

_FETCH_ALPHAFOLD_DECL = genai.protos.FunctionDeclaration(
    name="fetch_alphafold_structure",
    description=(
        "Fetch AlphaFold predicted structure metadata for a UniProt accession. "
        "Returns mmCIF/PDB URLs, sequence, mean pLDDT confidence score, and confidence band. "
        "Use to obtain predicted 3D structure when no experimental PDB exists."
    ),
    parameters=genai.protos.Schema(
        type=genai.protos.Type.OBJECT,
        properties={
            "uniprot_id": genai.protos.Schema(type=genai.protos.Type.STRING, description="UniProt accession (e.g. 'P04637')."),
        },
        required=["uniprot_id"],
    ),
)

_SEARCH_PDB_DECL = genai.protos.FunctionDeclaration(
    name="search_pdb_by_gene",
    description="Search the RCSB PDB for experimental structures matching a gene symbol. Returns a list of PDB IDs.",
    parameters=genai.protos.Schema(
        type=genai.protos.Type.OBJECT,
        properties={
            "gene": genai.protos.Schema(type=genai.protos.Type.STRING, description="Gene symbol (e.g. 'TP53')."),
            "max_results": genai.protos.Schema(type=genai.protos.Type.INTEGER, description="Maximum number of PDB IDs to return (default 5)."),
        },
        required=["gene"],
    ),
)

_FETCH_PDB_DECL = genai.protos.FunctionDeclaration(
    name="fetch_pdb_metadata",
    description=(
        "Fetch metadata for a PDB entry (title, resolution, experimental method, chain count, structure file URLs). "
        "Use after search_pdb_by_gene to assess which structure to load."
    ),
    parameters=genai.protos.Schema(
        type=genai.protos.Type.OBJECT,
        properties={
            "pdb_id": genai.protos.Schema(type=genai.protos.Type.STRING, description="4-character PDB ID (e.g. '1TUP')."),
        },
        required=["pdb_id"],
    ),
)

_TOOLS = genai.protos.Tool(function_declarations=[
    _SEARCH_PUBMED_DECL,
    _FETCH_ABSTRACTS_DECL,
    _LOOKUP_CLINVAR_DECL,
    _LOOKUP_GNOMAD_DECL,
    _GENE_TO_UNIPROT_DECL,
    _FETCH_ALPHAFOLD_DECL,
    _SEARCH_PDB_DECL,
    _FETCH_PDB_DECL,
])

# ─── Tool executor ───────────────────────────────────────────────────────────

async def _execute_tool(name: str, args: dict[str, Any]) -> Any:
    if name == "search_pubmed":
        return await search_pubmed(
            query=args["query"],
            max_results=min(int(args.get("max_results", 10)), 20),
        )
    if name == "fetch_article_abstracts":
        return await fetch_article_abstracts(pmids=args["pmids"])
    if name == "lookup_clinvar_variant":
        return await lookup_clinvar(gene=args.get("gene"), variant=args["variant"])
    if name == "lookup_gnomad_frequency":
        return await lookup_gnomad(gene=args.get("gene"), variant=args["variant"], rsid=args.get("rsid"))
    if name == "gene_to_uniprot":
        return {"uniprot_id": await gene_to_uniprot(args["gene"])}
    if name == "fetch_alphafold_structure":
        return await fetch_alphafold_metadata(args["uniprot_id"])
    if name == "search_pdb_by_gene":
        return await search_pdb_by_gene(args["gene"], max_results=int(args.get("max_results", 5)))
    if name == "fetch_pdb_metadata":
        return await fetch_pdb_metadata(args["pdb_id"])
    raise ValueError(f"Unknown tool: {name}")

# ─── Agent ──────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a scientific research assistant for Novu Research, a biomedical literature platform.

Your job: when the user provides a research query, use the available tools to:
1. Call search_pubmed with an optimized query to find relevant articles
2. Call fetch_article_abstracts with the returned PMIDs to get full details
3. Return the articles as structured data

Always call both tools in sequence. Do not answer from memory — always fetch live data.
Optimize the query using appropriate MeSH terms or field tags when beneficial."""


def _build_model() -> genai.GenerativeModel:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set in environment")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(
        model_name="gemini-3.1-flash-lite",
        system_instruction=SYSTEM_PROMPT,
        tools=[_TOOLS],
    )


_LOADING_CLS = "bg-outline/10 text-outline border-outline/20"


async def _extract_entities(articles: list[dict]) -> dict | None:
    """Extract gene, variants (LOADING status), and protein name — no ClinVar."""
    started = time.monotonic()
    try:
        from tools.entity_extractor import extract_research_entities
        entities = await extract_research_entities(articles)
        elapsed = time.monotonic() - started
        if not entities:
            telemetry.record_bus_extraction(0, elapsed)
            return None
        raw_variants: list[str] = entities.get("variants") or []
        gene_count = (1 if entities.get("gene") else 0) + len(raw_variants)
        telemetry.record_bus_extraction(gene_count, elapsed)
        return {
            "gene": entities.get("gene"),
            "variants": [{"id": v, "freq": "—", "status": "LOADING", "cls": _LOADING_CLS} for v in raw_variants],
            "protein_name": entities.get("protein_name"),
        }
    except Exception as e:
        logger.warning("entity_extraction_failed err=%s", e)
        return None


def _send_with_telemetry(chat, payload):
    """Wrap chat.send_message to capture latency + output token count."""
    started = time.monotonic()
    response = chat.send_message(payload)
    elapsed = time.monotonic() - started
    out_tokens = 0
    try:
        meta = getattr(response, "usage_metadata", None)
        if meta is not None:
            out_tokens = int(getattr(meta, "candidates_token_count", 0) or 0)
    except Exception:
        pass
    telemetry.record_brain_call(out_tokens, elapsed)
    return response


_VUS_FALLBACK = {"status": "VUS", "cls": "bg-tertiary/10 text-tertiary border-tertiary/20"}


async def _enrich_one(gene: str | None, variant_id: str) -> dict:
    """Run ClinVar first (for status + rsID), then gnomAD (using rsID for accuracy)."""
    try:
        cv = await lookup_clinvar(gene, variant_id) or _VUS_FALLBACK
    except Exception:
        cv = _VUS_FALLBACK
    try:
        gn = await lookup_gnomad(gene, variant_id, rsid=cv.get("rsid")) or {"freq": "—"}
    except Exception:
        gn = {"freq": "—"}
    # Slim payload for /api/enrichment (just freq + status + cls)
    return {
        "id": variant_id,
        "freq": gn.get("freq", "—"),
        "status": cv.get("status", "VUS"),
        "cls": cv.get("cls", _VUS_FALLBACK["cls"]),
    }


_NCBI_SEMAPHORE = asyncio.Semaphore(1)  # ClinVar/NCBI: 3 req/sec without API key — serialize to avoid 429


async def _enrich_with_throttle(gene: str | None, vid: str) -> dict:
    async with _NCBI_SEMAPHORE:
        return await _enrich_one(gene, vid)


async def run_enrichment(gene: str | None, variant_ids: list[str]) -> list[dict]:
    """Enrich variant IDs with ClinVar pathogenicity + gnomAD frequency."""
    results = await asyncio.gather(
        *[_enrich_with_throttle(gene, v) for v in variant_ids],
        return_exceptions=True,
    )
    enriched: list[dict] = []
    for vid, result in zip(variant_ids, results):
        if isinstance(result, Exception):
            logger.warning("enrich_failed variant=%s err=%s", vid, result)
            enriched.append({"id": vid, "freq": "—", **_VUS_FALLBACK})
        else:
            enriched.append(result)
    return enriched


import re as _re

_VARIANT_RE = _re.compile(r"^([A-Z])(\d+)([A-Z])$")


def _parse_variant_position(variant: str) -> int | None:
    """Extract residue position from a protein-level variant like 'R175H'."""
    m = _VARIANT_RE.match(variant.strip().upper())
    if m:
        return int(m.group(2))
    # Fallback: just grab the first integer in the string
    digits = _re.search(r"\d+", variant)
    return int(digits.group()) if digits else None


async def run_protein_lookup(gene: str, variant: str | None = None) -> dict:
    """Resolve gene → UniProt → AlphaFold + parallel PDB search.

    Returns combined payload for the ProteinViewer page:
    {
      gene, uniprot_id, alphafold: {...}, pdb_entries: [{pdb_id, title, ...}],
      variant, residue_position
    }
    """
    uniprot_id = await gene_to_uniprot(gene)
    if not uniprot_id:
        return {"gene": gene, "error": f"No UniProt entry for gene '{gene}'"}

    # Run AlphaFold + PDB search in parallel
    af_task = asyncio.create_task(fetch_alphafold_metadata(uniprot_id))
    pdb_task = asyncio.create_task(search_pdb_by_gene(gene, max_results=5))
    af = await af_task
    pdb_ids = await pdb_task

    # Fetch metadata for top 3 PDB entries in parallel
    pdb_entries: list[dict] = []
    if pdb_ids:
        meta_results = await asyncio.gather(
            *[fetch_pdb_metadata(pid) for pid in pdb_ids[:3]],
            return_exceptions=True,
        )
        for r in meta_results:
            if isinstance(r, dict) and "error" not in r:
                pdb_entries.append(r)

    return {
        "gene": gene,
        "uniprot_id": uniprot_id,
        "alphafold": af,
        "pdb_entries": pdb_entries,
        "variant": variant,
        "residue_position": _parse_variant_position(variant) if variant else None,
    }


async def run_genomics_lookup(gene: str, variants: list[str]) -> dict:
    """Full genomics enrichment for the GenomicsExplorer page.

    Returns {gene, variants: [...full enriched...]} where each variant includes
    freq, af, populations, status, cls, variant_id (gnomAD).
    """
    async def _detailed(vid: str) -> dict:
        async with _NCBI_SEMAPHORE:
            try:
                cv = await lookup_clinvar(gene, vid) or _VUS_FALLBACK
            except Exception:
                cv = _VUS_FALLBACK
        # gnomAD has its own rate limit (10 qpm), but we're well within it
        try:
            gn = await lookup_gnomad(gene, vid, rsid=cv.get("rsid")) \
                or {"freq": "—", "af": None, "variant_id": None, "populations": []}
        except Exception:
            gn = {"freq": "—", "af": None, "variant_id": None, "populations": []}
        return {
            "id": vid,
            "freq": gn.get("freq", "—"),
            "af": gn.get("af"),
            "gnomad_variant_id": gn.get("variant_id"),
            "populations": gn.get("populations") or [],
            "status": cv.get("status", "VUS"),
            "cls": cv.get("cls", _VUS_FALLBACK["cls"]),
        }

    results = await asyncio.gather(*[_detailed(v) for v in variants], return_exceptions=True)
    safe: list[dict] = []
    for vid, r in zip(variants, results):
        if isinstance(r, Exception):
            logger.warning("genomics_lookup_failed variant=%s err=%s", vid, r)
            safe.append({"id": vid, "freq": "—", "af": None, "gnomad_variant_id": None,
                         "populations": [], **_VUS_FALLBACK})
        else:
            safe.append(r)
    return {"gene": gene, "variants": safe}


_EMPTY_CONTEXT: dict = {"gene": None, "variants": [], "protein_name": None}


def _slim_articles(articles: list[dict]) -> list[dict]:
    """Strip large fields not needed by the dashboard (abstract, excess authors)."""
    return [
        {
            "pmid": a.get("pmid"),
            "title": a.get("title"),
            "authors": (a.get("authors") or [])[:3],
            "journal": a.get("journal"),
            "pubdate": a.get("pubdate"),
            "doi": a.get("doi"),
        }
        for a in articles
    ]


async def run_search(user_query: str) -> dict[str, Any]:
    """Run a full search: query → PMIDs → abstracts → research context."""
    start = time.monotonic()
    telemetry.brain_session_start()
    try:
        # Cache check — skip Gemini/PubMed if we have a fresh result
        cached_results = await db.get_cache(user_query)
        if cached_results is not None:
            latency_ms = int((time.monotonic() - start) * 1000)
            await db.log_search(user_query, len(cached_results), latency_ms, cached=True)
            research_context = await _extract_entities(cached_results)
            return {
                "results": _slim_articles(cached_results),
                "query": user_query,
                "count": len(cached_results),
                "research_context": research_context or _EMPTY_CONTEXT,
            }

        model = _build_model()
        chat = model.start_chat()

        # Turn 1: send user query
        response = _send_with_telemetry(chat, user_query)

        articles: list[dict] = []

        # Agentic loop: handle function calls until done
        for _ in range(5):  # max 5 turns
            parts = response.candidates[0].content.parts
            fn_calls = [p for p in parts if p.function_call.name]

            if not fn_calls:
                break  # model is done

            # Execute all requested tools
            tool_responses = []
            for part in fn_calls:
                fc = part.function_call
                result = await _execute_tool(fc.name, dict(fc.args))

                # Capture articles when fetched
                if fc.name == "fetch_article_abstracts" and isinstance(result, list):
                    articles = result

                tool_responses.append(
                    genai.protos.Part(
                        function_response=genai.protos.FunctionResponse(
                            name=fc.name,
                            response={"result": json.dumps(result, ensure_ascii=False)},
                        )
                    )
                )

            response = _send_with_telemetry(chat, tool_responses)

        latency_ms = int((time.monotonic() - start) * 1000)
        logger.info("search_done query=%s latency_ms=%d count=%d", user_query[:60], latency_ms, len(articles))

        # Entity extraction + cache + log run concurrently
        research_context, _, _ = await asyncio.gather(
            _extract_entities(articles),
            db.set_cache(user_query, articles),
            db.log_search(user_query, len(articles), latency_ms, cached=False),
        )

        return {
            "results": _slim_articles(articles),
            "query": user_query,
            "count": len(articles),
            "research_context": research_context or _EMPTY_CONTEXT,
        }
    finally:
        telemetry.brain_session_end()
