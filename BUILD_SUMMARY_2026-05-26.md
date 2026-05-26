# Build Summary: Novu Research Phase I (2026-05-26)

**Projekt:** Novu Research (AI Research OS)
**Fázis:** Phase I — alap infrastruktúra
**Build státusz:** KÉSZ, production build hibátlan

---

## Mit épitettünk

### Frontend (`novusolv-science/frontend/`)

React 19 + Vite 6 + TypeScript + Tailwind CSS v4 stack, dark scientific terminal UI.

| Fájl | Mit csinál |
|---|---|
| `package.json` | Függőségek: React 19, Vite 6, Tailwind v4, lucide-react |
| `vite.config.ts` | @tailwindcss/vite plugin, `@/` path alias |
| `tsconfig.app.json` | Strict TS, bundler moduleResolution |
| `index.html` | IBM Plex Mono betűtípus (Google Fonts) |
| `src/vite-env.d.ts` | Vite client types (import.meta.env fix) |
| `src/index.css` | Tailwind import, skeleton shimmer, blink-dot animáció, scrollbar stílus |
| `src/types/index.ts` | Article, SearchResponse, Page típusok |
| `src/lib/api.ts` | `searchLiterature()` — POST /api/search fetch wrapper |
| `src/components/Sidebar.tsx` | Összecsukható sidebar (220px / 52px), Literature/Protein/Genomic nav |
| `src/pages/LiteratureSearch.tsx` | Főoldal: TopBar, SearchBar, ResultsTable (sortálható), SkeletonRows, EmptyState, ErrorBanner |
| `src/App.tsx` | Routing: sidebar + oldalváltás |

**Design tokens:**
- Háttér: `zinc-950` (#09090b)
- Accent: `emerald-400` (#34d399)
- Font: IBM Plex Mono (100% monospace)

### Backend (`novusolv-science/backend/`)

FastAPI + uvicorn Python backend, Gemini function calling agent.

| Fájl | Mit csinál |
|---|---|
| `requirements.txt` | fastapi, uvicorn, httpx, python-dotenv, google-generativeai |
| `.env` | GEMINI_API_KEY, NCBI_API_KEY, NCBI_TOOL |
| `.env.example` | Template placeholder értékekkel |
| `tools/pubmed.py` | Async NCBI E-utilities wrapper: `search_pubmed()` + `fetch_article_abstracts()` |
| `agent.py` | Gemini function calling agentic loop (max 5 turn), model: gemini-3.1-flash-lite |
| `main.py` | FastAPI app: POST /api/search (AI), POST /api/search/direct (közvetlen NCBI), CORS |

---

## Fő technikai döntések

**Google Antigravity SDK nem pip-installálható.** Ez a Gemini CLI belső runtime-ja, nem Python csomag. Megoldás: `google-generativeai` SDK natív function calling-gal.

**science-skills-common helyi csomag hiánya.** A `pubmed_api_reference.py` erre épül, de ez a local package nincs meg a rendszeren. Megoldás: az NCBI API hívásokat közvetlenül reimplementáltuk `httpx`-szel a `tools/pubmed.py`-ban.

**Gemini agentic loop:** query beküldés → model tool call kérés → tool végrehajtás → FunctionResponse visszaküldés → ismétlés amíg kész (max 5 kör).

---

## Javitott hibák

| Hiba | Megoldás |
|---|---|
| TS2339: `import.meta.env` ismeretlen | `src/vite-env.d.ts` létrehozva `/// <reference types="vite/client" />` |
| TS1117: duplikált `borderTop` property | Sidebar.tsx-ből a duplikált sor törölve |
| TS6133: `ResultsTable` nem használt | LiteratureSearch átírva, közvetlenül `ResultsTable`-t használ; `SortableBody` (dead code) törölve |
| pip konfliktusok | Más projektek (fastmcp) okozták, a mi csomagjaink sikeresen települtek |

---

## Végeredmény

```
npm run build → ✓ built in 4.50s (0 TS hiba, 0 warning)
GET /health   → {"status":"ok"}
```

### Szerverek indítása

```bash
# Terminal 1
cd novusolv-science/backend && uvicorn main:app --reload

# Terminal 2
cd novusolv-science/frontend && npm run dev
```

Frontend: http://localhost:5173
Backend:  http://localhost:8000

---

## Mi nincs még kész (Phase II+)

- Gemini streaming válaszok (valós idejű output)
- 3D protein viewer (NGL Viewer integráció)
- PDF / Markdown export
- Protein és Genomic oldalak (jelenleg placeholder)
- NCBI API key regisztráció (ajánlott, rate limit miatt)