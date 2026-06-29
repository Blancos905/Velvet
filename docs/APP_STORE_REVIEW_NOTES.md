# Note per App Review (App Store Connect / Google Play)

Copiare e adattare nel campo «Note for reviewer» / «Istruzioni per il tester» al primo invio.

---

## Modello app

**Saloni Luxury** è un’app companion per titolari di salone e clienti già registrati sulla piattaforma web `https://www.saloniluxury.it`.

- L’interfaccia è caricata in WebView dal sito di produzione (HTTPS).
- **Non** sono disponibili acquisti o abbonamenti digitali in-app: il piano Premium si attiva solo tramite contratto/partner sul web; in app il titolare Free vede messaggi informativi neutri senza prezzi né link a pagamenti esterni.
- Funzioni native: notifiche push (FCM/APNs), geolocalizzazione per ricerca saloni, navigazione sicura (domain guard).

---

## Account demo per reviewer

| Ruolo | Email | Password | Cosa testare |
|-------|-------|----------|--------------|
| Cliente B2C | *(creare account demo)* | *(password)* | Ricerca saloni, prenotazione, profilo, elimina account |
| Titolare salone Free | *(creare account demo)* | *(password)* | Agenda, servizi, notifiche; sezioni Premium mostrano overlay informativo |
| Titolare salone Premium | *(opzionale)* | *(password)* | Funzioni Premium già attive lato account |

> Creare account reali su produzione prima dell’invio e inserire credenziali qui.

---

## Eliminazione account (obbligatorio store)

1. Accedi → **Profilo** → sezione **Chiudi account** → conferma.
2. Pagina pubblica: `https://www.saloniluxury.it/privacy/elimina-account`

---

## URL privacy (console store)

| Documento | URL |
|-----------|-----|
| Privacy B2C (clienti) | `https://www.saloniluxury.it/privacy/clienti` |
| Privacy B2B (soci partner) | `https://www.saloniluxury.it/privacy` |
| Elimina account | `https://www.saloniluxury.it/privacy/elimina-account` |
| Termini | `https://www.saloniluxury.it/termini` |

---

## Permessi

- **Posizione:** ricerca «saloni vicini» e compilazione CAP/comune (WebView + bridge nativo).
- **Notifiche push:** promemoria prenotazioni e messaggi di servizio (facoltative, richiedono consenso utente).

---

## Build release

```bash
cd velvet-app
./scripts/setup-android-release-signing.sh   # una tantum
./scripts/build-android-release.sh
flutter build ipa --release --dart-define=VELVET_WEB_BASE_URL=https://www.saloniluxury.it
```
