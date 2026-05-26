# Novu Research OS

**"AI Research Workbench & Data Operating System"**

A Novu Research (vagy "Novu Brain") egy prémium kutatói operációs rendszer, amely a világ legnagyobb orvosbiológiai adatbázisait (PubMed, ClinVar, AlphaFold) egy modern, AI-vezérelt műszerfalon (Bento Grid) teszi elérhetővé. Nem csupán adatot szolgáltat, hanem egy valós idejű "Data Bus" architektúrán keresztül vizuálisan értelmezi és összeköti azokat.

## Jelenlegi Státusz
- **Fázis:** Phase I Kész (Alap UI, Data Bus architektúra bekötve, dinamikus widgetek működnek).
- **Cél:** Research-as-a-Service (RaaS) SaaS termék.
- **Következő Lépés:** Phase II (ClinVar API bekötése a backendbe, valódi Gemini NLP alapú Entity Extraction).

## Rendszer Architektúra

Az alkalmazás két fő, szorosan együttműködő rétegből áll:

### 1. Backend (Az "Agy")
- **Stack:** Python + FastAPI
- **AI Motor:** Gemini 3.1 Flash Lite
- **Science Skills:** Specializált lokális toolok a tudományos adatbázisokhoz (PubMed).
- **Adatbázis:** Supabase (Keresések és hibák naplózása, graceful degradation).

### 2. Frontend (A "Műszerfal")
- **Stack:** React 19 + Vite + Tailwind CSS v4
- **UI/UX:** Letisztult, prémium Bento Grid elrendezés (Zinc-950 téma, IBM Plex Mono).
- **Data Bus:** A frontend képes valós időben értelmezni a beérkező cikkeket (`entityExtractor`), automatikusan kinyerni belőlük a releváns entitásokat (géneket, variánsokat), és dinamikusan frissíteni a widgeteket (Genomics, Proteomics) prop-ok segítségével.

## Fejlesztői Indítás

A projekt futtatásához két terminál szükséges:

**Backend (FastAPI):**
```bash
cd backend
uvicorn main:app --reload
```

**Frontend (React/Vite):**
```bash
cd frontend
npm run dev
```

## További Dokumentáció
- **`NOVU_RESEARCH_MANUAL.md`**: Részletes üzleti és technikai áttekintés a projekt jelenlegi állapotáról és jövőképéről.
- **`CLAUDE.md`**: Konkrét AI ágensek számára fenntartott instrukciók, architekturális térkép és Phase II korlátok.
- **`PLAN_data_bus.md`**: A Data Bus architektúra megvalósításának részletei.
