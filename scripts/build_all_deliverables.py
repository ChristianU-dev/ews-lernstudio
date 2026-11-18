"""Master-Pipeline zur Erzeugung aller Liefergegenstände (100 % lokal, ohne API-Key):
1. Zusammenführung & Normalisierung aller Course-Pack-Teile in `content/courses/ews-psychologie/`
   inkl. lückenloser Zuordnung aller 79 Originalgrafiken aus den 3 Skript-PDFs.
2. Hochauflösendes (300 DPI) Rendering neuer visueller Schaubilder, Alters-Zeitstrahlen & Prozessketten
   für jedes 1-Seiten-Ankerblatt via Pillow/agg.
3. Generierung der 3 farbcodierten visuellen Word-Lernskripte (.docx), der kompakten
   1-Seiten-Kapitelübersichten (.docx) und des herzlichen Benutzerhandbuchs (.docx) in `exports/`.
4. Generierung der 3 direkt importierbaren Anki-Decks (.apkg) mit Unterstapeln & Original-Seitenverweisen.
5. Synchronisation von `exports/` nach `public/exports/` für das Offline-Download-Center der Web-App.
"""

from pathlib import Path
import html
import json
import re
import shutil
import textwrap

from PIL import Image, ImageDraw, ImageFont
import docx
from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from docx.shared import Cm, Inches, Pt, RGBColor
import genanki

ROOT = Path(__file__).resolve().parent.parent
COURSE_DIR = ROOT / "content" / "courses" / "ews-psychologie"
PARTS_DIR = COURSE_DIR / "parts"
RAW_DIR = ROOT / "extracted_raw"
GEN_DIAG_DIR = RAW_DIR / "generated_diagrams_300dpi"
EXPORTS_DIR = ROOT / "exports"
PUBLIC_EXPORTS_DIR = ROOT / "public" / "exports"

DOMAIN_STYLES = {
    "A": {
        "name": "Lernen und Lehren",
        "filename": "Lernskript_A_Lernen_und_Lehren.docx",
        "anki_file": "Anki_A_Lernen_und_Lehren.apkg",
        "deck_id": 2026111801,
        "primary_hex": "1D4ED8",
        "soft_hex": "EFF6FF",
        "border_hex": "93C5FD",
        "rgb": (29, 78, 216),
        "soft_rgb": (239, 246, 255),
    },
    "B": {
        "name": "Entwicklungspsychologie",
        "filename": "Lernskript_B_Entwicklungspsychologie.docx",
        "anki_file": "Anki_B_Entwicklungspsychologie.apkg",
        "deck_id": 2026111802,
        "primary_hex": "059669",
        "soft_hex": "ECFDF5",
        "border_hex": "6EE7B7",
        "rgb": (5, 150, 105),
        "soft_rgb": (236, 253, 245),
    },
    "C": {
        "name": "Pädagogisch-psychologische Diagnostik & Evaluation",
        "filename": "Lernskript_C_Diagnostik.docx",
        "anki_file": "Anki_C_Diagnostik.apkg",
        "deck_id": 2026111803,
        "primary_hex": "D97706",
        "soft_hex": "FFFBEB",
        "border_hex": "FCD34D",
        "rgb": (217, 119, 6),
        "soft_rgb": (255, 251, 235),
    },
}


def load_font(size_px: int, bold: bool = False):
    candidates = (
        ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/calibrib.ttf"]
        if bold
        else ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/calibri.ttf"]
    )
    for fp in candidates:
        if Path(fp).exists():
            try:
                return ImageFont.truetype(fp, size_px)
            except Exception:
                pass
    return ImageFont.load_default()


