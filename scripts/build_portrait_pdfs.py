"""Generiert 4 farbcodierte, visuell einprägsame A4-Hochformat-PDFs (595 x 842 pt)
für das Convertible-Tablet im Hochformat (inkl. Stift-Abhakfeldern) und das iPhone:
- Lernskript_A_Lernen_und_Lehren_Hochformat.pdf (Saphirblau + Lila)
- Lernskript_B_Entwicklungspsychologie_Hochformat.pdf (Smaragdgrün + Lila)
- Lernskript_C_Diagnostik_Hochformat.pdf (Bernstein + Lila)
- Kapiteluebersichten_Kurzanker_A_B_C_Hochformat.pdf (1 kompakte Seite je Kapitel)
"""

from pathlib import Path
import html
import json
import re
import shutil

import pymupdf as fitz

ROOT = Path(__file__).resolve().parent.parent
COURSE_DIR = ROOT / "content" / "courses" / "ews-psychologie"
PUBLIC_DIR = ROOT / "public"
GEN_DIAG_DIR = ROOT / "extracted_raw" / "generated_diagrams_300dpi"
EXPORTS_DIR = ROOT / "exports"
PUBLIC_EXPORTS_DIR = PUBLIC_DIR / "exports"

DOMAIN_META = {
    "A": {
        "file": "domain_a_lernen_und_lehren.json",
        "out": "Lernskript_A_Lernen_und_Lehren_Hochformat.pdf",
        "title": "Skript A · Lernen und Lehren",
        "accent": "#2563EB",
        "soft": "#EFF6FF",
        "border": "#93C5FD",
    },
    "B": {
        "file": "domain_b_entwicklungspsychologie.json",
        "out": "Lernskript_B_Entwicklungspsychologie_Hochformat.pdf",
        "title": "Skript B · Entwicklungspsychologie",
        "accent": "#059669",
        "soft": "#ECFDF5",
        "border": "#6EE7B7",
    },
    "C": {
        "file": "domain_c_diagnostik.json",
        "out": "Lernskript_C_Diagnostik_Hochformat.pdf",
        "title": "Skript C · Diagnostik & Evaluation",
        "accent": "#D97706",
        "soft": "#FFFBEB",
        "border": "#FCD34D",
    },
}

GROUP_PALETTE = [
    ("#7C3AED", "#F5F3FF"),  # Lila (Überpunkt)
    ("#2563EB", "#EFF6FF"),  # Saphirblau
    ("#0D9488", "#F0FDFA"),  # Petrol-Türkis
    ("#D97706", "#FFFBEB"),  # Bernstein
    ("#DB2777", "#FDF2F8"),  # Beere
    ("#4F46E5", "#EEF2FF"),  # Indigo
]

