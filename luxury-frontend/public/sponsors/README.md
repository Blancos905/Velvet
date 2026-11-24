# Sponsor header (Saloni Luxury)

Cartella per i **loghi ufficiali** dei marchi partner mostrati nel carousel dell’header web.

## Cosa consegnare (quando è il momento)

Per ogni sponsor:

| Campo | Esempio |
|-------|---------|
| Nome | `L'Oréal Professionnel` |
| Logo | file SVG (preferito) o PNG trasparente, sfondo libero, leggibile su header marrone scuro |
| URL sito | `https://www.esempio.it/` |
| Ordine | opzionale (1 = primo nel percorso) |

Poi l’agent aggiorna:

1. questo folder (`public/sponsors/<slug>.svg|png`)
2. l’elenco in `luxury-frontend/src/data/headerSponsors.ts` → `HEADER_SPONSORS_LIVE`
3. flag `HEADER_SPONSOR_DEMO_PLACEHOLDERS = false`

## Note asset

- Altezza utile in UI ≈ 56–64px; meglio fornire logo più grande e nitido (SVG o PNG ≥ 2×).
- Preferire versioni **chiare / oro / bianco** (l’header è scuro).
- I file `*-demo` / SVG attuali sono **placeholder di sviluppo**, non marchi reali.
