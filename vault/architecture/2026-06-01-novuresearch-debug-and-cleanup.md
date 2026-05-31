# 2026-06-01 NovuResearch: Debug Session + Monorepo Cleanup

## Mi volt a probléma

Két tünet:
1. **Genomics Explorer** — navigáció után eltűnt a táblázat adata
2. **3D Protein Viewer** — a struktúra betöltött, de fekete canvas maradt

## Gyökérokok (valódi, sorrendben megtalálva)

### 1. Crash-szintű TypeScript hibák (tsc -b kimutatta)
- `GenomicsExplorer.tsx`: `useEffect` import hiányzott → a cache-visszatöltő effekt soha nem futott le mount-kor
- `ProteinViewer.tsx`: `handleLookup` használva deklaráció előtt (temporal dead zone) → ReferenceError minden mount-on
- `ProteinViewer.tsx`: `residue_position` `number|null` vs `number|undefined` típushiba (2 helyen)

**Tanulság:** mindig `npx tsc -b --noEmit` először. A futásidejű "nem látszik" sok esetben sima compile crash.

### 2. React 19 StrictMode + NGL WebGL dupla Stage
A `<StrictMode>` dev módban kétszer mountolja a komponenseket (mount → unmount → remount). Ez két NGL WebGL Stage-et hozott létre, a végén üres/halott canvas maradt. Tünetek a console-ban: több `STAGE LOG loading file` + `Timer 'CifParser._parse' already exists` + dupla `EDTSurface fillvoxels`.

**Fix:** `<StrictMode>` eltávolítva `main.tsx`-ből. StrictMode produkcióban eleve no-op, tehát ez csak a dev-et hozza szinkronba a proddal. Three.js/NGL/Mapbox-féle WebGL renderereknél ez a bevett megoldás.

**Megjegyzés:** A korábbi `lastLookupRef` upstream dedup (2026-05-28) megfogta a dupla API fetch-et, DE a load `useEffect` deps-e `[source, stageReady]` volt, és a `stageReady` counter a StrictMode remountkor inkrementálódott → a `loadFile` újra lefutott egy MÁSIK Stage-re.

### 3. Three.js r155 fény-skálázás
`THREE.WebGLRenderer: .useLegacyLights deprecated` warning — a three.js r155-ben megváltozott a fény-skálázás, ami NGL esetén feketén renderelt modellt adhat sötét háttéren.

**Fix:** `lightIntensity: 1.8, ambientIntensity: 0.5` a Stage konstruktorban.

### 4. Dev szerver a RÉGI legacy frontend példányt futtatja
**A legkorábbi buktató:** a monorepo migráció (2026-05-31) átmásolta a kódot `apps\research-frontend\`-be, DE a futó Vite dev szerver még mindig a régi `Executive Asisstant\projects\NovuResearch\frontend\`-et szolgálta ki. Minden kódjavítás a NEM futó példányba ment → "semmi változás" a böngészőben.

**Diagnózis módja:** `Invoke-WebRequest http://localhost:5173/src/main.tsx` → sourcemap `file` mezője megmutatja a VALÓS kiszolgált fájl útvonalát.

**Fix:** dev szervert átállítani az `apps\research-frontend`-ből való indításra.

### 5. Genomics megőrzés: localStorage helyett App-szintű state
A localStorage cache ugyan futott (a crash fix után), de a `GenomicsExplorer` kontrollált komponenssé alakítva: a perzisztens állapot (gene, variants, lastGene) az `App.tsx`-ben él, navigáción átmenve garantáltan megmarad.

---

## Monorepo cleanup (ugyanezen a napon)

### Mi törlődött
- `Executive Asisstant\projects\NovuResearch\` — teljes mappa (~273 MB frontend node_modules + backend + knowledge-base + docs)
- knowledge-base paritás ellenőrizve: OLD 199 fájl = NEW 199 fájl, bájtra azonos másolatok

### Mi frissült
- `GEMINI.md` — régi `projects/NovuResearch/...` útvonalak → `apps/research-backend`, `apps/research-frontend`
- `.claude/settings.local.json` — stale stitch permission frissítve a valós `apps\research-frontend\stich\` útvonalra
- `ProteinViewer.tsx` — DIAG console.log blokk eltávolítva (debug lezárult)

### Source of truth most
| Komponens | Helye |
|---|---|
| Frontend (Vite :5173) | `apps\research-frontend\` |
| Backend (uvicorn :8000) | `apps\research-backend\` |
| Stitch designok | `apps\research-frontend\stich\` |
| Docs, session summaries | `vault\projects\NovuResearch\` |

---

## Fájlok amik változtak

- `apps/research-frontend/src/main.tsx` — StrictMode eltávolítva
- `apps/research-frontend/src/pages/ProteinViewer.tsx` — handleLookup sorrend fix, lightIntensity, robustFrame, DIAG log cleanup
- `apps/research-frontend/src/pages/GenomicsExplorer.tsx` — useEffect import, App-szintű state (props-on át)
- `apps/research-frontend/src/App.tsx` — genomicsState + setGenomicsState, GenomicsExplorer propok
- `GEMINI.md` — útvonalak frissítve
- `.claude/settings.local.json` — stale permission frissítve
