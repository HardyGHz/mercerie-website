# Session Summary – 2026-05-26 (Claude Code)

## Mit csináltunk

### 1. Gemini munkájának verifikációja
Gemini 4 állítást tett az elvégzett munkáról. Claude Code kódonként ellenőrizte:

| Állítás | Valóság |
|---|---|
| Data Bus / researchContext state | VALÓS – App.tsx-ben van, entityExtractor.ts tölti ki |
| Dinamikus widgetek (Genomics, Proteomics) | VALÓS – researchContext props-ként megy le Dashboard-ba |
| Kattintható modulok, hover effekt | VALÓS – minden widget kap onClick + hover:border-primary |
| useEffect végtelen ciklus fix | VALÓS – prevLoadingRef ref-alapú edge-trigger pattern |

Gemini nem blöffölt, a kód rendben van.

### 2. MVP vs. valódi termék rés azonosítása
Hardy célja: saját eszközként használni, majd értékesíteni (RaaS).

Azonosított hiányosságok produkció előtt:
- `entityExtractor.ts` csak 14 hardkódolt génre működik, regex-alapú (nem AI)
- Variantsok frekvenciája mindig `—`, ClinVar API nincs bekötve
- Protein viewer statikus stock kép (NGL Viewer hiányzik)
- Agent log szimulált, nem valódi backend logok
- Nincs auth

Prioritási sorrend (megbeszélt):
1. ClinVar API bekötése
2. entityExtractor cseréje Gemini-alapú NLP-re
3. Valódi Agent log
4. Auth

### 3. CLAUDE.md létrehozása
Elkészült: `projects/NovuResearch/CLAUDE.md`

Tartalmazza: dev szerver parancsok, env var sablonok, teljes adatfolyam diagram, minden kulcsfájl szerepe, design token referenciák, ismert Phase II korlátok.

## Jelenlegi állapot
- Frontend: React 19 + Vite + Tailwind v4, Data Bus architektúra kész, dashboard működik
- Backend: FastAPI + Gemini function calling loop + PubMed tools + Supabase cache
- Mindkét szerver fut fejlesztői módban, alap PubMed keresés end-to-end működik

## Következő lépések (Phase II)
- ClinVar API tool a backendbe (`backend/tools/clinvar.py`)
- entityExtractor kiváltása backend-oldali Gemini NLP-vel (strukturált JSON output)
- NGL Viewer integráció a Proteomics widgetbe
- Agent log WebSocket/SSE stream bekötése a valódi backend logokhoz
- Supabase Auth (Google Login) – értékesítés előfeltétele