BASE_CSS = """
@page { size: A4 portrait; margin: 32pt 34pt 36pt 34pt; }
body {
  font-family: Helvetica, Arial, sans-serif;
  font-size: 9.4pt;
  line-height: 1.45;
  color: #1B1E23;
}
.cover {
  padding: 20pt 18pt;
  border-radius: 10pt;
  border: 2pt solid #7C3AED;
  background-color: #F5F3FF;
  margin-bottom: 16pt;
}
.cover h1 {
  font-size: 20pt;
  margin: 0 0 6pt 0;
  color: #1B1E23;
}
.unit-break {
  page-break-before: always;
}
.unit-header {
  padding: 10pt 12pt;
  border-radius: 8pt;
  margin-bottom: 10pt;
  border-left: 5pt solid #7C3AED;
}
.badge {
  display: inline-block;
  padding: 2pt 7pt;
  border-radius: 5pt;
  font-size: 8pt;
  font-weight: bold;
  margin-right: 5pt;
}
.unit-title {
  font-size: 14.5pt;
  font-weight: bold;
  margin: 5pt 0 2pt 0;
  color: #111827;
}
.unit-sub {
  font-size: 9.2pt;
  color: #4B5563;
  margin: 0;
}
.cat-box {
  padding: 8pt 10pt;
  border-radius: 7pt;
  margin-bottom: 8pt;
  page-break-inside: avoid;
}
.cat-title {
  font-size: 8.2pt;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.4pt;
  margin: 0 0 4pt 0;
  page-break-after: avoid;
}
.cat-merksatz { background-color: #F5F3FF; border-left: 4pt solid #7C3AED; }
.cat-def      { background-color: #EFF6FF; border-left: 4pt solid #2563EB; }
.cat-kern     { background-color: #F8FAFC; border-left: 4pt solid #4F46E5; }
.cat-empirie  { background-color: #FFFBEB; border-left: 4pt solid #D97706; }
.cat-praxis   { background-color: #ECFDF5; border-left: 4pt solid #059669; }
.cat-check    { background-color: #FDF2F8; border-left: 4pt solid #DB2777; }
.def-item { margin-bottom: 5pt; }
ul { margin: 3pt 0 3pt 14pt; padding: 0; }
li { margin-bottom: 2.5pt; }
table {
  width: 100%;
  border-collapse: collapse;
  margin: 6pt 0 8pt 0;
  font-size: 8.6pt;
  page-break-inside: avoid;
}
th, td {
  border: 0.7pt solid #CBD5E1;
  padding: 4.5pt 6pt;
  text-align: left;
  vertical-align: top;
}
th {
  background-color: #F1F5F9;
  font-weight: bold;
  color: #0F172A;
}
.img-wrap {
  text-align: center;
  margin: 6pt 0 8pt 0;
  padding: 5pt;
  border: 0.7pt solid #E2E8F0;
  border-radius: 6pt;
  background-color: #FFFFFF;
  page-break-inside: avoid;
}
.img-cap {
  font-size: 8pt;
  color: #64748B;
  font-style: italic;
  margin-top: 3pt;
}
.check-row {
  margin-bottom: 3pt;
}
"""


def md_to_html(text: str) -> str:
    s = html.escape(str(text or ""))
    s = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"\*([^*]+)\*", r"<i>\1</i>", s)
    return s.replace("\n", "<br/>")


def group_color_map(units: list[dict]) -> dict[str, tuple[str, str]]:
    mapping = {}
    for u in units:
        g = str(u.get("chapter_group_title") or u.get("chapter_group_num") or "Allgemein")
        if g not in mapping:
            mapping[g] = GROUP_PALETTE[len(mapping) % len(GROUP_PALETTE)]
    return mapping


