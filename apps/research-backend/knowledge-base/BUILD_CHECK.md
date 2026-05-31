# Build Audit & Quality Checklist

Használd ezt a listát minden fejlesztési fázis végén, hogy biztosítsd a **Novu Research** minőségét és a Novusolv standardoknak való megfelelést.

## 1. Technikai Struktúra (Web Artifact Standards)
- [ ] **Vite Config:** A `vite.config.ts` tartalmazza a `@/` path aliast.
- [ ] **Tailwind:** A `tailwind.config.js` megfelelően van konfigurálva a Shadcn/UI-hoz.
- [ ] **TypeScript:** Nincsenek kritikus `any` típusok, az interfészek lefedik a tudományos adatokat.
- [ ] **Node Version:** A projekt Node 18+ kompatibilis.

## 2. UI/UX & Design (Anti-Slop Audit)
- [ ] **Színséma:** Kizárólag a `zinc-950` (#09090b) és `zinc-900` alapokat használjuk.
- [ ] **Tipográfia:** Az adatok és koordináták `IBM Plex Mono` betűtípussal jelennek meg.
- [ ] **Bento Grid:** A layout nem szimmetrikus, a widgetek mérete tükrözi a fontosságukat.
- [ ] **AI Slop Check:** Nincsenek felesleges lila gradiensek, nincsenek túl lekerekített sarkok, nem minden van középre igazítva.

## 3. Backend & Engine (Safety & Logic)
- [ ] **SDK:** A `google-generativeai` könyvtárat használjuk (NEM az Antigravity-t).
- [ ] **API Security:** A kulcsok `.env` fájlban vannak, nem hardkódolva.
- [ ] **Function Calling:** A Science skillek tiszta Python függvényekként vannak átadva a Gemini 3.1 Flash Lite-nak.

## 4. Tudományos Adatkezelés
- [ ] **Path Sync:** A scriptek a lokális `knowledge-base/science/` mappából futnak.
- [ ] **Schema Check:** A kimeneti JSON formátum megfelel a frontend által elvárt típusoknak.

---
*Minden "NEM" válasz esetén javítsd a kódot a következő turnben!*
