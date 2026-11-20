import React, { useEffect, useMemo, useRef, useState } from "react";
import { Drawer } from "vaul";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileDown,
  FileText,
  Headphones,
  Highlighter,
  Link2,
  List,
  Mic,
  Palette,
  Printer,
  ScrollText,
  Sparkles,
  Trophy,
  ZoomIn,
} from "lucide-react";
import { Modal } from "../design/ui";
import { VisualDiagramSvg } from "../components/VisualDiagramSvg";
import { RichText } from "../components/RichText";

const HIGHLIGHT_COLORS = [
  { id: "yellow", label: "Sonnengelb", hex: "rgba(250, 204, 21, 0.24)" },
  { id: "lilac", label: "Lila", hex: "rgba(139, 92, 246, 0.18)" },
  { id: "emerald", label: "Salbei", hex: "rgba(16, 185, 129, 0.18)" },
  { id: "blue", label: "Saphir", hex: "rgba(59, 130, 246, 0.18)" },
];

const PDF_BY_DOMAIN = {
  A: "Lernskript_A_Lernen_und_Lehren_Hochformat.pdf",
  B: "Lernskript_B_Entwicklungspsychologie_Hochformat.pdf",
  C: "Lernskript_C_Diagnostik_Hochformat.pdf",
};

