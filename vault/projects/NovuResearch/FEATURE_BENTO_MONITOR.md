# Feature Spec: Live AI Co-Pilot Monitor Widget

**Státusz:** Tervezett | **Fázis:** Phase II | **Prioritás:** Magas

---

## Összefoglaló (One-liner)

Egy valós idejű fejlesztési monitor widget a Novu Research OS műszerfalán, amely a meglévő chip ikon segítségével aktiválható, és automatikusan frissülve mutatja a háttérben dolgozó AI ágens (pl. Claude Code) kódváltozásait.

---

## Probléma

A kutatói és fejlesztői munka során a platform gazdájának nincs láthatósága arra, hogy a háttérben futó AI fejlesztési eszközök éppen min dolgoznak. Ez a hiány különösen éles, ha egyszerre több AI ágens is aktív (pl. Gemini CLI + Claude Code párhuzamosan).

---

## Megoldás: Live Workspace Status Widget

A Novu Research OS műszerfalának jobb felső sarkában már jelen lévő chip ikonra kattintva a Bento Grid elrendezés kiegészül egy dedikált "AI Co-Pilot" monitor panellel. A widget a belső FastAPI backend egy új, ultra-gyors végpontját (`/api/dev/workspace-status`) kérdezi le 5 másodpercenként, és az eredményt a platform meglévő Scientific Minimalism dizájn rendszerébe illeszkedve jeleníti meg.

---

## Funkcionális Specifikáció

### Aktiválás
- **Trigger:** A meglévő chip ikon (`<span class="material-symbols-outlined">memory_chip</span>`) a dashboard jobb felső sarkában.
- **Viselkedés:** Kattintásra a Bento Grid elrendezése dinamikusan kiegészül az AI Monitor panellel (CSS grid reflow animációval). Második kattintásra visszaáll az eredeti nézet.
- **Nincs:** Különálló switch, modal ablak vagy glassmorphism overlay.

### Backend Végpont (`/api/dev/workspace-status`)
- **Metódus:** `GET`
- **Válaszidő:** < 200ms
- **Logika:** Lefuttatja a `git status --porcelain` és `git diff --stat` parancsokat a projekt könyvtárán, majd strukturált JSON-t ad vissza:

```json
{
  "timestamp": "2026-05-27T01:00:00",
  "branch": "main",
  "modified": ["frontend/src/App.tsx", "frontend/src/pages/Dashboard.tsx"],
  "new_files": ["CLAUDE.md", "entityExtractor.ts"],
  "summary": "5 fájl módosult, 2 új fájl létrehozva az utolsó commit óta.",
  "last_commit": "feat: implement data bus, dynamic widgets"
}
```

### Frontend Widget Specifikáció

**Pozíció:** Új Bento cella, a jobb felső chip ikon alatt nyílik le.

**Tartalom (Scientific Minimalism dizájn):**

```
┌─────────────────────────────────────────────┐
│  AI CO-PILOT MONITOR              ● LIVE    │
│  branch: main | last sync: 5s ago           │
├─────────────────────────────────────────────┤
│                                             │
│  MODIFIED (2)                               │
│  ● App.tsx          frontend/src/           │
│  ● Dashboard.tsx    frontend/src/pages/     │
│                                             │
│  NEW FILES (2)                              │
│  + CLAUDE.md                                │
│  + entityExtractor.ts    frontend/src/lib/  │
│                                             │
│  ─────────────────────────────────────────  │
│  feat: implement data bus, dynamic widgets  │
└─────────────────────────────────────────────┘
```

**Dizájn tokenek (meglévő rendszer):**
- Háttér: `bg-[#18181b]` (konzisztens a többi Bento cellával)
- Keret: `border border-[#27272a]`
- `● LIVE` jelző: zöld pulzáló pont (`animate-pulse text-secondary`)
- Módosított fájlok: `text-primary`
- Új fájlok: `text-secondary` (zöld)
- Törölt fájlok (ha van): `text-error` (piros)
- Tipográfia: `font-mono text-[11px]` (IBM Plex Mono, konzisztens a platform OS esztétikájával)

---

## Nem Funkcionális Követelmények

| Szempont | Specifikáció |
|---|---|
| **Frissítési ciklus** | 5 másodpercenként (polling) |
| **Láthatóság** | Csak a chip ikon megnyomása után aktív (nem zavaró alapállapotban) |
| **Teljesítmény** | A végpont max. 200ms, nem blokkolja a főoldal betöltését |
| **Hibakezelés** | Ha a backend nem érhető el, a widget "OFFLINE" státuszt mutat, nem hibaüzenetet |
| **Auth** | Fejlesztői mód, nincs auth szükség (a backend lokálisan fut) |

---

## Üzleti Érték

Ez a widget egyedülálló versenyelőnyt ad a Novu Research OS-nek a konkurens RaaS eszközökkel szemben: a kutatói platform egyben egy **élő, transzparens fejlesztési dashboardként** is funkcionál, amely demonstrálja az AI-vezérelt munkafolyamat mélységét és a rendszer átláthatóságát. Befektetői és ügyféldemonstrációnál azonnali "wow" faktor.

---

## Implementációs Lépések (Phase II)

1. `[ ]` `GET /api/dev/workspace-status` FastAPI végpont megírása (`backend/main.py`)
2. `[ ]` A chip ikon onClick eseménykezelő bekötése a Dashboard komponensbe
3. `[ ]` `AiMonitorWidget.tsx` React komponens létrehozása
4. `[ ]` Polling logika (`useInterval` hook, 5s)
5. `[ ]` Bento Grid feltételes renderelése az aktivált státusz alapján
