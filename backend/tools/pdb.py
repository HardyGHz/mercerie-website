"""RCSB PDB API wrapper for structure search + metadata."""

import logging
import httpx

import telemetry

logger = logging.getLogger("novu.pdb")

_SEARCH_URL = "https://search.rcsb.org/rcsbsearch/v2/query"
_DATA_URL = "https://data.rcsb.org/graphql"
_TIMEOUT = 10.0


async def search_pdb_by_gene(gene: str, max_results: int = 10) -> list[str]:
    """Search RCSB PDB for structures matching a gene symbol. Returns list of PDB IDs."""
    g = gene.strip().upper()
    query = {
        "query": {
            "type": "terminal",
            "service": "text",
            "parameters": {
                "operator": "exact_match",
                "value": g,
                "attribute": "rcsb_entity_source_organism.rcsb_gene_name.value",
            },
        },
        "request_options": {
            "results_content_type": ["experimental"],
            "paginate": {"start": 0, "rows": max_results},
            "sort": [{"sort_by": "score", "direction": "desc"}],
        },
        "return_type": "entry",
    }
    try:
        async with telemetry.track_data_api_call():
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                r = await client.post(_SEARCH_URL, json=query)
                r.raise_for_status()
                data = r.json()
        ids = [hit.get("identifier") for hit in (data.get("result_set") or [])]
        return [i for i in ids if i]
    except Exception as e:
        logger.warning("pdb_search_failed gene=%s err=%s", gene, e)
        return []


async def fetch_pdb_metadata(pdb_id: str) -> dict:
    """Fetch metadata for a PDB entry (resolution, method, title, chains)."""
    pid = pdb_id.strip().upper()
    query = """
    query($id: String!) {
      entry(entry_id: $id) {
        rcsb_id
        struct { title }
        rcsb_entry_info {
          resolution_combined
          experimental_method
          deposited_polymer_monomer_count
          deposited_polymer_entity_instance_count
        }
        exptl { method }
      }
    }
    """
    try:
        async with telemetry.track_data_api_call():
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                r = await client.post(_DATA_URL, json={"query": query, "variables": {"id": pid}})
                r.raise_for_status()
                data = r.json()
        entry = (data.get("data") or {}).get("entry")
        if not entry:
            return {"error": f"PDB entry {pid} not found"}

        info = entry.get("rcsb_entry_info") or {}
        resolutions = info.get("resolution_combined") or []
        return {
            "pdb_id": entry.get("rcsb_id", pid),
            "title": (entry.get("struct") or {}).get("title"),
            "resolution_a": resolutions[0] if resolutions else None,
            "method": info.get("experimental_method"),
            "chain_count": info.get("deposited_polymer_entity_instance_count"),
            "residue_count": info.get("deposited_polymer_monomer_count"),
            "cif_url": f"https://files.rcsb.org/download/{pid}.cif",
            "pdb_url": f"https://files.rcsb.org/download/{pid}.pdb",
        }
    except Exception as e:
        logger.warning("pdb_meta_failed pid=%s err=%s", pid, e)
        return {"error": str(e)}
