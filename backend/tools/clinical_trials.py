"""ClinicalTrials.gov v2 REST API wrapper.

Async functions for searching trials and fetching individual study details.
No external API key required; ClinicalTrials.gov v2 is public.

We use `requests` + `asyncio.to_thread` instead of `httpx` because
clinicaltrials.gov (behind Cloudflare/Envoy) consistently returns 403 to
httpx's TLS handshake fingerprint, while `requests` is accepted.
"""

import asyncio
from typing import Any

import requests

import telemetry

CT_BASE = "https://clinicaltrials.gov/api/v2"
_TIMEOUT = 30.0
_HEADERS = {
    "User-Agent": "novu-research/0.1 (https://novusolv.com)",
    "Accept": "application/json",
}

_LIST_FIELDS = ",".join([
    "NCTId",
    "BriefTitle",
    "OverallStatus",
    "Phase",
    "Condition",
    "InterventionName",
    "LeadSponsorName",
    "EnrollmentCount",
    "StudyType",
    "StartDate",
    "PrimaryCompletionDate",
    "LocationCountry",
])

_DETAIL_FIELDS = ",".join([
    "NCTId",
    "BriefTitle",
    "OfficialTitle",
    "OverallStatus",
    "Phase",
    "StudyType",
    "BriefSummary",
    "DetailedDescription",
    "Condition",
    "InterventionType",
    "InterventionName",
    "InterventionDescription",
    "LeadSponsorName",
    "EnrollmentCount",
    "StartDate",
    "PrimaryCompletionDate",
    "CompletionDate",
    "LocationFacility",
    "LocationCity",
    "LocationState",
    "LocationCountry",
    "LocationStatus",
    "EligibilityCriteria",
    "MinimumAge",
    "MaximumAge",
    "Sex",
    "StdAge",
    "HealthyVolunteers",
    "PrimaryOutcomeMeasure",
    "PrimaryOutcomeTimeFrame",
    "SecondaryOutcomeMeasure",
])


def _normalize_phase(phase: str | None) -> str | None:
    if not phase:
        return None
    p = phase.strip().upper().replace(" ", "").replace("PHASE", "PHASE")
    aliases = {
        "PHASE1": "PHASE1", "PHASE2": "PHASE2", "PHASE3": "PHASE3", "PHASE4": "PHASE4",
        "EARLYPHASE1": "EARLY_PHASE1", "EARLY_PHASE1": "EARLY_PHASE1",
        "NA": "NA",
    }
    return aliases.get(p, p)


def _sync_get(path: str, params: dict[str, Any]) -> requests.Response:
    with telemetry.track_data_api_call_sync():
        r = requests.get(f"{CT_BASE}{path}", params=params, headers=_HEADERS, timeout=_TIMEOUT)
        r.raise_for_status()
        return r


async def search_studies(
    *,
    condition: str | None = None,
    intervention: str | None = None,
    gene: str | None = None,
    status: str | None = None,
    phase: str | None = None,
    limit: int = 20,
) -> dict[str, Any]:
    """Search ClinicalTrials.gov studies. Returns the raw v2 API response."""
    params: dict[str, Any] = {
        "format": "json",
        "fields": _LIST_FIELDS,
        "pageSize": max(1, min(limit, 100)),
        "countTotal": "true",
    }
    if condition:
        params["query.cond"] = condition
    if intervention:
        params["query.intr"] = intervention
    if gene:
        params["query.term"] = gene
    if status:
        params["filter.overallStatus"] = status.upper()
    norm_phase = _normalize_phase(phase)
    if norm_phase:
        params["filter.advanced"] = f"AREA[Phase]{norm_phase}"

    r = await asyncio.to_thread(_sync_get, "/studies", params)
    r.raise_for_status()
    return r.json()


async def get_study(nct_id: str) -> dict[str, Any]:
    """Fetch a single study by NCT ID."""
    nct = nct_id.strip().upper()
    params = {"format": "json", "fields": _DETAIL_FIELDS}
    r = await asyncio.to_thread(_sync_get, f"/studies/{nct}", params)
    r.raise_for_status()
    return r.json()


