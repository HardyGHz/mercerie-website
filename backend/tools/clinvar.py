"""ClinVar NCBI E-utilities wrapper for variant pathogenicity lookup."""

import logging
import os
from typing import Literal

import httpx

import telemetry

logger = logging.getLogger("novu.clinvar")

_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
_TIMEOUT = 8.0

PathogenicityStatus = Literal["PATHOGENIC", "VUS", "BENIGN"]

_CLS: dict[PathogenicityStatus, str] = {
    "PATHOGENIC": "bg-error/10 text-error border-error/20",
    "VUS":        "bg-tertiary/10 text-tertiary border-tertiary/20",
    "BENIGN":     "bg-secondary/10 text-secondary border-secondary/20",
}


def _base_params() -> dict[str, str]:
    p: dict[str, str] = {"retmode": "json"}
    if key := os.environ.get("NCBI_API_KEY"):
        p["api_key"] = key
    if email := os.environ.get("USER_EMAIL"):
        p["email"] = email
    return p


def _map_significance(sig: str) -> PathogenicityStatus:
    s = sig.lower()
    if "pathogenic" in s:
        return "PATHOGENIC"
    if "benign" in s:
        return "BENIGN"
    return "VUS"


def _extract_rsid(record: dict) -> str | None:
    """Extract dbSNP rsID from a ClinVar esummary record."""
    for vs in record.get("variation_set") or []:
        for xref in vs.get("variation_xrefs") or []:
            if (xref.get("db_source") or "").lower() == "dbsnp":
                db_id = xref.get("db_id")
                if db_id:
                    return f"rs{db_id}" if not str(db_id).startswith("rs") else str(db_id)
    return None


async def lookup_variant(gene: str | None, variant: str) -> dict:
    """
    Look up a variant in ClinVar. Returns {status, cls, rsid, clinvar_id}.
    Falls back to VUS on any network or parse error.
    """
    default: dict = {"status": "VUS", "cls": _CLS["VUS"], "rsid": None, "clinvar_id": None}
    try:
        term = f"{gene}[gene] AND {variant}[varname]" if gene else f"{variant}[varname]"
        async with telemetry.track_data_api_call():
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                r = await client.get(
                    f"{_BASE}/esearch.fcgi",
                    params=_base_params() | {"db": "clinvar", "term": term, "retmax": 1},
                )
                r.raise_for_status()
                ids = r.json().get("esearchresult", {}).get("idlist", [])

        if not ids:
            return default

        async with telemetry.track_data_api_call():
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                r = await client.get(
                    f"{_BASE}/esummary.fcgi",
                    params=_base_params() | {"db": "clinvar", "id": ids[0]},
                )
                r.raise_for_status()
                data = r.json()

        uids = data.get("result", {}).get("uids", [])
        if not uids:
            return default

        record = data["result"][uids[0]]
        # ClinVar API uses either clinical_significance or germline_classification
        sig = (
            (record.get("clinical_significance") or {}).get("description")
            or (record.get("germline_classification") or {}).get("description")
            or ""
        )
        status = _map_significance(sig)
        rsid = _extract_rsid(record)
        logger.info("clinvar_hit variant=%s sig=%r -> %s rsid=%s", variant, sig, status, rsid)
        return {"status": status, "cls": _CLS[status], "rsid": rsid, "clinvar_id": uids[0]}

    except Exception as e:
        logger.warning("clinvar_failed variant=%s err=%s", variant, e)
        return default
