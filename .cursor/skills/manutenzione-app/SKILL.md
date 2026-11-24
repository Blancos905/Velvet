---
name: manutenzione-app
description: >-
  Esegue la manutenzione completa dell'app Luxury (Flutter in luxury-app/):
  inventario CodeGraph di tutti i moduli Dart, WebView shell, domain guard,
  Free/Premium policy, bridge JS, FCM, geolocation, deeplink, allineamento
  guards con frontend. Usa quando l'utente dice «manutenzione app»,
  «manutenzione flutter», «manutenzione mobile», «app maintenance»,
  «controllo app», «revisione app» o «scan app».
---

# Manutenzione app Luxury (Flutter)

## Trigger (verbatim)

Attiva questo workflow quando l'utente dice: **manutenzione app**

Sinonimi ammessi: manutenzione flutter, manutenzione mobile, app maintenance, controllo app, revisione app, scan app.

## Obiettivo

Controllare l’app **in profondità** (ogni file `luxury-app/lib/**/*.dart`, asset guards, bridge JS, sicurezza navigazione) usando CodeGraph + script + checklist, e **correggere automaticamente** tutto ciò che è sicuro, locale e non distruttivo. Non limitarsi a `flutter analyze`.

## Principio architetturale

> Shell WebView che carica `luxury-frontend`. **Zero logica UI duplicata.**
> Vincoli piano Free nativi: paywall, path, nav via asset JSON + bridge.
> Backend resta fonte di verità per entitlement/API.

## Inventario di riferimento (baseline)

| Stereotipo | ~Count | Path |
|------------|--------|------|
| Dart `lib/` | 31 | `luxury-app/lib/**` |
| Test | 3 | `luxury-app/test/` |
| LOC lib (ordine) | ~3800 | shell domina |
| Asset guards | 1 | `assets/luxury_subscription_guards.json` |

Moduli: `main`, `config`, `shell`, `security`, `free`, `auth`, `session`, `push`, `geolocation`, `deeplink`, `dev`, `theme`, `webview`.

## Workflow obbligatorio

```
Manutenzione app — progress:
- [ ] 0. Sync CodeGraph
- [ ] 1. Script ./luxury-app-maintenance.sh
- [ ] 2. CodeGraph blast radius (simboli critici)
- [ ] 3. Checklist modulo-by-modulo (CHECKLIST.md)
- [ ] 4. Allineamento FE guards + store/security
- [ ] 5. Report finale
```

### 0. Sync CodeGraph

```bash
devtools/codegraph/node_modules/.bin/codegraph sync
devtools/codegraph/node_modules/.bin/codegraph status
```

### 1. Script automatico

```bash
./luxury-app-maintenance.sh
# varianti: --fast · --smells · --codegraph · --test · --help
```

### 1-bis. Correzioni automatiche obbligatorie

Quando l'utente invoca **manutenzione app**, non fermarti al report:

1. correggi automaticamente wiring Flutter, bridge JS, guards, config, test e doc locali che puoi sistemare in sicurezza;
2. dopo ogni fix sostanziale rilancia i check pertinenti (`./luxury-app-maintenance.sh --smells`, `flutter analyze`, `flutter test`);
3. lascia nel report finale solo i problemi residui che richiedono device reali, store setup, segreti o decisioni prodotto.

### 2. Blast radius obbligatorio (CodeGraph)

| Simbolo | Perché |
|---------|--------|
| `FreeAccountWrapper` | entry UI da `main` |
| `LuxuryWebShell` | WebView hub (~tutto passa qui) |
| `LuxuryDomainGuard` | allowlist host (store security) |
| `LuxuryAppConfig` | `LUXURY_WEB_BASE_URL`, LAN/dev |
| `LuxurySubscriptionGuards` | policy Free da JSON asset |
| `LuxuryFreePlanPolicy` | facade policy (+ test) |
| `LuxuryNativeAppWebBridge` | flag native shell → FE |
| `LuxuryFreeWebBridge` | path/nav Free in WebView |
| `LuxuryPaywallWebBridge` / overlay / dialog | paywall nativo |
| `LuxuryProfileMenuWebBridge` | hub Profilo nativo |
| `LuxuryFcmService` / FCM web bridge | push → FE |
| `LuxurySessionController` | sync JWT/piano da WebView |
| `LuxuryGeolocationWebBridge` | GPS nativo |
| `LuxuryAppLinkListener` | Universal/App Links |
| `LuxuryJwt` / `SalonPlanTier` | parse ruolo/piano |

### 3. Modulo-by-modulo

Segui **tutta** [CHECKLIST.md](CHECKLIST.md). Per ogni modulo: inventaria file → `codegraph explore` → verifica no-UI-duplicata, domain guard, Free path, bridge channel names, FCM injection, deeplink.

### 4. Controlli trasversali (ogni virgola)

| Check | Criterio FAIL |
|-------|----------------|
| UI duplicata | Nuove schermate Flutter che replicano pages FE (tranne paywall/overlay/menu nativi documentati) |
| Domain guard | Navigazione a host non allowlistati / HTTP chiaro in release prod |
| Free policy | Path Premium aperti a Free owner senza paywall |
| Guards sync | `luxury_subscription_guards.json` ≠ semantica `subscription-guards.ts` FE |
| Bridge | Channel JS non registrato in `LuxuryWebShell` ma usato nel bridge |
| Session | Piano/ruolo nativo che bypassa backend entitlement |
| Secrets | Keystore/`key.properties` committati o secret in `lib/` |
| Store | Account deletion / domain guard regressi (vedi audit store) |
| UA | User-Agent senza `SaloniLuxuryApp` se FE lo richiede |

### 5. Report finale (template)

```markdown
# Manutenzione app — report

**Data:** YYYY-MM-DD
**CodeGraph:** …
**Script:** PASS | FAIL

## Executive summary
…

## FAIL
- …

## WARN
- …

## PASS per modulo
| Modulo | Esito | Note |

## Blast radius revisito
| Simbolo | Callers | Test | Note |

## Azioni consigliate
1. …
```

## Cosa non fare

- Non implementare feature prodotto in Dart se appartengono al FE
- Non allentare `LuxuryDomainGuard` «per comodità» in release
- Non modificare guards JSON senza aggiornare FE `subscription-guards.ts` (e viceversa)
- Non fare commit automatici, ma **sì** a fix automatici locali e sicuri durante la manutenzione

## Risorse

- Checklist: [CHECKLIST.md](CHECKLIST.md)
- Script: `./luxury-app-maintenance.sh`
- Master: `.cursor/rules/luxury-project-master.mdc` (sezione Flutter)
- FE allineamento: `luxury-frontend/src/lib/subscription-guards.ts`, `nativeAccountHubPaths.ts`
- Store: `docs/APP_STORE_REVIEW_NOTES.md`, `luxury-audit.sh --store`
