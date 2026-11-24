# Go-live legale minimo — senza Stripe, senza incassi

Checklist per pubblicare **Saloni Luxury / Luxury** con:

- piano **Premium in prova gratuita** (nessun addebito; non esiste un piano gratuito separato);
- **zero fatturato** per i prossimi ~6 mesi;
- **Stripe disattivato** o non configurato in produzione.

**Non sostituisce** commercialista o avvocato privacy. Serve a separare cosa è **obbligatorio al go-live** da cosa può **aspettare la monetizzazione**.

Riferimenti: `docs/GO_LIVE.md`, `LEGAL_COMPLIANCE_AUDIT.md`, `docs/APP_STORE_REVIEW_NOTES.md`.

---

## Premessa: Partita IVA senza incassi

| Domanda | Risposta sintetica |
|---------|-------------------|
| Serve P.IVA se non incasso nulla? | **Spesso sì al go-live pubblico**, perché l’attività (SaaS gratuito + trial) è già sul mercato, non perché hai già fatturato. |
| La prova gratuita di 6 mesi esonera? | **No** — rimanda i pagamenti, non l’identificazione del titolare né il trattamento dati. |
| Posso restare in “solo sviluppo”? | **Sì** solo se non ci sono utenti reali e nessuna raccolta dati pubblica. |

**Prima del go-live:** decidere forma giuridica (ditta individuale forfettario vs SRL) con un commercialista. Aprire o usare la P.IVA **prima** di aprire registrazioni pubbliche.

---

## Fase 0 — Ancora in sviluppo (nessun utente esterno)

Puoi **rimandare** quasi tutto sotto, tranne:

- [ ] Non usare domini/email di produzione per dati reali di terzi
- [ ] Non pubblicare su store con informative placeholder
- [ ] Pianificare soggetto giuridico e P.IVA per la data di go-live

---

## Fase 1 — Go-live pubblico (prova Premium, €0 incassi)

### A. Soggetto giuridico e fiscale (🔴 bloccante)

| # | Voce | Obbligatorio ora? | Azione |
|---|------|-------------------|--------|
| A1 | **P.IVA** (ditta o società) | **Sì** (consiglio forte al go-live) | Apertura o uso P.IVA esistente — parere commercialista |
| A2 | **Ragione sociale e sede** nelle informative | **Sì** (GDPR art. 13) | Valorizzare in `.env.production`: `VITE_COMPANY_LEGAL_NAME`, `VITE_COMPANY_ADDRESS`, `VITE_COMPANY_VAT` |
| A3 | **Denominazione commerciale** | **Sì** | `VITE_COMPANY_NAME=Saloni Luxury` |
| A4 | **Email privacy attiva** | **Sì** | `privacy@saloniluxury.it` + SPF/DKIM/DMARC |
| A5 | **Email assistenza** | **Sì** | `assistenza@saloniluxury.it` |
| A6 | **Iscrizione REA / CCIAA** | Dipende da forma societaria | Se SRL già costituita, dati in footer/legale |
| A7 | **INPS / contributi** | Dipende da regime | Commercialista — anche con fatturato zero può esserci posizione previdenziale minima |

**File:** `luxury-frontend/src/content/legalEntity.ts` (legge le env a build time).

```bash
cd luxury-frontend
cp .env.example .env.production
# Compilare VITE_COMPANY_* con valori reali
npm run build
```

Verifica: aprire `/privacy` in produzione e controllare che compaiano P.IVA e sede reali (niente “comunicata su richiesta”).

---

### B. Privacy e GDPR (🔴 bloccante)

