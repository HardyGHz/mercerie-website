"""gnomAD GraphQL API wrapper for variant frequency lookup."""

import logging
import httpx

logger = logging.getLogger("novu.gnomad")

_GRAPHQL_URL = "https://gnomad.broadinstitute.org/api"
_TIMEOUT = 10.0
_DATASET = "gnomad_r4"


async def _gnomad_post(query: str, variables: dict) -> dict:
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.post(_GRAPHQL_URL, json={"query": query, "variables": variables})
        r.raise_for_status()
        return r.json()


async def _resolve_query(query_str: str) -> str | None:
    """Resolve a free-form query (e.g. 'TP53 R175H' or 'rs28934578') to a variant_id."""
    query = """
    query($q: String!, $ds: DatasetId!) {
      variant_search(query: $q, dataset: $ds) {
        variant_id
      }
    }
    """
    try:
        data = await _gnomad_post(query, {"q": query_str, "ds": _DATASET})
        variants = data.get("data", {}).get("variant_search") or []
        if variants:
            return variants[0].get("variant_id")
        return None
    except Exception as e:
        logger.warning("gnomad_resolve_failed query=%s err=%s", query_str, e)
        return None


def _format_af(af: float | None) -> str:
    if af is None:
        return "—"
    if af == 0:
        return "0"
    if af < 0.00001:
        return f"{af:.2e}"
    return f"{af:.5f}".rstrip("0").rstrip(".")


async def lookup_variant_frequency(
    gene: str | None,
    variant: str,
    rsid: str | None = None,
) -> dict:
    """
    Look up a variant frequency in gnomAD.

    If `rsid` is provided (recommended), it's used directly. Otherwise tries
    a free-form query like "TP53 R175H" against gnomAD's variant_search.

    Returns: {freq: str, af: float | None, variant_id: str | None, populations: list}
    `freq` is human-readable ('0.00024' or '—'); `af` is the raw float (or None).
    """
    default: dict = {"freq": "—", "af": None, "variant_id": None, "populations": []}

    # Prefer rsID lookup if available (gnomAD variant_search reliably resolves rsIDs)
    variant_id: str | None = None
    if rsid:
        variant_id = await _resolve_query(rsid)
    # Fallback: try free-form (works for some inputs like HGVS or variant_id-style)
    if not variant_id:
        query_str = f"{gene} {variant}".strip() if gene else variant
        variant_id = await _resolve_query(query_str)
    if not variant_id:
        return default

    query = """
    query($id: String!, $ds: DatasetId!) {
      variant(variantId: $id, dataset: $ds) {
        variant_id
        rsids
        exome {
          af
          ac
          an
          populations { id ac an }
        }
        genome {
          af
          ac
          an
          populations { id ac an }
        }
      }
    }
    """
    try:
        data = await _gnomad_post(query, {"id": variant_id, "ds": _DATASET})
        v = (data.get("data") or {}).get("variant") or {}
        exome = v.get("exome") or {}
        genome = v.get("genome") or {}
        af = exome.get("af") if exome.get("af") is not None else genome.get("af")
        raw_pops = exome.get("populations") or genome.get("populations") or []
        pops = []
        keep_ids = ("afr", "ami", "amr", "asj", "eas", "fin", "nfe", "sas", "mid", "remaining")
        for p in raw_pops:
            pid = p.get("id")
            if pid not in keep_ids:
                continue
            ac, an = p.get("ac"), p.get("an")
            pop_af = (ac / an) if (ac is not None and an and an > 0) else None
            pops.append({"id": pid, "af": pop_af})
        logger.info("gnomad_hit variant=%s af=%s id=%s pops=%d", variant, af, variant_id, len(pops))
        return {
            "freq": _format_af(af),
            "af": af,
            "variant_id": variant_id,
            "populations": pops,
        }
    except Exception as e:
        logger.warning("gnomad_freq_failed variant=%s err=%s", variant, e)
        return default
