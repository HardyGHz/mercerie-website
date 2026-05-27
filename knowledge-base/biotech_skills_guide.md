# 🧬 Bioteck Science Skills — Átfogó Útmutató és Összehasonlítás

Ez az útmutató részletesen bemutatja a **Science** plugin 37 beépített készségét (skill-jét), funkcionális kategóriákba csoportosítva őket, valamint összehasonlítja az átfedő területeket (pl. variáns-analízis, fehérjeszerkezet, irodalomkutatás), hogy megkönnyítse a megfelelő eszköz kiválasztását.

---

## 📂 1. Genomika, Transzkriptomika és Szabályozás

Ezek a skillek a DNS/RNS szintű elemzésekre, genetikai variánsokra és a génkifejeződés szabályozására fókuszálnak.

| Készség neve | Fő funkció / Mire jó? | Bemenet | Kimenet | Tipikus használati eset |
| :--- | :--- | :--- | :--- | :--- |
| **`ensembl-database`** | Gén, transzkriptum és fehérje azonosítók feloldása, szekvenciák letöltése, génszerkezet (exonok) lekérdezése, valamint variánsok hatásvizsgálata (VEP). | Gén/Transzkriptum ID, genom koordináták | Szekvenciák, exon koordináták, transzkriptum listák, VEP annotációk | **Elsődleges ID-fordító** és szekvenciakereső a genomikai pipeline-ok elején. |
| **`dbsnp-database`** | Rövid genetikai variánsok (SNP-k, indels) keresése és térképezése az NCBI dbSNP adatbázisában. | rsID (pl. `rs121918719`), VCF koordináták, HGVS leíró | Funkcionális osztály, allélgyakoriságok, génkapcsolatok, GRCh38 koordináták | Egy adott ismert rsID koordinátáinak és alapvető tulajdonságainak lekérése. |
| **`gnomad-database`** | Variánsok előfordulási gyakoriságának (populáció-genetika) és a gének funkcióvesztési intoleranciájának (pLI, LOEUF) lekérdezése. | Variáns koordináták, gén szimbólum | Allélgyakoriság populációk szerint, LOEUF/pLI pontszámok | Annak ellenőrzése, hogy egy adott variáns **mennyire ritka**, és a gén mennyire érzékeny a mutációkra. |
| **`alphagenome-single-variant-analysis`** | Mesterséges intelligencia alapú előrejelzés nem-kódoló variánsok transzkripcióra, kromatin hozzáférhetőségre és transzkripciós faktor kötődésre gyakorolt hatásáról. | Variáns (pl. `chr:pos:ref>alt`), cell-type / szövet | Hatás-pontszámok (RNA-seq, DNASE, ChIP, TF binding változások) | Nem-kódoló (pl. promoter, enhancer) variánsok funkcionális és szabályozási hatásának becslése. |
| **`ucsc-conservation-and-tfbs`** | Evolúciós konzerváltsági pontszámok (phyloP, phastCons) és kísérleti Transzkripciós Faktor Kötőhelyek (TFBS) lekérése. | Genomikai koordináták (régió) | Konzerváltsági értékek, TFBS átfedések (ENCODE, JASPAR, ReMap) | Annak vizsgálata, hogy egy adott genom szakasz evolúciósan megőrzött-e, illetve kötődnek-e oda TF-ek. |
| **`encode-ccres-database`** | A humán cisz-szabályozó elemek (cCREs) adatbázisának lekérdezése cella- és szövettípusok szerint. | Cella/szövettípus, régió | Promoterek, enhancerek, insulátorok listája és aktivitása | Szabályozó régiók funkcionális annotálása egy adott sejtvonalban. |
| **`jaspar-database`** | Transzkripciós faktorok kötődési profiljainak (mátrixok) lekérése. | TF név, JASPAR mátrix ID | Pozíció-frekvencia mátrixok (PFM, PWM) különböző formátumokban (MEME, YAML) | Motívumkereséshez szükséges TF kötődési minták letöltése. |
| **`unibind-database`** | Kísérletileg validált transzkripciós faktor kötőhelyek (TFBS) letöltése. | TF név, sejtvonal, faj | Kötőhely koordináták (BED/FASTA) | Valós ChIP-seq adatokon alapuló TF-DNS interakciós adatsorok kinyerése. |
| **`gtex-database`** | Szövet-specifikus génkifejeződés (RNA expression) és expressziós kvantitatív trait locus (eQTL) adatok lekérése. | Gén szimbólum, szövet típus | Génexpressziós szintek (TPM), eQTL variánsok és p-értékek | Annak vizsgálata, hogy egy variáns befolyásolja-e egy gén kifejeződését egy adott szövetben (pl. szív vagy agy). |

