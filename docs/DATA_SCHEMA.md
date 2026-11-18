# Daten- & Speicher-Schema (`DATA_SCHEMA.md`)

## 1. Course-Pack JSON-Struktur (`content/courses/<course-id>/`)

| Datei | Inhalt & Pflichtfelder |
| :--- | :--- |
| `manifest.json` | `id`, `title`, `version`, `learner_subjects` (`primary`, `didactic`), `domains` (`A`, `B`, `C` mit Farbcode & Gesamtseitenzahl) |
| `domain_a_lernen_und_lehren.json` | `{ domain: "A", units: [ AnchorSheetUnit ] }` — strikt getrenntes Skript A (108 S.) |
| `domain_b_entwicklungspsychologie.json` | `{ domain: "B", units: [ AnchorSheetUnit ] }` — strikt getrenntes Skript B (82 S.) |
| `domain_c_diagnostik.json` | `{ domain: "C", units: [ AnchorSheetUnit ] }` — strikt getrenntes Skript C (73 S.) |
| `flashcards.json` | Array von `Flashcard` (`id`, `unit_id`, `domain`, `subdeck`, `card_type`, `front`, `back`, `page_label`, `confusion_tag`, `tags`) |
| `exam_bank.json` | `exam_compass`, `testformat_sets` (je 48 Pkt., `>= 36` Pkt. offene Aufgaben + 1-Pkt.-SC + 4×0,5-Pkt.-MC), `essay_sets` |
| `operators.json` | `operators` (`operator`, `ab_level`, `official_definition`, `what_graders_expect`, `trap_warning`), `operator_drills` |
| `confusion_pairs.json` | Array klassischer Verwechslungs-Paare (`id`, `domain`, `term_a`, `term_b`, `core_difference`, `memory_bridge`, `kunst_sport_example`, `page_label`) |
| `knowledge_graph_curated.json` | `{ nodes: [...], edges: [...] }` mit `bridge_type`: `"cross_domain"` \| `"within_domain"` |

### Aufbau einer `AnchorSheetUnit` (1-Seiten-Ankerblatt)
- `id` (`"A-01-01"`), `domain` (`"A"|"B"|"C"`), `chapter_group_title`, `section_num`, `title`, `subtitle`
- `page_start` (`int`), `page_end` (`int`), `page_label` (`"Original-Skript S. X–Y"`)
- `visual_anchor_tagline` (visueller Merksatz für das Seitengedächtnis)
- `definitions`: `[{ term, definition, author_year, page_ref }]`
- `sections`: `[{ heading, page_ref, bullets: [...] }]`
- `empirical_studies`: `[{ title, authors_year, page_ref, setup, finding, implication }]`
- `original_figures`: `[{ path, caption, page_ref }]`
- `custom_visual`: `{ type: "process_flow" | "timeline", title, steps_or_rows: [{ label, detail }] }`
- `comparison_table`: `{ title, headers: [...], rows: [[...]] }`
- `cross_references`: `[{ target_domain, target_hint, bridge_explanation }]`
- `grundschule_praxis`: `{ kunst, sport, allgemein }`
- `laut_erzaehl_check`: 5 Prüfpunkte `[{ term, hint }]`
- `essay_recipe`: `{ intro, core_model, empirics, critique_bridge, school_transfer }`

---

## 2. Lokale Offline-Datenbank (`Dexie` / IndexedDB: `EWSLernstudioDB_v1`)

| Tabelle | Primärschlüssel | Gespeicherte Felder |
| :--- | :--- | :--- |
| `settings` | `key` | `value`, `updatedAt` (z. B. `examDate`, `dailyTargetMinutes`, `dailyCardCap`, `supabaseUrl`, `syncKey`) |
| `unitProgress` | `unitId` | `domain`, `status` (`"unread"\|"seen"\|"mastered"`), `lautCheckDone`, `lautCheckCount`, `updatedAt` |
| `notes` | `unitId` | `highlightColor`, `text`, `binderMarker`, `updatedAt` |
| `fsrsStates` | `cardId` | `card` (serialisiertes `ts-fsrs` Card-Objekt mit `stability`, `difficulty`, `due`, `state`), `reviewCount`, `lapses`, `updatedAt` |
| `examAttempts` | `id` | `setId`, `domain`, `mode`, `totalScore`, `maxScore`, `createdAt` |
| `podcasts` | `id` | `unitId`, `domain`, `title`, `blob` (lokales Audio-File für Offline-Zugbetrieb), `mimeType`, `createdAt` |
| `activityLogs` | `dateKey` (`YYYY-MM-DD`) | `minutesStudied`, `unitsCompleted`, `cardsReviewed`, `examDrills`, `bonusRounds`, `podcastListened`, `updatedAt` |
| `confusionStats` | `pairId` | `count`, `updatedAt` |
| `profiles` *(v2)* | `id` | `name`, `subtitle`, `avatarEmoji`, `isProtected` (`true` für Hauptprofil), `googleEmail`, `updatedAt` |
| `customCourses` *(v2)* | `id` | `profileId`, `title`, `packData` (vollständiges Course-Pack inkl. generierter Ankerblätter & FSRS-Karten), `updatedAt` |

*Hinweis zur Mehr-Profil-Trennung*: Daten des Hauptprofils (`profile-main`) behalten ihre direkten Schlüssel; Zusatzprofile speichern isoliert unter `<profileId>::<key>`, sodass sich mehrere Personen ein Gerät teilen können, ohne jemals Fortschritte zu vermischen.

---

## 3. Supabase Sync-Tabelle (`public.ews_sync_records`) & Google OAuth
- Zusammengesetzter Primärschlüssel: `(sync_key, collection, record_id)`
- Unterstützt sowohl **Google OAuth 2.0** (`sync_key = 'google:' || auth.uid()`, per RLS strikt auf den angemeldeten Google-Account isoliert) als auch den schnellen Sync-Code (`char_length(sync_key) >= 8`).
- `payload` (`jsonb`), `updated_at` (`timestamptz`)
- Konfliktlösung in `src/lib/syncEngine.js`: Deterministischer **Last-Write-Wins-Abgleich** anhand von `updatedAt` (keine Datenverluste bei abwechselndem Offline-Lernen im Zug und am Laptop).
