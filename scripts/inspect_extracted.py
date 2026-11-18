"""Creates a complete index of chapters, page ranges, figures, bold terms, and empirical studies
across all 3 EWS Psychology scripts and all 8 exam/guideline PDFs."""

from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "extracted_raw"


def summarize_script(json_path: Path) -> str:
    data = json.loads(json_path.read_text(encoding="utf-8"))
    lines = [f"# {data['source_pdf']} ({data['total_pages']} Seiten)\n"]
    total_figs = 0
    total_vec = 0
    all_bold = []
    study_pages = []

    for p in data["pages"]:
        pno = p["page_no"]
        txt = p["text"]
        first_lines = [ln.strip() for ln in txt.splitlines() if ln.strip()][:5]
        figs = p.get("figures", [])
        vec = p.get("vector_diagram_page")
        total_figs += len(figs)
        if vec:
            total_vec += 1
        em = p.get("empirical_study_markers", [])
        if em:
            study_pages.append((pno, em[:4]))
        all_bold.extend(p.get("bold_terms_and_authors", []))
        header_preview = " | ".join(first_lines[:3])
        fig_note = ""
        if figs or vec:
            fig_note = f"  [FIGS: {', '.join(figs + ([vec] if vec else []))}]"
        lines.append(f"- **S. {pno:03d}**: {header_preview[:160]}{fig_note}")

    lines.insert(1, f"- Eingebettete Abbildungen: {total_figs}, Vektor-Schaubilder: {total_vec}")
    lines.insert(2, f"- Fett-Spans gesamt: {len(all_bold)}, Seiten mit Studien-Markern: {len(study_pages)}\n")
    return "\n".join(lines)


def main():
    out = []
    for name in [
        "A_Lernen_und_Lehren_Skript",
        "B_Entwicklungspsychologie_Skript",
        "C_Diagnostik_Skript",
    ]:
        jp = RAW / name / f"{name}_extracted.json"
        if jp.exists():
            out.append(summarize_script(jp))

    pruef_dir = RAW / "pruefungen"
    if pruef_dir.exists():
        out.append("# Prüfungsmaterialien\n")
        for sub in sorted(pruef_dir.iterdir()):
            if sub.is_dir():
                jp = sub / f"{sub.name}_extracted.json"
                if jp.exists():
                    d = json.loads(jp.read_text(encoding="utf-8"))
                    out.append(f"## {d['source_pdf']} ({d['total_pages']} S.)")
                    for p in d["pages"]:
                        preview = " ".join(p["text"].split())[:220]
                        out.append(f"  - S. {p['page_no']}: {preview}")

    (RAW / "INDEX_SUMMARY.md").write_text("\n\n".join(out), encoding="utf-8")
    print("[OK] INDEX_SUMMARY.md erstellt.")


if __name__ == "__main__":
    main()
