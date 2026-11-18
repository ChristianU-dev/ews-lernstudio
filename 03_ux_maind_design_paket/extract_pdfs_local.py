"""100 % Lokale PDF-, Typografie- & Grafik-Extraktion via PyMuPDF (OHNE externen API-Key!).
Da alle drei Skripte und alle Klausuren digital gesetzte PDFs sind, extrahiert dieses Modul
sofort lokal:
- Vollständigen Seitentext & Struktur mit exakter Seitenzahl (`page_no`)
- Typografische Marker der Skripte (`bold` = Begriffe/Autoren, `italic` = Beispiele/Schulimplikationen, `underline` = Empirische Befunde)
- Alle eingebetteten Originalgrafiken als hochauflösende PNGs + Seiten-Renders für Vektor-Diagramme
Antigravity verarbeitet und strukturiert diese Daten direkt mit seinem eigenen Agenten-Modell weiter —
es wird KEIN Uni-Key und KEIN kostenpflichtiger Cloud-API-Key benötigt!
"""

from pathlib import Path
import json
import pymupdf as fitz  # PyMuPDF


def extract_pdf_to_structured_bundle(pdf_path: Path, out_dir: Path) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    figures_dir = out_dir / "figures"
    figures_dir.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(pdf_path)
    pages = []

    for idx in range(len(doc)):
        page = doc[idx]
        page_no = idx + 1
        bold_items, italic_items, underlined_hints = [], [], []

        # Unterstreichungen über dünne horizontale Linien / Annotationen erkennen
        drawings = page.get_drawings()
        thin_hlines = [
            d["rect"] for d in drawings
            if d.get("rect") and (d["rect"].height <= 3.0) and (d["rect"].width >= 35.0)
        ]

        blocks = page.get_text("dict").get("blocks", [])
        for b in blocks:
            for line in b.get("lines", []):
                lrect = fitz.Rect(line["bbox"])
                is_line_underlined = any(
                    abs(hr.y0 - lrect.y1) <= 5.0 and hr.x0 < lrect.x1 and hr.x1 > lrect.x0
                    for hr in thin_hlines
                )
                for span in line.get("spans", []):
                    txt = span.get("text", "").strip()
                    if not txt:
                        continue
                    flags = span.get("flags", 0)
                    font_l = span.get("font", "").lower()
                    if (flags & 16) or "bold" in font_l:
                        bold_items.append(txt)
                    if (flags & 2) or "italic" in font_l or "oblique" in font_l:
                        italic_items.append(txt)
                    if is_line_underlined or "empirischer befund" in txt.lower():
                        underlined_hints.append(txt)

        saved_figs = []
        for img_i, img_info in enumerate(page.get_images(full=True), start=1):
            xref = img_info[0]
            pix = fitz.Pixmap(doc, xref)
            if pix.width < 70 or pix.height < 70:
                continue
            rects = page.get_image_rects(xref)
            fname = f"{pdf_path.stem}_S{page_no:03d}_Abb{img_i}.png"
            fpath = figures_dir / fname
            if rects:
                r = rects[0] & page.rect
                if not r.is_empty and r.width >= 10 and r.height >= 10:
                    eff_dpi = (pix.width / max(r.width, 1.0)) * 72.0
                    if eff_dpi < 260:
                        clip_r = fitz.Rect(
                            max(0, r.x0 - 8),
                            max(0, r.y0 - 8),
                            min(page.rect.width, r.x1 + 8),
                            min(page.rect.height, r.y1 + 12),
                        ) & page.rect
                        if not clip_r.is_empty and clip_r.width >= 10 and clip_r.height >= 10:
                            page.get_pixmap(dpi=300, clip=clip_r).save(fpath)
                            saved_figs.append(f"figures/{fname}")
                            continue
            if pix.n - pix.alpha > 3:
                pix = fitz.Pixmap(fitz.csRGB, pix)
            pix.save(fpath)
            saved_figs.append(f"figures/{fname}")

        # Vektor-Schaubilder (Pfeile/Boxen) in hoher HiDPI-Auflösung (300 DPI) sichern
        vector_diagram = None
        substantial_drawings = [
            d["rect"] for d in drawings
            if d.get("rect") and (d["rect"].width > 8 or d["rect"].height > 8)
            and not (d["rect"].height <= 3.0 and d["rect"].width >= 35.0)
        ]
        if len(substantial_drawings) >= 8:
            union_rect = substantial_drawings[0]
            for r in substantial_drawings[1:]:
                union_rect = union_rect | r
            # Nur echte Schaubild-Flächen (nicht bloße Seitenränder) mit kleinem Rand (14 pt) rendern
            if union_rect.height >= 45 and union_rect.width >= 90:
                clip_rect = fitz.Rect(
                    max(0, union_rect.x0 - 18),
                    max(0, union_rect.y0 - 18),
                    min(page.rect.width, union_rect.x1 + 18),
                    min(page.rect.height, union_rect.y1 + 22),
                ) & page.rect
                if not clip_rect.is_empty and clip_rect.width >= 10 and clip_rect.height >= 10:
                    vname = f"{pdf_path.stem}_S{page_no:03d}_Schaubild.png"
                    vpath = figures_dir / vname
                    page.get_pixmap(dpi=300, clip=clip_rect).save(vpath)
                    vector_diagram = f"figures/{vname}"

        pages.append({
            "page_no": page_no,
            "text": page.get_text("text"),
            "bold_terms_and_authors": bold_items,
            "italic_examples_and_implications": italic_items,
            "empirical_study_markers": underlined_hints,
            "figures": saved_figs,
            "vector_diagram_page": vector_diagram,
        })

    doc.close()
    bundle = {
        "source_pdf": pdf_path.name,
        "total_pages": len(pages),
        "pages": pages,
    }
    (out_dir / f"{pdf_path.stem}_extracted.json").write_text(
        json.dumps(bundle, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return bundle


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    for pdf in sorted((root / "01_skripte").glob("*.pdf")):
        target = root / "extracted_raw" / pdf.stem
        if (target / f"{pdf.stem}_extracted.json").exists():
            print(f"[SKIP-OK] {pdf.name} bereits extrahiert.")
            continue
        res = extract_pdf_to_structured_bundle(pdf, target)
        print(f"[OK] {pdf.name}: {res['total_pages']} Seiten lokal extrahiert.")
    for pdf in sorted((root / "02_pruefungsmaterial").glob("*.pdf")):
        target = root / "extracted_raw" / "pruefungen" / pdf.stem
        res = extract_pdf_to_structured_bundle(pdf, target)
        print(f"[OK] {pdf.name}: {res['total_pages']} Seiten lokal extrahiert.")