| # | Voce | Obbligatorio ora? | Stato in repo |
|---|------|-------------------|---------------|
| B1 | Informativa **B2C** `/privacy/clienti` | **Sì** | ✅ Custom |
| B2 | Informativa **B2B** titolari `/privacy` | **Sì** | ✅ Custom |
| B2b | Riepilogo account **titolare** `/account/info-privacy` | **Sì** (UX) | ✅ informativa titolare Premium (anche prima dell’attivazione; senza un secondo piano) |
| B3 | Informativa **Staff** `/privacy/staff` | **Sì** | ✅ Custom |
| B4 | **Cookie policy** + banner | **Sì** | ✅ Gate Maps; foto home self-hosted (`/editorial/`) |
| B5 | **Registro consensi** server-side | **Sì** (consigliato) | ✅ `POST /api/v1/public/cookie-consent` — applicare SQL prod |
| B6 | **DPA Art. 28** con saloni partner | **Sì** | ✅ `/legale/accordo-trattamento` + click-wrap in registrazione; SQL colonne DPA su prod |
| B7 | **RoPA** (registro trattamenti) | **Sì** (organizzativo) | ❌ Documento esterno |
| B8 | **DPIA** | Valutare con consulente | ❌ Se trattamento a rischio elevato |
| B9 | **Diritti** export / cancellazione | **Sì** | ✅ API `/me/data-export`, `/me/account` |
| B10 | **Versione documenti** in registrazione | **Sì** | ✅ `legalDocumentVersion` |
| B11 | **Minori 16+** in registrazione | **Sì** | ✅ Checkbox UX |
| B12 | Rimuovere testi **“Pre-Release”** | **Sì** | Verificare `LegalPrivacyAccordion.tsx` |

**SQL registro cookie (produzione):**

```bash
# PostgreSQL
psql ... -f luxury/deploy/sql/add_cookie_consent_events_postgres.sql
# MariaDB
mysql ... < luxury/deploy/sql/add_cookie_consent_events_mariadb.sql
```

---

### C. Contratti e termini (🔴 bloccante)

| # | Voce | Obbligatorio ora? | Note |
|---|------|-------------------|------|
| C1 | **Termini di servizio** `/termini` | **Sì** | Già allineati a trial senza addebito automatico |
| C2 | Accettazione ToS + privacy in registrazione | **Sì** | ✅ Checkbox + backend |
| C3 | **DPA / accordo trattamento** salone ↔ piattaforma | **Sì** | ✅ Checkbox obbligatoria in `/piani` + versione `dpaDocumentVersion` su profilo |
| C4 | Clausole **ruoli** titolare/responsabile | **Sì** | ✅ Copy Art. 28 in ToS/privacy |

**Cosa può essere un click-wrap minimo al signup salone:**

1. Termini di servizio (versione `LEGAL_DOCUMENT_VERSION`)
2. Informativa privacy B2B
3. Accettazione **Accordo Art. 28** (PDF o pagina dedicata `/legale/dpa` — da creare)

---

### D. Pagamenti e fiscale — **NON serve ora**

| # | Voce | Obbligatorio ora? | Quando |
|---|------|-------------------|--------|
| D1 | Account **Stripe** | **No** | ~6 mesi, prima del primo checkout |
| D2 | `STRIPE_SECRET_KEY` / webhook in prod | **No** | Stessa data |
| D3 | Raccolta **dati fatturazione** salone | **No** in registrazione Premium trial | Solo su attivazione volontaria post-prova |
| D4 | **Fatturazione elettronica** abbonamenti | **No** | Con primi incassi |
| D5 | **IVA** su abbonamenti | **No** | Con fatturazione |
| D6 | Copy Stripe nelle informative | **Opzionale** | Già presente con formulazione “ove i pagamenti siano attivi” — coerente |

**Importante:** con Stripe spento, il flusso “Procedi” post-trial deve **non** raccogliere carte né dati fiscali obbligatori — oggi il copy lo prevede. Verificare che l’UI non mostri checkout se billing non configurato.

---

### E. Store mobile (se pubblicate app)

