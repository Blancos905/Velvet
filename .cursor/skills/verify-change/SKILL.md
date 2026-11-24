---
name: verify-change
description: >-
  Verifica il modulo toccato dopo ogni modifica di codice, prima di dichiarare
  il lavoro finito. Esegue i test del comportamento toccato in luxury e
  luxury-frontend, il typecheck TypeScript, dart analyze sui file Flutter
  modificati, Ruff sul Python toccato ed ESLint sul JavaScript o TypeScript
  toccato. Svuota .cursor/hooks/.verify-pending al termine.
---

# Verifica del cambiamento

Esegui questa skill dopo ogni modifica di codice, prima di dichiarare il lavoro finito. Comandi solo sul modulo toccato. Se un comando non può partire, dillo. Non sostituirlo con una build APK.

## Path

Se `.cursor/hooks/.verify-pending` esiste e non è vuoto, verifica quei path (un path per riga). Altrimenti verifica i file modificati in questo compito. Dopo i controlli, svuota il file.

Immagini, screenshot e i path fuori dal repo non sono un modulo. Se in coda non resta nessun sorgente (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.java`, `.dart`, `.py`) né uno stile del frontend (`.css`, `.scss`), svuota il file e fermati. Non elencare npm, tsc, ESLint, Maven, dart analyze o Ruff come controlli non partiti.

## luxury-frontend

Il pacchetto ha `npm test` (vitest). Da `luxury-frontend`:

```bash
npm test
```

Se sono cambiati file `.ts` o `.tsx`, i `tsconfig` non sono una solution (niente project references). Da `luxury-frontend`:

```bash
npx tsc --noEmit --pretty false
```

Se è cambiato `vite.config.ts`, aggiungi:

```bash
npx tsc --noEmit --pretty false -p tsconfig.node.json
```

ESLint sui file toccati, dalla root del repo:

```bash
npx --prefix luxury-frontend eslint -c eslint.config.mjs -- file1 file2
```

## luxury-app

Sui file `.dart` modificati, da `luxury-app`:

```bash
dart analyze percorso/del/file.dart
```

Non compilare un APK.

## luxury

Test del comportamento toccato, non l’intera suite se il cambiamento è locale. Da `luxury`:

```bash
./mvnw -Dtest=ClasseTest test
```

I test usano H2 in memoria (`luxury/src/test/resources/application.properties`). Non avviare Postgres né Redis per questo.

## Python

Non c’è una venv di modulo né una suite pytest. Non lanciare pytest. Sui file `.py` toccati, dalla root:

```bash
scripts/dev-ruff.sh check percorso/file.py
```

`scripts/dev-ruff.sh` usa `python3` se importa i moduli, altrimenti `python3.12` (su questo Mac `python3` esce con codice 69 per la licenza Xcode). Crea da solo la cache `.cache/ruff-venv` e ci installa Ruff. Non chiedere `sudo` e non accettare la licenza Xcode al posto dell’utente. La configurazione è `ruff.toml`. Se anche quello script non parte, dillo. Non aggiungere Ruff a dipendenze di produzione: questo repo non ne ha.

## Altri pacchetti Node

`luxury/deploy/whatsapp-bridge` e `devtools/codegraph` non hanno uno script `npm test`. Se il cambiamento è solo lì, dillo. Sui file JavaScript toccati usa lo stesso ESLint della root.

## Chiusura

Riporta i comandi e l’esito. Se un comando non è partito, scrivilo. Poi svuota `.cursor/hooks/.verify-pending`.