---

## 🧬 2. Fehérjeelemzés, Szerkezet és Homológia

Ezek a skillek a fehérjék 3D szerkezetével, szekvenciájával, doménjeivel és vizualizációjával foglalkoznak.

| Készség neve | Fő funkció / Mire jó? | Bemenet | Kimenet | Tipikus használati eset |
| :--- | :--- | :--- | :--- | :--- |
| **`uniprot-database`** | Fehérjék funkcionális annotációinak, taxonómiájának és szekvenciájának lekérdezése (Swiss-Prot/TrEMBL). | Fehérje név, UniProt ID (pl. `P04637`) | Funkció leírás, szekvencia, poszt-transzlációs módosítások, szakirodalom | **Elsődleges fehérje-tudástár**: funkció, mutációk és alapvető biológia megismerése. |
| **`alphafold-database-fetch-and-analyze`** | AlphaFold által prediktált 3D fehérjeszerkezetek letöltése és szerkezeti elemzése (pLDDT, rendezetlenség). | UniProt Accession ID | 3D koordináták (.pdb/.cif), pLDDT (konfidencia) profil, domén határok | AI által jósolt fehérjeszerkezetek kinyerése és a modell megbízhatóságának vizsgálata. |
| **`pdb-database`** | Kísérletileg meghatározott (X-ray, Cryo-EM) 3D makromolekuláris szerkezetek keresése és letöltése. | PDB ID (pl. `1A8G`), szekvencia | Kísérleti koordinátafájlok, kísérleti részletek (felbontás, módszer) | Valós, kísérletileg validált fehérje- vagy fehérje-ligandum komplex szerkezetek beszerzése. |
| **`foldseek-structural-search`** | 3D fehérjeszerkezet-hasonlósági keresés (hasonló alakú fehérjék keresése). | 3D koordinátafájl (.pdb/.cif) | Szerkezetileg hasonló fehérjék listája | **Szerkezeti homológia keresése** (ha a fehérjék szekvenciája eltér, de a 3D alakjuk megegyezik). |
| **`protein-sequence-similarity-search`** | Fehérje szekvencia-hasonlósági keresés homológok megtalálására. | Fehérjeszekvencia (FASTA) | Hasonló szekvenciájú fehérjék (BLAST vagy MMseqs2 találatok) | Új szekvenciák funkciójának tippelése ismert homológok alapján. |
| **`protein-sequence-msa`** | Többszörös szekvencia-illesztés (Multiple Sequence Alignment) készítése. | Több fehérjeszekvencia (FASTA) | MSA illesztési fájl (Clustal Omega) | Konzervált aminosavak, aktív centrumok és evolúciós kapcsolatok azonosítása fehérjecsaládokon belül. |
| **`interpro-database`** | Fehérjedómének, családok, aktív helyek azonosítása és Deep Learning alapú funkcionális annotáció. | Fehérje ID vagy szekvencia | Dómenszerkezet (IDA), InterPro családok, GO annotációk | Fehérjék funkcionális egységeinek (dómeneinek) feltérképezése. |
| **`human-protein-atlas-database`** | Fehérjék expressziós és térbeli lokalizációs (sejtszervecske szintű) adatai humán szövetekben és sejtvonalakban. | Gén/fehérje név | Immunhisztokémiai (IHC) képek linkjei, szövetspecifikus fehérje szintek | Annak ellenőrzése, hogy a fehérje hol termelődik a testben, és melyik sejtszervecskében található. |
| **`pymol`** | Fehérjeszerkezetek 3D vizualizációja, szuperpozíciója (illesztése) és képek renderelése. | PDB/CIF koordináták, PyMOL scriptek | Renderelt képek, szerkezeti mérések (távolságok, szögek) | Fehérje-ligandum kötőhelyek vizuális elemzése, prezentációs ábrák készítése. |

---

## 🕸️ 3. Rendszerbiológia, Útvonalak és Interakciók

Ezek az eszközök a fehérjék és gének közötti hálózatos kapcsolatokat és biológiai folyamatokat (pathways) elemzik.

