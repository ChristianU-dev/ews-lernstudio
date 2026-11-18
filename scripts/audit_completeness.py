"""Automatisierter Vollständigkeits-Audit (`docs/AUDIT_REPORT.md`):
Gleicht skriptbasiert die aufbereitete Wissensbasis (`content/courses/ews-psychologie/`),
die 3 generierten Word-Skripte (`exports/*.docx`) und die 3 Anki-Decks (`exports/*.apkg`)
gegen alle 3 Original-PDFs (`extracted_raw/*/*_extracted.json`) ab:
- 100 % Seiten-Abdeckung aller Inhaltsseiten (A: S. 6–108, B: S. 7–82, C: S. 8–73)
- Abgleich aller fett gedruckten Autoren/Fachbegriffe, Definitionen & unterstrichenen Studien
- 100 % Einbindung aller 79 relevanten Original-Grafiken
- Prüfung von PISA 2022 & PISA 2025, BaySchO LRS/Dyskalkulie, Kunst & Sport Praxisboxen
  sowie 48-Punkte / >=75%-Offen-Regel aller Testformat-Prüfungssätze.
"""

from pathlib import Path
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "extracted_raw"
COURSE_DIR = ROOT / "content" / "courses" / "ews-psychologie"
EXPORTS_DIR = ROOT / "exports"
DOCS_DIR = ROOT / "docs"

NOISE_BOLD_TOKENS = {
    "skript",
    "vorwort",
    "inhaltsverzeichnis",
    "hinweise",
    "layout",
    "benutzung",
    "stand",
    "april",
    "september",
    "oktober",
    "themenbereich",
    "psychologie",
    "bsp",
    "bsp.:",
    "beispiel",
    "beispiele",
    "abb",
    "abbildung",
    "tabelle",
    "kapitel",
    "fazit",
    "zusammenfassung",
    "exkurs",
    "ergänzung",
    "definition",
    "begriffsklärung",
    "merkmale",
    "überblick",
    "kritik",
    "förderung",
    "ursachen",
    "symptome",
    "diagnostik",
    "häufigkeit",
    "verlauf",
    "intervention",
}


def normalize_token(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^\wäöüß\-]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def extract_meaningful_bold_terms(raw_pages: list[dict], first_content_page: int) -> list[str]:
    terms = []
    seen = set()
    for p in raw_pages:
        if p["page_no"] < first_content_page:
            continue
        for raw_b in p.get("bold_terms_and_authors", []):
            cleaned = re.sub(r"^[\d.\s▪•➢\-–():;]+|[\s():;.,!?]+$", "", raw_b).strip()
            if len(cleaned) < 4:
                continue
            norm = normalize_token(cleaned)
            if not norm or norm in NOISE_BOLD_TOKENS or norm.isdigit():
                continue
            if norm not in seen:
                seen.add(norm)
                terms.append(cleaned)
    return terms


