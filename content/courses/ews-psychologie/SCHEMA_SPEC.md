# Verbindliches JSON-Schema für das Course-Pack `ews-psychologie`

Dieses Dokument definiert das exakte JSON-Format für alle Teil-Dateien in `content/courses/ews-psychologie/parts/`, damit die Zusammenführung, der automatische Vollständigkeits-Audit (`scripts/audit_completeness.py`), die `.docx`-Generierung, die `.apkg`-Generierung und die React-App 100 % kompatibel arbeiten.

## 1. `domain_<x>_part<n>.json` (Einheiten / 1-Seiten-Ankerblätter)

```json
{
  "domain": "A",
  "part": 1,
  "domain_title": "Lernen und Lehren",
  "source_pdf": "A_Lernen_und_Lehren_Skript.pdf",
  "units": [
    {
      "id": "A-01-01",
      "domain": "A",
      "chapter_group_num": "1",
      "chapter_group_title": "1. Lernen als Verhaltensänderung (Behaviorismus)",
      "section_num": "1.1–1.2",
      "title": "Begriffsklärung & Klassisches Konditionieren",
      "subtitle": "Reiz-Reaktions-Verknüpfung, Signallernen & Emotionale Konditionierung",
      "page_start": 6,
      "page_end": 10,
      "page_label": "Original-Skript S. 6–10",
      "estimated_minutes": 15,
      "exam_weight": "high",
      "visual_anchor_tagline": "Glocke + Futter -> Speichelfluss: Wie neutrale Reize in der Schule Angst oder Freude auslösen",
      "definitions": [
        {
          "term": "Lernen (Behavioristische Perspektive)",
          "definition": "Relativ überdauernde Veränderung im Verhalten oder Verhaltenspotenzial infolge wiederholter Erfahrungen (Übung/Beobachtung), nicht durch Reifung, Ermüdung oder Drogen bedingt.",
          "author_year": "Bower & Hilgard, 1983; Zimbardo & Gerrig, 2004",
          "page_ref": "S. 6–7"
        }
      ],
      "sections": [
        {
          "heading": "Grundprinzip & Phasen des Klassischen Konditionierens (Pawlow, 1905)",
          "page_ref": "S. 7–8",
          "bullets": [
            "**Unkonditionierter Stimulus (UCS)** löst ohne Lernen eine **unkonditionierte Reaktion (UCR)** aus (z. B. Futter -> Speichel).",
            "**Neutraler Stimulus (NS)** wird zeitlich nah (**Kontiguität**) und verlässlich (**Kontingenz**) mehrfach mit UCS gekoppelt.",
            "Aus NS wird der **konditionierte Stimulus (CS)**, der allein die **konditionierte Reaktion (CR)** auslöst."
          ]
        }
      ],
      "empirical_studies": [
        {
          "title": "Der kleine Albert – Konditionierte emotionale Reaktion",
          "authors_year": "Watson & Rayner, 1920",
          "page_ref": "S. 9",
          "setup": "9 bzw. 11 Monate alter Säugling Albert: Weiße Ratte (NS) wurde mehrfach mit lautem Hammerschlag auf Eisenstange (UCS -> Angst/Weinen UCR) gekoppelt.",
          "finding": "Albert zeigte starke Furcht allein beim Anblick der weißen Ratte (CR) sowie Reizgeneralisierung auf Kaninchen, Pelzmantel und Nikolausbart.",
          "implication": "Schul- und Prüfungsängste können durch Kopplung neutraler Schulsituationen (Tafel, Fachlehrkraft) mit Beschämung/Überforderung klassisch konditioniert werden."
        }
      ],
      "original_figures": [
        {
          "path": "courses/ews-psychologie/figures/original/A_Lernen_und_Lehren_Skript_S006_Schaubild.png",
          "caption": "Black-Box-Modell des Behaviorismus (Original-Skript S. 6)",
          "page_ref": "S. 6"
        }
      ],
      "custom_visual": {
        "type": "process_flow",
        "title": "Phasenablauf Klassisches Konditionieren & Löschung",
        "steps_or_rows": [
          { "label": "1. Vor Konditionierung", "detail": "UCS -> UCR | NS -> keine spez. Reaktion" },
          { "label": "2. Akquisition (Erwerb)", "detail": "NS + UCS (Kontiguität & Kontingenz) -> UCR" },
          { "label": "3. Nach Konditionierung", "detail": "CS -> CR (gelernte Reaktion)" },
          { "label": "4. Extinktion & Spontanerholung", "detail": "CS mehrfach ohne UCS -> Abschwächung; nach Pause kurzes Wiederauftreten" }
        ]
      },
      "comparison_table": {
        "title": "Schlüsselphänomene des Klassischen Konditionierens",
        "headers": ["Begriff", "Mechanismus", "Grundschul-Beispiel"],
        "rows": [
          ["Reizgeneralisierung", "Ähnliche Reize lösen ebenfalls CR aus", "Angst vor Mathe überträgt sich auf Sachunterrichts-Tabellen"],
          ["Reizdiskrimination", "Nur spezifischer CS löst CR aus", "Kind fürchtet Diktate, freut sich aber auf freies Geschichten-Erfinden"]
        ]
      },
      "cross_references": [
        {
          "target_domain": "B",
          "target_hint": "Gebiet B, Kap. 8.4–8.6 (Prüfungsangst nach Liebert & Morris, 1967)",
          "bridge_explanation": "Klassisches Konditionieren erklärt die Entstehung der physiologischen Aufregungskomponente (Emotionality) bei Prüfungsangst; Vermeidung hält sie operant aufrecht (Mowrer)."
        },
        {
          "target_domain": "C",
          "target_hint": "Gebiet C, Kap. 9.5 & 9.6 (Angststörungen & Schulabsentismus)",
          "bridge_explanation": "Konditionierte Schulangst führt durch Flucht-/Vermeidungsverhalten zu Schulverweigerung; Abbau gelingt über Gegenkonditionierung und systematische Desensibilisierung."
        }
      ],
      "grundschule_praxis": {
        "kunst": "Kunst Klasse 2 (Wasserfarben-Werkstatt): Positive Atmosphäre durch ruhige Einstiegsmusik (NS -> CS) beim Mischen von Farben schafft entspannte Lernfreude (CR); strikter Verzicht auf Bloßstellen misslungener Bilder verhindert konditionierte Gestaltungshemmung.",
        "sport": "Sport Klasse 3 (Bocksprung / Gerätturnen): Hat ein Kind nach einem Sturz Angst vor dem Sprungbock (CS -> Angst), erfolgt systematische Desensibilisierung/Annäherung in Mini-Schritten (erst niedrige Matte, dann kleiner Kasten mit Hilfestellung) unter entspanntem Sicherheitsgefühl.",
        "allgemein": "Klangschale in Klasse 1 als freundlich aufgebautes Ruhe-Signal (CS) statt lautem Schimpfen."
      },
      "laut_erzaehl_check": [
        { "term": "UCS, UCR, NS, CS, CR", "hint": "Erkläre alle 5 Kürzel frei am Hund- oder Schulangst-Beispiel." },
        { "term": "Kontiguität vs. Kontingenz", "hint": "Zeitliche Nähe (ca. 0,5 Sek. optimal) vs. Vorhersagekraft/Regelhaftigkeit." },
        { "term": "Generalisierung & Diskrimination", "hint": "Ausweitung auf ähnliche Reize vs. gezielte Unterscheidung." },
        { "term": "Extinktion & Spontanerholung", "hint": "CS ohne UCS darbieten -> Abbau, aber kein komplettes Ausradieren." },
        { "term": "Gegenkonditionierung & Syst. Desensibilisierung (Wolpe)", "hint": "Angstreiz schrittweise mit Entspannung koppeln." }
      ],
      "essay_recipe": {
        "intro": "Lernen im Behaviorismus als beobachtbare Verhaltensänderung infolge Erfahrung (vgl. Bower & Hilgard, 1983), wobei innere Prozesse als Black Box ausgeklammert werden.",
        "core_model": "Klassisches Konditionieren nach Pawlow (1905): Kopplung von NS und UCS unter Kontiguität und Kontingenz bis CS allein CR auslöst, inkl. Generalisierung, Diskrimination und Extinktion.",
        "empirics": "Watson & Rayner (1920, Little Albert): Experimenteller Nachweis konditionierter Furchtreaktionen und deren Generalisierung auf ähnliche Reize.",
        "critique_bridge": "Erklärt unwillkürliche emotionale Reaktionen (z. B. Prüfungsangst; Liebert & Morris, 1967), greift für komplexen Wissenserwerb und Einsicht jedoch zu kurz -> Übergang zu Kognitivismus.",
        "school_transfer": "Grundschul-Ableitung: Angstfreie Fehlerkultur, positives Klassenklima und schrittweise systematische Annäherung z. B. beim Gerätturnen oder freien Malen."
      },
      "all_bold_terms_covered": [
        "Behaviorismus", "Black Box", "Bower & Hilgard (1983)", "Pawlow (1905)", "UCS", "UCR", "NS", "CS", "CR", "Kontiguität", "Kontingenz", "Watson & Rayner (1920)", "Generalisierung", "Diskrimination", "Extinktion", "Spontanerholung", "Gegenkonditionierung", "Systematische Desensibilisierung", "Wolpe"
      ]
    }
  ]
}
```

