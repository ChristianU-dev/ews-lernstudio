# UX-mAInd Design-Paket & Lokale Extraktions-Werkzeuge

Dieser Ordner enthält alle Design-Bausteine aus Christians `UX-mAInd`-Projekt sowie die Liste der externen Open-Source-UI-Bibliotheken:
1. **`package.ux_maind_stack.json`**: Exakte Liste der externen Design- & Funktionsbibliotheken (`@radix-ui/*`, `vaul`, `sonner`, `cmdk`, `lucide-react`, `@xyflow/react`, `@dagrejs/dagre`, `@tanstack/react-table`, `ts-fsrs`, `dexie`, `@supabase/supabase-js`, `vite-plugin-pwa`, `vitest`, `@playwright/test`), die **direkt zu Beginn in Schritt 1** per `npm install` heruntergeladen werden sollen!
2. **`requirements.txt`**: Python-Pakete für die lokale PDF-/Bild-Extraktion, Diagramm-Erstellung, `.docx`-Generierung und `.apkg`-Erzeugung (`pymupdf`, `python-docx`, `genanki`, `matplotlib`, `pillow`, `pydantic`).
3. **`ui.jsx`**: Original-UI-Komponentenbibliothek auf Basis von `@radix-ui/*` (`Select`, `Modal`, `Switch`, `Tip`, `InfoPopover`, `StatusBadge`, `StatusDot`, `Kbd`).
4. **`StudioPrefsProvider.jsx` & `studio_complete_theme.css`**: Vollständiges Light- & Dark-Mode Design-System inkl. Dual-Shell für Widescreen-PC (`>= 960px`) und natives iPhone-Layout (`< 960px`, Frosted-Glass-Bottom-Bar, Safe-Areas).
5. **`widescreen_graph_layout.js`**: 16:9-Kartenlayout für `@xyflow/react` + `@dagrejs/dagre`.
6. **`extract_pdfs_local.py`**: 100 % lokaler PDF-, Formatierungs- und Grafik-Extraktor auf Basis von `PyMuPDF` — **benötigt KEINEN API-Key**!
