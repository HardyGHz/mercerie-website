"""PubMed / NCBI E-utilities wrapper.

Implements the same logic as pubmed_api_reference.py but as importable
async functions using httpx — no external science-skills-common dependency.
"""

import os
import time
import urllib.parse
import xml.etree.ElementTree as ET
from typing import Any

import httpx

import telemetry

EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov"
PMC_BIOC_BASE = "https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json"

# Rate limiting: 3 req/s without key, 10 with key
_QPS = 10 if os.environ.get("NCBI_API_KEY") else 3
_TIMEOUT = 30.0


def _base_params() -> dict[str, str]:
    p: dict[str, str] = {}
    if email := os.environ.get("USER_EMAIL"):
        p["email"] = email
    if tool := os.environ.get("NCBI_TOOL", "novu-research"):
        p["tool"] = tool
    if key := os.environ.get("NCBI_API_KEY"):
        p["api_key"] = key
    return p


async def search_pubmed(query: str, max_results: int = 10) -> list[str]:
    """Returns PMIDs matching a PubMed query."""
    params = _base_params() | {
        "db": "pubmed",
        "term": query,
        "retmax": str(max_results),
        "sort": "relevance",
        "retmode": "json",
    }
    async with telemetry.track_data_api_call():
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(f"{EUTILS_BASE}/entrez/eutils/esearch.fcgi", params=params)
            r.raise_for_status()
            data = r.json()
    return data["esearchresult"]["idlist"]


async def fetch_article_abstracts(pmids: list[str]) -> list[dict[str, Any]]:
    """Returns metadata + abstracts for a list of PMIDs."""
    if not pmids:
        return []

    params = _base_params() | {
        "db": "pubmed",
        "id": ",".join(pmids),
        "rettype": "abstract",
        "retmode": "xml",
    }
    async with telemetry.track_data_api_call():
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(f"{EUTILS_BASE}/entrez/eutils/efetch.fcgi", params=params)
            r.raise_for_status()
            xml_text = r.text

    root = ET.fromstring(xml_text)
    results = []

    for article in root.iter("PubmedArticle"):
        pmid_el = article.find(".//PMID")
        art = article.find(".//Article")
        if pmid_el is None or art is None:
            continue

        authors: list[str] = []
        for author in art.findall(".//AuthorList/Author"):
            last = author.findtext("LastName") or ""
            init = author.findtext("Initials") or ""
            name = f"{last} {init}".strip() if last else author.findtext("CollectiveName") or ""
            if name:
                authors.append(name)

        abstract_parts: list[str] = []
        for at in art.findall(".//Abstract/AbstractText"):
            label = at.get("Label")
            text = "".join(at.itertext())
            abstract_parts.append(f"{label}: {text}" if label else text)

        doi: str | None = None
        for eid in art.findall("ELocationID"):
            if eid.get("EIdType") == "doi":
                doi = eid.text
                break

        journal_el = art.find(".//Journal")
        journal: str | None = None
        pubdate: str | None = None
        if journal_el is not None:
            journal = journal_el.findtext("Title")
            pd = journal_el.find(".//PubDate")
            if pd is not None:
                year = pd.findtext("Year") or ""
                month = pd.findtext("Month") or ""
                pubdate = f"{year} {month}".strip() if year else pd.findtext("MedlineDate")

        results.append({
            "pmid": pmid_el.text,
            "title": art.findtext("ArticleTitle"),
            "authors": authors,
            "journal": journal,
            "pubdate": pubdate,
            "doi": doi,
            "abstract": "\n".join(abstract_parts) if abstract_parts else None,
        })

    return results