| # | Voce | Obbligatorio ora? | Riferimento |
|---|------|-------------------|-------------|
| E1 | URL privacy pubblico HTTPS | **Sì** | `luxuryLegalPanelPaths.ts` |
| E2 | **Elimina account** in-app | **Sì** | `docs/APP_STORE_REVIEW_NOTES.md` |
| E3 | **Data Safety** / **Privacy Nutrition Labels** | **Sì** | Allineare a informative B2C/B2B |
| E4 | **Nessun IAP** per Premium | **Sì** | Già documentato per reviewer |
| E5 | Account demo per Apple/Google | **Sì** | Creare prima dell’invio |

---

### F. Infrastruttura e sicurezza (🟠 alta)

| # | Voce | Obbligatorio ora? |
|---|------|-------------------|
| F1 | TLS HTTPS su dominio reale | **Sì** |
| F2 | `LUXURY_TOKEN_SECRET` produzione forte | **Sì** |
| F3 | SMTP transazionale (`noreply@`) | **Sì** per verifica email |
| F4 | CORS solo domini reali | **Sì** |
| F5 | Piano **incident response** (breach) | Consigliato — documento esterno breve |
| F6 | `./luxury-audit.sh` + `./go-live-check.sh` | **Sì** prima del deploy |

---

## Fase 2 — Tra ~6 mesi (prima del primo euro)

Attivare **prima** di accettare il primo pagamento:

- [ ] Stripe live + webhook + test end-to-end
- [ ] Dati fatturazione salone obbligatori solo al checkout
- [ ] Fatturazione elettronica (FatturaPA o intermediario)
- [ ] Aggiornare informative se cambiano sub-responsabili o trasferimenti
- [ ] Verificare clausole recesso / rinnovo abbonamento B2B
- [ ] Commercialista: IVA, corrispettivi, eventuale OSS se clienti UE

---

## Ordine operativo consigliato (2–4 settimane)

```text
Settimana 1 — Soggetto
  Commercialista → P.IVA / società
  Caselle email privacy + assistenza + noreply
  .env.production con VITE_COMPANY_*

Settimana 2 — Documenti
  Revisione legale informative esistenti (non LegalBlink generico)
  RoPA sintetico (anche 2–3 pagine)

Settimana 3 — Tecnico
  Deploy staging con dati legali reali
  SQL cookie_consent_events su DB prod
  luxury-audit + go-live-check

Settimana 4 — Pubblico
  Go-live web
  (Opzionale) store con account demo
  Monitoraggio richieste privacy@ (diritti GDPR)
```

---

## Gate finale — spunta rapida

**Non andare live con utenti reali se manca anche solo uno di questi:**

- [ ] P.IVA e titolare identificato nelle pagine `/privacy*`
- [ ] `privacy@` funzionante
- [ ] DPA Art. 28 accettato dai saloni partner (click-wrap in registrazione — verificare `dpa_accepted_at` su nuovi OWNER)
- [ ] RoPA redatto (anche versione 1.0)
- [ ] Registro cookie SQL applicato in produzione
- [ ] Nessun placeholder `[TODO_LEGAL]` in build produzione
- [ ] Stripe **non** configurato **oppure** checkout disabilitato in UI

**Puoi andare live senza:**

- [ ] Stripe / fatture / SDI
- [ ] Dati fiscali in registrazione Premium
- [ ] LegalBlink o CMP esterni
- [ ] Multilingua informative

---

## Domande frequenti

**Posso usare solo nome e cognome senza SRL?**  
Sì come **ditta individuale** con P.IVA; le informative devono riportare nome, cognome o ragione d’impresa, sede, P.IVA.

**Beta chiusa con 3 saloni amici?**  
Zona grigia. Minimo: titolare identificato, informative pubblicate, DPA anche semplificato, consenso informato. Meglio P.IVA aperta.

**Il trial Premium di 6 mesi crea obblighi fiscali?**  
Non di fatturazione verso i saloni finché è gratuito; sì per **posizione contributiva** e **attività economica** — chiedere al commercialista.

**LegalBlink ora?**  
Non necessario: informative custom + eventuale revisione legale una tantum.

---

*Ultimo aggiornamento: giugno 2026 — allineato a `LEGAL_COMPLIANCE_AUDIT.md` e registro cookie server-side.*
