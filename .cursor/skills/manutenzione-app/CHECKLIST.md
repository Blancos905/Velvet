# Checklist manutenzione app — modulo by modulo

Usare insieme a `SKILL.md` e `./luxury-app-maintenance.sh`.
Per ogni riga: `codegraph explore "<Simbolo>"`, poi spunta.

---

## entry / config

| Simbolo / file | Verifica | □ |
|----------------|----------|---|
| `main.dart` / `LuxuryApp` | `WebViewPlatform` Android/iOS; `LuxurySubscriptionGuards.load()` prima di `runApp` | □ |
| `FreeAccountWrapper` | unica root UI; tema Premium unificato | □ |
| `LuxuryAppConfig` | base URL da `--dart-define=LUXURY_WEB_BASE_URL`; LAN/localhost/10.0.2.2; UA base | □ |
| `LuxurySubscriptionGuards` | load asset; `isPathAllowed`; inject script WebView; **10+ callers** | □ |
| `assets/luxury_subscription_guards.json` | versioned; path Free/blocked; messaggi; in `pubspec.yaml` assets | □ |
| Allineamento FE | confronta con `luxury-frontend/src/lib/subscription-guards.ts` | □ |

---

## shell (WebView hub)

| Simbolo | Verifica | □ |
|---------|----------|---|
| `LuxuryWebShell` | carica FE; UA `SaloniLuxuryApp`; navigation delegate; inject bridges | □ |
| `_onNavigationRequest` | domain guard + Stripe + Maps allow; prevent resto | □ |
| Canali JS registrati | `LuxuryNativeGeolocation`, `LuxuryProfileMenu`, `LuxuryPaywall` | □ |
| Inject FCM token / tap push | bridge verso FE | □ |
| `LuxuryShellLoadingOverlay` | loading iniziale | □ |
| Error UI | messaggio «Impossibile caricare» senza crash loop | □ |

---

## Free / paywall nativo

| Simbolo | Verifica | □ |
|---------|----------|---|
| `LuxuryFreePlanPolicy` | delega a guards; test `luxury_free_plan_policy_test.dart` | □ |
| `LuxuryFreeWebBridge` | blocca path/nav Free **solo** owner Free in app; SPA navigate senza reload | □ |
| `LuxuryPaywallOverlay` / `LuxuryPremiumPaywallDialog` | paywall nativo, CTA Premium | □ |
| `LuxuryPaywallWebBridge` | channel `LuxuryPaywall` | □ |
| Path JSON | `alwaysAllowed` / `accountAllowed` / `blockedPathPrefixes` coerenti prodotto | □ |
| Nav labels | `allowedNavLabels` / `blockedNavLabels` | □ |

**FAIL prodotto:** Free owner raggiunge `/account/chat`, staff, brand, stats senza paywall.

---

## security

| Simbolo | Verifica | □ |
|---------|----------|---|
| `LuxuryDomainGuard` | allowlist host da base URL + prod domains; LAN solo se `isLocalDev` | □ |
| Maps exception | Google Maps host consentiti in modo stretto | □ |
| Stripe exception | `*.stripe.com` solo checkout/portal | □ |
| Cleartext | HTTP solo LAN/dev documentato; release → HTTPS | □ |
| Nessun bypass | link esterni non aprire WebView su host arbitrari | □ |

**Critico store:** regressione domain guard = FAIL.

---

## auth / session

| Simbolo | Verifica | □ |
|---------|----------|---|
| `LuxuryJwt` | parse claim ruoli; test `luxury_jwt_test.dart` | □ |
| `SalonPlanTier` | BASE/PREMIUM (+ legacy) | □ |
| `LuxurySalonSession` | modello sessione | □ |
| `LuxurySessionController` | `syncFromWebView` via JS; errori → `debugPrint` ok | □ |
| No trust cieco | policy Free usa sessione ma entitlement Premium resta backend | □ |

---

## bridges JS (inventario obbligatorio)

| Bridge | Channel | Ruolo | □ |
|--------|---------|-------|---|
| `LuxuryNativeAppWebBridge` | (script flag) | FE sa di essere in app nativa | □ |
| `LuxuryFreeWebBridge` | inject | path/nav Free | □ |
| `LuxuryPaywallWebBridge` | `LuxuryPaywall` | apri paywall | □ |
| `LuxuryProfileMenuWebBridge` | `LuxuryProfileMenu` | sheet hub Profilo | □ |
| `LuxuryFcmWebBridge` | inject | token + tap push | □ |
| `LuxuryGeolocationWebBridge` | `LuxuryNativeGeolocation` | GPS | □ |

