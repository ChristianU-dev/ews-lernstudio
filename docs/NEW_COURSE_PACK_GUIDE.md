# Leitfaden: Neues Studienfach als Course-Pack anlegen (`NEW_COURSE_PACK_GUIDE.md`)

Das Lernstudio ist modular aufgebaut, sodass dieselbe Oberfläche (1-Seiten-Ankerblätter, Laut-Erzähl-Check, Wissensgraph, FSRS-Trainer, Wahlformat-/Klausur-Simulator, NotebookLM-Podcast-Hub) ohne UI-Umbau für weitere Prüfungen genutzt werden kann – z. B. **Allgemeine Pädagogik**, **Schulpädagogik**, **Grundschuldidaktik**, **Kunst** oder **Sport**.

## Schritt-für-Schritt in 4 Schritten

1. **Neuen Ordner anlegen**:
   Erstelle `content/courses/<neues-fach>/` (z. B. `content/courses/schulpaedagogik/`).

2. **PDFs lokal in 300 DPI extrahieren**:
   Lege die neuen Skript-PDFs bereit und nutze `extract_pdf_to_structured_bundle(pdf_path, out_dir)` aus `03_ux_maind_design_paket/extract_pdfs_local.py`. Kopiere extrahierte Abbildungen nach `public/courses/<neues-fach>/figures/original/`.

3. **JSON-Dateien nach Schema erstellen**:
   Orientiere dich an `content/courses/ews-psychologie/SCHEMA_SPEC.md`:
   - `manifest.json` (Fachname, Teilgebiete & Farbcodes)
   - `domain_<id>.json` (Einheiten mit `page_label`, `definitions`, `sections`, `empirical_studies`, `custom_visual`, `grundschule_praxis`, `laut_erzaehl_check`)
   - `flashcards.json`, `exam_bank.json`, `operators.json`, `confusion_pairs.json`, `knowledge_graph_curated.json`

4. **Registrieren & Prüfen**:
   Trage das neue Paket in `src/lib/coursePackRegistry.js` in `BUILTIN_PACKS` ein und prüfe es mit `validateCoursePack(pack)` (`npm test` & `npm run build`).
