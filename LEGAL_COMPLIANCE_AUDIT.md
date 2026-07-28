# Audit conformità UE — Saloni Luxury / Luxury

**Data:** 10 giugno 2026  
**Ambito:** GDPR, ePrivacy, trasparenza recensioni (DSA-lite), requisiti store (privacy manifest / permessi), coerenza codice ↔ informative.  
**Esclusi intenzionalmente:** Stripe, pagamenti Premium, P.IVA, sede legale, REA, dati societari definitivi.

---

## Executive summary

Il monorepo è stato portato a uno **stato idoneo al pre-go-live UE** per quanto verificabile dal codice e dalla documentazione legale esistente, **salvo** i placeholder societari e l’integrazione pagamenti Stripe (rimandati per scelta di progetto).

Rischio residuo principale: **documenti organizzativi** (DPA firmati con saloni, registro trattamenti, DPIA) non verificabili dal repository.

---

## Modifiche effettuate

### 1. Cookie / ePrivacy

| Azione | File |
|--------|------|
| Gate Google Maps iframe su `SalonExplorePage` (placeholder + link Scelte privacy) | `luxury-frontend/src/pages/SalonExplorePage.tsx` |
| Gate geocodifica Nominatim (`locateByPlace`, CAP non-IT, reverse geocode, GPS) dietro consenso «Mappe e geocodifica» | `luxury-frontend/src/pages/HomePage.tsx` |
| CAP italiano risolto localmente senza API quando manca consenso maps | `luxury-frontend/src/data/searchLocations.ts` (`resolveItalianCityForCap`) |
| Aggiornata cookie policy (revoca immediata, geocodifica gated) | `luxury-frontend/src/pages/legal/CookiePolicyPage.tsx` |
| Registro server-side scelte cookie (`cookie_consent_events`, API pubblica) | `luxury/.../PublicCookieConsentController.java`, `luxury-frontend/src/lib/cookieConsent.ts` |

**Già presenti (verificati):** Unsplash gated su HomePage, `SalonLocationMapCard`, banner cookie v2, font self-hosted.

### 2. Push notifications (FCM / Firebase)

| Azione | File |
|--------|------|
| Sezioni privacy B2C/B2B/Staff su push, token FCM, Firebase, disattivazione | `PrivacyPolicy*LayeredContent.tsx`, `legalSharedCopy.ts` |
| Richiesta permesso Android 13+ via `requestPermission` | `luxury-app/lib/push/luxury_fcm_service.dart` |
| `PrivacyInfo.xcprivacy`: categoria Device ID (token push) | `luxury-app/ios/Runner/PrivacyInfo.xcprivacy` |
| Export include `pushDevices` | `MePersonalDataExportService.java` |

### 3. Account deletion

| Azione | File |
|--------|------|
| Pulizia token reset password e timestamp inbox notifiche | `ConsumerAccountService.java` (`scrubProfileIdentifiers`) |
| Comportamento esistente confermato: refresh revocati, FCM rimossi, recensioni distaccate, salon client anonimizzati | stesso file |

### 4. Export dati personali (Art. 20)

| Azione | File |
|--------|------|
| Aggiunti `pushDevices`, `platformNotifications`, metadati profilo (`planTier`, `securityRoles`, `createdAt`) | `MePersonalDataExportService.java` |
| Query export notifiche consumer | `ScheduledNotificationRepository.java` |
| Test aggiornati | `MeDataExportControllerTest.java` |

### 5. Recensioni e moderazione

| Azione | File |
|--------|------|
| Aggregati SQL/JPA escludono `hiddenAt IS NOT NULL` (search, SEO, operatori, showcase) | `ReviewRepository.java` |
| Showcase usa query pubbliche filtrate | `ReviewShowcaseService.java` |
| Testo moderazione DSA-lite + segnalazione email | `legalSharedCopy.ts`, ToS, privacy, `SalonPublicReviewsBlock.tsx` |

### 6. GDPR B2B (Art. 28)

| Azione | File |
|--------|------|
| Paragrafo sub-responsabili, assistenza diritti interessati | `LEGAL_ART28_SUBPROCESSORS_PARAGRAPH` in privacy B2B/B2C/Staff |

### 7. Minori (16+)

| Azione | File |
|--------|------|
| Checkbox obbligatoria in registrazione cliente e salone | `ClientSignupPage.tsx`, `SalonPlansPage.tsx` |

