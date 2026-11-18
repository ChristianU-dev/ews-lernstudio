# Projektauftrag: Adaptives EWS-Psychologie Lernstudio (PC & iPhone) + Visuelle Skripte

## 0. Sofort-Start: Bibliotheken gleich zu Beginn installieren & 100 % Ohne API-Key arbeiten!
Du arbeitest lokal im isolierten Projektordner auf dem Windows-PC der Nutzerin im autonomen Modus:
1. **KEIN externer API-Key nötig!**:
   - Frage NIEMALS nach einem OpenAI-, Uni- oder Gemini-API-Key und warte auf keinen Key!
   - Alle PDFs in `01_skripte/` und `02_pruefungsmaterial/` sind digital gesetzte PDFs. Führe direkt `03_ux_maind_design_paket/extract_pdfs_local.py` (`PyMuPDF` / `fitz`) aus, um sämtliche Texte, Formatierungen (**fett**, *kursiv*, <u>unterstrichen</u>), Tabellen und eingebetteten Originalgrafiken 100 % lokal und verlustfrei zu extrahieren. Die fachliche Strukturierung, Verdichtung, Schaubild-Generierung und Aufgabenerstellung übernimmst **du selbst direkt als Antigravity-Agent**!
2. **Gleich am Anfang ALLE externen Bibliotheken herunterladen & installieren**:
   - Prüfe kurz im Terminal `node -v`, `python --version` und `git --version` (falls auf dem frischen PC etwas fehlt, installiere es via `winget install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements` bzw. `Python.Python.3.12` / `Git.Git`).
   - Initialisiere sofort das Projekt und installiere **direkt in Phase 1 alle benötigten Pakete auf einen Schlag**, damit danach alles ruckelfrei lokal bereitsteht:
     - Python-Pakete aus `03_ux_maind_design_paket/requirements.txt` (`pip install -r ...`)
     - Alle externen Design- & App-Bibliotheken aus `03_ux_maind_design_paket/package.ux_maind_stack.json` (`@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-switch`, `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`, `@radix-ui/react-popover`, `cmdk`, `vaul`, `sonner`, `lucide-react`, `@xyflow/react`, `@dagrejs/dagre`, `@tanstack/react-table`, `ts-fsrs`, `dexie`, `@supabase/supabase-js`, `vite-plugin-pwa`, `vitest`, `@playwright/test`) + `npx playwright install chromium`.
   - Initialisiere lokal ein sauberes Git-Repository (`git init -b main`) und verbinde es bei aktivem `gh auth status` mit einem privaten GitHub-Repo `ews-lernstudio` (ansonsten sauber lokal committen und den 1-Zeilen-Push in `SETUP_UND_LOGINS.md` notieren).
   - **Sicherheit**: Arbeite ausschließlich innerhalb dieses Projektordners; verändere niemals Dateien außerhalb dieses Arbeitsverzeichnisses.

---

## 1. Voller Wissensabgleich vor der Umsetzung
Da du keinen Zugriff auf vorangegangene Gemini-Chats hast, lies unmittelbar während/nach der Paket-Installation diese Referenzdokumente vollständig durch:
1. `00_LEARNER_PERSONA_UND_DIDAKTIK_PROFIL.md` *(komplettes Lernprofil der Nutzerin, Hauptfach Kunst, Didaktikfach Sport, visuelles Seitengedächtnis, lautes Nacherzählen, Start-Hürde, 300-Seiten-Ausdruck)*
2. `00_PRUEFUNGSWISSEN_UND_QUELLEN.md` *(alle Spielregeln zum bayerischen Wahlformat, 75%-Offen-Anteil, 0,5-Pkt.-MC, Operatoren & Zitierweise)*
3. `02_pruefungsmaterial/09_WEB_QUELLEN_UND_LINKS.json` *(weiterführende Web-Links zu bayerischen Grundschul-Klausuren an Uni Würzburg & Uni Regensburg – rufe diese bei Bedarf aktiv ab!)*
4. `03_ux_maind_design_paket/` *(Christians externes UI-Bibliothekspaket + fertige Komponenten `ui.jsx`, `StudioPrefsProvider.jsx`, `studio_complete_theme.css` und `widescreen_graph_layout.js`)*