def render_unit_html(u: dict, dom: str, grp_colors: dict, include_full: bool = True, first_unit: bool = False) -> str:
    meta = DOMAIN_META[dom]
    grp_title = str(u.get("chapter_group_title") or f"Kapitel {u.get('chapter_group_num', '')}")
    grp_accent, grp_bg = grp_colors.get(grp_title, ("#7C3AED", "#F5F3FF"))
    cls_break = "" if first_unit else 'class="unit-break"'

    parts = [
        f'<div {cls_break}>',
        f'<div class="unit-header" style="background-color: {meta["soft"]}; border-left-color: {meta["accent"]};">',
        f'  <div>',
        f'    <span class="badge" style="background-color: {meta["accent"]}; color: #FFFFFF;">Gebiet {dom} · Kap. {html.escape(str(u.get("section_num", "")))}</span>',
        f'    <span class="badge" style="background-color: {grp_bg}; color: {grp_accent}; border: 0.7pt solid {grp_accent};">{html.escape(grp_title)}</span>',
        f'    <span class="badge" style="background-color: #FFFFFF; color: #111827; border: 0.7pt solid #94A3B8;"><b>{html.escape(str(u.get("page_label", "")))}</b></span>',
        f'  </div>',
        f'  <div class="unit-title">{html.escape(str(u.get("title", "")))}</div>',
    ]
    if u.get("subtitle"):
        parts.append(f'  <p class="unit-sub">{html.escape(str(u["subtitle"]))}</p>')
    parts.append("</div>")

    # 1. Visueller Merksatz (Lila)
    if u.get("visual_anchor_tagline"):
        parts.append(
            f'<div class="cat-box cat-merksatz">'
            f'<div class="cat-title" style="color: #6D28D9;">1. Visueller Merksatz (Seitengedächtnis)</div>'
            f'<div><b>{md_to_html(u["visual_anchor_tagline"])}</b></div>'
            f'</div>'
        )

    # Rendere 300-DPI Schaubild
    diag_name = f"{u.get('id', '')}.png"
    if (GEN_DIAG_DIR / diag_name).exists():
        parts.append(
            f'<div class="img-wrap">'
            f'<img src="{diag_name}" style="max-width: 100%; height: auto;" />'
            f'</div>'
        )

    # 2. Prüfungsrelevante Definitionen (Blau)
    defs = u.get("definitions") or []
    if defs:
        def_limit = defs if include_full else defs[:3]
        def_html = "".join(
            f'<div class="def-item">• <b>{html.escape(str(d.get("term", "")))}</b> '
            f'<span style="color:#475569;">({html.escape(str(d.get("author_year", "")))}, {html.escape(str(d.get("page_ref", "")))})</span>: '
            f'{md_to_html(d.get("definition", ""))}</div>'
            for d in def_limit
        )
        parts.append(
            f'<div class="cat-box cat-def">'
            f'<div class="cat-title" style="color: #1D4ED8;">2. Prüfungsrelevante Definitionen (Wortlaut &amp; Urheber)</div>'
            f'{def_html}</div>'
        )

    # 3. Kernaussagen & Modelle (nur im Vollskript)
    if include_full:
        for sec in u.get("sections") or []:
            bullets_html = "".join(f"<li>{md_to_html(b)}</li>" for b in (sec.get("bullets") or []))
            parts.append(
                f'<div class="cat-box cat-kern">'
                f'<div class="cat-title" style="color: #4338CA;">3. {html.escape(str(sec.get("heading", "Kernwissen")))} '
                f'<span style="font-weight:normal; color:#64748B;">({html.escape(str(sec.get("page_ref", "")))})</span></div>'
                f'<ul>{bullets_html}</ul></div>'
            )

        # Vergleichstabelle
        ctab = u.get("comparison_table")
        if ctab and ctab.get("headers") and ctab.get("rows"):
            th_row = "".join(f"<th>{html.escape(str(h))}</th>" for h in ctab["headers"])
            tb_rows = ""
            for row in ctab["rows"]:
                tds = "".join(
                    f"<td>{'<b>' if ci == 0 else ''}{md_to_html(cell)}{'</b>' if ci == 0 else ''}</td>"
                    for ci, cell in enumerate(row)
                )
                tb_rows += f"<tr>{tds}</tr>"
            parts.append(
                f'<div style="page-break-inside: avoid; margin-bottom: 8pt;">'
                f'<div style="font-size:8.6pt; font-weight:bold; color:#4338CA; margin-bottom:3pt;">Vergleichstabelle: {html.escape(str(ctab.get("title", "")))}</div>'
                f'<table><thead><tr>{th_row}</tr></thead><tbody>{tb_rows}</tbody></table>'
                f'</div>'
            )

    # 4. Empirische Studien & Original-Abbildungen (Bernstein)
    studies = u.get("empirical_studies") or []
    if studies:
        st_limit = studies if include_full else studies[:2]
        st_html = "".join(
            f'<div class="def-item">• <b>{html.escape(str(s.get("title", "")))}</b> '
            f'({html.escape(str(s.get("authors_year", "")))}, {html.escape(str(s.get("page_ref", "")))}): '
            f'{md_to_html(s.get("finding", ""))}</div>'
            for s in st_limit
        )
        parts.append(
            f'<div class="cat-box cat-empirie">'
            f'<div class="cat-title" style="color: #B45309;">4. Empirische Schlüsselstudien &amp; Befunde</div>'
            f'{st_html}</div>'
        )

    if include_full:
        for fig in u.get("original_figures") or []:
            rel = str(fig.get("path", "")).lstrip("./")
            if (PUBLIC_DIR / rel).exists():
                parts.append(
                    f'<div class="img-wrap">'
                    f'<img src="{rel}" style="max-width: 92%; max-height: 220pt; height: auto;" />'
                    f'<div class="img-cap">{html.escape(str(fig.get("caption", "Originalgrafik")))} ({html.escape(str(fig.get("page_ref", "")))})</div>'
                    f'</div>'
                )

    # 5. Grundschul-Praxis (Kunst & Sport) + Theorie-Brücken (Grün)
    gp = u.get("grundschule_praxis") or {}
    if gp:
        gp_rows = []
        if gp.get("kunst"):
            gp_rows.append(f'<div><b>Kunst (Kl. 1–4):</b> {md_to_html(gp["kunst"])}</div>')
        if gp.get("sport"):
            gp_rows.append(f'<div><b>Sport (Kl. 1–4):</b> {md_to_html(gp["sport"])}</div>')
        if include_full and gp.get("allgemein"):
            gp_rows.append(f'<div><b>Klassenführung / Allgemein:</b> {md_to_html(gp["allgemein"])}</div>')
        parts.append(
            f'<div class="cat-box cat-praxis">'
            f'<div class="cat-title" style="color: #047857;">5. Grundschul-Praxis (Kunst &amp; Sport)</div>'
            f'{"".join(gp_rows)}</div>'
        )

    if include_full and u.get("cross_references"):
        br_html = "".join(
            f'<div class="def-item">↔ <b>Brücke zu Gebiet {html.escape(str(x.get("target_domain", "")))} ({html.escape(str(x.get("target_hint", "")))}):</b> '
            f'{md_to_html(x.get("bridge_explanation", ""))}</div>'
            for x in u["cross_references"]
        )
        parts.append(
            f'<div class="cat-box" style="background-color:#F1F5F9; border-left:4pt solid #334155;">'
            f'<div class="cat-title" style="color:#334155;">Theorie-Brücken zu den anderen Skripten</div>{br_html}</div>'
        )

    # 6. 5-Punkte Laut-Erzähl-Check zum Abhaken (Beere/Pink)
    checks = u.get("laut_erzaehl_check") or []
    if checks:
        chk_html = "".join(
            f'<div class="check-row">&#9744; <b>{i + 1}. {html.escape(str(c.get("term", "")))}</b> — '
            f'{md_to_html(c.get("hint") or c.get("check_hint", ""))}</div>'
            for i, c in enumerate(checks)
        )
        parts.append(
            f'<div class="cat-box cat-check">'
            f'<div class="cat-title" style="color: #BE185D;">6. Laut-Erzähl-Check (5 Ankerpunkte zum Abhaken)</div>'
            f'{chk_html}</div>'
        )

    parts.append("</div>")
    return "\n".join(parts)


