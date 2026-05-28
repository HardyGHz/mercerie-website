# HANDOFF — 2026-05-28 (folytatás holnap)

## Mit csináltunk ma

Teszteltük a `feature-finishing-loop` skillt egy valós bugon: **ProteinViewer 3D canvas üres marad, ha Genomics → 3D gombbal jövünk át (`target` propot kap).** Manuálisan a LOAD STRUCTURE gombbal működik.

## Hol tartunk a loopban

Iteráció #2 közepén, várok evidence-re Hardytól.

**Iteráció #1:** Hipotézis = NGL viewport race az `autoView()` és container layout között. Fix = `requestAnimationFrame` után még egy `handleResize() + autoView()`. **NEM oldotta meg.**

**Iteráció #2:** Új evidence (DevTools console) megmutatta a tényleges root cause-t:
```
loading 'AF-P04637-F1-model_v6.cif'  (3×)
loaded 'AF-P04637-F1-model_v6.cif'   (3×)
Timer 'CifParser._parse ...' already exists  (2×)
```
A CIF-et háromszor töltötte be párhuzamosan (React 18 StrictMode + target prop async race), mind a 3 component bekerült Stage-re, `autoView()` az unió bbox-ra frame-elt → kamera infinity-be → fekete canvas. A `recenter` ezért sem segített.

**Fix kísérlet (iteráció #2):** request-ID alapú dedup `loadIdRef`-fel. Csak a legutolsó loadFile resolved component-je marad fent, a többit `stage.removeComponent(c)`-vel eltakarítja. Build zöld.

**State amikor abbahagytuk:** Hardy reprodukálta a bugot a fix után is ("2. stepnél nem mutatja"). Kértem új console screenshot-ot hogy lássam:
- Mennyi `loading file` sor van most? (Ha 1-2 → fix applikálódott. Ha még mindig 3 → vagy NGL nem dedup-ol, vagy Vite cache, vagy nincs hard reload után.)
- Maradt-e "Timer already exists" warning?
- Új error van-e?

Ez a screenshot a következő input amit várok holnap.

## Reprodukálás

1. `cd backend && uvicorn main:app --reload` (port 8000)
2. `cd frontend && npm run dev` (port 5173)
3. Browser → Genomics Explorer (DNA sidebar ikon)
4. ANALYZE gomb → várd amíg betölti a TP53 variantokat
5. R175H sor jobb szélén `3D` ikon → kattints
6. ProteinViewerre vált, jobb oldal metadata betöltődik (P04637, 393 aa, R175H mutation highlight box), DE a 3D canvas üres
7. F12 → Console nézi mit dob NGL

## Releváns fájlok

- `frontend/src/pages/ProteinViewer.tsx` — itt van a (még nem ellenőrzött) request-ID fix:
  - sor ~34: `const loadIdRef = useRef(0)` hozzáadva
  - sor ~113-167: source-load useEffect átírva (régi `cancelled` flag helyett `myId` request-ID compare, `stage.removeComponent(c)` stale loadokra)
- `frontend/src/App.tsx` — `proteinTarget` state, `setPage('protein-viewer')` flow
- `frontend/src/pages/GenomicsExplorer.tsx` — a `3D` gomb callback-je (`onProteinTarget`)

## Lehetséges következő lépések

Sorrendben, amit holnap tesztelni:

1. **Először:** új console screenshot a Hardytól → eldönti, hogy a fix applikálódott-e és működik-e
2. Ha 3 load még mindig → vagy `npm run dev` restart kell (Vite cache), vagy a representation-re-add useEffect is racing → ott is dedup kell
3. Ha 1 load van de canvas még mindig üres → más bug. Akkor:
   - `comp.autoView()` után async logoljuk a viewport méretet és camera position-t (`console.log(stage.viewer.width, stage.viewer.height, stage.viewerControls.position)`)
   - Lehet hogy `comp.addRepresentation('label', ...)` invalid sele-t kap és throw-ol — try/catch köré
4. Worst case: React.StrictMode kikapcsolni csak ProteinViewer-re (nem ajánlott, masking)
5. Alternatíva: a target-prop useEffect-ben debounce vagy `useRef` alapú dedup (StrictMode-ban a ref reset-elődik mount között, de a 2 await között már ugyanaz)

## Skill tanulság (feature-finishing-loop)

Eddig jól működött, a workflow szerint mentem:
- Step 2 evidence-kérés a console-ról → KRITIKUS volt, az első fix vakon hibás hipotézisre épült (autoView race), a console tárta fel a tényleges race-t (3× loadFile)
- Step 3 most-likely-first fix → az első jó "irányba" mutatott (race volt valóban), de nem a jó szinten oldotta meg
- Step 4 nem volt szükséges (nincs design choice)
- Step 6 verification checklist → működött, Hardy gyorsan visszajelzett

Skill nem igényel változtatást ebből a sessionből. Talán: "ha az első fix nem hoz eredményt, MINDIG kérj új console-t mielőtt második fix-et próbálsz" — de ez már benne van implicit a "Iteráció → vissza Step 2-re" loopban.
