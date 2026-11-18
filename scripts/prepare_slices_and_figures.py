"""Prepares clean page-range slices and a complete figure manifest for lossless content authoring."""

from pathlib import Path
import json
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "extracted_raw"
PUBLIC_FIGS = ROOT / "public" / "courses" / "ews-psychologie" / "figures" / "original"
SLICES_DIR = RAW / "slices"


def main():
    PUBLIC_FIGS.mkdir(parents=True, exist_ok=True)
    SLICES_DIR.mkdir(parents=True, exist_ok=True)

    fig_manifest = {"A": [], "B": [], "C": []}
    mapping = [
        ("A", "A_Lernen_und_Lehren_Skript", [(1, 54, "a_part1"), (55, 108, "a_part2")]),
        ("B", "B_Entwicklungspsychologie_Skript", [(1, 45, "b_part1"), (46, 82, "b_part2")]),
        ("C", "C_Diagnostik_Skript", [(1, 45, "c_part1"), (46, 73, "c_part2")]),
    ]

    for dom, folder, ranges in mapping:
        src_dir = RAW / folder
        data = json.loads((src_dir / f"{folder}_extracted.json").read_text(encoding="utf-8"))
        pages = data["pages"]

        # Copy all figures >= 80x50 px and record dimensions
        for p in pages:
            pno = p["page_no"]
            all_f = list(p.get("figures", []))
            if p.get("vector_diagram_page"):
                all_f.append(p["vector_diagram_page"])
            valid_f = []
            for rel_f in all_f:
                fp = src_dir / rel_f
                if fp.exists():
                    with Image.open(fp) as im:
                        w, h = im.size
                    if w >= 80 and h >= 50:
                        dest_name = fp.name
                        shutil.copy2(fp, PUBLIC_FIGS / dest_name)
                        web_path = f"courses/ews-psychologie/figures/original/{dest_name}"
                        fig_manifest[dom].append({
                            "page_no": pno,
                            "filename": dest_name,
                            "web_path": web_path,
                            "width": w,
                            "height": h,
                        })
                        valid_f.append(web_path)
            p["clean_figures"] = valid_f

        # Write readable markdown + json slices for each part
        for start_p, end_p, tag in ranges:
            sub_pages = [p for p in pages if start_p <= p["page_no"] <= end_p]
            (SLICES_DIR / f"{tag}.json").write_text(
                json.dumps(sub_pages, indent=2, ensure_ascii=False), encoding="utf-8"
            )
            md_lines = [f"# Slice {tag} ({folder} S. {start_p}–{end_p})\n"]
            for p in sub_pages:
                md_lines.append(f"## === SEITE {p['page_no']} ===")
                if p["clean_figures"]:
                    md_lines.append(f"ORIGINAL_GRAFIKEN_AUF_SEITE: {', '.join(p['clean_figures'])}")
                if p["bold_terms_and_authors"]:
                    md_lines.append(f"FETT_BEGRIFFE_AUTOREN: {' | '.join(dict.fromkeys(p['bold_terms_and_authors']))}")
                if p["empirical_study_markers"]:
                    md_lines.append(f"UNTERSTRICHEN_EMPIRIE: {' | '.join(dict.fromkeys(p['empirical_study_markers']))}")
                md_lines.append("VOLLTEXT:")
                md_lines.append(p["text"].strip())
                md_lines.append("\n---\n")
            (SLICES_DIR / f"{tag}.md").write_text("\n".join(md_lines), encoding="utf-8")

    (RAW / "FIGURES_MANIFEST.json").write_text(
        json.dumps(fig_manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    for dom, items in fig_manifest.items():
        print(f"[OK] Domain {dom}: {len(items)} Originalgrafiken kopiert.")


if __name__ == "__main__":
    main()