### 8. Log retention

**Verificato (nessuna modifica necessaria):** `SecurityAuditRetentionJob` esegue purge su `luxury.logging.retention-days` (default 180). Copy allineato in privacy B2B (`logRetentionDays`).

### 9. Geolocalizzazione

**Verificato:** User-Agent Nominatim identificato lato backend (sessione precedente). Frontend ora allineato al consenso cookie per geocodifica client-side.

---

## File modificati (elenco)

### Backend (`luxury/`)
- `consumer/service/ConsumerAccountService.java`
- `consumer/service/MePersonalDataExportService.java`
- `legal/cookie/**`, `publicapi/api/PublicCookieConsentController.java`
- `notification/domain/ScheduledNotificationRepository.java`
- `review/domain/ReviewRepository.java`
- `review/service/ReviewShowcaseService.java`
- `test/.../MeDataExportControllerTest.java`

### Frontend (`luxury-frontend/`)
- `src/pages/HomePage.tsx`
- `src/pages/SalonExplorePage.tsx`
- `src/pages/ClientSignupPage.tsx`
- `src/pages/SalonPlansPage.tsx`
- `src/data/searchLocations.ts`
- `src/content/legalSharedCopy.ts`
- `src/pages/legal/*` (Cookie, ToS, Privacy B2B/B2C/Staff)
- `src/components/salon/SalonPublicReviewsBlock.tsx`

### Mobile (`luxury-app/`)
- `lib/push/luxury_fcm_service.dart`
- `ios/Runner/PrivacyInfo.xcprivacy`

### Documentazione
- `LEGAL_COMPLIANCE_AUDIT.md` (questo file)

---

## Problemi risolti

1. **Iframe Google Maps su pagina studio salone** caricato senza consenso cookie.
2. **Geocodifica Nominatim** invocata da HomePage senza consenso «Mappe e geocodifica».
3. **Rating medio pubblico** includeva recensioni nascoste in query aggregate.
4. **Export GDPR incompleto** (mancavano device push e inbox notifiche).
5. **Delete account** lasciava token reset password e ack inbox.
6. **Push FCM** non descritto in privacy / Privacy Manifest iOS.
7. **Android 13+** senza richiesta runtime notifiche in Flutter.
8. **Moderazione recensioni** poco trasparente verso utenti (DSA-lite).
9. **Registrazione** senza conferma età minima in UX (solo testo legale).

---

## Problemi non risolvibili dal codice (azione manuale)

| Voce | Priorità | Note |
|------|----------|------|
| DPA Art. 28 firmati con ogni salone partner | Alta | Template/contratto fuori repo |
| Registro trattamenti / DPIA | Alta | Documentazione organizzativa |
| Play Console Data Safety ↔ testi privacy | Media | Allineare manualmente dopo deploy |
| App Store Privacy Nutrition Labels | Media | Verificare con build finale |
| `.env.production` con dati societari reali | Alta | Placeholder lasciati per scelta |
| Caselle email attive (SPF/DKIM/DMARC) | Alta | Infra Aruba |
| SMTP produzione per email transazionali | Media | Oggi inbox + log |

---

## Esclusi intenzionalmente

- **Stripe** e qualsiasi copy su pagamenti, abbonamenti Premium, chargeback
- **P.IVA**, sede legale, REA, dati societari definitivi (`legalEntity.ts` placeholder invariati)

---

## Verifiche eseguite

| Check | Esito |
|-------|-------|
| `npm run test` (luxury-frontend) | 38 test PASS |
| `npm run build` (luxury-frontend) | PASS (dopo fix import) |
| `./mvnw test -Dtest=MeAccountControllerTest,MeDataExportControllerTest,PublicCookieConsentControllerTest` | PASS |
| `./go-live-check.sh` | 0 FAIL (WARN attesi infra/env) |

---

## Conformità residua stimata

| Area | Stato |
|------|-------|
| GDPR diritti (accesso, cancellazione, portabilità) | **Pronto** nel codice |
| ePrivacy cookie/mappe/editoriali | **Pronto** |
| Push FCM disclosure | **Pronto** (verificare store console) |
| Recensioni / moderazione | **Pronto** (moderazione admin base) |
| Art. 28 B2B (copy) | **Pronto** (manca DPA contrattuale reale) |
| Go-live legale completo | **Bloccato** solo da P.IVA/sede e Stripe (esclusi) |
