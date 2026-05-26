# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dev szerverek

```bash
# Frontend (localhost:5173)
cd frontend && npm run dev

# Backend (localhost:8000)
cd backend && uvicorn main:app --reload
```

Backend-hez szükséges `.env` a `backend/` mappában:
```
GEMINI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
```

Frontend-hez `.env.local` a `frontend/` mappában:
```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Ha Supabase nincs konfigurálva, a logging/cache csendben ki van kapcsolva (graceful degradation mindkét oldalon).

## Build és típusellenőrzés

```bash
cd frontend && npm run build   # tsc -b + vite build
```

Nincs teszt suite jelenleg.

## Architektúra

### Adatfolyam

```
User query (header input / terminal)
  → App.tsx: handleSearch()
    → backend POST /api/search
      → agent.py: run_search()  [Gemini function calling loop]
        → tools/pubmed.py: search_pubmed() + fetch_article_abstracts()
      → db.py: Supabase cache check/set + search log
    → App.tsx: setDashArticles() → setResearchContext(extractResearchContext())
      → Dashboard.tsx: widgetek újrarenderelnek (gene, variants, proteinName)
```

### Frontend struktúra

- **`App.tsx`** — egyetlen state forrás: `dashArticles`, `researchContext`, `dashLoading`, `dashQuery`. Ezeket props-ként kapja a `Dashboard`. Minden keresés itt indul és itt végződik.
- **`lib/entityExtractor.ts`** — regex-alapú NLP: kiszedi a gént (14 hardkódolt célpont), variantokat (`R175H` mintájú tokenek), és leképezi a fehérjenévre. A `ResearchContext` típust tölti ki.
- **`lib/api.ts`** — egyetlen endpoint: `POST /api/search`. Hibákat Supabase-be loggol.
- **`lib/supabase.ts`** — frontend-oldali logging (`searches`, `browse_history`, `error_logs` táblák). Ha nincs env var, minden függvény no-op.
- **`types/index.ts`** — megosztott típusok: `Article`, `ResearchContext`, `Variant`, `Page`, `SearchResponse`.

### Backend struktúra

- **`main.py`** — FastAPI app. Két route: `POST /api/search` (Gemini agent) és `POST /api/search/direct` (agent nélküli PubMed, tesztelésre). CORS minden origint enged (dev beállítás).
- **`agent.py`** — Gemini `gemini-3.1-flash-lite` function calling loop (max 5 turn). Sorrendben: `search_pubmed` → `fetch_article_abstracts`. Cache hit esetén kihagyja a Gemini hívást.
- **`db.py`** — Supabase async wrapper. Cache: `pubmed_cache` tábla, SHA-256 hash kulcs, 24h TTL. A sync Supabase SDK-t `asyncio.to_thread`-del fut.
- **`tools/pubmed.py`** — NCBI E-utilities hívások (`httpx`): `esearch` (PMIDs) + `efetch` (XML absztraktok).

### Design rendszer

Cyberpunk-Industrial esztétika, sharp corners (0px radius).
- Háttér: `#09090b`, card: `#18181b`, border: `#27272a`
- Primary (kék): `#adc6ff`, Secondary (zöld): `#4edea3`, Tertiary (lila): `#c0c1ff`
- Fontok: Geist (UI), JetBrains Mono (data/mono)
- Tailwind v4 CSS-first konfig (`@import "tailwindcss"` az `index.css`-ben, nem `tailwind.config.js`)
- Referenciaként: `frontend/stich/stitch_novu_bio_research_os/`

## Ismert korlátok (Phase II munka)

- `entityExtractor.ts` csak 14 hardkódolt génre ismer rá; a variantsok frekvenciája mindig `—` (ClinVar API nincs bekötve)
- A Proteomics widget fehérjeképe statikus stock kép, nem valódi PDB struktúra (NGL Viewer még nincs)
- Agent log (SEC-06) a keresés lifecycle eseményeiből generál szimulált bejegyzéseket, nem a valódi backend logjait mutatja
- Nincs auth, nincs user management
