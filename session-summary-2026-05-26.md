# Session Summary: Novu Research Strategy (2026-05-26)

**Project:** Novu Research (AI Research OS)
**Lead:** Hardy (Novusolv)
**Status:** Strategy Finalized -> Development Ready

## 1. Key Decisions & Architecture
- **Tech Stack:** React 19 (Frontend) + FastAPI (Backend Bridge) + Google AI Python SDK (Agent Engine).
- **Model:** **Gemini 3.1 Flash Lite** (High speed, low cost, 1M+ context).
- **UI Design:** Bento Grid layout, Zinc-950 theme, IBM Plex Mono typography. Avoiding "AI slop" aesthetics.
- **Agent Logic:** Function Calling via `google-generativeai` to orchestrate 35+ local science tools.

## 2. Resources Created
- `SOP_ARCH.md`: The master blueprint for the project.
- `knowledge-base/`: Contains SDK guides and Science skill references for the development agent.
- `README.md`: High-level project vision and goals.

## 3. Discovered Science Skills (35+ Categories)
- **Literature:** PubMed, ArXiv, OpenAlex, EuropePMC.
- **Genomics:** AlphaGenome, gnomAD, ClinVar, Ensembl.
- **Structure:** AlphaFold, PDB, UniProt, FoldSeek.
- **Clinical/Chem:** ClinicalTrials.gov, PubChem, ChemBL, OpenFDA.

## 4. Next Steps for Claude Code
1.  **Read `SOP_ARCH.md`** and the `knowledge-base/` folder.
2.  **Initialize Project:** Use `web-artifacts-builder` for a clean React/Vite structure.
3.  **Backend Setup:** Create a FastAPI server with the `google-generativeai` integration.
4.  **UI Implementation:** Follow the "Master UI Prompt" and use `frontend-design` / `ui-ux-pro-max` skills.

## 5. Technical Warning
- **Antigravity SDK:** This is an internal Gemini CLI runtime. DO NOT attempt to `pip install` it. Use `google-generativeai` for the external backend development.
