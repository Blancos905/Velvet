# velvet-frontend — SaloniLuxury (web)

SPA **React 18**, **TypeScript**, **Vite 5** per il sito pubblico **SaloniLuxury**: ricerca saloni, vetrina, registrazione/login, area account consumatore e **area titolare** (piano salone, brand, layout, servizi) quando il JWT contiene il ruolo realm **`OWNER`**.

## Avvio

```bash
npm install
npm run dev
```

- Dev server: **http://localhost:5173** (porta fissa in `vite.config.ts`).  
- Le chiamate a **`/api`** sono proxate verso Spring: default **`http://127.0.0.1:8080`**. Se l’API è su un’altra porta o sulla VM (es. **8082**), imposta **`VITE_PROXY_API_TARGET`** in **`.env.development`** (vedi `.env.lab.example`). Avvia il backend raggiungibile da quel target, altrimenti vedrai errori di rete o **401** se la richiesta finisce su un altro servizio sulla 8080.

## Variabili d’ambiente (Vite)

File di riferimento: **`.env.example`**. Copia in **`.env.development`** (non committare segreti).

| Variabile | Uso |
|-----------|-----|
| **`VITE_PROXY_API_TARGET`** | Solo **`npm run dev`**: URL base del backend per il proxy **`/api`** (es. `http://192.168.1.64:8082`). Se assente, default **`http://127.0.0.1:8080`**. |
| **`VITE_API_BASE_URL`** | Base URL dell’API senza slash finale. **Vuoto** in locale → path relativi `/api/...` e proxy Vite. Se valorizzato, le richieste vanno direttamente a quell’host (in dev serve **`velvet.cors.allowed-origins`** sul backend verso `http://localhost:5173`). In produzione, se la SPA è su un dominio diverso dall’API, impostare l’URL completo dell’API e **`velvet.cors.allowed-origins`**. |
| **`VITE_PARTNER_SIGNUP_URL`** | Destinazione del pulsante «Diventa partner». Default: pagina interna **`/partner`**. |
| **`VITE_PARTNER_CONTACT_EMAIL`** | Opzionale: email per pulsante mailto sulla pagina partner. |

Config letta da `src/config/env.ts`.

## Autenticazione

- **Login / registrazione consumatore e titolare:** `POST /api/v1/auth/login` con email e password → **JWT** salvato in **`sessionStorage`**. Le chiamate autenticate passano il token a `apiJson` / `apiFetch` (`Authorization: Bearer …`).  
- **`VelvetAuthProvider`** (`src/auth/VelvetAuthProvider.tsx`): espone stato sessione, login, logout, ruoli da JWT (`velvetJwtHintsFromAccessToken`), flag **`isSalonTitolare`** se è presente il ruolo **`OWNER`**, hint piano salone.  
- **`/auth/callback`:** route di compatibilità; reindirizza alla home (flusso OIDC non è il path attuale).

## Routing (sintesi)

| Path | Note |
|------|------|
| `/` | Home SaloniLuxury, ricerca (anche CAP → locate). |
| `/search` | Lista ricerca; preferiti in cima se loggato. |
| `/s/:slug` | Vetrina / mini-sito salone, prenotazione consumatore. |
| `/piani` | Piani Free / Premium e onboarding titolare (registrazione salone). |
| `/partner` | Landing B2B partner (override URL con `VITE_PARTNER_SIGNUP_URL`). |
| `/registrati` | Registrazione cliente. |
| `/account/prenotazioni/:id` | Dettaglio prenotazione consumatore (link dalle email di conferma). |
| `/recensione` | Recensione con **token** (query). |
| `/account/*` | **Protetto:** layout account; redirect index → `/account/home` (cliente) o `/account/salone` (titolare). Sottoroute: prenotazioni, profilo, preferiti, assistenza; per **OWNER**: salone (home, servizi, brand, layout catalogo, strumenti Standard). |

## Struttura `src/`

- **`api/`** — client HTTP, tipi DTO, registrazioni pubbliche, locate.  
- **`auth/`** — provider contesto autenticazione.  
- **`components/`** — UI condivisa (header, footer, protezione route, flussi salone).  
- **`config/`** — env tipizzate.  
- **`data/`** — piani, cataloghi layout, dati statici ricerca.  
- **`hooks/`** — React Query / dati titolare.  
- **`layout/`** — layout radice pubblico.  
- **`lib/`** — parsing JWT, `returnUrl` sicuro post-login, utilità.  
- **`pages/`** — viste e sottocartelle `account/salon/`.  
- **`providers/`** — QueryClient + auth.  
- **`styles/`** — fogli CSS tema (`velvet-surfaces.css`, `velvet-plans.css`, `velvet-auth-login.css`).  
- **`utils/`** — messaggi errore OIDC/auth lato UI.

Documentazione di prodotto e API: **`../docs/DOCUMENTAZIONE-PRODOTTO-E-SISTEMA.md`** (§11), **`../docs/STATO-IMPLEMENTAZIONE-CODICE.md`**.
