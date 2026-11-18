"""Dumps TOCs of all 3 scripts + full text of exam guidelines/papers + renders scanned pages if needed."""

from pathlib import Path
import json
import pymupdf as fitz

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "extracted_raw"


def main():
    toc_out = []
    for s in [
        "A_Lernen_und_Lehren_Skript",
        "B_Entwicklungspsychologie_Skript",
        "C_Diagnostik_Skript",
    ]:
        d = json.loads((RAW / s / f"{s}_extracted.json").read_text(encoding="utf-8"))
        toc_out.append(f"# {s} ({d['total_pages']} S.)\n")
        for p in d["pages"][:5]:
            toc_out.append(f"## Seite {p['page_no']}\n{p['text']}\n")
    (RAW / "TOCS.md").write_text("\n".join(toc_out), encoding="utf-8")

    # Render 03_Operatoren_Psychologie_KMK.pdf & 06_Klausur_Herbst_2024_Teil_Testformat.pdf pages at 220 DPI for visual inspection
    for pdf_name in [
        "03_Operatoren_Psychologie_KMK.pdf",
        "06_Klausur_Herbst_2024_Teil_Testformat.pdf",
    ]:
        pdf_path = ROOT / "02_pruefungsmaterial" / pdf_name
        out_dir = RAW / "pruefungen" / pdf_path.stem / "page_renders"
        out_dir.mkdir(parents=True, exist_ok=True)
        doc = fitz.open(pdf_path)
        for i, page in enumerate(doc, start=1):
            page.get_pixmap(dpi=220).save(out_dir / f"page_{i:02d}.png")
        doc.close()

    # Dump full text of all text-based exam files
    exam_txt = []
    for sub in sorted((RAW / "pruefungen").iterdir()):
        jp = sub / f"{sub.name}_extracted.json"
        if jp.exists():
            d = json.loads(jp.read_text(encoding="utf-8"))
            exam_txt.append(f"# {d['source_pdf']} ({d['total_pages']} S.)\n")
            for p in d["pages"]:
                exam_txt.append(f"### Seite {p['page_no']}\n{p['text']}\n")
    (RAW / "ALL_EXAMS_TEXT.md").write_text("\n".join(exam_txt), encoding="utf-8")
    print("[OK] TOCS.md, ALL_EXAMS_TEXT.md und Page-Renders erstellt.")


if __name__ == "__main__":
    main()
