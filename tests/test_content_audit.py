from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from audit_completeness import run_audit


def test_full_completeness_audit_passes():
    report = run_audit()
    assert report["all_passed"] is True
    for dom in ("A", "B", "C"):
        d = report["domains"][dom]
        assert d["uncovered_pages"] == []
        assert d["missing_figures"] == []
        assert d["bold_coverage_pct"] >= 92.0
        assert d["praxis_kunst_sport_complete"] is True
        assert d["laut_erzaehl_5_complete"] is True
        assert d["docx_size_kb"] > 30
        assert d["apkg_size_kb"] > 5
    assert all(report["pisa_checks"].values())
    assert len(report["exam_checks"]) >= 6
    assert all(ec["valid"] for ec in report["exam_checks"])