export function AnchorScriptsView({
  domains = [],
  activeDomainId = "A",
  activeUnitId,
  onSelectDomain,
  onSelectUnit,
  unitProgressMap = {},
  notesMap = {},
  onUpdateProgress,
  onSaveNote,
  onOpenPodcastForUnit,
  onJumpToDomainHint,
  onDownloadExport,
}) {
  const [chapterPickerOpen, setChapterPickerOpen] = useState(false);
  const [viewMode, setViewMode] = useState("flip"); // Standard: "flip" (Blätter-Modus ohne Scrollen!) vs "scroll"
  const [slideIndex, setSlideIndex] = useState(0);
  const [zoomedFigure, setZoomedFigure] = useState(null);
  const [revealedChecks, setRevealedChecks] = useState({});
  const [showEssayRecipe, setShowEssayRecipe] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState("");
  const touchStartX = useRef(null);

  const currentDomain = useMemo(
    () => domains.find((d) => d.id === activeDomainId) || domains[0] || { id: "A", units: [] },
    [domains, activeDomainId]
  );

  const units = currentDomain.units || [];
  const currentIndex = Math.max(
    0,
    units.findIndex((u) => u.id === activeUnitId)
  );
  const unit = units[currentIndex] || units[0] || null;

  // Jedem Überpunkt eine feste, wiedererkennbare Farbe (0..5) zuordnen!
  const groupedUnits = useMemo(() => {
    const groups = [];
    for (const u of units) {
      const gTitle = u.chapter_group_title || `Kapitel ${u.chapter_group_num || ""}`;
      let last = groups[groups.length - 1];
      if (!last || last.title !== gTitle) {
        last = { title: gTitle, colorIdx: groups.length % 6, items: [] };
        groups.push(last);
      }
      last.items.push(u);
    }
    return groups;
  }, [units]);

  const currentGroupColorIdx = useMemo(() => {
    const gTitle = unit?.chapter_group_title || `Kapitel ${unit?.chapter_group_num || ""}`;
    const grp = groupedUnits.find((g) => g.title === gTitle);
    return grp ? grp.colorIdx : 0;
  }, [groupedUnits, unit]);

  // Dynamische Buch-Seiten ("Blätter") für dieses Kapitel erzeugen
  const slides = useMemo(() => {
    if (!unit) return [];
    const list = [{ id: "overview", label: "1. Überblick & Bild", short: "Bild" }];
    if (Array.isArray(unit.definitions) && unit.definitions.length > 0) {
      list.push({ id: "definitions", label: "2. Definitionen", short: "Def." });
    }
    if (
      (Array.isArray(unit.sections) && unit.sections.length > 0) ||
      (unit.comparison_table && Array.isArray(unit.comparison_table.rows) && unit.comparison_table.rows.length > 0)
    ) {
      list.push({ id: "core", label: "3. Kern & Vergleich", short: "Kern" });
    }
    if (
      (Array.isArray(unit.empirical_studies) && unit.empirical_studies.length > 0) ||
      (Array.isArray(unit.original_figures) && unit.original_figures.length > 0)
    ) {
      list.push({ id: "studies", label: "4. Studien & Grafik", short: "Studien" });
    }
    if (unit.grundschule_praxis || (Array.isArray(unit.cross_references) && unit.cross_references.length > 0)) {
      list.push({ id: "transfer", label: "5. Kunst/Sport & Brücken", short: "Praxis" });
    }
    list.push({ id: "check", label: `${list.length + 1}. Laut-Check & Notiz`, short: "Check" });
    return list;
  }, [unit]);

  // Beim Kapitelwechsel immer auf Buch-Seite 1 zurückspringen
  useEffect(() => {
    setSlideIndex(0);
  }, [unit?.id]);

  // Tastatur-Pfeile zum entspannten Umblättern am Laptop / Tablet
  useEffect(() => {
    if (viewMode !== "flip") return undefined;
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight") setSlideIndex((i) => Math.min(slides.length - 1, i + 1));
      if (e.key === "ArrowLeft") setSlideIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewMode, slides.length]);

  const progress = (unit && unitProgressMap[unit.id]) || { status: "unread", lautCheckDone: [] };
  const savedNote = (unit && notesMap[unit.id]) || { highlightColor: "yellow", text: "", binderMarker: "" };

  const [noteDraft, setNoteDraft] = useState(null);
  const effectiveNote =
    noteDraft && noteDraft.unitId === unit?.id
      ? noteDraft
      : {
          unitId: unit?.id,
          highlightColor: savedNote.highlightColor || "yellow",
          text: savedNote.text || "",
          binderMarker: savedNote.binderMarker || "",
        };

  if (!unit) {
    return <div className="lx-card">Keine Skript-Einheiten geladen.</div>;
  }

  const safeSlideIdx = Math.min(slideIndex, Math.max(0, slides.length - 1));
  const currentSlide = slides[safeSlideIdx] || slides[0];
  const checkedList = Array.isArray(progress.lautCheckDone) ? progress.lautCheckDone : [];

  const toggleCheckItem = (idx) => {
    const nextSet = new Set(checkedList);
    if (nextSet.has(idx)) nextSet.delete(idx);
    else nextSet.add(idx);
    const arr = Array.from(nextSet);
    const allDone = arr.length >= (unit.laut_erzaehl_check?.length || 5);
    onUpdateProgress(unit.id, unit.domain, {
      lautCheckDone: arr,
      lautCheckCount: arr.length,
      status: allDone ? "mastered" : progress.status === "mastered" ? "mastered" : "seen",
    });
  };

  const toggleReveal = (idx) => {
    const key = `${unit.id}:${idx}`;
    setRevealedChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const startSpeechCheck = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpokenTranscript("Sprich die 5 Punkte einfach frei laut vor dir her und hake sie unten ab!");
      return;
    }
    try {
      const rec = new SpeechRec();
      rec.lang = "de-DE";
      rec.continuous = false;
      rec.interimResults = false;
      setDictating(true);
      rec.onresult = (ev) => {
        setSpokenTranscript(ev.results?.[0]?.[0]?.transcript || "");
        setDictating(false);
      };
      rec.onerror = () => setDictating(false);
      rec.onend = () => setDictating(false);
      rec.start();
    } catch {
      setDictating(false);
    }
  };

  const activeHighlightHex = HIGHLIGHT_COLORS.find((c) => c.id === effectiveNote.highlightColor)?.hex || "transparent";
  const shouldShowBlock = (blockId) => viewMode === "scroll" || currentSlide?.id === blockId;

  const isSmallScreen = typeof window !== "undefined" && window.innerWidth < 960;

  const renderChapterListContent = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {groupedUnits.map((grp) => (
        <div key={grp.title} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className={`lx-badge lx-grp-badge-${grp.colorIdx}`} style={{ fontSize: 12 }}>
              {grp.title}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 6 }}>
            {grp.items.map((u) => {
              const isSel = u.id === unit.id;
              const mastered = unitProgressMap[u.id]?.status === "mastered";
              return (
                <button
                  key={u.id}
                  type="button"
                  className="lx-btn"
                  style={{
                    justifyContent: "space-between",
                    height: "auto",
                    minHeight: 46,
                    padding: "8px 12px",
                    textAlign: "left",
                    borderColor: isSel ? "var(--lilac)" : "var(--border)",
                    background: isSel ? "var(--lilac-soft)" : "var(--bg-subtle)",
                  }}
                  onClick={() => {
                    onSelectUnit(u.id);
                    setChapterPickerOpen(false);
                  }}
                >
                  <span style={{ fontWeight: isSel ? 700 : 600, fontSize: 12.5, flex: 1, minWidth: 0 }}>
                    {u.section_num} {u.title}
                    <div style={{ fontSize: 11, color: "var(--fg-muted)", fontWeight: 500, marginTop: 2 }}>
                      {u.page_label.replace("Original-Skript ", "")}
                    </div>
                  </span>
                  {mastered && <CheckCircle2 size={15} style={{ color: "var(--dot-success)", flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const portraitPdfName = PDF_BY_DOMAIN[unit.domain] || PDF_BY_DOMAIN.A;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} data-testid="anchor-scripts-view">
      {/* 1. OBERE STEUERZEILE: Farbcodierte 3 Skripte + Hochformat-Blätter-Modus + PDF-Download */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="lx-segmented cols-3" role="tablist" aria-label="Drei getrennte Pflichtskripte">
          {[
            { id: "A", label: "A · Lernen", sub: "108 S.", cls: "domain-badge-A" },
            { id: "B", label: "B · Entwickl.", sub: "82 S.", cls: "domain-badge-B" },
            { id: "C", label: "C · Diagnostik", sub: "73 S.", cls: "domain-badge-C" },
          ].map((tab) => {
            const active = currentDomain.id === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`lx-seg-btn ${active ? `is-active ${tab.cls}` : ""}`}
                onClick={() => onSelectDomain(tab.id)}
                data-testid={`domain-tab-${tab.id}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  padding: "5px 12px",
                  border: active ? "1px solid currentColor" : "1px solid transparent",
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 12.5 }}>{tab.label}</span>
                <span className="lx-hide-mobile" style={{ fontSize: 10.5, opacity: 0.78 }}>
                  ({tab.sub})
                </span>
              </button>
            );
          })}
        </div>

        {/* Ansicht & Hochformat-PDF Export in einer kompakten Zeile */}
        <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "nowrap", maxWidth: "100%" }}>
          <div className="lx-segmented" style={{ display: "inline-flex", width: "auto", flexWrap: "nowrap" }}>
            <button
              type="button"
              className={`lx-seg-btn ${viewMode === "flip" ? "is-active" : ""}`}
              style={{ whiteSpace: "nowrap", padding: "4px 10px" }}
              onClick={() => setViewMode("flip")}
              data-testid="view-mode-flip"
            >
              <BookOpen size={13} style={{ marginRight: 4, verticalAlign: "-2px" }} />
              <span>Blätter<span className="lx-hide-mobile">-Modus</span></span>
            </button>
            <button
              type="button"
              className={`lx-seg-btn ${viewMode === "scroll" ? "is-active" : ""}`}
              style={{ whiteSpace: "nowrap", padding: "4px 10px" }}
              onClick={() => setViewMode("scroll")}
              data-testid="view-mode-scroll"
            >
              <ScrollText size={13} style={{ marginRight: 4, verticalAlign: "-2px" }} />
              <span>Alles</span>
            </button>
          </div>

          <a
            href={`./exports/${portraitPdfName}`}
            download={portraitPdfName}
            className="lx-btn"
            style={{ textDecoration: "none", fontSize: 12.5, whiteSpace: "nowrap", minHeight: 36, padding: "4px 10px" }}
            onClick={(e) => {
              if (onDownloadExport) {
                e.preventDefault();
                onDownloadExport(portraitPdfName);
              }
            }}
            data-testid="script-download-portrait-pdf"
          >
            <FileDown size={14} style={{ color: "var(--lilac)" }} />
            <span className="lx-hide-mobile">Hochformat-PDF</span>
            <span className="lx-only-mobile">PDF</span>
          </a>

          <button
            type="button"
            className="lx-btn lx-hide-mobile"
            style={{ minHeight: 36 }}
            onClick={() => window.print()}
            title="Dieses Blatt ausdrucken"
          >
            <Printer size={14} />
          </button>
        </div>
      </div>

      {/* 2. PROMINENTER KAPITELWÄHLER ÜBER VOLLE BREITE */}
      <div
        className="lx-card no-print"
        style={{
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "nowrap",
          borderLeft: `5px solid var(--grp-${currentGroupColorIdx})`,
        }}
      >
        <button
          type="button"
          className="lx-btn"
          style={{
            flex: 1,
            minWidth: 0,
            justifyContent: "space-between",
            background: "var(--bg-subtle)",
            borderColor: `var(--grp-${currentGroupColorIdx})`,
            padding: "5px 10px",
            minHeight: 38,
          }}
          onClick={() => setChapterPickerOpen(true)}
          data-testid="open-chapter-sheet-btn"
        >
          <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, flex: 1 }}>
            <List size={14} style={{ color: `var(--grp-${currentGroupColorIdx})`, flexShrink: 0 }} />
            <span className="truncate" style={{ fontWeight: 700, fontSize: 12.5 }}>
              Kap. {unit.section_num}: {unit.title}
            </span>
          </span>
          <span className={`lx-badge lx-grp-badge-${currentGroupColorIdx}`} style={{ minHeight: 21, padding: "1px 7px", fontSize: 11, flexShrink: 0 }}>
            {currentIndex + 1}/{units.length}<span className="lx-hide-mobile"> · Kapitel ▾</span>
          </span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            className="lx-btn"
            style={{ minHeight: 38, padding: "5px 8px" }}
            disabled={currentIndex <= 0}
            onClick={() => currentIndex > 0 && onSelectUnit(units[currentIndex - 1].id)}
            title="Vorheriges Kapitel"
          >
            <ChevronLeft size={15} />
            <span className="lx-hide-mobile">Vorheriges</span>
          </button>
          <button
            type="button"
            className="lx-btn"
            style={{ minHeight: 38, padding: "5px 8px" }}
            disabled={currentIndex >= units.length - 1}
            onClick={() => currentIndex < units.length - 1 && onSelectUnit(units[currentIndex + 1].id)}
            title="Nächstes Kapitel"
          >
            <span className="lx-hide-mobile">Nächstes</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* 3. DAS VISUELLE ANKERBLATT IM VOLLFORMAT (BLÄTTER-MODUS ODER KOMPLETT) */}
      <article
        className={`lx-anchor-sheet domain-border-${unit.domain}`}
        data-testid="active-anchor-sheet"
        onTouchStart={(e) => {
          touchStartX.current = e.touches?.[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (viewMode !== "flip" || touchStartX.current === null) return;
          const dx = (e.changedTouches?.[0]?.clientX ?? touchStartX.current) - touchStartX.current;
          touchStartX.current = null;
          if (dx < -60) setSlideIndex((i) => Math.min(slides.length - 1, i + 1));
          if (dx > 60) setSlideIndex((i) => Math.max(0, i - 1));
        }}
      >
        {/* Fester farbiger Kapitel-Kopf mit Überpunkt-Farbgruppe & Original-Seitenzahl */}
        <header style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 14, borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span className={`lx-badge domain-badge-${unit.domain}`} style={{ fontWeight: 700, fontSize: 11.5 }}>
                Gebiet {unit.domain} · {unit.section_num}
              </span>
              <span className={`lx-badge lx-grp-badge-${currentGroupColorIdx}`} style={{ fontSize: 11.5 }}>
                {unit.chapter_group_title}
              </span>
              <span className="lx-badge" style={{ fontWeight: 700, color: "var(--fg)", fontSize: 11.5 }} data-testid="original-page-badge">
                <FileText size={11} />
                <span>{unit.page_label}</span>
              </span>
            </div>

            <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                className="lx-btn"
                style={{ minHeight: 34, padding: "4px 10px", fontSize: 12 }}
                onClick={() => onOpenPodcastForUnit(unit)}
              >
                <Headphones size={13} style={{ color: "var(--lilac)" }} />
                <span>Podcast</span>
              </button>
              <button
                type="button"
                className={`lx-btn ${progress.status === "mastered" ? "lx-btn-primary" : ""}`}
                style={{ minHeight: 34, padding: "4px 11px", fontSize: 12 }}
                onClick={() =>
                  onUpdateProgress(unit.id, unit.domain, {
                    status: progress.status === "mastered" ? "seen" : "mastered",
                  })
                }
                data-testid="toggle-mastered-btn"
              >
                <Check size={13} />
                <span>{progress.status === "mastered" ? "Gelernt ✓" : "Als gelernt abhaken"}</span>
              </button>
            </div>
          </div>

          <div>
            <h1 style={{ margin: "2px 0 3px", fontSize: "clamp(19px, 2.3vw, 24px)", lineHeight: 1.24 }}>
              {unit.title}
            </h1>
            {unit.subtitle && <div style={{ fontSize: 13.5, color: "var(--fg-secondary)" }}>{unit.subtitle}</div>}
          </div>

          {/* Blätter-Leiste (im Blätter-Modus sichtbar) */}
          {viewMode === "flip" && (
            <div className="lx-pill-scroll no-print" role="tablist" aria-label="Buchseiten durchblättern">
              {slides.map((sl, idx) => (
                <button
                  key={sl.id}
                  type="button"
                  role="tab"
                  aria-selected={idx === safeSlideIdx}
                  className={`lx-pill-chip ${idx === safeSlideIdx ? "is-active" : ""}`}
                  onClick={() => setSlideIndex(idx)}
                  data-testid={`slide-pill-${sl.id}`}
                >
                  {sl.label}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* BUCHSEITE 1: ÜBERBLICK & SCHAUBILD */}
        {shouldShowBlock("overview") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {unit.visual_anchor_tagline && (
              <div
                className="lx-cat-merksatz"
                style={{
                  background: activeHighlightHex !== "transparent" && effectiveNote.text ? activeHighlightHex : undefined,
                }}
              >
                <div className="lx-cat-banner">
                  <Sparkles size={13} />
                  <span>Visueller Merksatz für dein Seitengedächtnis</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", lineHeight: 1.5 }}>
                  {unit.visual_anchor_tagline}
                </div>
              </div>
            )}

            {unit.custom_visual && <VisualDiagramSvg visual={unit.custom_visual} domain={unit.domain} />}
          </div>
        )}

        {/* BUCHSEITE 2: PRÜFUNGSRELEVANTE DEFINITIONEN */}
        {shouldShowBlock("definitions") && Array.isArray(unit.definitions) && unit.definitions.length > 0 && (
          <section>
            <h2 className="lx-section-kicker" style={{ color: "var(--cat-def-fg)" }}>
              2. Prüfungsrelevante Definitionen (Wortlaut &amp; Urheber)
            </h2>
            <div className="lx-anchor-two-col">
              {unit.definitions.map((def, idx) => (
                <div key={idx} className={`lx-cat-def dom-${unit.domain}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 14, color: "var(--fg)" }}>{def.term}</strong>
                    <span className="lx-badge" style={{ background: "var(--bg-surface)", fontSize: 11, padding: "2px 8px", minHeight: 22 }}>
                      {def.author_year} · {def.page_ref}
                    </span>
                  </div>
                  <div style={{ fontSize: 13.5, color: "var(--fg-secondary)", lineHeight: 1.55 }}>
                    <RichText text={def.definition} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* BUCHSEITE 3: KERNAUSSAGEN & VERGLEICHSTABELLE */}
        {shouldShowBlock("core") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {Array.isArray(unit.sections) && unit.sections.length > 0 && (
              <section>
                <h2 className="lx-section-kicker" style={{ color: "var(--cat-kern-fg)" }}>
                  3. Strukturierte Kernaussagen &amp; Modelle
                </h2>
                <div className="lx-sections-grid">
                  {unit.sections.map((sec, sIdx) => (
                    <div key={sIdx} className="lx-cat-kern">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>{sec.heading}</h3>
                        {sec.page_ref && (
                          <span style={{ fontSize: 11.5, color: "var(--fg-muted)", flexShrink: 0 }}>{sec.page_ref}</span>
                        )}
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, lineHeight: 1.55 }}>
                        {(sec.bullets || []).map((b, bIdx) => (
                          <li key={bIdx} style={{ color: "var(--fg-secondary)" }}>
                            <RichText text={b} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {unit.comparison_table && Array.isArray(unit.comparison_table.rows) && unit.comparison_table.rows.length > 0 && (
              <section>
                <h2 className="lx-section-kicker" style={{ color: "var(--lilac)" }}>
                  Gegenüberstellung · {unit.comparison_table.title}
                </h2>
                <div className="lx-table-scroll">
                  <table className="lx-table">
                    <thead>
                      <tr>
                        {(unit.comparison_table.headers || []).map((h, i) => (
                          <th key={i}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {unit.comparison_table.rows.map((row, rIdx) => (
                        <tr key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} style={{ fontWeight: cIdx === 0 ? 700 : 400 }}>
                              <RichText text={cell} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )}

        {/* BUCHSEITE 4: EMPIRISCHE STUDIEN & ORIGINAL-ABBILDUNGEN */}
        {shouldShowBlock("studies") && (
          <div className="lx-anchor-two-col" style={{ alignItems: "start" }}>
            {Array.isArray(unit.empirical_studies) && unit.empirical_studies.length > 0 && (
              <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h2 className="lx-section-kicker" style={{ color: "var(--cat-empirie-fg)", marginBottom: 0 }}>
                  4. Empirische Schlüsselstudien &amp; Befunde
                </h2>
                {unit.empirical_studies.map((st, idx) => (
                  <div key={idx} className="lx-cat-empirie">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                      <strong style={{ fontSize: 13.5 }}>{st.title}</strong>
                      <span className="lx-badge" style={{ background: "var(--bg-surface)", fontSize: 11, minHeight: 22 }}>
                        {st.authors_year} · {st.page_ref}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.5 }}>
                      <strong>Aufbau:</strong> <RichText text={st.setup} />
                    </div>
                    <div style={{ fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.5 }}>
                      <strong>Befund:</strong> <RichText text={st.finding} />
                    </div>
                    {st.implication && (
                      <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45 }}>
                        <em>Schul-Implikation:</em> <RichText text={st.implication} />
                      </div>
                    )}
                  </div>
                ))}
              </section>
            )}

            {Array.isArray(unit.original_figures) && unit.original_figures.length > 0 && (
              <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <h2 className="lx-section-kicker" style={{ color: "var(--lilac)", marginBottom: 0 }}>
                  Original-Abbildungen ({unit.original_figures.length})
                </h2>
                {unit.original_figures.map((fig, fIdx) => (
                  <div key={fIdx} className="lx-orig-figure-frame">
                    <img src={`./${fig.path.replace(/^\.?\//, "")}`} alt={fig.caption || "Originalgrafik"} loading="lazy" />
                    <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, color: "#22262c", fontSize: 12 }}>
                      <span style={{ fontWeight: 600, lineHeight: 1.35 }}>
                        {fig.caption} ({fig.page_ref})
                      </span>
                      <button
                        type="button"
                        className="lx-btn no-print"
                        style={{ minHeight: 30, padding: "3px 9px", fontSize: 11.5, background: "#ffffff", color: "#1b1e23", flexShrink: 0 }}
                        onClick={() => setZoomedFigure(fig)}
                      >
                        <ZoomIn size={13} />
                        <span>Zoom</span>
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}

        {/* BUCHSEITE 5: KUNST/SPORT GRUNDSCHULPRAXIS & THEORIE-BRÜCKEN */}
        {shouldShowBlock("transfer") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {unit.grundschule_praxis && (
              <section>
                <h2 className="lx-section-kicker" style={{ color: "var(--cat-praxis-fg)" }}>
                  5. Grundschul-Praxis (Hauptfach Kunst &amp; Didaktikfach Sport)
                </h2>
                <div className="lx-praxis-box">
                  <div className="lx-cat-praxis">
                    <span style={{ fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 7, color: "var(--fg)" }}>
                      <Palette size={15} style={{ color: "var(--domain-a)" }} />
                      <span>Unterrichtsfach Kunst</span>
                    </span>
                    <div style={{ fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.55 }}>
                      <RichText text={unit.grundschule_praxis.kunst} />
                    </div>
                  </div>
                  <div className="lx-cat-praxis">
                    <span style={{ fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 7, color: "var(--fg)" }}>
                      <Trophy size={15} style={{ color: "var(--domain-b)" }} />
                      <span>Didaktikfach Sport</span>
                    </span>
                    <div style={{ fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.55 }}>
                      <RichText text={unit.grundschule_praxis.sport} />
                    </div>
                  </div>
                  {unit.grundschule_praxis.allgemein && (
                    <div className="lx-cat-praxis" style={{ gridColumn: "1 / -1" }}>
                      <strong style={{ fontSize: 13 }}>Klassenführung / Deutsch / Mathematik (Kl. 1–4)</strong>
                      <div style={{ fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.55 }}>
                        <RichText text={unit.grundschule_praxis.allgemein} />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {Array.isArray(unit.cross_references) && unit.cross_references.length > 0 && (
              <section>
                <h2 className="lx-section-kicker">
                  <Link2 size={13} />
                  <span>Theorie-Brücken zu den anderen Skripten</span>
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                  {unit.cross_references.map((br, idx) => (
                    <div key={idx} className="lx-card lx-card-subtle" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span className={`lx-badge domain-badge-${br.target_domain || "B"}`}>
                          Brücke zu Gebiet {br.target_domain}
                        </span>
                        <button
                          type="button"
                          className="lx-badge no-print"
                          style={{ cursor: "pointer", background: "var(--bg-surface)" }}
                          onClick={() => onJumpToDomainHint(br.target_domain, br.target_hint)}
                        >
                          Aufschlagen →
                        </button>
                      </div>
                      <strong style={{ fontSize: 13 }}>{br.target_hint}</strong>
                      <div style={{ fontSize: 12.5, color: "var(--fg-secondary)", lineHeight: 1.5 }}>
                        <RichText text={br.bridge_explanation} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {unit.essay_recipe && (
              <section className="lx-card lx-card-subtle no-print" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 13.5 }}>5-Schritte-Essay-Baukasten zu „{unit.title}“</strong>
                  <button type="button" className="lx-btn" onClick={() => setShowEssayRecipe((v) => !v)}>
                    {showEssayRecipe ? "Zuklappen" : "Essay-Rezept öffnen"}
                  </button>
                </div>
                {showEssayRecipe && (
                  <ol style={{ margin: "6px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 7, fontSize: 13, lineHeight: 1.55 }}>
                    <li><strong>Einleitung &amp; Definition:</strong> <RichText text={unit.essay_recipe.intro} /></li>
                    <li><strong>Hauptmodell:</strong> <RichText text={unit.essay_recipe.core_model} /></li>
                    <li><strong>Empirie-Beleg:</strong> <RichText text={unit.essay_recipe.empirics} /></li>
                    <li><strong>Kritik &amp; Theorie-Brücke:</strong> <RichText text={unit.essay_recipe.critique_bridge} /></li>
                    <li><strong>Grundschul-Transfer (Kunst/Sport):</strong> <RichText text={unit.essay_recipe.school_transfer} /></li>
                  </ol>
                )}
              </section>
            )}
          </div>
        )}

        {/* BUCHSEITE 6: LAUT-ERZÄHL-CHECK & EIGENE NOTIZ */}
        {shouldShowBlock("check") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <section className="lx-cat-check no-print" data-testid="laut-erzaehl-check-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15.5, color: "var(--cat-check-fg)" }}>
                    Laut-Erzähl-Check ({checkedList.length}/{(unit.laut_erzaehl_check || []).length} Ankerpunkte)
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--fg-secondary)" }}>
                    Kurz wegschauen, das Blatt frei laut nacherzählen und jeden Punkt zur Kontrolle abhaken.
                  </p>
                </div>
                <button type="button" className="lx-btn" onClick={startSpeechCheck}>
                  <Mic size={14} style={{ color: dictating ? "var(--dot-danger)" : "var(--fg-secondary)" }} />
                  <span>{dictating ? "Höre zu..." : "Optional einsprechen"}</span>
                </button>
              </div>

              {spokenTranscript && (
                <div className="lx-card" style={{ padding: "10px 13px", fontSize: 13 }}>
                  <strong>Gesprochen:</strong> {spokenTranscript}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(unit.laut_erzaehl_check || []).map((chk, idx) => {
                  const isDone = checkedList.includes(idx);
                  const isRevealed = Boolean(revealedChecks[`${unit.id}:${idx}`]) || isDone;
                  return (
                    <div
                      key={idx}
                      className="lx-card"
                      style={{
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        borderColor: isDone ? "var(--callout-success-border)" : "var(--border)",
                      }}
                    >
                      <div className="min-w-0" style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <strong style={{ fontSize: 13.5 }}>
                          {idx + 1}. {chk.term}
                        </strong>
                        {isRevealed ? (
                          <span style={{ fontSize: 12.5, color: "var(--fg-secondary)", lineHeight: 1.45 }}>
                            {chk.hint || chk.check_hint}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--fg-muted)", fontStyle: "italic" }}>
                            Prüfhinweis verdeckt – erst frei sprechen, dann Auge antippen
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <button
                          type="button"
                          className="lx-icon-btn"
                          onClick={() => toggleReveal(idx)}
                          title={isRevealed ? "Hinweis verdecken" : "Hinweis zeigen"}
                        >
                          {isRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button
                          type="button"
                          className={`lx-btn ${isDone ? "lx-btn-primary" : ""}`}
                          style={{ minHeight: 34, padding: "4px 11px" }}
                          onClick={() => toggleCheckItem(idx)}
                          data-testid={`laut-check-btn-${idx}`}
                        >
                          <Check size={13} />
                          <span>{isDone ? "Sitzt" : "Abhaken"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Eigene Markierung & Kurznotiz */}
            <section className="lx-card lx-card-subtle no-print" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 7 }}>
                  <Highlighter size={15} style={{ color: "var(--lilac)" }} />
                  <span>Eigene Notiz &amp; Textmarker ({unit.page_label})</span>
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {HIGHLIGHT_COLORS.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => {
                        const next = { ...effectiveNote, highlightColor: col.id };
                        setNoteDraft(next);
                        onSaveNote(unit.id, next);
                      }}
                      style={{
                        minHeight: 26,
                        padding: "2px 9px",
                        borderRadius: 6,
                        border: effectiveNote.highlightColor === col.id ? "2px solid var(--lilac)" : "1px solid var(--border)",
                        background: col.hex,
                        color: "var(--fg)",
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                className="lx-textarea"
                rows={2}
                placeholder={`Deine Eselsbrücke oder Randnotiz für ${unit.page_label}...`}
                value={effectiveNote.text}
                onChange={(e) => setNoteDraft({ ...effectiveNote, text: e.target.value })}
                onBlur={() => onSaveNote(unit.id, effectiveNote)}
                data-testid="unit-note-textarea"
              />
            </section>
          </div>
        )}

        {/* FOOTER NAVIGATION: IM BLÄTTER-MODUS SEITENWEISE UMBLÄTTERN, SONST KAPITEL WECHSELN */}
        <footer
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            paddingTop: 10,
            borderTop: "1px solid var(--border-subtle)",
            flexWrap: "wrap",
          }}
        >
          {viewMode === "flip" ? (
            <>
              <button
                type="button"
                className="lx-btn"
                disabled={safeSlideIdx <= 0}
                onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft size={15} />
                <span>Vorherige Seite</span>
              </button>

              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--fg-muted)" }}>
                Seite {safeSlideIdx + 1} von {slides.length} · Kap. {unit.section_num}
              </span>

              {safeSlideIdx < slides.length - 1 ? (
                <button
                  type="button"
                  className="lx-btn lx-btn-primary"
                  onClick={() => setSlideIndex((i) => Math.min(slides.length - 1, i + 1))}
                  data-testid="next-slide-btn"
                >
                  <span>Nächste Seite</span>
                  <ChevronRight size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  className="lx-btn lx-btn-primary"
                  onClick={() => {
                    onUpdateProgress(unit.id, unit.domain, { status: "mastered" });
                    if (currentIndex < units.length - 1) {
                      onSelectUnit(units[currentIndex + 1].id);
                    }
                  }}
                  data-testid="slide-complete-unit-btn"
                >
                  <Check size={15} />
                  <span>
                    {currentIndex < units.length - 1
                      ? "Kapitel sicher gelernt! (Nächstes)"
                      : "Kapitel sicher gelernt!"}
                  </span>
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                className="lx-btn"
                disabled={currentIndex <= 0}
                onClick={() => currentIndex > 0 && onSelectUnit(units[currentIndex - 1].id)}
              >
                <ChevronLeft size={15} />
                <span>Vorheriges Blatt</span>
              </button>
              <span style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>
                Blatt {currentIndex + 1} von {units.length}
              </span>
              <button
                type="button"
                className="lx-btn lx-btn-primary"
                disabled={currentIndex >= units.length - 1}
                onClick={() => currentIndex < units.length - 1 && onSelectUnit(units[currentIndex + 1].id)}
              >
                <span>Nächstes Blatt</span>
                <ChevronRight size={15} />
              </button>
            </>
          )}
        </footer>
      </article>

      {/* Original-Grafik Zoom-Modal */}
      <Modal
        open={Boolean(zoomedFigure)}
        onOpenChange={(o) => !o && setZoomedFigure(null)}
        title={zoomedFigure?.caption || "Originalgrafik"}
        subtitle={`${unit.page_label} · ${zoomedFigure?.page_ref || ""}`}
        width={920}
      >
        {zoomedFigure && (
          <div className="lx-orig-figure-frame" style={{ padding: 14 }}>
            <img src={`./${zoomedFigure.path.replace(/^\.?\//, "")}`} alt={zoomedFigure.caption} style={{ maxHeight: "70dvh", width: "auto" }} />
          </div>
        )}
      </Modal>

      {/* Farbcodierter Kapitel-Wähler (Auf Mobile Vaul Bottom-Sheet, am PC geräumiges Modal) */}
      {isSmallScreen ? (
        <Drawer.Root open={chapterPickerOpen} onOpenChange={setChapterPickerOpen}>
          <Drawer.Portal>
            <Drawer.Overlay className="lx-vaul-overlay" />
            <Drawer.Content className="lx-vaul-content" aria-describedby={undefined}>
              <div className="lx-vaul-handle" />
              <Drawer.Title style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                Kapitel wählen · {currentDomain.title}
              </Drawer.Title>
              <div style={{ overflowY: "auto", maxHeight: "68dvh", paddingBottom: 8 }}>
                {renderChapterListContent()}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      ) : (
        <Modal
          open={chapterPickerOpen}
          onOpenChange={setChapterPickerOpen}
          title={`Kapitel wählen · ${currentDomain.title}`}
          subtitle="Alle Überpunkte sind farbig codiert – suche dir direkt das gewünschte Ankerblatt aus."
          width={760}
        >
          <div style={{ marginTop: 8 }}>{renderChapterListContent()}</div>
        </Modal>
      )}
    </div>
  );
}
