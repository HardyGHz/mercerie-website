"""Gemini-based biomedical entity extraction from article text."""

import asyncio
import json
import logging
import os
from typing import Any

logger = logging.getLogger("novu.entity_extractor")

_PROMPT = """\
Extract the primary biomedical research subject from the text below.
Return ONLY a valid JSON object — no explanation, no markdown.

Required format:
{
  "gene": "<HUGO gene symbol, e.g. TP53, BRCA1 — or null if not identifiable>",
  "variants": ["<protein variant notation, e.g. R175H, G245S — max 4, deduplicated>"],
  "protein_name": "<common protein name, e.g. P53, BRCA1 — or null>"
}

Text:
"""


def _run_sync(text: str) -> dict[str, Any] | None:
    try:
        import google.generativeai as genai

        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return None

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-3.1-flash-lite")
        response = model.generate_content(
            _PROMPT + text[:6000],
            generation_config=genai.GenerationConfig(response_mime_type="application/json"),
        )
        data = json.loads(response.text)
        return {
            "gene": data.get("gene") or None,
            "variants": [v for v in (data.get("variants") or []) if isinstance(v, str)][:4],
            "protein_name": data.get("protein_name") or None,
        }
    except Exception as e:
        logger.warning("entity_extraction_failed err=%s", e)
        return None


async def extract_research_entities(articles: list[dict]) -> dict[str, Any] | None:
    """Extract gene, variants, and protein name from article texts using Gemini."""
    text = " ".join(
        f"{a.get('title', '')} {a.get('abstract', '')}"
        for a in articles[:5]
        if a.get("title") or a.get("abstract")
    )
    if not text.strip():
        return None
    return await asyncio.to_thread(_run_sync, text)
