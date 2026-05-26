# Novu Research OS – Technikai és Üzleti Kézikönyv

Ez a dokumentum a **Novu Research** platform ("Novu Brain") központi dokumentációja. Célja, hogy Hardy számára átláthatóvá tegye a rendszer működését, az üzleti logikát és a technikai felépítést.

---

## 1. Mi ez az alkalmazás?
A **Novu Research OS** egy "AI Research Workbench". Nem egy egyszerű weboldal, hanem egy operációs rendszer, ami a tudományos kutatók (biohackerek, kutatók) kezébe adja a világ legnagyobb orvosbiológiai adatbázisait (PubMed, ClinVar, stb.) egy központi AI ágenssel.

## 2. A rendszer architektúrája (A "motor")

Az alkalmazás két fő részből áll, amik szorosan együttműködnek:

### A. A Backend (Az "Agy")
Ez a rész felel az intelligenciáért és az adatok begyűjtéséért.
*   **Technológia:** Python + FastAPI.
*   **Gemini 3.1 Flash Lite:** Ez az ágensünk agya. Amikor keresel valamit, ő dönti el, melyik "tool"-t kell használnia.
*   **Science Skills (Tools):** Ezek a speciális Python scriptek (`backend/tools/`), amelyekkel az ágens "megtanul" beszélni a tudományos adatbázisokkal (pl. PubMed). Ezeket nevezzük "Backend Skilleknek".
*   **Supabase Logolás:** Minden kutatás és hiba logolva van a Supabase-ben, így látjuk a felhasználói szokásokat és a rendszer stabilitását.

### B. A Frontend (A "Műszerfal" / OS)
Ez az, amit te látsz és használsz.
*   **Technológia:** React + Tailwind.
*   **Data Bus (Az idegrendszer):** Ez a legújabb fejlesztésünk. Az alkalmazás nem csak megjeleníti az adatot, hanem "értelmezi" is azt a kliensoldalon (az ún. `entityExtractor` segítségével). Ha az ágens hoz egy cikket, a frontend rögtön kiszedi belőle a fontos géneket (pl. TP53) és a mutációkat, és frissíti a hozzájuk tartozó widgeteket.

---

## 3. A "Science Skills" – Mit tud a rendszer?

A rendszerünk jelenleg a következő képességekkel rendelkezik:

1.  **Irodalomkutatás (Literature):** A PubMed-ből keres le cikkeket, absztraktokat és metaadatokat (DOI, szerzők). Ez az alapja minden egyéb kutatásnak.
2.  **Genomika (Genomics):** Képes felismerni a géneket és variánsokat (pl. TP53 mutációk). A jövőben ide fogjuk bekötni a ClinVar API-t a patogenitás ellenőrzéséhez.
3.  **Proteomika (Proteomics):** A fehérjék szerkezeti adatait (PDB) és a hozzájuk tartozó fizikai tulajdonságokat vizualizálja.

---

## 4. Hogyan működik a Data Bus? (A "Magic")

Amikor beírsz egy keresést a Novu Brain-be:
1.  **Keresés:** A backend az ágens segítségével letölti a kapcsolódó cikkeket.
2.  **Kinyerés:** A frontend a beérkező cikkek szövegéből ("Data Bus") azonnal kinyeri a géneket és variánsokat.
3.  **Dinamikus frissítés:** A Dashboard modulok (Genomics, Proteomics) látják ezt az új infót, és automatikusan "kivirágzanak" (frissül a nevük, a táblázatuk, a státuszuk).

---

## 5. Üzleti érték (Novusolv fókusz)
*   **Skálázhatóság:** A frontend-alapú kinyerés miatt a rendszer nagyon gyors, és nem terheli a backendet vagy a Gemini token keretet.
*   **SaaS Potenciál:** Ez a Dashboard egy "Research-as-a-Service" (RaaS) termék alapja, amit bármilyen KKV vagy kutatócsoport használhat saját "AI Research OS"-ként.

---
*Ez a dokumentum élő — ahogy a rendszer fejlődik, úgy egészítjük ki az új skillekkel és modulokkal.*