def slim_study_summary(study: dict[str, Any]) -> dict[str, Any]:
    proto = study.get("protocolSection", {}) or {}
    ident = proto.get("identificationModule", {}) or {}
    status = proto.get("statusModule", {}) or {}
    design = proto.get("designModule", {}) or {}
    sponsor = proto.get("sponsorCollaboratorsModule", {}) or {}
    cond = proto.get("conditionsModule", {}) or {}
    arms = proto.get("armsInterventionsModule", {}) or {}
    contacts = proto.get("contactsLocationsModule", {}) or {}

    interventions = [
        {"type": i.get("type"), "name": i.get("name")}
        for i in (arms.get("interventions") or [])
    ]

    phases = design.get("phases") or []
    locations = contacts.get("locations") or []
    countries = sorted({
        loc.get("country")
        for loc in locations
        if loc.get("country")
    })

    return {
        "nct_id": ident.get("nctId"),
        "brief_title": ident.get("briefTitle"),
        "overall_status": status.get("overallStatus"),
        "phases": phases,
        "study_type": design.get("studyType"),
        "conditions": cond.get("conditions") or [],
        "interventions": interventions,
        "lead_sponsor": (sponsor.get("leadSponsor") or {}).get("name"),
        "enrollment_count": (design.get("enrollmentInfo") or {}).get("count"),
        "start_date": (status.get("startDateStruct") or {}).get("date"),
        "primary_completion_date": (status.get("primaryCompletionDateStruct") or {}).get("date"),
        "countries": countries,
        "site_count": len(locations),
    }


def slim_study_detail(payload: dict[str, Any]) -> dict[str, Any]:
    proto = payload.get("protocolSection", {}) or {}
    ident = proto.get("identificationModule", {}) or {}
    status_mod = proto.get("statusModule", {}) or {}
    design = proto.get("designModule", {}) or {}
    desc = proto.get("descriptionModule", {}) or {}
    cond = proto.get("conditionsModule", {}) or {}
    arms = proto.get("armsInterventionsModule", {}) or {}
    sponsor = proto.get("sponsorCollaboratorsModule", {}) or {}
    elig = proto.get("eligibilityModule", {}) or {}
    contacts = proto.get("contactsLocationsModule", {}) or {}
    outcomes = proto.get("outcomesModule", {}) or {}

    interventions = [
        {"type": i.get("type"), "name": i.get("name"), "description": i.get("description")}
        for i in (arms.get("interventions") or [])
    ]

    sites = [
        {
            "facility": loc.get("facility"),
            "city": loc.get("city"),
            "state": loc.get("state"),
            "country": loc.get("country"),
            "status": loc.get("status"),
        }
        for loc in (contacts.get("locations") or [])
    ]

    primary_outcomes = [
        {"measure": o.get("measure"), "time_frame": o.get("timeFrame")}
        for o in (outcomes.get("primaryOutcomes") or [])
    ]
    secondary_outcomes = [
        {"measure": o.get("measure"), "time_frame": o.get("timeFrame")}
        for o in (outcomes.get("secondaryOutcomes") or [])
    ]

    return {
        "nct_id": ident.get("nctId"),
        "brief_title": ident.get("briefTitle"),
        "official_title": ident.get("officialTitle"),
        "overall_status": status_mod.get("overallStatus"),
        "phases": design.get("phases") or [],
        "study_type": design.get("studyType"),
        "brief_summary": desc.get("briefSummary"),
        "detailed_description": desc.get("detailedDescription"),
        "conditions": cond.get("conditions") or [],
        "interventions": interventions,
        "lead_sponsor": (sponsor.get("leadSponsor") or {}).get("name"),
        "enrollment_count": (design.get("enrollmentInfo") or {}).get("count"),
        "start_date": (status_mod.get("startDateStruct") or {}).get("date"),
        "primary_completion_date": (status_mod.get("primaryCompletionDateStruct") or {}).get("date"),
        "completion_date": (status_mod.get("completionDateStruct") or {}).get("date"),
        "eligibility_criteria": elig.get("eligibilityCriteria"),
        "minimum_age": elig.get("minimumAge"),
        "maximum_age": elig.get("maximumAge"),
        "sex": elig.get("sex"),
        "std_ages": elig.get("stdAges") or [],
        "healthy_volunteers": elig.get("healthyVolunteers"),
        "sites": sites,
        "primary_outcomes": primary_outcomes,
        "secondary_outcomes": secondary_outcomes,
    }