Ogni channel usato nel JS **deve** essere `addJavaScriptChannel` in `LuxuryWebShell`.

---

## profile menu nativo

| Simbolo | Verifica | □ |
|---------|----------|---|
| `LuxuryProfileMenuSheet` / `LuxuryProfileMenuItem` | hub: Profilo, Assistenza, Notifiche, … | □ |
| Path hub | allineati a FE `nativeAccountHubPaths` | □ |
| Logout | cleanup JWT + DELETE FCM device se documentato | □ |

---

## push FCM

| Simbolo | Verifica | □ |
|---------|----------|---|
| `LuxuryFcmService` | init Firebase; token; `onMessageOpenedApp`; iOS APNs note | □ |
| `LuxuryFcmWebBridge` | inject token + pending open al FE | □ |
| Cold start / background | tap push → popup FE | □ |
| Logout | revoke/delete token prima clear sessione | □ |
| No log token in release | `debugPrint` token solo debug (WARN se sempre on) | □ |

---

## geolocation / deeplink / webview / theme / dev

| Simbolo | Verifica | □ |
|---------|----------|---|
| `LuxuryNativeGeolocationService` | permessi + geolocator | □ |
| `LuxuryGeolocationWebBridge` | override `navigator.geolocation` | □ |
| `LuxuryAppLinkListener` | Universal/App Links → WebView SPA path | □ |
| `LuxuryIosWebViewKeyboard` | iOS keyboard dismiss fix | □ |
| `luxury_free_theme` / `luxury_premium_shell_theme` | tema shell (non UI prodotto) | □ |
| `LuxuryDevStackGate` / health | solo dev: attende Vite+Spring | □ |

---

## piattaforme / store / secrets

| Check | Verifica | □ |
|-------|----------|---|
| `pubspec.yaml` | asset guards; deps webview/firebase/app_links | □ |
| iOS | ATS, associated domains, push capability (review notes) | □ |
| Android | cleartext config solo debug; intent filters | □ |
| `key.properties` / keystore | **non** in git; solo `*.example` | □ |
| Account deletion | in-app path legale (FE) raggiungibile da app | □ |
| Icon/splash assets | presenti in `assets/` | □ |

---

## test gap noti

| Area | Stato | □ |
|------|-------|---|
| `LuxuryFreePlanPolicy` / guards | ha test | □ |
| `LuxuryJwt` | ha test | □ |
| `widget_test` | smoke | □ |
| `LuxuryDomainGuard` | **no covering tests** → WARN priorità alta | □ |
| `LuxuryWebShell` / bridges | **no covering tests** → WARN | □ |
| `LuxuryFcmService` | **no covering tests** → WARN | □ |

---

## Anti-pattern (FAIL se nuovi)

1. Schermata Flutter che copia una page React (agenda, chat, clienti, …)
2. Fetch API business da Dart invece che dalla SPA
3. Allowlist host aperta (`*` / http generico in release)
4. Free path Premium senza paywall
5. Bridge channel non registrato
6. Guards JSON modificati senza sync FE (o viceversa)
7. Log di access token / FCM token in build release

---

## Inventario file `lib/` (spunta copertura review)

| Path | □ |
|------|---|
| `main.dart` | □ |
| `config/luxury_app_config.dart` | □ |
| `config/luxury_subscription_guards.dart` | □ |
| `shell/free_account_wrapper.dart` | □ |
| `shell/luxury_web_shell.dart` | □ |
| `shell/luxury_*_bridge.dart` / paywall / profile / loading / theme styles | □ |
| `security/luxury_domain_guard.dart` | □ |
| `free/luxury_free_plan_policy.dart` | □ |
| `auth/luxury_jwt.dart` / `salon_plan_tier.dart` | □ |
| `session/*` | □ |
| `push/*` | □ |
| `geolocation/*` | □ |
| `deeplink/*` | □ |
| `dev/*` | □ |
| `theme/*` | □ |
| `webview/luxury_ios_webview_keyboard.dart` | □ |
| `assets/luxury_subscription_guards.json` | □ |