## 2. `cards_<x>_part<n>.json` (FSRS- & Anki-Karten)

Jede Einheit erhält gezielte Karteikarten (Definitionen mit Autor/Jahr, Studien mit Aufbau/Befund, Modell-Schritte, Abgrenzungen/Verwechslungsfallen, Grundschul-Transfer).

```json
[
  {
    "id": "card-A-001",
    "unit_id": "A-01-01",
    "domain": "A",
    "subdeck": "1_Behaviorismus",
    "card_type": "definition",
    "front": "Wie wird **Lernen** aus behavioristischer Sicht definiert (inkl. Urheber/Jahr)?",
    "back": "**Relativ überdauernde Veränderung im Verhalten oder Verhaltenspotenzial** eines Organismus infolge wiederholter **Erfahrungen** (nicht bedingt durch Reifung, Ermüdung oder Substanzen).\n\n*Urheber:* Bower & Hilgard (1983) / Zimbardo & Gerrig (2004)",
    "page_label": "Original-Skript S. 6–7",
    "confusion_tag": null,
    "tags": ["Definition", "Behaviorismus"]
  }
]
```

## 3. NULL-AUSLASSUNGS-PFLICHT FÜR ALLE SUBAGENTEN
1. Lies **JEDE EINZELNE SEITE** deiner zugewiesenen Slice-Datei (`extracted_raw/slices/<tag>.md`) Zeile für Zeile komplett durch!
2. **Kein einziger Unterpunkt aus dem Inhaltsverzeichnis**, **keine feste Definition**, **kein fett gedruckter Fachbegriff**, **kein Autor mit Jahreszahl**, **keine unterstrichene Studie (`Empirischer Befund`)** und **keine `ORIGINAL_GRAFIKEN_AUF_SEITE`** darf fehlen!
3. Fasse Redundanzen sprachlich prägnant in glasklare Stichpunkte (`bullets` mit `**Fettdruck**` für Schlüsselbegriffe/Autoren) zusammen, sodass jede `unit` ein optisch einprägsames **1-Seiten-Ankerblatt** ergibt (ca. 10–18 Units pro Halbskript bzw. eine Unit pro logischem Unterkapitel von ca. 2–5 Original-Seiten, sodass die Seitenspannen `page_start`–`page_end` lückenlos den gesamten Inhalt abdecken!).
4. Binde **JEDE** in `ORIGINAL_GRAFIKEN_AUF_SEITE` genannte Grafik in `original_figures` der passenden Unit mit aussagekräftiger Bildunterschrift (`caption`) und exakter Seitenzahl ein!
5. Schreibe valides UTF-8 JSON und prüfe es mit `python -c "import json; json.load(open(...))"`, bevor du abschließt!
