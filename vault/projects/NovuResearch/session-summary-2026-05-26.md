# Session Summary: Novu Research Strategy & Implementation (2026-05-26)

**Project:** Novu Research (AI Research OS)
**Lead:** Hardy (Novusolv)
**Status:** Strategy & Infrastructure Ready -> Full Implementation

## 1. Key Decisions & Architecture
- **Tech Stack:** React 19 (Frontend) + FastAPI (Backend Bridge) + Google AI Python SDK (Agent Engine).
- **Model:** **Gemini 3.1 Flash Lite** (High speed, low cost, 1M+ context).
- **UI Design:** Bento Grid layout, Zinc-950 theme, IBM Plex Mono typography.
- **Agent Logic:** Function Calling via `google-generativeai` to orchestrate 35+ local science tools.
- **Strategic Pivot:** Az Antigravity SDK belső runtime-nak bizonyult, ezért a publikus fejlesztéshez a **Google Generative AI SDK**-ra váltottunk a maximális stabilitás érdekében.

## 2. Resources Created & FULL SYNC
- **`SOP_ARCH.md`**: A projekt mesterterve, frissítve a build-audit és full-sync folyamatokkal.
- **`knowledge-base/science/`**: **TELJES SZINKRON KÉSZ.** A teljes science plugin (35+ kategória, scriptek, referenciák) átmásolva a projektbe.
- **`knowledge-base/BUILD_CHECK.md`**: Új "Build Audit" skill/checklist a Claude számára a minőségbiztosításhoz.
- **`knowledge-base/antigravity/`**: Referencia anyagok az ágens logikához.

## 3. Build Progress & Deviations
- **Előrehaladás:** A frontend és backend alapjai futnak. A "Data Bus" architektúra készen áll a tudományos adatok fogadására.
- **Eltérések:** Az Antigravity SDK közvetlen használatát elvetettük (eltérés a kezdeti tervtől), helyette a natív Gemini Function Calling-ot alkalmazzuk a `google-generativeai` könyvtáron keresztül. Ez biztosítja a kód hordozhatóságát és skálázhatóságát.

## 4. Discovered Science Skills (35+ Categories)
- **Literature:** PubMed, ArXiv, OpenAlex, EuropePMC.
- **Genomics:** AlphaGenome, gnomAD, ClinVar, Ensembl.
- **Structure:** AlphaFold, PDB, UniProt, FoldSeek.
- **Clinical/Chem:** ClinicalTrials.gov, PubChem, ChemBL, OpenFDA.

## 5. Next Steps for Development
1.  **Initialize Project:** Use `web-artifacts-builder` for a clean React/Vite structure.
2.  **Backend Implementation:** Create the FastAPI server utilizing the local `knowledge-base/science/` scripts.
3.  **UI Refinement:** Implement the Bento Grid using `frontend-design` / `ui-ux-pro-max` skills.
4.  **Verification:** Run the `BUILD_CHECK.md` audit before every major commit.

---
*Science & Profit | Novu Research by Novusolv*
