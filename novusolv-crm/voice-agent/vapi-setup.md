# Vapi Voice Agent Setup — Dezmembrare MVP

## 1. Assistant Settings (Vapi Dashboard)

| Beállítás | Érték |
|---|---|
| Name | Dezmembrare Agent |
| First Message | "Bună ziua, ați sunat la [Cég neve]. Cum vă pot ajuta?" |
| Language | Romanian (ro-RO) |
| Voice | Vapi default Romanian voice |
| Max Duration | 5 min |

---

## 2. System Prompt

```
Ești un asistent telefonic pentru o dezmembrare auto. Programul este închis acum, dar preiei comenzile.

Obiectivul tău:
1. Salută politicos
2. Întreabă ce piesă are nevoie clientul
3. Întreabă marca, modelul și anul mașinii
4. Întreabă numele clientului
5. Întreabă când dorește să fie sunat înapoi (zi și oră)
6. Confirmă datele și spune că va fi contactat

Reguli:
- Vorbești doar română
- Ești scurt și politicos
- Nu promite prețuri sau disponibilitate
- Dacă nu înțelegi, roagă clientul să repete
- La final mulțumește și închide apelul

Exemplu de conversație:
Client: "Bună, am nevoie de un alternator."
Tu: "Bine ați venit! Pentru ce mașină aveți nevoie de alternator?"
Client: "Pentru un Dacia Logan 2015."
Tu: "Înțeles. Și numele dumneavoastră, vă rog?"
Client: "Ion Popescu."
Tu: "Mulțumesc, domnule Popescu. Când doriți să vă sunăm înapoi?"
Client: "Mâine dimineața, pe la 9."
Tu: "Perfect. Vă sunăm mâine dimineața la 9. O seară bună!"
```

---

## 3. Structured Data (Analysis tab → "Create Structured Output")

**Vapi Dashboard → Analysis tab → "+ Create Structured Output"**

6 külön mezőt kell felvenni. Mindegyiknél:
- Extraction Method: **AI extraction**
- Result Format: **String** (ne Boolean!)
- Assistant: **Dezmembrare Agent**

| Name | Description |
|---|---|
| `callerName` | The caller's full name |
| `partNeeded` | The car part the caller is looking for |
| `carMake` | Car brand/make (e.g. Dacia, Ford, BMW) |
| `carModel` | Car model (e.g. Logan, Focus, Series 3) |
| `carYear` | Year of the car (e.g. 2015) |
| `callbackTime` | When the caller wants to be called back (e.g. mâine la 9, marți dimineața) |

---

## 4. Webhook (Server URL)

A Vapi dashboardon a "Server URL" mezőbe:

```
https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/vapi-webhook
```

Event: `end-of-call-report`

---

## 5. Deploy lépések

1. Supabase CLI telepítés (ha nincs): `npm install -g supabase`
2. Login: `supabase login`
3. Link projekt: `supabase link --project-ref <PROJECT_REF>`
4. Deploy: `supabase functions deploy vapi-webhook`
5. Vapi dashboardon beállítani a Server URL-t (fent)
6. Teszt: hívj rá egy számra, ellenőrizd a CRM-ben

---

## 6. Amit kell tudni a deploy előtt

- `SUPABASE_URL` és `SUPABASE_SERVICE_ROLE_KEY` automatikusan elérhető Edge Function-ben
- A Vapi phone number beállításánál az Assistantnál add meg ezt az agentet
- Az Edge Function URL publikus — Vapi nem küld auth headert alap esetben (MVP-nél OK)