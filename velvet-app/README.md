# Velvet App (SaloniVelvet)

Shell **Flutter** per iOS e Android: **nessuna logica di business** nell’app. Tutta l’esperienza (UI, auth JWT, prenotazioni, account) è quella di **`velvet-frontend`**, caricata in **WebView**.

| Progetto | Ruolo |
|----------|--------|
| `../velvet/` | Backend API (Spring Boot) |
| `../velvet-frontend/` | Sito React/Vite — **unica implementazione UI/logica client** |
| **`velvet-app/`** | Contenitore nativo: WebView, `tel:` / WhatsApp esterni, back stack |

## Prerequisiti

- [Flutter SDK](https://docs.flutter.dev/get-started/install) (stable, SDK ≥ 3.5)
- Per sviluppo locale: `velvet-frontend` in `npm run dev` (porta **5173**) e backend `velvet` su **8080**

### Prima configurazione piattaforme

Dalla cartella `velvet-app` (genera `android/` e `ios/` se mancanti):

```bash
./scripts/setup-flutter.sh
```

Oppure manualmente:

```bash
flutter create . --org it.salonivelvet --project-name velvet_app --platforms=android,ios
flutter pub get
```

## Avvio rapido (dev locale)

1. Backend Spring su `:8080` e frontend Vite su `:5173` (proxy `/api` → backend).
2. Setup piattaforme (una volta): `./scripts/setup-flutter.sh`
3. Simulatore + Vite insieme:

```bash
./scripts/dev-with-frontend.sh ios
# oppure
./scripts/dev-with-frontend.sh android
```

## Avvio

**Produzione** (default: `https://salonivelvet.it`):

```bash
flutter run
```

**Sviluppo** — emulatore Android (host → `10.0.2.2`):

```bash
flutter run --dart-define=VELVET_WEB_BASE_URL=http://10.0.2.2:5173
```

**Sviluppo** — simulatore iOS:

```bash
flutter run --dart-define=VELVET_WEB_BASE_URL=http://127.0.0.1:5173
```

**Sviluppo** — telefono fisico sulla stessa rete del Mac:

```bash
flutter run --dart-define=VELVET_WEB_BASE_URL=http://192.168.x.x:5173
```

Assicurati che Vite sia avviato con `--host` se il device non raggiunge `localhost` del Mac:

```bash
cd ../velvet-frontend && npm run dev -- --host
```

## Variabili (`--dart-define`)

| Nome | Default | Uso |
|------|---------|-----|
| `VELVET_WEB_BASE_URL` | `https://salonivelvet.it` | Origine del sito (velvet-frontend deployato o dev server) |
| `VELVET_WEB_INITIAL_PATH` | `/` | Path iniziale (es. `/ricerca`) |

Le chiamate API restano gestite dal **frontend** (proxy Vite in dev, `VITE_API_BASE_URL` in prod). L’app non espone `EXPO_PUBLIC_*` né duplica client HTTP.

## Comportamento nativo minimo

- **WebView** a schermo intero con loading ed errore di rete
- **Indietro** Android: history WebView, poi chiusura app
- Link **`tel:`**, **`mailto:`**, **`sms:`**, **`whatsapp:`**, **`https://wa.me/...`** → app di sistema (`url_launcher`)
- Pannelli legali con `?embed=1` come sul vecchio prototipo Expo — stesse pagine di `velvet-frontend`

## Documentazione prodotto

`../docs/GOOGLE-PLAY-E-CANALI-CLIENTE-VELVET.md`, `../docs/AMBIENTI-E-CONFIGURAZIONE.md`
