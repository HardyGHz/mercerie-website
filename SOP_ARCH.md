# SOP: Novu Research Platform Development

Ez a dokumentum rögzíti a **Novu Research** (AI Research OS) fejlesztési folyamatát, architektúráját és a rendelkezésre álló erőforrások használatát.

## 1. Projekt Vízió
Egy professzionális, előfizetéses (SaaS) modellben működő tudományos dashboard, amely a DeepMind Science Skills erejét és a Google Antigravity SDK intelligenciáját kombinálja.

## 2. Architektúra (Tech Stack)
A rendszer három fő rétegből áll:

### A. Frontend (A Dashboard)
- **Stack:** React 19, Vite, TypeScript, Tailwind CSS.
- **UI:** Shadcn/UI (modern, minimalista, sötét mód fókuszú).
- **Design Guidance:** A `modern-web-guidance-plugin` alapján (reszponzív, akadálymentes).
- **Frontend Excellence:** A fejlesztő ágens (pl. Claude Code) vegye figyelembe a `frontend-design` és `ui-ux-pro-max-skill` tudásbázisokat. 
    - Kerülni kell az "AI slop" esztétikát.
    - Fókusz: Tipográfia (IBM Plex Mono), sötét mód (Zinc-950), és nagy adatsűrűségű táblázatok.
- **Workflow:** A projektet a `web-artifacts-builder` segítségével kell inicializálni a konzisztens struktúra érdekében.
- **Fő funkciók:**
    - Keresőfelület (Literature Search).
    - 3D Fehérje vizualizáció (NGL Viewer integráció).
    - Ágens-chat ablak (ahol az Antigravity ágens válaszol).

### B. Backend / Intelligence Layer (A Motor)
- **Stack:** Python (FastAPI).
- **Core Library:** `google-generativeai` (Hivatalos Google AI Python SDK).
- **Ágens Logika:** 
    - A Gemini 3.1 Flash Lite natív **Function Calling** képességét használjuk az ágens-viselkedéshez.
    - A Science scriptek Python függvényekként (Tools) lesznek definiálva a modell számára.
- **Ágens Konfiguráció:**
    - Modell: **Gemini 3.1 Flash Lite**.
    - Memória: Perzisztens beszélgetés-előzmények (Supabase-ben tárolva).

### C. Data Layer
- **Adatbázis:** Supabase (Felhasználók, mentett kutatások, cache).
- **Auth:** Supabase Auth (Google Login).

## 3. Erőforrások (Knowledge Base)
A fejlesztő ágens (Claude) számára a legfontosabb referenciák a projekten belüli `knowledge-base/` mappában találhatóak:
- **PubMed/Science útmutató:** `knowledge-base/science/`
- **Antigravity SDK útmutató:** `knowledge-base/antigravity/`
- **Modern Web Design:** `knowledge-base/WEB_DESIGN_GUIDE.md`

## 4. Fejlesztési Lépések (Roadmap)

### I. fázis: Alapozás (Claude Code-dal)
1.  **Repo Setup:** React + Vite alapok, Tailwind beállítása.
2.  **API Bridge:** Egy egyszerű Python FastAPI szerver létrehozása, ami beimportálja a `google-generativeai` könyvtárat.
3.  **Első Skill bekötése:** A `pubmed_api.py` script meghívása a backendről.

### II. fázis: Az Ágens életre keltése
1.  **Tool Integration:** A Gemini 3.1 Flash felruházása a Science scriptekkel (Function Calling).
2.  **Streaming:** Valós idejű válaszok megjelenítése a frontenden.
3.  **Strukturált Output:** A kutatási eredmények JSON formátumban való visszaadása.

### III. fázis: Vizualizáció és Design
1.  **3D Viewer:** Fehérjeszerkezetek (PDB fájlok) renderelése az appban.
2.  **Export:** Kutatási jelentések generálása PDF/Markdown formátumban.

## 5. Kereskedelmi és Jogi Irányelvek
- Minden kimenő adat az AI által feldolgozott, értékkel növelt tartalom.
- A platform a "Research-as-a-Service" modellre épül.
- API kulcsok kezelése: A kliensek vagy a Novusolv központi kulcsát használják (tier-alapon).

---
*Utolsó frissítés: 2026-05-26*
