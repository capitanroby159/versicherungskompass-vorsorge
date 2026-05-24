# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

No build step — open directly in a browser:

```
index.html   → Hauptapp (7-Schritte-Wizard)
budget.html  → Standalone Haushaltsbudget-Tool
```

For local development, a simple HTTP server avoids CORS issues with file loading:

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

## Architecture

### Vanilla HTML/CSS/JS — kein Framework, kein Build-Tool

Alle drei Dateien sind selbstständig. Kein npm, kein Bundler, keine Tests.

**`index.html`** enthält:
- Inline-CSS für komponentenspezifische Styles am Seitenanfang
- Die gesamte HTML-Struktur der 7 Schritte als `<div class="section-panel" id="panel-*">`
- `<template>`-Tags für dynamisch generierte Listeneinträge (AG, PK, UVG, KTG, UVGZ, Priv, Immo, Hypo)
- Modal-Overlay für Berater-Verwaltung und LFZ-Info

**`js/app.js`** ist ein einziges Skript mit klar getrennten Modulen (Objekt-Literals):
- `DateHelper` — CH-Datumsformat TT.MM.JJJJ, Alter-/Dienstjahre-Berechnungen
- `Berater` — CRUD gegen `localStorage` (`vk_berater_liste`), Modal-Rendering
- `DataManager` — `collect()` liest alle DOM-Felder → JSON; `populate()` restauriert JSON → DOM
- `App` — Stepper-Navigation, aktiver Schritt, globales Init
- `Toast` — Kurzmeldungen

Globale Funktionen (nicht in einem Modul): `addArbeitgeber`, `addPKVertrag`, `addUVGVertrag`, `addKTGVertrag`, `addUVGZVertrag`, `addPrivVertrag`, `addImmobilie`, `addKonto`, `addWertschrift`, `addVorsorge`, `addUebriges`, `addKind` — jede klont den passenden `<template>` und appended an eine `dynamic-list`.

**`css/styles.css`** — gemeinsames Design System mit CSS-Custom-Properties (Farben, Spacing, Typo, Shadows). Primärfarbe forest-green `#2E3D32`, Akzent koralle `#D4703A`. Fonts: Playfair Display (Headings) + DM Sans (Body) via Google Fonts.

**`css/budget-standalone.css`** — Budget-spezifische Klassen (`.budget-table`, `.budget-row`, `.send-steps`). Sind auch direkt in `budget.html` als `<style>`-Block enthalten, damit `budget.html` ohne externe CSS-Datei funktioniert.

### Datenspeicherung

- **Session-Daten**: `DataManager.collect()` → JSON → Browser-Download (kein Server-Upload)
- **Laden**: User wählt die gespeicherte JSON-Datei, `DataManager.populate()` baut DOM neu auf
- **Berater-Liste**: `localStorage` (Key `vk_berater_liste`), wird in Beraterliste-Modal verwaltet

### Dynamische Listen

Jede Listenkategorie folgt dem gleichen Muster:
1. `<template id="xyz-template">` mit Platzhaltern `{ID}` und `{PERSON}`
2. `addXyz(person, data?)` klont Template, ersetzt `{ID}`/`{PERSON}`, appended an `#p1-xyz-list`
3. Badge `#p1-xyz-count-badge` zeigt Anzahl
4. `removeVertrag('xyz', id, person)` entfernt das Element aus dem DOM

### Schweizer Fachdomäne

- AHV/BVG/UVG/KTG/UVGZ/3a/3b/FZL — Schweizer Sozialversicherungs- und Vorsorgesystem
- Lohnangaben in CHF (Formatierung via `fmtCHF()`, Parsing via `parseCHF()`)
- Sämtliche UI-Texte auf Deutsch (Schweizer Hochdeutsch)
- UVG-Lohnmaximum: CHF 148'200 (wird in `updateUVGTotal()` erzwungen)

### Phasenplan

Schritte 4–7 sind aktuell Platzhalter:
- **Schritt 4** (EU-Analyse) → Phase 6
- **Schritt 5** (Todesfall) → Phase 7
- **Schritt 6** (Pension) → Phase 8
- **Schritt 7** (Zusammenfassung/Export) → Phase 10–12
