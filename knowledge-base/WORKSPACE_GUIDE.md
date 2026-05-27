# Guide: Novu Research OS - Workspace Intelligence Mapping

Ezt a fájlt használd a frontend "In-App Documentation" (header tooltipek vagy rövid leírások) implementálásához.

---

## 1. Literature & Discovery (Intelligence Hub)
- **Rövid leírás:** A globális tudományos tudástár központi elérése és AI-alapú szintézise.
- **Összetevők:** PubMed, ArXiv, BioRxiv, EuropePMC, OpenAlex.
- **Képesség:** Több millió publikációból nyer ki összefüggéseket, trendeket és bizonyítékokat.
- **Input forrás:** Felhasználói kérdések, génevek, vegyületek.
- **Output cél:** Megalapozza a kutatást az összes többi csoport számára (génlista -> Genomics, fehérje-nevek -> Proteomics).

## 2. Genomics & Variants (The DNA Lab)
- **Rövid leírás:** Nagy pontosságú DNS elemzés és genetikai variánsok interpretálása.
- **Összetevők:** AlphaGenome, gnomAD, ClinVar, dbSNP, Ensembl, GTEx.
- **Képesség:** Meghatározza a mutációk gyakoriságát és patogenitását (betegségokozó képességét).
- **Input forrás:** Literature findings (rsID-k), konkrét genomi koordináták.
- **Output cél:** Specifikus variáns-hatás riportok a Proteomics (fehérje-stabilitás) és a Clinical (kockázatelemzés) számára.

## 3. Proteins & Structures (3D Molecular Workshop)
- **Rövid leírás:** Strukturális biológiai központ, ahol a molekuláris szintű funkció életre kel.
- **Összetevők:** AlphaFold, PDB, UniProt, FoldSeek, InterPro, PyMOL.
- **Képesség:** Fehérje-hajtogatás predikció és kötőhely-mechanizmusok 3D szimulációja.
- **Input forrás:** Aminosav szekvenciák, Genomics-ból érkező variáns adatok.
- **Output cél:** Kötési affinitási adatok és 3D koordináták a Chemistry/Clinical (gyógyszertervezés) számára.

## 4. Chemistry & Clinical (Pharmacology Hub)
- **Rövid leírás:** Vegyületek azonosítása és a klinikai engedélyezési folyamatok monitorozása.
- **Összetevők:** PubChem, ChEMBL, ClinicalTrials.gov, OpenFDA, Reactome.
- **Képesség:** Molekuláris jelöltek keresése és klinikai vizsgálatok (Phase I-III) életciklus követése.
- **Input forrás:** Proteomics által azonosított célpontok, Genomics alapú betegség-markerek.
- **Output cél:** Végleges klinikai stratégia, gyógyszer-jelöltek és biztonsági figyelmeztetések.

---
*Megjegyzés: Az ágens feladata, hogy ezeket a láncolatokat automatikusan felajánlja a felhasználónak a "Next Logical Step" gombok formájában.*