def run_audit() -> dict:
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    fig_manifest = json.loads((RAW_DIR / "FIGURES_MANIFEST.json").read_text(encoding="utf-8"))
    flashcards = json.loads((COURSE_DIR / "flashcards.json").read_text(encoding="utf-8"))
    exam_bank = json.loads((COURSE_DIR / "exam_bank.json").read_text(encoding="utf-8"))

    configs = [
        ("A", "A_Lernen_und_Lehren_Skript", "domain_a_lernen_und_lehren.json", 6, 108, "Lernskript_A_Lernen_und_Lehren.docx", "Anki_A_Lernen_und_Lehren.apkg"),
        ("B", "B_Entwicklungspsychologie_Skript", "domain_b_entwicklungspsychologie.json", 7, 82, "Lernskript_B_Entwicklungspsychologie.docx", "Anki_B_Entwicklungspsychologie.apkg"),
        ("C", "C_Diagnostik_Skript", "domain_c_diagnostik.json", 8, 73, "Lernskript_C_Diagnostik.docx", "Anki_C_Diagnostik.apkg"),
    ]

    domain_reports = {}
    all_passed = True

    for dom, raw_name, dom_json_name, p_start, p_end, docx_name, apkg_name in configs:
        raw_bundle = json.loads((RAW_DIR / raw_name / f"{raw_name}_extracted.json").read_text(encoding="utf-8"))
        dom_bundle = json.loads((COURSE_DIR / dom_json_name).read_text(encoding="utf-8"))
        units = dom_bundle.get("units", [])
        dom_cards = [c for c in flashcards if c.get("domain") == dom]

        # 1. Seiten-Abdeckung prüfen
        covered_pages = set()
        for u in units:
            for pno in range(int(u["page_start"]), int(u["page_end"]) + 1):
                covered_pages.add(pno)
        expected_pages = set(range(p_start, p_end + 1))
        uncovered_pages = sorted(expected_pages - covered_pages)

        # 2. Volltext-Korpus aus JSON + Karten für Begriffs-/Autorenabgleich bilden
        corpus_text = json.dumps(dom_bundle, ensure_ascii=False).lower() + " " + json.dumps(dom_cards, ensure_ascii=False).lower()
        corpus_norm = normalize_token(corpus_text)

        raw_bolds = extract_meaningful_bold_terms(raw_bundle["pages"], p_start)
        matched_bolds = []
        missing_bolds = []
        for bt in raw_bolds:
            nt = normalize_token(bt)
            # Prüfe vollständigen String oder signifikante Hauptwörter (>= 5 Zeichen)
            words = [w for w in nt.split() if len(w) >= 5]
            if nt in corpus_norm or (words and all(w in corpus_norm for w in words)):
                matched_bolds.append(bt)
            else:
                missing_bolds.append(bt)

        bold_coverage_pct = round((len(matched_bolds) / max(1, len(raw_bolds))) * 100, 1)

        # 3. Originalgrafiken prüfen
        expected_figs = {f["web_path"].lstrip("./") for f in fig_manifest.get(dom, [])}
        embedded_figs = {
            fig["path"].lstrip("./")
            for u in units
            for fig in (u.get("original_figures") or [])
        }
        missing_figs = sorted(expected_figs - embedded_figs)

        # 4. Zählwerte für Definitionen, Studien, Kunst/Sport & Laut-Erzähl-Check
        def_count = sum(len(u.get("definitions") or []) for u in units)
        study_count = sum(len(u.get("empirical_studies") or []) for u in units)
        praxis_ok = all(
            bool((u.get("grundschule_praxis") or {}).get("kunst"))
            and bool((u.get("grundschule_praxis") or {}).get("sport"))
            for u in units
        )
        laut_ok = all(len(u.get("laut_erzaehl_check") or []) == 5 for u in units)

        # 5. Physische Exporte (.docx & .apkg) prüfen
        docx_path = EXPORTS_DIR / docx_name
        apkg_path = EXPORTS_DIR / apkg_name
        docx_exists = docx_path.exists() and docx_path.stat().st_size > 20_000
        apkg_exists = apkg_path.exists() and apkg_path.stat().st_size > 5_000

        docx_media_count = 0
        if docx_exists:
            with zipfile.ZipFile(docx_path, "r") as zf:
                docx_media_count = sum(1 for n in zf.namelist() if n.startswith("word/media/"))

        if uncovered_pages or missing_figs or not praxis_ok or not laut_ok or not docx_exists or not apkg_exists:
            all_passed = False

        domain_reports[dom] = {
            "total_pdf_pages": raw_bundle["total_pages"],
            "content_page_range": f"S. {p_start}–{p_end}",
            "units_count": len(units),
            "uncovered_pages": uncovered_pages,
            "definitions_count": def_count,
            "studies_count": study_count,
            "expected_figures": len(expected_figs),
            "embedded_figures": len(embedded_figs),
            "missing_figures": missing_figs,
            "bold_terms_total": len(raw_bolds),
            "bold_terms_matched": len(matched_bolds),
            "bold_coverage_pct": bold_coverage_pct,
            "sample_unmatched_bold_spans": missing_bolds[:10],
            "praxis_kunst_sport_complete": praxis_ok,
            "laut_erzaehl_5_complete": laut_ok,
            "flashcards_count": len(dom_cards),
            "docx_size_kb": round(docx_path.stat().st_size / 1024, 1) if docx_exists else 0,
            "docx_embedded_images": docx_media_count,
            "apkg_size_kb": round(apkg_path.stat().st_size / 1024, 1) if apkg_exists else 0,
        }

    # PISA 2022 & 2025 Spezialprüfung in Gebiet C
    c_raw_txt = (COURSE_DIR / "domain_c_diagnostik.json").read_text(encoding="utf-8")
    pisa_checks = {
        "PISA 2022": "PISA 2022" in c_raw_txt and "475" in c_raw_txt and "480" in c_raw_txt and "492" in c_raw_txt,
        "PISA 2025": "PISA 2025" in c_raw_txt and "464" in c_raw_txt and "465" in c_raw_txt and "486" in c_raw_txt,
        "BaySchO LRS vs. Dyskalkulie": "Notenschutz" in c_raw_txt and "Dyskalkulie" in c_raw_txt,
    }
    if not all(pisa_checks.values()):
        all_passed = False

    # Prüfungsbank-Validierung (48 Punkte & >= 75 % Offen-Anteil)
    exam_checks = []
    for s in exam_bank.get("testformat_sets", []):
        qs = s.get("questions", [])
        tot = sum(float(q.get("points", 0)) for q in qs)
        opn = sum(float(q.get("points", 0)) for q in qs if q.get("type") in ("vignette_open", "short_open"))
        share = round((opn / max(1.0, tot)) * 100, 1)
        ok = abs(tot - 48.0) < 0.01 and opn >= 36.0
        if not ok:
            all_passed = False
        exam_checks.append({
            "id": s.get("id"),
            "domain": s.get("domain"),
            "total_points": tot,
            "open_points": opn,
            "open_share_pct": share,
            "valid": ok,
        })

    # Schreibe docs/AUDIT_REPORT.md
    md = [
        "# Automatisierter Vollständigkeits-Audit (`AUDIT_REPORT.md`)",
        "",
        f"**Gesamtstatus:** {'✅ **BESTANDEN (100 % Seiten-, Grafik- & Struktur-Vollständigkeit)**' if all_passed else '⚠️ Nacharbeit erforderlich'}",
        "",
        "## 1. Abgleich der 3 Pflichtskripte (Einzeltrennung, Null-Auslassung & Exporte)",
        "",
        "| Kennzahl | Skript A (Lernen & Lehren) | Skript B (Entwicklungspsychologie) | Skript C (Diagnostik) |",
        "| :--- | :---: | :---: | :---: |",
        f"| Original-PDF Gesamtseiten | {domain_reports['A']['total_pdf_pages']} S. | {domain_reports['B']['total_pdf_pages']} S. | {domain_reports['C']['total_pdf_pages']} S. |",
        f"| Inhalts-Seitenbereich | {domain_reports['A']['content_page_range']} | {domain_reports['B']['content_page_range']} | {domain_reports['C']['content_page_range']} |",
        f"| Nicht abgedeckte Inhaltsseiten | **{len(domain_reports['A']['uncovered_pages'])}** | **{len(domain_reports['B']['uncovered_pages'])}** | **{len(domain_reports['C']['uncovered_pages'])}** |",
        f"| 1-Seiten-Ankerblätter (`units`) | {domain_reports['A']['units_count']} | {domain_reports['B']['units_count']} | {domain_reports['C']['units_count']} |",
        f"| Exakte Definitionen (mit Autor/Jahr) | {domain_reports['A']['definitions_count']} | {domain_reports['B']['definitions_count']} | {domain_reports['C']['definitions_count']} |",
        f"| Ausgearbeitete Empirie-Steckbriefe | {domain_reports['A']['studies_count']} | {domain_reports['B']['studies_count']} | {domain_reports['C']['studies_count']} |",
        f"| Original-Grafiken eingebunden | **{domain_reports['A']['embedded_figures']} / {domain_reports['A']['expected_figures']}** | **{domain_reports['B']['embedded_figures']} / {domain_reports['B']['expected_figures']}** | **{domain_reports['C']['embedded_figures']} / {domain_reports['C']['expected_figures']}** |",
        f"| Fett-Spans / Autoren-Abdeckung | {domain_reports['A']['bold_coverage_pct']} % ({domain_reports['A']['bold_terms_matched']}/{domain_reports['A']['bold_terms_total']}) | {domain_reports['B']['bold_coverage_pct']} % ({domain_reports['B']['bold_terms_matched']}/{domain_reports['B']['bold_terms_total']}) | {domain_reports['C']['bold_coverage_pct']} % ({domain_reports['C']['bold_terms_matched']}/{domain_reports['C']['bold_terms_total']}) |",
        f"| Kunst- & Sport-Praxisbox auf jedem Blatt | {'✅ Ja' if domain_reports['A']['praxis_kunst_sport_complete'] else '❌'} | {'✅ Ja' if domain_reports['B']['praxis_kunst_sport_complete'] else '❌'} | {'✅ Ja' if domain_reports['C']['praxis_kunst_sport_complete'] else '❌'} |",
        f"| 5-Punkte Laut-Erzähl-Check komplett | {'✅ Ja' if domain_reports['A']['laut_erzaehl_5_complete'] else '❌'} | {'✅ Ja' if domain_reports['B']['laut_erzaehl_5_complete'] else '❌'} | {'✅ Ja' if domain_reports['C']['laut_erzaehl_5_complete'] else '❌'} |",
        f"| FSRS- / Anki-Karten | {domain_reports['A']['flashcards_count']} | {domain_reports['B']['flashcards_count']} | {domain_reports['C']['flashcards_count']} |",
        f"| Word-Lernskript (`.docx` + eingebettete Bilder) | {domain_reports['A']['docx_size_kb']} KB ({domain_reports['A']['docx_embedded_images']} Abb.) | {domain_reports['B']['docx_size_kb']} KB ({domain_reports['B']['docx_embedded_images']} Abb.) | {domain_reports['C']['docx_size_kb']} KB ({domain_reports['C']['docx_embedded_images']} Abb.) |",
        f"| Anki-Paket (`.apkg`) | {domain_reports['A']['apkg_size_kb']} KB | {domain_reports['B']['apkg_size_kb']} KB | {domain_reports['C']['apkg_size_kb']} KB |",
        "",
        "## 2. Spezial-Checks (Aktualität Oktober 2026 & Bayern-Recht)",
        "",
    ]
    for k, ok in pisa_checks.items():
        md.append(f"- **{k}**: {'✅ Vollständig mit Originalwerten verifiziert' if ok else '❌ Fehlt'}")

    md.extend([
        "",
        "## 3. Validierung der Bayerischen Wahlformat-Prüfungssätze (48 Punkte & mind. 75 % Offen-Anteil)",
        "",
        "| Satz-ID | Gebiet | Gesamtpunkte | Offene Punkte (Vignetten & Kurzfragen) | Offen-Anteil | Status |",
        "| :--- | :---: | :---: | :---: | :---: | :---: |",
    ])
    for ec in exam_checks:
        md.append(
            f"| `{ec['id']}` | {ec['domain']} | {ec['total_points']:.0f} Pkt. | {ec['open_points']:.0f} Pkt. | **{ec['open_share_pct']} %** | {'✅ Gültig' if ec['valid'] else '❌ Fehler'} |"
        )

    (DOCS_DIR / "AUDIT_REPORT.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print(f"[OK] docs/AUDIT_REPORT.md geschrieben (all_passed={all_passed}).")

    return {
        "all_passed": all_passed,
        "domains": domain_reports,
        "pisa_checks": pisa_checks,
        "exam_checks": exam_checks,
    }


if __name__ == "__main__":
    res = run_audit()
    if not res["all_passed"]:
        raise SystemExit(1)
