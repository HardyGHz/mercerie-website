# Plan: Frontend Data Bus — Dynamic Dashboard Widgets

## Context
A NovuResearch dashboard SEC-02 (GENOMICS) és SEC-04 (PROTEOMICS) widgetjei jelenleg statikus mock adatokat mutatnak. A PubMed keresés eredménye (Article[]) már megvan a frontenden — ebből kell kliensoldalon entitásokat kinyerni és a widgeteket dinamikusan feltölteni. Backend módosítás nem szükséges, token/API költség nem nő.

## Érintett fájlok
- `frontend/src/types/index.ts` — új típusok hozzáadása
- `frontend/src/lib/entityExtractor.ts` — ÚJ fájl
- `frontend/src/App.tsx` — researchContext state + extractor trigger
- `frontend/src/pages/Dashboard.tsx` — widgetek props-ból töltve

---

## Phase 1: Típusok (types/index.ts)

Hozzáadandó interfészek a meglévők mellé:

```ts
export interface Variant {
  id: string        // pl. "R175H"
  freq: string      // pl. "0.024" vagy "—" ha nem kinyerhető
  status: 'PATHOGENIC' | 'VUS' | 'BENIGN'
  cls: string       // Tailwind color classes
}

export interface ResearchContext {
  gene: string | null       // pl. "TP53", null ha nem azonosítható
  variants: Variant[]       // max 4, deduplikált
  proteinName: string | null // pl. "P53"
}
```

---

## Phase 2: entityExtractor.ts (ÚJ fájl)

`frontend/src/lib/entityExtractor.ts`

Export: `extractResearchContext(articles: Article[]): ResearchContext`

### Gene kinyerés
```
Regex: /\b(TP53|BRCA1|BRCA2|EGFR|KRAS|PIK3CA|PTEN|RB1|APC|VHL|BRAF|MLH1|MSH2|CDH1|PALB2)\b/gi
```
Minden article title + abstract-ból gyűjtés → legtöbbször előforduló gén nyer.

### Variant kinyerés
```
Regex: /\b([A-Z]\d{2,4}[A-Z])\b/g  — pl. R175H, R273H, Y220C
```
Max 4 db, deduplikálva. Freq default: `"—"` (nem kinyerhető megbízhatóan).

Status heurisztika (az abstract szövege alapján):
- "pathogenic" szó jelenlétével → PATHOGENIC + piros
- "benign" szó jelenlétével → BENIGN + zöld
- Egyéb → VUS + amber

### Protein name
Gene → protein statikus lookup:
```ts
{ TP53: 'P53', BRCA1: 'BRCA1', BRCA2: 'BRCA2', EGFR: 'EGFR', KRAS: 'KRAS', ... }
```

### Fallback
Ha nincs gén: `{ gene: null, variants: [], proteinName: null }`

---

## Phase 3: App.tsx módosítás

```tsx
import { extractResearchContext } from '@/lib/entityExtractor'
import type { ResearchContext } from '@/types'

const [researchContext, setResearchContext] = useState<ResearchContext>({
  gene: null, variants: [], proteinName: null
})

useEffect(() => {
  if (dashArticles.length > 0) {
    setResearchContext(extractResearchContext(dashArticles))
  }
}, [dashArticles])
```

Dashboard props bővítése: `<Dashboard ... researchContext={researchContext} />`

---

## Phase 4: Dashboard.tsx widgetek

### Props interface bővítés
```ts
interface Props {
  // meglévők...
  researchContext: ResearchContext
}
```

### SEC-02 GENOMICS
- `researchContext.variants.length > 0` → valós variánsok listája
- Üres → egyetlen sor: `"NO VARIANT DATA"` placeholder (text-outline, italic)

### SEC-04 PROTEOMICS
- Cím: `researchContext.gene ? \`RECOMBINANT ${researchContext.gene}-L2 FOLD\` : 'RECOMBINANT P53-L2 FOLD'`
- 4 statisztikai sor: marad statikus (nem kinyerhető cikkekből — elfogadott korlát)

---

## Verification
1. Keresés: `"TP53 variants"` → SEC-02 TP53 variánsokat mutat, SEC-04 cím "TP53" szerepel
2. Keresés: `"BRCA1 breast cancer"` → SEC-02 BRCA1 variánsok, gene frissül
3. Keresés: `"alzheimer amyloid"` → SEC-02 "NO VARIANT DATA" graceful state
4. TypeScript: `npm run build` 0 hibával

## Elfogadott korlátok
- Variant freq értékek nem kinyerhetők cikkekből → default `"—"`
- PDB ID és protein 3D struktúra statikus marad
- Status heurisztika (PATHOGENIC/VUS/BENIGN) nem klinikai — csak vizuális