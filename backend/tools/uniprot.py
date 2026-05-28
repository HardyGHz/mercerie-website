"""UniProt API: gene symbol → UniProt accession mapping."""

import logging
import httpx

logger = logging.getLogger("novu.uniprot")

_BASE = "https://rest.uniprot.org"
_TIMEOUT = 10.0

# Hardcoded canonical UniProt IDs for common research targets (fast path)
_KNOWN: dict[str, str] = {
    "TP53":  "P04637",
    "BRCA1": "P38398",
    "BRCA2": "P51587",
    "KRAS":  "P01116",
    "EGFR":  "P00533",
    "HRAS":  "P01112",
    "NRAS":  "P01111",
    "BRAF":  "P15056",
    "PIK3CA":"P42336",
    "PTEN":  "P60484",
    "APC":   "P25054",
    "MYC":   "P01106",
    "RB1":   "P06400",
    "VHL":   "P40337",
    "ALK":   "Q9UM73",
    "MET":   "P08581",
    "ERBB2": "P04626",
    "NF1":   "P21359",
    "STK11": "Q15831",
    "CDKN2A":"P42771",
    "ATM":   "Q13315",
    "MLH1":  "P40692",
}


async def gene_to_uniprot(gene: str, organism: str = "9606") -> str | None:
    """Return canonical reviewed UniProt accession for a gene symbol (human by default)."""
    g = gene.strip().upper()
    if g in _KNOWN:
        return _KNOWN[g]
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(
                f"{_BASE}/uniprotkb/search",
                params={
                    "query": f"gene_exact:{g} AND organism_id:{organism} AND reviewed:true",
                    "fields": "accession,gene_primary",
                    "format": "json",
                    "size": 1,
                },
            )
            r.raise_for_status()
            results = r.json().get("results") or []
            if results:
                acc = results[0].get("primaryAccession")
                logger.info("uniprot_resolved gene=%s -> %s", g, acc)
                return acc
            return None
    except Exception as e:
        logger.warning("uniprot_lookup_failed gene=%s err=%s", g, e)
        return None
