# Technikai Megoldás: 3D ProteinViewer Stabilizálás (2026-05-31)

## Probléma leírása
A NovuResearch 3D megjelenítője (NGL Viewer) instabil volt:
- **Race Condition:** React 19 Strict Mode-ban a dupla `useEffect` miatt párhuzamos betöltések futottak le, amik ütköztek.
- **Layout Settlement:** A CSS Grid elrendezés mozgása miatt a canvas mérete változott, a kamera pedig a végtelenbe (fekete képernyő) ugrott.
- **Ghosting:** A korábbi keresések modelljei a memóriában maradtak.

## A Megoldás (The "Serious" Approach)

### 1. Load Locking (Versenyhelyzet kezelése)
Bevezettünk egy `loadIdRef` számlálót. Minden betöltés egy egyedi ID-t kap.
```typescript
const myId = ++loadIdRef.current;
// ... betöltés után ...
if (isCancelled || myId !== loadIdRef.current) return; // Csak a legfrissebb maradhat
```

### 2. Robust Framing (Kamera fixálás)
A sima `autoView()` helyett egy `robustFrame` segédfüggvényt használunk, ami:
- Meghívja a `stage.handleResize()`-t.
- Két lépcsőben (azonnal + 300ms késleltetéssel) keretezi be a modellt, megvárva a böngésző layout kiszámítását.

### 3. ResizeObserver Integráció
Egy dedikált `ResizeObserver` figyeli a konténert. Ha a rácsos szerkezet (Grid) miatt akár 1 pixelt is változik a méret, az NGL azonnal újraszámolja a 3D vetületet.

### 4. Memória Tisztítás
A betöltés elején a `stage.removeAllComponents()` hívással garantáljuk, hogy ne legyen "szellemkép" a korábbi proteinekből.

## Debugging Tippek a jövőre
- Ha a kép fekete: Ellenőrizd a `loadIdRef` szinkronját.
- Ha a modell nem középen van: A `robustFrame` késleltetését (300ms) kell növelni, ha lassabb a gép/layout.

"Komoly dolgokra komoly megoldás kell."
