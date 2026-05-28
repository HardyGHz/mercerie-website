"""AlphaFold Database API wrapper.

The AlphaFold API returns prediction metadata for a UniProt accession,
including URLs to the mmCIF structure and PAE confidence files.
"""

import logging
import httpx

logger = logging.getLogger("novu.alphafold")

_BASE = "https://alphafold.ebi.ac.uk/api"
_TIMEOUT = 10.0


def _confidence_band(mean_plddt: float | None) -> str:
    if mean_plddt is None:
        return "—"
    if mean_plddt >= 90:
        return "VERY HIGH"
    if mean_plddt >= 70:
        return "HIGH"
    if mean_plddt >= 50:
        return "LOW"
    return "VERY LOW"


async def fetch_alphafold_metadata(uniprot_id: str) -> dict:
    """
    Fetch AlphaFold prediction metadata for a UniProt accession.

    Returns: {
        uniprot_id, cif_url, pdb_url, pae_url,
        sequence, sequence_length, mean_plddt, confidence_band,
        model_created_date, organism_name, gene_symbol
    }
    On error returns {error: str}.
    """
    uid = uniprot_id.strip().upper()
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(f"{_BASE}/prediction/{uid}")
            r.raise_for_status()
            data = r.json()
        if not data:
            return {"error": f"No AlphaFold entry for {uid}"}

        # Prefer canonical entry; fall back to longest isoform
        entry = next((e for e in data if e.get("uniprotAccession") == uid), None)
        if entry is None:
            entry = max(data, key=lambda e: e.get("sequenceEnd", 0))

        seq = entry.get("uniprotSequence") or ""
        mean_plddt = entry.get("globalMetricValue")
        return {
            "uniprot_id": entry.get("uniprotAccession", uid),
            "cif_url": entry.get("cifUrl"),
            "pdb_url": entry.get("pdbUrl"),
            "pae_url": entry.get("paeDocUrl"),
            "sequence": seq,
            "sequence_length": len(seq) or entry.get("sequenceEnd"),
            "mean_plddt": mean_plddt,
            "confidence_band": _confidence_band(mean_plddt),
            "model_created_date": entry.get("modelCreatedDate"),
            "organism_name": entry.get("organismScientificName"),
            "gene_symbol": entry.get("gene"),
            "uniprot_description": entry.get("uniprotDescription"),
            "entry_id": entry.get("entryId"),
        }
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return {"error": f"UniProt ID '{uid}' not found in AlphaFold DB"}
        logger.warning("alphafold_http_error uid=%s status=%s", uid, e.response.status_code)
        return {"error": f"AlphaFold HTTP {e.response.status_code}"}
    except Exception as e:
        logger.warning("alphafold_failed uid=%s err=%s", uid, e)
        return {"error": str(e)}