Du hast volle ingenieurtechnische und didaktische Freiheit, über diese Bausteine hinaus kluge Entscheidungen zu treffen, um die bestmögliche Lernumgebung für sie zu erschaffen.

---

## 2. Verlustfreie Aufbereitung der 3 Skripte (Einzeltrennung + Vernetzung)
- Behandle die drei PDFs in `01_skripte/` (*A: Lernen und Lehren*, 108 S.; *B: Entwicklungspsychologie*, 82 S.; *C: Diagnostik*, 73 S.) als **drei strikt getrennte Einheiten**, ergänze aber explizite Querverweise/Theorie-Brücken zwischen ihnen.
- **Null-Auslassungs-Gebot**: Komprimiere Redundanzen in klare, strukturierte Stichpunkte – lasse aber **keine Definition, keinen Autor mit Jahreszahl, kein Modell, keine empirische Studie (inkl. PISA 2022 & 2025) und keine relevante Original-Grafik** weg!

---

## 3. Original UX-mAInd Design-System & Perfektes Dual-Layout (PC + iPhone)
Übernimm zwingend das Design-Paket aus `03_ux_maind_design_paket/` (`@radix-ui/*` über `ui.jsx`, `vaul`, `sonner`, `cmdk`, `lucide-react`, `@xyflow/react`, `StudioPrefsProvider.jsx` für **Light- und Dark-Mode** sowie `studio_complete_theme.css`):

### Auf dem PC / Laptop (`>= 960px` Widescreen-Werkbank)
- Ruhige, ablenkungsfreie Oberfläche mit Seitenleiste, `Ctrl+K`-Befehlspalette (`cmdk`) und drei festen Themen-Farbcodes (A Blau, B Smaragdgrün, C Bernstein).
- **Visuelle 1-Seiten-Ankerblätter** für ihr fotografisches Seitengedächtnis: Knappe Stichpunkte, Definitions-Box, Empirie-Steckbrief, eingebettete Originalgrafik + neu erzeugtes Schaubild/Zeitstrahl/Vergleichstabelle, **exakte Original-Seitenzahl (`Original-Skript S. X–Y`)** für ihren gedruckten 300-Seiten-Ordner, digitale Markier-/Notizfunktion, Grundschul-Praxisbox (**Kunst & Sport**) und **„Laut-Erzähl-Check“** (5 Ankerbegriffe).
- Großer interaktiver **Karten-Wissensgraph (`@xyflow/react` + `@dagrejs/dagre`)** mit Seiten-Inspektor.

### Auf ihrem iPhone (`< 960px` & Homescreen-PWA)
- **Echtes natives iOS-App-Gefühl**: PWA-Manifest (`display: "standalone"`, `viewport-fit=cover`), Safe-Area-Abstände, **0 Pixel horizontaler Overflow**, `>= 44px` Daumen-Buttons, `16px` Inputs (kein ungewollter iOS-Safari-Zoom).
- **Fixierte Frosted-Glass-Bottom-Navigation** statt Sidebar; Details öffnen als geschmeidiges **Bottom-Sheet (`vaul`)**.
- **100 % Offline im Zug** (`vite-plugin-pwa` + `Dexie`/IndexedDB) + **Sperrbildschirm-Audioplayer (`navigator.mediaSession`)** für ihre Sofa- und Zug-Podcasts + wischbare **FSRS-Karten (`ts-fsrs`)**.

---

## 4. Alle Liefergegenstände (Deliverables)
1. **Drei visuelle Word-Lernskripte (`.docx`) + 1-Seiten-Kapitelübersichten + 3 Anki-Decks (`.apkg`) in `exports/`**:
   - `Lernskript_A_Lernen_und_Lehren.docx`, `Lernskript_B_Entwicklungspsychologie.docx`, `Lernskript_C_Diagnostik.docx` (inkl. aller Original-Abbildungen + neu mit Python/SVG gerenderten Schaubildern, Alters-Zeitstrahlen & Vergleichstabellen, Original-Seitenangaben, Querverweisen, Grundschul-Unterrichtsbeispielen für **Kunst & Sport** und Laut-Erzähl-Checks).
   - Drei direkt in Anki importierbare `.apkg`-Dateien (`genanki`) mit Unterstapeln und Original-Seitenverweis.
