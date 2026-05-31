# Idea Puffer & Architektúra Újdonságok (2026-05-31)

Hardy, ide gyűjtöttem össze azokat a komoly megoldásokat, amikről ma beszéltünk. Ez a jegyzet az alapköve a Notes Assistant 2.0-nak.

## 1. Az "Idea Puffer" Koncepció
Ez a mappa (`vault/idea-buffer/`) szolgál a spontán ötletek tárolására. 
- **Cél:** Semmi ne vesszen el, de ne is zavarja az éppen futó fejlesztést (Execution).
- **Folyamat:** Idea -> Kutatás -> Terv -> Execution.

## 2. Monorepo Architektúra
A projektet egyetlen egységként kezeljük, de funkcionálisan elosztva:
- **`apps/`**: Ide kerül a CRM és a NovuResearch.
- **`packages/`**: Közös kódok, típusok, Supabase szervizek.
- **`vault/`**: Az Obsidian Vault (A rendszer memóriája).

## 3. Obsidian CLI & Újdonságok
- **Hivatalos CLI (v1.12+):** Közvetlen híd a kód és a jegyzetek között. Én (Gemini) ezen keresztül tudok írni a jegyzeteidbe.
- **Canvas:** Vizuális rendszerszervezés.
- **Service Layer:** A kódunk tiszta marad, az adatok kezelése központosított lesz.

## 4. Következő Lépések az Execution-höz
1. Jegyzetek átmozgatása az új Vaultba.
2. CRM és Research appok beköltöztetése az `apps/` mappába.
3. Közös Supabase szerviz kialakítása a `packages/` alatt.

"Komoly dolgokra komoly megoldás kell." - Ezt az elvet követjük.