| Készség neve | Fő funkció / Mire jó? | Bemenet | Kimenet | Tipikus használati eset |
| :--- | :--- | :--- | :--- | :--- |
| **`reactome-database`** | Biológiai útvonalak (pathway) elemzése, génlista dúsítás (enrichment) és útvonal diagramok exportálása. | Gén/Fehérje lista, útvonal ID | Dúsított útvonalak listája, p-értékek, diagram képek | Génexpressziós kísérletben (pl. RNA-seq) megváltozott gének funkcionális útvonalainak azonosítása. |
| **`string-database`** | Fehérje-fehérje interakciós (PPI) hálózatok és funkcionális kapcsolatok lekérdezése kísérleti és szövegbányászati adatokból. | Fehérjék listája | Interakciós párok, konfidencia pontszámok, funkcionális dúsítások | Fehérjekomplexek és jelátviteli hálózatok felrajzolása és elemzése. |
| **`quickgo-database`** | Gene Ontology (GO) kifejezések (Biológiai folyamat, Molekuláris funkció, Sejtalkotó) és annotációk keresése. | Gén ID vagy GO kifejezés | GO annotációk, taxonómiai korlátozások, GO hierarchia | Gének funkcionális kategorizálása standardizált ontológia szerint. |

---

## 💊 4. Kéminformatika, Célpont-azonosítás és Klinikai adatok

Ezek a skillek áthidalják a biológia és a gyógyszerfejlesztés közötti szakadékot a vegyületektől a klinikai vizsgálatokig.

| Készség neve | Fő funkció / Mire jó? | Bemenet | Kimenet | Tipikus használati eset |
| :--- | :--- | :--- | :--- | :--- |
| **`pubchem-database`** | Kémiai vegyületek óriás-adatbázisa: szerkezet, fizikai-kémiai tulajdonságok és bioaktivitás. | Vegyület név, CID, SMILES | Kémiai tulajdonságok, 2D/3D szerkezetek, bioaktivitási adatok | Vegyületek alapvető adatlapjainak lekérése és szerkezeti hasonlóság (substructure) keresés. |
| **`chembl-database`** | Bioaktív molekulák és gyógyszer-célpontok kísérleti adatai (IC50, Ki, EC50 értékek). | Vegyület, fehérje célpont, SMILES | Kötődési affinitás értékek, assay részletek | Gyógyszerjelölt vegyületek célfehérjéhez való kötődési erősségének (affinitásának) ellenőrzése. |
| **`opentargets-database`** | Célpont-betegség asszociációk integrált elemzése, gyógyszer-célpontok értékelése (tractability, biztonság). | Célpont (gén) vagy betegség név | Asszociációs pontszámok (genetika, gyógyszerek alapján), tractability (gyógyszerrel célozhatóság) | **Target Discovery**: új gyógyszercélpontok keresése adott betegségekhez. |
| **`clinvar-database`** | Humán genetikai variánsok klinikai jelentősége és patogenitási besorolása kísérleti bizonyítékokkal. | Variáns koordináták, HGVS | Patogenitási státusz (Pathogenic, Benign, VUS), klinikai leírás | Mutációk klinikai veszélyességének értékelése betegvizsgálatoknál. |
| **`clinical-trials-database`** | A ClinicalTrials.gov adatbázis lekérdezése folyamatban lévő és lezárt klinikai vizsgálatok után. | Betegség, gyógyszer, NCT ID | Klinikai fázisok, részvételi feltételek (eligibility), szponzorok, eredmények | Adott betegségre futó klinikai tesztek vagy gyógyszerjelöltek klinikai fázisának lekérdezése. |
| **`openfda-database`** | Az FDA hivatalos adatbázisa: mellékhatások, visszahívások, gyógyszer-címkék és engedélyezések. | Gyógyszer név, NDC | Mellékhatás jelentések, figyelmeztetések, jóváhagyási adatok | Gyógyszerbiztonsági elemzések (mellékhatások statisztikája) és szabályozási státusz ellenőrzése. |

---

## 📚 5. Szakirodalmi Keresés és Tudományos Források

Ezek a skillek a publikált szakcikkek és preprintek hatékony felkutatására és feldolgozására szolgálnak.