2. **Adaptive, Mitlernende & Wiederverwendbare Web-App**:
   - Einstellbares Prüfungsdatum im Februar; **Sofa-Podcast-Start** gegen die Anfangshürde; schnelles **30–35 Min. Kern-Tagesziel** ohne rote Überfälligkeits-Warnungen nach Pausentagen + motivierende **„+12-Min.-Bonus-Etappen“** im Flow.
   - **NotebookLM Sofa-Podcast-Hub**: Dynamischer 1-Klick-Prompt-Generator (abgestimmt auf Kapitel, Kunst/Sport & ihre aktuellen Schwachstellen) + Drag-and-Drop-MP3-Ablage mit Offline-Player und Fortschrittskopplung.
   - **Staatsexamens-Simulator (Wahlformat Bayern)**: Klarer Examens-Kompass; Schwerpunkt **Testformat** (mind. 75 % offene Fallvignetten & Kurzantworten mit Satzlimit-Zähler, Operatoren-Trainer *Nennen* vs. *Skizzieren* und Musterlösungen; Single Choice 1 Pkt.; Multiple Choice 0,5 Pkt. je Zeile) + **5-Punkte-Essay-Baukasten** pro Kapitel.
   - **Integrierter FSRS-Kartentrainer (`ts-fsrs`)**, **Adaptives Lernprofil** (lernt Stärken, Verwechslungen & Tempo), **modulare Course-Pack-Architektur** (`content/courses/ews-psychologie/` für spätere Wiederverwendung in anderen Fächern) und **Download-Center** für alle `.docx`- & `.apkg`-Dateien.
   - **Kostenloser Sync & Hosting**: Lokal sofort ohne Login nutzbar (`Dexie`) + optionaler Echtzeit-Sync zwischen PC und iPhone über **Supabase Free Tier** (`supabase/schema.sql`) + fertiger **GitHub-Pages-Workflow** (`.github/workflows/deploy.yml`).
3. **Handbuch & Wartungs-Dokumentation**:
   - `exports/HANDBUCH_UND_LERNSTRATEGIE.docx` (herzlich & komplett technikfrei für sie geschrieben).
   - `SETUP_UND_LOGINS.md` (kurze 3-Minuten-Anleitung für GitHub Pages & optionales Supabase).
   - `docs/ARCHITECTURE.md`, `docs/DATA_SCHEMA.md`, `docs/MAINTENANCE_AND_RUNBOOK.md`, `docs/NEW_COURSE_PACK_GUIDE.md` + Diagnose-Skript (`npm run doctor`) für kinderleichte spätere Wartung.

---

## 5. Verbindliche Qualitäts-Checks vor Abschluss (Definition of Done)
1. **Automatisierter Vollständigkeits-Audit (`docs/AUDIT_REPORT.md`)**: Skriptbasierter Abgleich gegen alle 3 Original-PDFs (alle Kapitel, fett gedruckten Begriffe/Autoren, Definitionen, unterstrichenen Studien und relevanten Grafiken vollständig enthalten).
2. **Unit- & Integrationstests (`vitest` / `pytest`)**: FSRS, 0,5-Pkt.-MC, adaptiver Planer, Course-Pack-Schema und Sync-Logik grün.
3. **Dual-Viewport Browser-Tests (`playwright`)**: Sowohl **PC (`1440×900`)** als auch **iPhone (`390×844`)** getestet (Light/Dark-Mode, `scrollWidth <= innerWidth` ohne horizontalen Overflow am iPhone, Mobile-Bottom-Nav vs. PC-Sidebar, Offline-Modus, Audio-Player, Wissensgraph, Fallvignette/MC, `.docx`-Downloads, **0 Console-/Page-Errors**).
4. **Sauberer Build**: `npm run build` und `npm run doctor` fehlerfrei, alles sauber in Git committet.
