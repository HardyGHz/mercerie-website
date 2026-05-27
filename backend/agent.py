"""Gemini 3.1 Flash Lite agent with PubMed function calling."""

import asyncio
import json
import logging
import os
import time
from typing import Any

import google.generativeai as genai
from tools.pubmed import search_pubmed, fetch_article_abstracts
import db

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

_TOOLS = genai.protos.Tool(function_declarations=[_SEARCH_PUBMED_DECL, _FETCH_ABSTRACTS_DECL])

# ─── Tool executor ───────────────────────────────────────────────────────────

async def _execute_tool(name: str, args: dict[str, Any]) -> Any:
    if name == "search_pubmed":
        return await search_pubmed(
            query=args["query"],
            max_results=min(int(args.get("max_results", 10)), 20),
        )
    if name == "fetch_article_abstracts":
        return await fetch_article_abstracts(pmids=args["pmids"])
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
    try:
        from tools.entity_extractor import extract_research_entities
        entities = await extract_research_entities(articles)
        if not entities:
            return None
        raw_variants: list[str] = entities.get("variants") or []
        return {
            "gene": entities.get("gene"),
            "variants": [{"id": v, "freq": "—", "status": "LOADING", "cls": _LOADING_CLS} for v in raw_variants],
            "protein_name": entities.get("protein_name"),
        }
    except Exception as e:
        logger.warning("entity_extraction_failed err=%s", e)
        return None


async def run_enrichment(gene: str | None, variant_ids: list[str]) -> list[dict]:
    """Enrich variant IDs with ClinVar pathogenicity. Called by the /api/enrichment route."""
    from tools.clinvar import lookup_variant
    results = await asyncio.gather(
        *[lookup_variant(gene, v) for v in variant_ids],
        return_exceptions=True,
    )
    enriched: list[dict] = []
    for vid, result in zip(variant_ids, results):
        if isinstance(result, Exception):
            result = {"status": "VUS", "cls": "bg-tertiary/10 text-tertiary border-tertiary/20"}
        enriched.append({"id": vid, "freq": "—", **result})
    return enriched


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
    response = chat.send_message(user_query)

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

        response = chat.send_message(tool_responses)

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