def merge_course_parts():
    fig_manifest = json.loads((RAW_DIR / "FIGURES_MANIFEST.json").read_text(encoding="utf-8"))

    domain_targets = [
        ("A", ["domain_a_part1.json", "domain_a_part2.json"], "domain_a_lernen_und_lehren.json"),
        ("B", ["domain_b_part1.json", "domain_b_part2.json"], "domain_b_entwicklungspsychologie.json"),
        ("C", ["domain_c_part1.json", "domain_c_part2.json"], "domain_c_diagnostik.json"),
    ]

    merged_domains = {}
    for dom, part_files, out_name in domain_targets:
        units = []
        source_pdf = ""
        dom_title = DOMAIN_STYLES[dom]["name"]
        for pf in part_files:
            p_path = PARTS_DIR / pf
            if not p_path.exists():
                raise FileNotFoundError(f"Fehlende Teil-Datei: {p_path}")
            pdata = json.loads(p_path.read_text(encoding="utf-8"))
            source_pdf = pdata.get("source_pdf") or source_pdf
            units.extend(pdata.get("units", []))

        units.sort(key=lambda u: (u.get("page_start", 0), u.get("id", "")))

        # Stelle sicher, dass JEDE extrahierte Originalgrafik des Skripts mindestens einer passenden Unit zugeordnet ist!
        assigned_paths = set()
        for u in units:
            u.setdefault("original_figures", [])
            for f in u["original_figures"]:
                assigned_paths.add(f["path"].lstrip("./"))

        for fig in fig_manifest.get(dom, []):
            wpath = fig["web_path"].lstrip("./")
            if wpath not in assigned_paths:
                pno = fig["page_no"]
                target_u = next(
                    (u for u in units if u.get("page_start", 0) <= pno <= u.get("page_end", 999)),
                    None,
                )
                if target_u is None and units:
                    target_u = min(units, key=lambda u: abs(u.get("page_start", 0) - pno))
                if target_u is not None:
                    target_u["original_figures"].append(
                        {
                            "path": wpath,
                            "caption": f"Original-Schaubild / Abbildung aus dem Skript (S. {pno})",
                            "page_ref": f"S. {pno}",
                        }
                    )
                    assigned_paths.add(wpath)

        bundle = {
            "domain": dom,
            "domain_title": dom_title,
            "source_pdf": source_pdf,
            "total_units": len(units),
            "units": units,
        }
        (COURSE_DIR / out_name).write_text(
            json.dumps(bundle, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        merged_domains[dom] = units
        print(f"[OK] Domain {dom} zusammengeführt: {len(units)} Ankerblätter.")

    # Karten zusammenführen
    all_cards = []
    for cf in [
        "cards_a_part1.json",
        "cards_a_part2.json",
        "cards_b_part1.json",
        "cards_b_part2.json",
        "cards_c_part1.json",
        "cards_c_part2.json",
    ]:
        c_path = PARTS_DIR / cf
        if not c_path.exists():
            raise FileNotFoundError(f"Fehlende Kartendatei: {c_path}")
        cdata = json.loads(c_path.read_text(encoding="utf-8"))
        items = cdata if isinstance(cdata, list) else cdata.get("cards", [])
        all_cards.extend(items)

    # Eindeutige IDs garantieren
    seen_ids = set()
    dedup_cards = []
    for idx, c in enumerate(all_cards, start=1):
        cid = c.get("id") or f"card-gen-{idx:04d}"
        if cid in seen_ids:
            cid = f"{cid}-{idx}"
        seen_ids.add(cid)
        c["id"] = cid
        dedup_cards.append(c)

    (COURSE_DIR / "flashcards.json").write_text(
        json.dumps(dedup_cards, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"[OK] Flashcards zusammengeführt: {len(dedup_cards)} Karten.")
    return merged_domains, dedup_cards


def render_300dpi_unit_diagram(unit: dict, out_path: Path) -> Path | None:
    vis = unit.get("custom_visual")
    if not vis or not vis.get("steps_or_rows"):
        return None

    dom = unit.get("domain", "A")
    st = DOMAIN_STYLES[dom]
    steps = vis["steps_or_rows"][:6]

    # 300 DPI Grafik (1950 px Breite = 6,5 Zoll bei echten 300 DPI!)
    W = 1950
    header_h = 135
    row_h = 175
    H = header_h + len(steps) * row_h + 45

    img = Image.new("RGB", (W, H), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    font_title = load_font(36, bold=True)
    font_badge = load_font(24, bold=True)
    font_label = load_font(27, bold=True)
    font_detail = load_font(25, bold=False)

    # Rahmen & Header
    draw.rounded_rectangle([6, 6, W - 7, H - 7], radius=28, fill=(255, 255, 255), outline=(210, 218, 230), width=4)
    draw.rounded_rectangle([10, 10, W - 11, header_h - 15], radius=22, fill=st["soft_rgb"])

    title_txt = (vis.get("title") or unit.get("title") or "Struktur-Schaubild")[:72]
    draw.text((44, 42), title_txt, fill=st["rgb"], font=font_title)

    page_lbl = unit.get("page_label", "")
    draw.text((W - 430, 48), page_lbl, fill=(90, 104, 124), font=font_badge)

    for i, step in enumerate(steps):
        y = header_h + i * row_h
        cx, cy = 88, y + 76

        if i < len(steps) - 1:
            draw.line([(cx, cy + 38), (cx, y + row_h + 38)], fill=st["rgb"], width=6)

        draw.ellipse([cx - 34, cy - 34, cx + 34, cy + 34], fill=st["soft_rgb"], outline=st["rgb"], width=5)
        draw.text((cx - 9, cy - 19), str(i + 1), fill=st["rgb"], font=font_label)

        box_x0, box_y0, box_x1, box_y1 = 152, y + 14, W - 40, y + row_h - 18
        draw.rounded_rectangle(
            [box_x0, box_y0, box_x1, box_y1],
            radius=20,
            fill=(246, 248, 252),
            outline=(216, 224, 236),
            width=3,
        )

        lbl = str(step.get("label") or f"Phase {i + 1}")
        det = str(step.get("detail") or step.get("description") or "")

        lbl_lines = textwrap.wrap(lbl, width=25)[:2]
        for li, ln in enumerate(lbl_lines):
            draw.text((box_x0 + 28, box_y0 + 26 + li * 36), ln, fill=(24, 34, 50), font=font_label)

        draw.line([(720, box_y0 + 20), (720, box_y1 - 20)], fill=(200, 210, 225), width=3)

        det_lines = textwrap.wrap(det, width=62)[:3]
        for di, ln in enumerate(det_lines):
            draw.text((750, box_y0 + 22 + di * 34), ln, fill=(58, 72, 92), font=font_detail)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, dpi=(300, 300))
    return out_path


def set_cell_shading(cell, hex_color: str):
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading)


def set_cell_margins(cell, top=110, bottom=110, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement("w:tcMar")
    for m, val in [("top", top), ("bottom", bottom), ("left", left), ("right", right)]:
        node = OxmlElement(f"w:{m}")
        node.set(qn("w:w"), str(val))
        node.set(qn("w:type"), "dxa")
        tcMar.append(node)
    tcPr.append(tcMar)


def add_formatted_runs(paragraph, text: str, base_size_pt: float = 10.0, base_color=(30, 41, 59)):
    parts = re.split(r"(\*\*[^*]+\*\*|\*[^*]+\*)", str(text or ""))
    for part in parts:
        if not part:
            continue
        if part.startswith("**") and part.endswith("**") and len(part) > 4:
            r = paragraph.add_run(part[2:-2])
            r.bold = True
            r.font.size = Pt(base_size_pt)
            r.font.color.rgb = RGBColor(15, 23, 42)
        elif part.startswith("*") and part.endswith("*") and len(part) > 2:
            r = paragraph.add_run(part[1:-1])
            r.italic = True
            r.font.size = Pt(base_size_pt)
            r.font.color.rgb = RGBColor(*base_color)
        else:
            r = paragraph.add_run(part)
            r.font.size = Pt(base_size_pt)
            r.font.color.rgb = RGBColor(*base_color)


def add_callout_box(doc: Document, title: str, body_lines: list[str], fill_hex: str, accent_rgb: tuple):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_shading(cell, fill_hex)
    set_cell_margins(cell, top=120, bottom=120, left=180, right=180)

    p0 = cell.paragraphs[0]
    p0.paragraph_format.space_before = Pt(0)
    p0.paragraph_format.space_after = Pt(3)
    rt = p0.add_run(title)
    rt.bold = True
    rt.font.size = Pt(10.5)
    rt.font.color.rgb = RGBColor(*accent_rgb)

    for ln in body_lines:
        p = cell.add_paragraph()
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(2)
        add_formatted_runs(p, ln, base_size_pt=9.8)

    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(4)


def build_domain_docx(dom: str, units: list[dict], out_file: Path):
    st = DOMAIN_STYLES[dom]
    doc = Document()

    for sec in doc.sections:
        sec.top_margin = Cm(1.6)
        sec.bottom_margin = Cm(1.6)
        sec.left_margin = Cm(1.8)
        sec.right_margin = Cm(1.8)

    normal_style = doc.styles["Normal"]
    normal_style.font.name = "Calibri"
    normal_style.font.size = Pt(10)

    # Deckblatt
    p_cov = doc.add_paragraph()
    p_cov.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r_kicker = p_cov.add_run(f"VISUELLES EWS-PSYCHOLOGIE LERNSKRIPT · GEBIET {dom}\n")
    r_kicker.bold = True
    r_kicker.font.size = Pt(12)
    r_kicker.font.color.rgb = RGBColor(*st["rgb"])

    r_main = p_cov.add_run(f"Skript {dom}: {st['name']}\n")
    r_main.bold = True
    r_main.font.size = Pt(24)
    r_main.font.color.rgb = RGBColor(15, 23, 42)

    r_sub = p_cov.add_run(
        "Maßgeschneidert für Lehramt Grundschule in Bayern (FAU Erlangen-Nürnberg)\n"
        "Unterrichtsfach Kunst · Didaktikfach Sport · Verlustfreie 1-Seiten-Ankerblätter passend zu deinem gedruckten Skript"
    )
    r_sub.font.size = Pt(11)
    r_sub.font.color.rgb = RGBColor(71, 85, 105)

    add_callout_box(
        doc,
        "So nutzt du dieses visuelle Anker-Skript optimal mit deinem 300-Seiten-Papierordner:",
        [
            "• Jede Einheit trägt rechts oben exakt die **Original-Seitenzahl** (z. B. **Original-Skript S. 8–14**), damit du die passende Stelle sofort in deinem Ausdruck aufschlagen und farbig markieren kannst.",
            "• **Null-Auslassungs-Garantie**: Alle Definitionen (inkl. Autor & Jahr), alle empirischen Studien, alle Modelle und alle Original-Abbildungen sind vollständig enthalten – ergänzt um neu gerenderte **300-DPI-Schaubilder**, **Theorie-Brücken**, **Kunst- & Sport-Unterrichtsbeispiele** und deinen **5-Punkte-Laut-Erzähl-Check**.",
        ],
        st["soft_hex"],
        st["rgb"],
    )

    # Kapitelübersicht auf dem Deckblatt
    p_toc = doc.add_paragraph()
    r_toc = p_toc.add_run("Übersicht aller visuellen Anker-Einheiten in diesem Skript:")
    r_toc.bold = True
    r_toc.font.size = Pt(11.5)
    for u in units:
        pi = doc.add_paragraph()
        pi.paragraph_format.space_before = Pt(1)
        pi.paragraph_format.space_after = Pt(1)
        add_formatted_runs(
            pi,
            f"• **Kap. {u.get('section_num', '')} — {u.get('title', '')}** ({u.get('page_label', '')})",
            base_size_pt=9.8,
        )

    doc.add_page_break()

    # Jede Unit startet auf einer frischen Anker-Seite!
    for idx, u in enumerate(units):
        if idx > 0:
            doc.add_page_break()

        # Farbiger Kapitel-Banner
        hdr_tbl = doc.add_table(rows=1, cols=1)
        hdr_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        hcell = hdr_tbl.cell(0, 0)
        set_cell_shading(hcell, st["primary_hex"])
        set_cell_margins(hcell, top=130, bottom=130, left=180, right=180)
        hp = hcell.paragraphs[0]
        hp.paragraph_format.space_after = Pt(2)
        rh1 = hp.add_run(f"GEBIET {dom} · KAPITEL {u.get('section_num', '')}   |   {u.get('page_label', '').upper()}\n")
        rh1.bold = True
        rh1.font.size = Pt(9.5)
        rh1.font.color.rgb = RGBColor(255, 255, 255)

        rh2 = hp.add_run(u.get("title", ""))
        rh2.bold = True
        rh2.font.size = Pt(15.5)
        rh2.font.color.rgb = RGBColor(255, 255, 255)

        if u.get("visual_anchor_tagline"):
            hp2 = hcell.add_paragraph()
            hp2.paragraph_format.space_before = Pt(2)
            hp2.paragraph_format.space_after = Pt(0)
            rh3 = hp2.add_run(f"Visueller Anker: {u['visual_anchor_tagline']}")
            rh3.italic = True
            rh3.font.size = Pt(9.8)
            rh3.font.color.rgb = RGBColor(238, 246, 255)

        sp = doc.add_paragraph()
        sp.paragraph_format.space_after = Pt(3)

        # 1. Definitionen
        defs = u.get("definitions") or []
        if defs:
            def_lines = [
                f"**{d.get('term', '')}** ({d.get('author_year', '')}, {d.get('page_ref', '')}): {d.get('definition', '')}"
                for d in defs
            ]
            add_callout_box(doc, "PRÜFUNGSRELEVANTE DEFINITIONEN (EXAKT + URHEBER/JAHR)", def_lines, st["soft_hex"], st["rgb"])

        # 2. Strukturierte Kern-Stichpunkte
        for sec in u.get("sections") or []:
            ps = doc.add_paragraph()
            ps.paragraph_format.space_before = Pt(5)
            ps.paragraph_format.space_after = Pt(2)
            rs = ps.add_run(f"{sec.get('heading', '')} ({sec.get('page_ref', '')})")
            rs.bold = True
            rs.font.size = Pt(11)
            rs.font.color.rgb = RGBColor(*st["rgb"])

            for b in sec.get("bullets") or []:
                pb = doc.add_paragraph()
                pb.paragraph_format.left_indent = Cm(0.45)
                pb.paragraph_format.space_before = Pt(0.5)
                pb.paragraph_format.space_after = Pt(1.5)
                add_formatted_runs(pb, f"▪ {b}", base_size_pt=9.8)

        # 3. Neu erzeugtes 300-DPI-Strukturschaubild
        diag_path = GEN_DIAG_DIR / f"{u['id']}.png"
        if render_300dpi_unit_diagram(u, diag_path) and diag_path.exists():
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(4)
            p_img.paragraph_format.space_after = Pt(4)
            p_img.add_run().add_picture(str(diag_path), width=Inches(6.2))

        # 4. Original-Abbildungen aus dem PDF
        for fig in u.get("original_figures") or []:
            rel = fig.get("path", "").lstrip("./")
            full_fig = ROOT / "public" / rel
            if full_fig.exists():
                with Image.open(full_fig) as im:
                    w_px, h_px = im.size
                disp_in = min(5.6, max(2.8, (w_px / max(h_px, 1)) * 2.3))
                pf = doc.add_paragraph()
                pf.alignment = WD_ALIGN_PARAGRAPH.CENTER
                pf.paragraph_format.space_before = Pt(4)
                pf.paragraph_format.space_after = Pt(1)
                pf.add_run().add_picture(str(full_fig), width=Inches(disp_in))

                pcap = doc.add_paragraph()
                pcap.alignment = WD_ALIGN_PARAGRAPH.CENTER
                pcap.paragraph_format.space_after = Pt(4)
                rcap = pcap.add_run(f"{fig.get('caption', 'Original-Abbildung')} ({fig.get('page_ref', '')})")
                rcap.italic = True
                rcap.font.size = Pt(8.8)
                rcap.font.color.rgb = RGBColor(100, 116, 139)

        # 5. Empirische Studien
        studies = u.get("empirical_studies") or []
        if studies:
            st_lines = []
            for s in studies:
                line = (
                    f"**{s.get('title', '')}** ({s.get('authors_year', '')}, {s.get('page_ref', '')}) — "
                    f"*Aufbau:* {s.get('setup', '')} | *Befund:* {s.get('finding', '')}"
                )
                if s.get("implication"):
                    line += f" | *Schule:* {s['implication']}"
                st_lines.append(line)
            add_callout_box(doc, "EMPIRISCHE STUDIEN & BEFUNDE", st_lines, "FFFBEB", (180, 83, 9))

        # 6. Vergleichstabelle
        ctab = u.get("comparison_table")
        if ctab and ctab.get("headers") and ctab.get("rows"):
            pt = doc.add_paragraph()
            pt.paragraph_format.space_before = Pt(4)
            pt.paragraph_format.space_after = Pt(2)
            rt = pt.add_run(f"Vergleichstabelle: {ctab.get('title', '')}")
            rt.bold = True
            rt.font.size = Pt(10.5)

            ncols = len(ctab["headers"])
            rows_data = ctab["rows"]
            tbl = doc.add_table(rows=1 + len(rows_data), cols=ncols)
            tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
            tbl.style = "Table Grid"

            for ci, htxt in enumerate(ctab["headers"]):
                c = tbl.cell(0, ci)
                set_cell_shading(c, st["soft_hex"])
                p = c.paragraphs[0]
                rh = p.add_run(str(htxt))
                rh.bold = True
                rh.font.size = Pt(9.3)

            for ri, row in enumerate(rows_data, start=1):
                for ci in range(ncols):
                    val = row[ci] if ci < len(row) else ""
                    c = tbl.cell(ri, ci)
                    p = c.paragraphs[0]
                    add_formatted_runs(p, str(val), base_size_pt=9.1)

            sp2 = doc.add_paragraph()
            sp2.paragraph_format.space_after = Pt(3)

        # 7. Grundschul-Praxisbox (Kunst & Sport)
        gp = u.get("grundschule_praxis") or {}
        if gp:
            gp_lines = []
            if gp.get("kunst"):
                gp_lines.append(f"🎨 **Hauptfach Kunst (Kl. 1–4):** {gp['kunst']}")
            if gp.get("sport"):
                gp_lines.append(f"🤸 **Didaktikfach Sport (Kl. 1–4):** {gp['sport']}")
            if gp.get("allgemein"):
                gp_lines.append(f"🏫 **Klassenführung / Deutsch / Mathe:** {gp['allgemein']}")
            add_callout_box(doc, "GRUNDSCHUL-UNTERRICHTSTRANSFER (KUNST & SPORT)", gp_lines, "ECFDF5", (5, 150, 105))

        # 8. Theorie-Brücken
        xrefs = u.get("cross_references") or []
        if xrefs:
            br_lines = [
                f"↔ **Brücke zu Gebiet {x.get('target_domain', '')} ({x.get('target_hint', '')}):** {x.get('bridge_explanation', '')}"
                for x in xrefs
            ]
            add_callout_box(doc, "VERNETZUNGS-BRÜCKEN ZU DEN ANDEREN SKRIPTEN", br_lines, "F1F5F9", (51, 65, 85))

        # 9. Laut-Erzähl-Check (5 Ankerbegriffe)
        checks = u.get("laut_erzaehl_check") or []
        if checks:
            chk_lines = [
                f"☐ **{i + 1}. {c.get('term', '')}** — {c.get('hint') or c.get('check_hint', '')}"
                for i, c in enumerate(checks)
            ]
            add_callout_box(
                doc,
                "DEIN LAUT-ERZÄHL-CHECK (BLATT KURZ WEGLEGEN & 5 ANKERPUNKTE FREI SPRECHEN!)",
                chk_lines,
                st["soft_hex"],
                st["rgb"],
            )

    out_file.parent.mkdir(parents=True, exist_ok=True)
    doc.save(out_file)
    print(f"[OK] Word-Lernskript erstellt: {out_file.name}")


def build_one_page_summaries_docx(merged_domains: dict, out_file: Path):
    doc = Document()
    for sec in doc.sections:
        sec.top_margin = Cm(1.4)
        sec.bottom_margin = Cm(1.4)
        sec.left_margin = Cm(1.6)
        sec.right_margin = Cm(1.6)

    p = doc.add_paragraph()
    r = p.add_run("KOMPAKTE 1-SEITEN-KAPITELÜBERSICHTEN (GEBIET A, B & C)\n")
    r.bold = True
    r.font.size = Pt(18)
    r2 = p.add_run(
        "Alle Ankerblätter auf je 1 kompakten Überblicksseite für deinen Endspurt & Seitengedächtnis-Abruf."
    )
    r2.font.size = Pt(10.5)

    first = True
    for dom in ["A", "B", "C"]:
        st = DOMAIN_STYLES[dom]
        for u in merged_domains.get(dom, []):
            if not first:
                doc.add_page_break()
            first = False

            add_callout_box(
                doc,
                f"1-SEITEN-ANKER · GEBIET {dom} · KAP. {u.get('section_num', '')} · {u.get('page_label', '')}",
                [
                    f"**{u.get('title', '')}** — {u.get('visual_anchor_tagline', '')}",
                ],
                st["soft_hex"],
                st["rgb"],
            )

            for d in (u.get("definitions") or [])[:3]:
                pd = doc.add_paragraph()
                pd.paragraph_format.space_after = Pt(2)
                add_formatted_runs(
                    pd,
                    f"📌 **Definition {d.get('term', '')}** ({d.get('author_year', '')}): {d.get('definition', '')}",
                    base_size_pt=9.3,
                )

            for s in (u.get("empirical_studies") or [])[:3]:
                ps = doc.add_paragraph()
                ps.paragraph_format.space_after = Pt(2)
                add_formatted_runs(
                    ps,
                    f"🔬 **Studie {s.get('authors_year', '')}** ({s.get('title', '')}): {s.get('finding', '')}",
                    base_size_pt=9.2,
                )

            gp = u.get("grundschule_praxis") or {}
            if gp:
                pg = doc.add_paragraph()
                pg.paragraph_format.space_after = Pt(3)
                add_formatted_runs(
                    pg,
                    f"🎨 **Kunst:** {gp.get('kunst', '')}\n🤸 **Sport:** {gp.get('sport', '')}",
                    base_size_pt=9.1,
                )

            checks = u.get("laut_erzaehl_check") or []
            if checks:
                add_callout_box(
                    doc,
                    "5-FINGER LAUT-ERZÄHL-CHECK",
                    [f"☐ {i+1}. **{c.get('term', '')}**: {c.get('hint') or c.get('check_hint', '')}" for i, c in enumerate(checks)],
                    "F8FAFC",
                    (30, 41, 59),
                )

    doc.save(out_file)
    print(f"[OK] 1-Seiten-Kapitelübersichten erstellt: {out_file.name}")


def build_handbook_docx(out_file: Path):
    doc = Document()
    for sec in doc.sections:
        sec.top_margin = Cm(2.0)
        sec.bottom_margin = Cm(2.0)
        sec.left_margin = Cm(2.1)
        sec.right_margin = Cm(2.1)

    p = doc.add_paragraph()
    r1 = p.add_run("DEIN PERSÖNLICHES HANDBUCH & DEINE LERNSTRATEGIE\n")
    r1.bold = True
    r1.font.size = Pt(12)
    r1.font.color.rgb = RGBColor(29, 78, 216)
    r2 = p.add_run("Entspannt, visuell & sicher durch dein EWS-Psychologie Staatsexamen im Februar\n")
    r2.bold = True
    r2.font.size = Pt(21)
    r3 = p.add_run("Speziell für dich zusammengestellt · Lehramt Grundschule Bayern · Kunst & Sport")
    r3.font.size = Pt(11)
    r3.font.color.rgb = RGBColor(100, 116, 139)

    chapters = [
        (
            "1. Warum dieses Lernstudio genau zu deinem Kopf passt",
            "EFF6FF",
            (29, 78, 216),
            [
                "Du hast zwei riesige Stärken beim Lernen: **Du merkst dir visuell, wie eine Seite aufgebaut ist**, und **du kannst Inhalte super verankern, wenn du sie laut frei vor dir hersprichst** oder sie dir vorher entspannt in einem **Podcast-Gespräch** erklären lässt.",
                "Gleichzeitig ist das Schwerste überhaupt oft gar nicht der Stoff – sondern **das Anfangen** und das Gefühl vor einem riesigen 300-Seiten-Papierberg.",
                "Genau deshalb nimmt dir dein Lernstudio diese Starthürde komplett ab: Du musst nie überlegen, womit du anfängst, und du wirst **niemals** rote „Überfällig!“-Warnungen sehen, wenn du mal einen Tag Pause machst.",
            ],
        ),
        (
            "2. Dein entspannter 32-Minuten-Alltag (Sofa, Schreibtisch & Zug)",
            "ECFDF5",
            (5, 150, 105),
            [
                "• **Schritt 1 – Der Sofa-Start (5–8 Min.):** Keine Lust, direkt an den Schreibtisch zu gehen? Öffne die App auf deinem iPhone, mach es dir auf dem Sofa gemütlich und hör dir zuerst die kurze Podcast-Folge zum heutigen Kapitel an.",
                "• **Schritt 2 – Visuelles 1-Seiten-Ankerblatt + dein Papier-Ordner (12 Min.):** Jedes Thema ist als klares Ankerblatt in seiner festen Farbe gestaltet (**Blau = Lernen & Lehren**, **Smaragdgrün = Entwicklung**, **Bernstein = Diagnostik**). Rechts oben steht immer exakt **Original-Skript S. X–Y**. Schlag genau diese Seiten in deinem ausgedruckten Ordner auf und markiere dir dort deine Lieblingsstellen mit Textmarker!",
                "• **Schritt 3 – Dein Laut-Erzähl-Check (5 Min.):** Schau kurz weg vom Bildschirm, erzähle die Seite laut vor dir her und hake die **5 Ankerbegriffe** unten auf dem Blatt ab.",
                "• **Schritt 4 – Im Zug oder zwischendurch (8 Min.):** Wische auf dem iPhone entspannt ein paar FSRS-Karten durch oder löse eine kurze Fallvignette – alles funktioniert **100 % offline** auch im Funkloch!",
                "• **Wenn du im Flow bist:** Nach deiner ~32-Minuten-Kernetappe ist dein Tagessieg sicher in der Tasche. Hast du noch Energie, klickst du einfach auf eine **„+12-Min.-Bonus-Etappe“**!",
            ],
        ),
        (
            "3. So funktioniert dein Staatsexamen in Bayern wirklich (Keine Angst vor Überraschungen!)",
            "FFFBEB",
            (180, 83, 9),
            [
                "• **4 Stunden Gesamtzeit für 3 Aufgaben (je ca. 80 Minuten):** Du bearbeitest genau eine Aufgabe aus **Gebiet A (Lernen & Lehren)**, eine aus **Gebiet B (Entwicklungspsychologie)** und eine aus **Gebiet C (Diagnostik)**.",
                "• **Freie Wahl in jedem Gebiet:** In jedem Gebiet liegen dir ein **Testformat (A1, B1, C1)** und ein **Essay (A2, B2, C2)** vor. Du darfst in der Prüfung spontan pro Gebiet wählen (z. B. dreimal Testformat oder zweimal Testformat und einmal Essay bei deinem Lieblingsthema!).",
                "• **Wie das Testformat (48 Punkte) aufgebaut ist:** Mindestens **75 % der Punkte (ca. 36–38 Punkte)** kommen aus kurzen offenen Fragen und alltagsnahen **Fallvignetten** aus der Grundschule! Diese schreibst du auf **Reinschriftpapier**. Nur Single-Choice- (1 Punkt) und Multiple-Choice-Fragen kreuzt du direkt auf dem Aufgabenblatt an.",
                "• **Der 0,5-Punkte-Vorteil bei Multiple Choice:** Jede MC-Frage hat 4 Aussagen mit „Trifft zu“ / „Trifft nicht zu“. **Jede richtig gesetzte Zeile bringt dir sicher 0,5 Punkte** (zusammen 2 Punkte, 0 bis 4 Aussagen können stimmen, niemals Minuspunkte!).",
                "• **Die zwei wichtigsten Operatoren-Tricks:** Steht dort **„Nennen Sie…“**, reichen reine Stichworte (spart enorm Zeit!). Steht dort **„Skizzieren Sie…“**, schreibe **knappe ganze Sätze** – zeichne aber **keine** Skizze!",
            ],
        ),
        (
            "4. Deine Geheimwaffe: Grundschul-Beispiele aus Kunst & Sport",
            "EFF6FF",
            (29, 78, 216),
            [
                "Viele Kandidatinnen schreiben im Examen immer dieselben Standard-Beispiele. Auf jedem deiner Ankerblätter findest du fertige, lebendige Unterrichtsideen für **Kunst** (z. B. Prozess-Portfolio als Kunstmappe, Aquarell-Modelllernen, Split-Attention-freie Werkkarten) und **Sport** (z. B. Banduras 4 Teilprozesse beim Gerätturnen, Inhibition beim Stopp-Tanz, individuelle Bezugsnorm beim Ausdauerlauf, systematische Annäherung bei Angst vor dem Sprungbock).",
                "Damit fallen dir Anwendungsaufgaben sofort leicht – und deine Antworten stechen bei der Korrektur positiv heraus!",
            ],
        ),
        (
            "5. So erstellst du dir in 60 Sekunden echte NotebookLM-Podcasts (inkl. Aha-Training!)",
            "ECFDF5",
            (5, 150, 105),
            [
                "1. Öffne im Lernstudio den Reiter **„Sofa-Podcast-Hub“**, wähle dein Kapitel (oder **„Aha-Training“** für deine persönlichen Wackelkandidaten!) und klicke auf **„1-Klick für NotebookLM kopieren“**. Dein Kapitel-Spickzettel wird automatisch gleich mitkopiert!",
                "2. Öffne mit deinem Studierenden-Account **notebooklm.google.com**, füge den kopierten Text ein und starte die Audio-Zusammenfassung.",
                "3. Ziehe die fertige MP3 per Maus in dein Lernstudio – schon kannst du sie auf dem Sofa und offline im Zug über den iPhone-Sperrbildschirm anhören!",
            ],
        ),
        (
            "6. Tagesringe, Atelier-Garten, Kalender & Fokus-Timer (Motivation ohne Druck!)",
            "FFFBEB",
            (180, 83, 9),
            [
                "• **Deine 3 Tagesringe & Tagesform-Schalter:** Wähle jeden Tag frei nach deiner Energie zwischen **🛋️ Sanft (15 Min.)**, **✨ Normal (32 Min.)** oder **🚀 Flow (50 Min.)**. Die drei Ringe (Fokuszeit, Ankerblatt, Karten-Abruf) passen sich sofort an!",
                "• **Wachsender Atelier-Garten & Pausen-Schutzschilde (🛡️):** Mit jeder gehörten Folge, jedem Ankerblatt und jeder Kartenrunde sammelst du Erfahrungspunkte (XP) und lässt deine Atelier-Pflanze vom Samenkorn bis zum goldenen Examens-Hain wachsen. Und das Wichtigste: Freie Tage sind durch **automatische Pausen-Schutzschilde** geschützt – Ruhetage kosten dich niemals deinen Fortschritt!",
                "• **Mitlernende Examens-Prognose, Kalender (.ics) & Fokus-Timer:** Die App misst sanft dein persönliches Tempo und plant automatisch **8 volle Puffertage** vor deinem Februar-Termin ein. Über den Kalender-Button oben rechts kannst du deinen Prüfungstermin + entspannte Werktags-Etappen per 1-Klick direkt in deinen **iPhone- oder Google-Kalender** eintragen.",
            ],
        ),
        (
            "7. Dein geschütztes Profil, Google-Login & weitere Studienfächer (Dein dauerhafter Studien-Buddy)",
            "EFF6FF",
            (29, 78, 216),
            [
                "• **Geschütztes Hauptprofil & eigenes Profil für Christian:** Dein Profil **„Staatsexamen (Kunst & Sport)“** trägt ein festes Schutz-Schloss, damit deine Notizen, Karten und Erfolge niemals versehentlich überschrieben oder gelöscht werden können. Über den Profil-Knopf oben links kann z. B. **Christian** jederzeit sein eigenes, komplett getrenntes Lernprofil anlegen!",
                "• **Google-Account Cloud-Sicherung:** Unter „Profile & Google-Account“ oder „Downloads & Cloud“ könnt ihr euch optional mit eurem Google-Konto verbinden, um alle Stände zwischen Laptop und iPhone zu synchronisieren.",
                "• **Für dein gesamtes restliches Studium nutzbar:** Über **„+ Eigenes Lernfach“** kannst du jederzeit neue Fächer anlegen (z. B. *Schulpädagogik*, *Allgemeine Pädagogik*, *Grundschuldidaktik*, *Kunst* oder *Sport*), eigene Vorlesungsnotizen einfügen und per 1-Klick automatisch in visuelle Ankerblätter und FSRS-Karteikarten verwandeln!",
            ],
        ),
    ]

    for title, hex_bg, rgb_col, lines in chapters:
        add_callout_box(doc, title, lines, hex_bg, rgb_col)

    doc.save(out_file)
    print(f"[OK] Benutzerhandbuch erstellt: {out_file.name}")


def md_to_anki_html(text: str) -> str:
    escaped = html.escape(str(text or ""))
    escaped = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", escaped)
    escaped = re.sub(r"\*([^*]+)\*", r"<i>\1</i>", escaped)
    return escaped.replace("\n", "<br>")


def build_anki_decks(cards: list[dict]):
    model = genanki.Model(
        1607392326,
        "EWS Psychologie Visuelles Anker-Modell",
        fields=[
            {"name": "Vorderseite"},
            {"name": "Rueckseite"},
            {"name": "OriginalSeiten"},
            {"name": "Gebiet"},
        ],
        templates=[
            {
                "name": "EWS Karte",
                "qfmt": """
                <div class="card-wrap">
                  <div class="meta"><span class="dom">Gebiet {{Gebiet}}</span> · <span class="pg">{{OriginalSeiten}}</span></div>
                  <div class="front">{{Vorderseite}}</div>
                </div>
                """,
                "afmt": """
                <div class="card-wrap">
                  <div class="meta"><span class="dom">Gebiet {{Gebiet}}</span> · <span class="pg">{{OriginalSeiten}}</span></div>
                  <div class="front">{{Vorderseite}}</div>
                  <hr id="answer">
                  <div class="back">{{Rueckseite}}</div>
                </div>
                """,
            }
        ],
        css="""
        .card { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f6f9; color: #182232; padding: 18px; }
        .nightMode.card { background: #0f141c; color: #eef3fa; }
        .card-wrap { background: #ffffff; border: 1px solid #dce2ec; border-radius: 12px; padding: 18px; max-width: 680px; margin: 0 auto; text-align: left; }
        .nightMode .card-wrap { background: #171f2b; border-color: #2c3a4f; }
        .meta { font-size: 12px; color: #67768c; font-weight: 600; margin-bottom: 10px; }
        .front { font-size: 17px; font-weight: 600; line-height: 1.45; }
        .back { font-size: 15px; line-height: 1.6; margin-top: 12px; }
        hr { border: none; border-top: 1px solid #dce2ec; margin: 14px 0; }
        """,
    )

    for dom, st in DOMAIN_STYLES.items():
        dom_cards = [c for c in cards if c.get("domain") == dom]
        decks_by_name = {}
        root_name = f"EWS Psychologie::{dom} {st['name']}"

        for idx, c in enumerate(dom_cards, start=1):
            sub = re.sub(r"[^A-Za-z0-9ÄÖÜäöüß _-]", "", str(c.get("subdeck") or "Allgemein")).strip()
            full_deck_name = f"{root_name}::{sub}"
            if full_deck_name not in decks_by_name:
                deck_id = st["deck_id"] * 100 + len(decks_by_name) + 1
                decks_by_name[full_deck_name] = genanki.Deck(deck_id, full_deck_name)

            note = genanki.Note(
                model=model,
                guid=genanki.guid_for(c["id"]),
                fields=[
                    md_to_anki_html(c.get("front", "")),
                    md_to_anki_html(c.get("back", "")),
                    html.escape(str(c.get("page_label", "Original-Skript"))),
                    html.escape(dom),
                ],
                tags=[re.sub(r"\s+", "_", str(t)) for t in (c.get("tags") or ["EWS"])],
            )
            decks_by_name[full_deck_name].add_note(note)

        pkg = genanki.Package(list(decks_by_name.values()))
        out_apkg = EXPORTS_DIR / st["anki_file"]
        pkg.write_to_file(str(out_apkg))
        print(f"[OK] Anki-Deck erstellt: {out_apkg.name} ({len(dom_cards)} Karten in {len(decks_by_name)} Unterstapeln)")


def sync_exports_to_public():
    PUBLIC_EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
    for f in EXPORTS_DIR.iterdir():
        if f.is_file():
            shutil.copy2(f, PUBLIC_EXPORTS_DIR / f.name)
    print(f"[OK] Alle Export-Dateien nach public/exports/ gespiegelt.")


def main():
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
    GEN_DIAG_DIR.mkdir(parents=True, exist_ok=True)

    merged_domains, all_cards = merge_course_parts()

    for dom in ["A", "B", "C"]:
        build_domain_docx(dom, merged_domains[dom], EXPORTS_DIR / DOMAIN_STYLES[dom]["filename"])

    build_one_page_summaries_docx(
        merged_domains, EXPORTS_DIR / "Kapiteluebersichten_1_Seiten_Anker_A_B_C.docx"
    )
    build_handbook_docx(EXPORTS_DIR / "HANDBUCH_UND_LERNSTRATEGIE.docx")
    build_anki_decks(all_cards)
    sync_exports_to_public()


if __name__ == "__main__":
    main()