| Készség neve | Fő funkció / Mire jó? | Bemenet | Kimenet | Tipikus használati eset |
| :--- | :--- | :--- | :--- | :--- |
| **`pubmed-database`** | Az elsődleges orvosbiológiai cikkadatbázis (MEDLINE) és PMC teljes szövegek lekérése. | Keresőszavak, szerzők, PMID | Absztraktok, cikk metaadatok, PMC teljes szövegek | Orvosbiológiai szakirodalom szisztematikus áttekintése. |
| **`literature-search-europepmc`** | Az Europe PMC adatbázis lekérdezése (cikkek, hivatkozások, open-access teljes szövegek). | Keresőszavak, PMCID | Teljes szövegek (XML/plain text), hivatkozási listák | Nyílt hozzáférésű cikkek teljes szövegének letöltése elemzéshez és szövegbányászathoz. |
| **`literature-search-openalex`** | Globális, multidiszciplináris tudományos hálózati adatbázis (hivatkozások, h-index, intézmények). | Keresőszavak, DOI, szerző | Teljes bibliometriai adatok, h-index, citation count | Szerzők, intézmények tudományos hatásának mérése és cikkek DOI alapján történő lekérése. |
| **`literature-search-arxiv`** | Fizika, matematika, számítástechnika és kvantitatív biológia (q-bio) preprint-ek keresése. | Keresőszavak, arXiv ID | Absztraktok, PDF letöltési linkek | A legfrissebb matematikai modellek, bioinformatikai algoritmusok vagy gépi tanulási cikkek keresése. |
| **`literature-search-biorxiv`** | Élettudományi (bioRxiv) és orvosi (medRxiv) preprintek keresése és letöltése. | Időszak, kategória, DOI | Preprint metaadatok, PDF linkek | A még peer-review alatt álló, legfrissebb biológiai felfedezések nyomon követése. |

---

## 🛠️ 6. Segédeszközök és Egyéb Skillek

| Készség neve | Leírás |
| :--- | :--- |
| **`embl-ebi-ols`** | Az Ontology Lookup Service (OLS) lekérdezése. Segít megtalálni az ontológia kifejezéseket (pl. betegségnevek DOID, fenotípusok HP) és azok hierarchiáját. |
| **`uv`** | Biztosítja a villámgyors `uv` Python csomagkezelő jelenlétét a környezetben (szükséges más skillek futásához). |
| **`workflow-skill-creator`** | Képes egy sikeresen végrehajtott felhasználói munkafolyamatot önálló, újrafelhasználható agent skill-é alakítani. |

---

## 📊 7. Kulcsfontosságú Összehasonlítások (Melyiket mikor használd?)

### A. Variáns Annotáció & Klinikai Hatás: `dbsnp` vs `clinvar` vs `gnomad` vs `alphagenome`
> [!TIP]
> - Ha **koordinátákra** és alapinformációkra van szükséged egy `rs12345` ID-ből: használd a **`dbsnp-database`**-t.
> - Ha azt akarod tudni, hogy a variáns **betegséget okoz-e** (klinikai szempont): használd a **`clinvar-database`**-t.
> - Ha azt akarod ellenőrizni, hogy a variáns **gyakori-e az egészséges populációban**: használd a **`gnomad-database`**-t.
> - Ha a variáns **nem-kódoló régióban van**, és a génszabályozásra gyakorolt hatását akarod prediktálni: használd az **`alphagenome-single-variant-analysis`**-t.

### B. Fehérje 3D Szerkezet: `pdb` vs `alphafold` vs `foldseek` vs `pymol`
> [!IMPORTANT]
> - Ha **kísérletileg igazolt** (pl. röntgenkrisztallográfiás) szerkezet kell: **`pdb-database`**.
> - Ha a fehérjének **nincs kísérleti szerkezete**, de létezik hozzá AI-predikció: **`alphafold-database-fetch-and-analyze`**.
> - Ha egy 3D szerkezethez keresel **hasonló alakú más fehérjéket** (nem szekvencia, hanem forma alapján): **`foldseek-structural-search`**.
> - Ha a letöltött szerkezeteket **meg akarod jeleníteni**, egymáshoz akarod igazítani, vagy képet akarsz renderelni róluk: **`pymol`**.

### C. Irodalomkutatás: `pubmed` vs `europepmc` vs `openalex`
> [!NOTE]
> - Ha **orvosbiológiai absztraktokra** és cikkekre fókuszálsz: **`pubmed-database`** (ez a legstandardabb).
> - Ha **teljes szövegű** nyílt hozzáférésű cikkeket akarsz letölteni gépi elemzésre: **`literature-search-europepmc`** (az XML/plain text formátumok miatt).
> - Ha **hivatkozási hálózatokat** (melyik cikk kit idéz, h-index) vagy más tudományterületeket keresel: **`literature-search-openalex`**.
