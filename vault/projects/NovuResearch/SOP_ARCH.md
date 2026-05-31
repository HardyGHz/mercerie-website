# SOP: Novu Research Platform Development

Ez a dokumentum rögzíti a **Novu Research** (AI Research OS) fejlesztési folyamatát, architektúráját és a rendelkezésre álló erőforrások használatát.

## 1. Projekt Vízió
Egy **professzionális, laboratóriumi szintű kutatói operációs rendszer (Lab-Grade OS)**. A cél nem egy egyszerű SaaS app, hanem egy olyan digitális munkaállomás, amely egy biotechnológiai labor asztalán, az elsődleges munkaeszközként is megállja a helyét.

## 2. Architektúra (Tech Stack)
A rendszer három fő rétegből áll:

### A. Frontend (A Dashboard)
- **Stack:** React 19, Vite, TypeScript, Tailwind CSS.
- **UI Architecture:** Hierarchikus "Workspace & Toolbox" modell.
    - **Primary Workspaces (Left Sidebar):** Literature, Genomics, Proteomics, Clinical. Adatintegrációs központok.
    - **Toolbox / Instrument Gallery:** Egy professzionális "műszertár", ahol minden egyes 37+ skill egyedi "műszerként" (Individual Instrument) érhető el közvetlen bemeneti mezőkkel és futtatási lehetőséggel. Expert-level használatra tervezve.
    - **Interconnectedness:** Az ágens KÖTELES láncolni a skilleket (pl. Genomics -> ClinVar -> AlphaFold).
- **UI Architecture Source:** A `stich/` mappában található HTML vázlatok és a **`DESIGN.md`** rendszerterv alapján.
- **Design System:** **Scientific Minimalism / Cyberpunk-Industrial**. 
    - Színkódok: Background `#09090b`, Surfaces `#18181b`.
    - Tipográfia: `IBM Plex Mono` (adatokhoz) és `Geist` (UI-hoz).
    - Shape: Szigorúan **0px (sharp)** corners.
- **Workflow:** A projektet a `stich/command_center_desktop.html` struktúrája alapján kell felépíteni (Left Workflow Strip, Central Workspace, Right Tools & AI Monitor).
- **In-App Documentation:** Minden Workspace (tab) tartalmazzon egy rövid, 1-2 soros leírást és egy "Info" tooltipet a **`WORKSPACE_GUIDE.md`** alapján, amely bemutatja az adatfolyamot (Inputs/Outputs).

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

## 3. Erőforrások (Knowledge Base - FULL SYNC)
A fejlesztő ágens (Claude) számára minden erőforrás lokálisan elérhető a `knowledge-base/` mappában:
- **Teljes Tudományos Motor (Science Skills):** `knowledge-base/science/` (Minden script, dokumentáció és referencia átmásolva).
- **Antigravity SDK útmutató:** `knowledge-base/antigravity/`
- **Modern Web Design:** `knowledge-base/WEB_DESIGN_GUIDE.md`

## 4. Build Audit & Verification
A fejlesztés során a Claude-nak KÖTELEZŐ elvégeznie a következő build-auditot minden fázis végén a `web-artifacts-builder` szabványai alapján:
1.  **Struktúra ellenőrzés:** Létezik-e a `vite.config.ts`, `tailwind.config.js` és a `@/` alias konfiguráció.
2.  **UI Audit:** Megfelel-e a design a **DESIGN.md** és a Zinc-950/IBM Plex Mono irányelveknek (Nincs AI slop).
3.  **Dependency Check:** Minden szükséges shadcn/ui komponens és Radix UI függőség telepítve van-e.
4.  **Bundling Test:** Lefut-e hiba nélkül a `scripts/bundle-artifact.sh` (ha artifact-ként futtatjuk).

## 5. Fejlesztési Lépések (Roadmap)

### I. fázis: Alapozás (Claude Code-dal)
1.  **Repo Setup:** React + Vite alapok a `DESIGN.md` stílusjegyeivel.
2.  **UI Layout:** A Command Center váz (Sidebars + Header + Central Stage) implementálása a Stitch minták alapján.
3.  **API Bridge:** FastAPI szerver létrehozása a `google-generativeai` integrációhoz.
4.  **Első Skill bekötése:** A `pubmed_api.py` script meghívása a backendről.

### II. fázis: Az Ágens életre keltése
1.  **Tool Integration:** A Gemini 3.1 Flash felruházása a Science scriptekkel (Function Calling).
2.  **Streaming:** Valós idejű válaszok megjelenítése a frontenden.
3.  **Strukturált Output:** A kutatási eredmények JSON formátumban való visszaadása.

### III. fázis: Vizualizáció és Design
1.  **3D Viewer:** Fehérjeszerkezetek (PDB fájlok) renderelése az appban.
2.  **Export:** Kutatási jelentések generálása PDF/Markdown formátumban.

## 6. Kereskedelmi és Jogi Irányelvek
- Minden kimenő adat az AI által feldolgozott, értékkel növelt tartalom.
- A platform a "Research-as-a-Service" modellre épül.
- API kulcsok kezelése: A kliensek vagy a Novusolv központi kulcsát használják (tier-alapon).

---
*Utolsó frissítés: 2026-05-27*
