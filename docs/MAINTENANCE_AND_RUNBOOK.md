# Wartungs- & Betriebshandbuch (`MAINTENANCE_AND_RUNBOOK.md`)

## 1. Wichtigste Befehle im Alltag

*(Hinweis für Windows Smart App Control: Alle Skripte laufen über PowerShell, `node` und `python` komplett ohne `.bat`- oder `.cmd`-Wrapper; in `.npmrc` ist `script-shell=powershell.exe` und in `package.json` `@rollup/wasm-node` hinterlegt.)*

| Aufgabe | Befehl |
| :--- | :--- |
| Lokalen Entwicklungsserver starten | `npm run dev` |
| Produktions-PWA bauen (`dist/`) | `npm run build` |
| Alle Word-Skripte (`.docx`) & Anki-Decks (`.apkg`) neu erzeugen | `npm run generate:exports` |
| Automatisierten Vollständigkeits-Audit ausführen | `npm run audit:content` |
| Unit-Tests (`vitest` + `pytest`) ausführen | `npm test` sowie `python -m pytest` |
| Dual-Viewport Browser-Tests (16:10 HiDPI PC + iPhone) | `npm run test:e2e` |
| Komplette System-Diagnose | `npm run doctor` |

---

## 2. Typische Wartungsszenarien

### A. Ein neues Skript-Update (z. B. neues Semester-PDF) einpflegen
1. Neues PDF in `01_skripte/` ablegen.
2. `python 03_ux_maind_design_paket/extract_pdfs_local.py` ausführen (extrahiert Texte, Fettdruck, Studien-Marker und 300-DPI-Originalgrafiken lokal).
3. Neue/aktualisierte Abschnitte in `content/courses/ews-psychologie/parts/` ergänzen.
4. `python scripts/build_all_deliverables.py` und `python scripts/audit_completeness.py` ausführen – aktualisiert automatisch alle `.docx`-Skripte, `.apkg`-Decks, `public/exports/` und `docs/AUDIT_REPORT.md`.
5. `npm run build` und `npm run doctor` prüfen, committen und auf `main` pushen (löst automatisch das GitHub-Pages-Deployment aus).

### B. Fehlerbehebung (`npm run doctor`)
Falls etwas fehlt oder eine JSON-Datei versehentlich ungültig bearbeitet wurde, zeigt `npm run doctor` dateigenau an, welche Datei oder welcher Export betroffen ist.

### C. Lokales Backup & Wiederherstellung
Unter **„Downloads & Sync → Lernstand als Datei sichern“** kann jederzeit eine vollständige `.json`-Sicherung aller Lernstände, FSRS-Intervalle und persönlichen Notizen exportiert und auf jedem Gerät wieder eingespielt werden.
