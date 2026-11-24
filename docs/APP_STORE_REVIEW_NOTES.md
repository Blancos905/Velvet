# Note per App Review (App Store Connect / Google Play)

Copiare e adattare nel campo «Note for reviewer» / «Istruzioni per il tester» al primo invio.

---

## Modello app

**Saloni Luxury** è un’app companion per titolari di salone e clienti già registrati sulla piattaforma web `https://www.saloniluxury.it`.

- L’interfaccia è caricata in WebView dal sito di produzione (HTTPS).
- **Non** usa StoreKit né Google Play Billing. L’unico piano è Premium: 30 giorni di prova senza carta, poi l’abbonamento si attiva con il checkout Stripe sul sito (anche dalla WebView), dopo i dati di fatturazione.
- Funzioni native: notifiche push (FCM/APNs), geolocalizzazione per ricerca saloni, navigazione sicura (domain guard).

---

## Account demo per reviewer

| Ruolo | Email | Password | Cosa testare |
|-------|-------|----------|--------------|
| Cliente B2C | *(creare account demo)* | *(password)* | Ricerca saloni, prenotazione, profilo, elimina account |
| Titolare salone Premium | *(creare account demo)* | *(password)* | Agenda, servizi, notifiche, vetrina e chat già attive sull’account |

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
| Licenza gratuita clienti | `https://www.saloniluxury.it/licenza` |

---

## Permessi

- **Posizione:** ricerca «saloni vicini» e compilazione CAP/comune (WebView + bridge nativo).
- **Notifiche push:** promemoria prenotazioni e messaggi di servizio (facoltative, richiedono consenso utente).

---

## Build release

```bash
cd luxury-app
./scripts/setup-android-release-signing.sh   # una tantum
./scripts/build-android-release.sh
flutter build ipa --release --dart-define=LUXURY_WEB_BASE_URL=https://www.saloniluxury.it
```
