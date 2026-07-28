# Luxury App (SaloniLuxury)

Shell **Flutter** per iOS e Android: **nessuna logica di business** nell’app. Tutta l’esperienza (UI, auth JWT, prenotazioni, account) è quella di **`luxury-frontend`**, caricata in **WebView**.

| Progetto | Ruolo |
|----------|--------|
| `../luxury/` | Backend API (Spring Boot) |
| `../luxury-frontend/` | Sito React/Vite — **unica implementazione UI/logica client** |
| **`luxury-app/`** | Contenitore nativo: WebView, `tel:` / WhatsApp esterni, back stack |

## Prerequisiti

- [Flutter SDK](https://docs.flutter.dev/get-started/install) (stable, SDK ≥ 3.5)
- Per sviluppo locale: `luxury-frontend` in `npm run dev` (porta **5173**) e backend `luxury` su **8080**

### Prima configurazione piattaforme

Dalla cartella `luxury-app` (genera `android/` e `ios/` se mancanti):

```bash
./scripts/setup-flutter.sh
```

Oppure manualmente:

```bash
flutter create . --org it.saloniluxury --project-name luxury_app --platforms=android,ios
flutter pub get
```

## Avvio rapido (dev locale)

1. Backend Spring su `:8080` e frontend Vite su `:5173` (proxy `/api` → backend).
2. Setup piattaforme (una volta): `./scripts/setup-flutter.sh`
3. **Consigliato** — tutto in ordine (Spring + Vite + simulatore):

```bash
# dalla root del monorepo
./scripts/dev-app-ios.sh
# oppure
./scripts/dev-app-android.sh
```

Oppure dalla cartella `luxury-app`:

```bash
./scripts/dev-with-frontend.sh ios
# oppure
./scripts/dev-with-frontend.sh android
```

`wait-for-backend.sh` attende Spring Boot e, se la porta 8080 è libera, lo **avvia in automatico** (log in `/tmp/luxury-spring-dev.log`). Per disabilitare: `LUXURY_AUTO_START_BACKEND=0`.

Probe dev backend: `GET /api/v1/public/health` (Tomcat + DB, senza query pesante su organizations).

## Avvio

**Produzione** (default: `https://saloniluxury.it`):

```bash
flutter run
```

**Sviluppo** — emulatore Android (host → `10.0.2.2`):

```bash
flutter run --dart-define=LUXURY_WEB_BASE_URL=http://10.0.2.2:5173
```

**Sviluppo** — simulatore iOS:

```bash
flutter run --dart-define=LUXURY_WEB_BASE_URL=http://127.0.0.1:5173
```

**Sviluppo** — telefono fisico sulla stessa rete del Mac:

```bash
flutter run --dart-define=LUXURY_WEB_BASE_URL=http://192.168.x.x:5173
```

Assicurati che Vite sia avviato con `--host` se il device non raggiunge `localhost` del Mac:

```bash
cd ../luxury-frontend && npm run dev -- --host
```

## Variabili (`--dart-define`)

| Nome | Default | Uso |
|------|---------|-----|
| `LUXURY_WEB_BASE_URL` | `https://saloniluxury.it` | Origine del sito (luxury-frontend deployato o dev server) |
| `LUXURY_WEB_INITIAL_PATH` | `/` | Path iniziale (es. `/ricerca`) |

Le chiamate API restano gestite dal **frontend** (proxy Vite in dev, `VITE_API_BASE_URL` in prod). L’app non espone `EXPO_PUBLIC_*` né duplica client HTTP.

## Comportamento nativo minimo

- **WebView** a schermo intero con loading ed errore di rete
- **Indietro** Android: history WebView, poi chiusura app
- Link **`tel:`**, **`mailto:`**, **`sms:`**, **`whatsapp:`**, **`https://wa.me/...`** → app di sistema (`url_launcher`)
- Pannelli legali con `?embed=1` come sul vecchio prototipo Expo — stesse pagine di `luxury-frontend`

## Documentazione prodotto

`../docs/GOOGLE-PLAY-E-CANALI-CLIENTE-LUXURY.md`, `../docs/AMBIENTI-E-CONFIGURAZIONE.md`

## Release Android (Google Play)

### 1. Firma release (una tantum)

```bash
cd luxury-app
./scripts/setup-android-release-signing.sh
```

Crea `android/upload-keystore.jks` e `android/key.properties` (entrambi **gitignored**).  
Salva backup del keystore e delle password in un vault — Play Console userà questo certificato upload.

Template: `android/key.properties.example`

### 2. Build AAB

```bash
./scripts/build-android-release.sh
```

Default: `LUXURY_WEB_BASE_URL=https://www.saloniluxury.it`. Output:

`build/app/outputs/bundle/release/app-release.aab`

### 3. Upload

Play Console → app `it.saloniluxury.luxury_app` → carica l’AAB.  
Allinea Data safety e URL privacy a `/privacy/clienti` e `/privacy/elimina-account` sul sito live.

Note reviewer: `../docs/APP_STORE_REVIEW_NOTES.md`