def write_html_to_a4_pdf(html_str: str, out_path: Path):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = out_path.with_suffix(".tmp.pdf")
    archive = fitz.Archive([str(PUBLIC_DIR), str(GEN_DIAG_DIR), str(ROOT)])
    story = fitz.Story(html=html_str, user_css=BASE_CSS, archive=archive)
    writer = fitz.DocumentWriter(str(tmp_path))
    mediabox = fitz.paper_rect("a4")
    where = fitz.Rect(34, 32, mediabox.width - 34, mediabox.height - 34)
    more = True
    while more:
        dev = writer.begin_page(mediabox)
        more, _ = story.place(where)
        story.draw(dev, None)
        writer.end_page()
    writer.close()
    del writer
    del story

    # Subsetting & Deflate-Kompression: reduziert PDF-Größe um >90 % bei voller 300-DPI-Schärfe!
    doc = fitz.open(str(tmp_path))
    try:
        doc.subset_fonts()
    except Exception:
        pass
    doc.save(str(out_path), garbage=4, deflate=True, use_objstms=True)
    doc.close()
    try:
        tmp_path.unlink(missing_ok=True)
    except OSError:
        pass


def build_all_portrait_pdfs():
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

    loaded_domains = {}
    for dom, meta in DOMAIN_META.items():
        data = json.loads((COURSE_DIR / meta["file"]).read_text(encoding="utf-8"))
        units = data.get("units", [])
        loaded_domains[dom] = units
        grp_colors = group_color_map(units)

        cover_html = (
            f'<div class="cover" style="border-color:{meta["accent"]}; background-color:{meta["soft"]};">'
            f'<div style="font-size:9.5pt; font-weight:bold; color:#7C3AED;">EWS PSYCHOLOGIE · HOCHFORMAT-TABLET &amp; STIFT-EDITION</div>'
            f'<h1>{html.escape(meta["title"])}</h1>'
            f'<p style="margin:4pt 0 0 0; font-size:9.8pt; color:#374151;">'
            f'<b>{len(units)} visuelle 1-Seiten-Ankerblätter</b> · Jedes Kapitel startet sauber auf einer neuen Hochformat-Seite mit Farbcodierung, Schaubildern, Kunst-/Sport-Beispielen &amp; Abhak-Kästchen.</p>'
            f'</div>'
        )
        body_html = "\n".join(
            render_unit_html(u, dom, grp_colors, include_full=True, first_unit=(i == 0))
            for i, u in enumerate(units)
        )
        full_html = f"<!DOCTYPE html><html><head><meta charset='utf-8'/></head><body>{cover_html}{body_html}</body></html>"
        out_pdf = EXPORTS_DIR / meta["out"]
        write_html_to_a4_pdf(full_html, out_pdf)
        shutil.copy2(out_pdf, PUBLIC_EXPORTS_DIR / meta["out"])
        print(f"[OK] Hochformat-PDF erstellt: {meta['out']} ({out_pdf.stat().st_size // 1024} KB)")

    # Sammel-Kurzanker PDF (A, B, C kompakt)
    summary_parts = [
        '<div class="cover">'
        '<div style="font-size:9.5pt; font-weight:bold; color:#7C3AED;">SCHNELL-WIEDERHOLUNG IM HOCHFORMAT</div>'
        '<h1>Kompakte 1-Seiten-Kapitelübersichten (A, B &amp; C)</h1>'
        '<p style="margin:4pt 0 0 0; font-size:9.8pt; color:#374151;">Alle 87 Kapitel im kompakten Überblick für den entspannten Endspurt am Tablet oder iPhone.</p>'
        '</div>'
    ]
    is_first = True
    for dom in ["A", "B", "C"]:
        units = loaded_domains[dom]
        grp_colors = group_color_map(units)
        for u in units:
            summary_parts.append(render_unit_html(u, dom, grp_colors, include_full=False, first_unit=is_first))
            is_first = False

    sum_name = "Kapiteluebersichten_Kurzanker_A_B_C_Hochformat.pdf"
    sum_pdf = EXPORTS_DIR / sum_name
    write_html_to_a4_pdf(
        f"<!DOCTYPE html><html><head><meta charset='utf-8'/></head><body>{''.join(summary_parts)}</body></html>",
        sum_pdf,
    )
    shutil.copy2(sum_pdf, PUBLIC_EXPORTS_DIR / sum_name)
    print(f"[OK] Kompakte Hochformat-Übersicht erstellt: {sum_name} ({sum_pdf.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    build_all_portrait_pdfs()
