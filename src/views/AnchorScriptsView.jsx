import React, { useMemo, useState } from "react";
import { Drawer } from "vaul";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Headphones,
  Highlighter,
  Link2,
  List,
  Mic,
  Palette,
  Printer,
  Sparkles,
  Trophy,
  ZoomIn,
} from "lucide-react";
import { Modal } from "../design/ui";
import { VisualDiagramSvg } from "../components/VisualDiagramSvg";
import { RichText } from "../components/RichText";

const HIGHLIGHT_COLORS = [
  { id: "yellow", label: "Sandgelb", hex: "rgba(217, 160, 60, 0.20)" },
  { id: "emerald", label: "Salbei", hex: "rgba(45, 116, 89, 0.16)" },
  { id: "blue", label: "Schieferblau", hex: "rgba(53, 99, 130, 0.16)" },
  { id: "coral", label: "Terracotta", hex: "rgba(185, 80, 65, 0.16)" },
];

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
}) {
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [zoomedFigure, setZoomedFigure] = useState(null);
  const [revealedChecks, setRevealedChecks] = useState({});
  const [showEssayRecipe, setShowEssayRecipe] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState("");

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

  const groupedUnits = useMemo(() => {
    const groups = [];
    for (const u of units) {
      const gTitle = u.chapter_group_title || `Kapitel ${u.chapter_group_num || ""}`;
      let last = groups[groups.length - 1];
      if (!last || last.title !== gTitle) {
        last = { title: gTitle, items: [] };
        groups.push(last);
      }
      last.items.push(u);
    }
    return groups;
  }, [units]);

  const progress = (unit && unitProgressMap[unit.id]) || {
    status: "unread",
    lautCheckDone: [],
  };
  const savedNote = (unit && notesMap[unit.id]) || {
    highlightColor: "yellow",
    text: "",
    binderMarker: "",
  };

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

  const checkedList = Array.isArray(progress.lautCheckDone) ? progress.lautCheckDone : [];

  const toggleCheckItem = (idx) => {
    const nextSet = new Set(checkedList);
    if (nextSet.has(idx)) nextSet.delete(idx);
    else nextSet.add(idx);
    const arr = Array.from(nextSet);
    const allFive = arr.length >= (unit.laut_erzaehl_check?.length || 5);
    onUpdateProgress(unit.id, unit.domain, {
      lautCheckDone: arr,
      lautCheckCount: arr.length,
      status: allFive ? "mastered" : progress.status === "mastered" ? "mastered" : "seen",
    });
  };

  const toggleReveal = (idx) => {
    const key = `${unit.id}:${idx}`;
    setRevealedChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const startSpeechCheck = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpokenTranscript(
        "Sprich die 5 Punkte einfach frei laut vor dir her und hake sie unten ab!"
      );
      return;
    }
    try {
      const rec = new SpeechRec();
      rec.lang = "de-DE";
      rec.continuous = false;
      rec.interimResults = false;
      setDictating(true);
      rec.onresult = (ev) => {
        const txt = ev.results?.[0]?.[0]?.transcript || "";
        setSpokenTranscript(txt);
        setDictating(false);
      };
      rec.onerror = () => setDictating(false);
      rec.onend = () => setDictating(false);
      rec.start();
    } catch {
      setDictating(false);
    }
  };

  const activeHighlightHex =
    HIGHLIGHT_COLORS.find((c) => c.id === effectiveNote.highlightColor)?.hex || "transparent";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} data-testid="anchor-scripts-view">
      {/* Ruhige 3-Skript-Umschaltung + kompakte Aktionszeile */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div className="lx-segmented cols-3" role="tablist" aria-label="Drei getrennte Pflichtskripte">
          {[
            { id: "A", label: "A · Lernen", deskSub: "108 S." },
            { id: "B", label: "B · Entwickl.", deskSub: "82 S." },
            { id: "C", label: "C · Diagnostik", deskSub: "73 S." },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={currentDomain.id === tab.id}
              className={`lx-seg-btn ${currentDomain.id === tab.id ? "is-active" : ""}`}
              onClick={() => onSelectDomain(tab.id)}
              data-testid={`domain-tab-${tab.id}`}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "5px 10px" }}
            >
              <span style={{ fontWeight: 700, fontSize: 12 }}>{tab.label}</span>
              <span className="lx-hide-mobile" style={{ fontSize: 10.5, color: "var(--fg-muted)", fontWeight: 500 }}>
                ({tab.deskSub})
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 240px", minWidth: 0, maxWidth: "100%", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="lx-btn lx-only-mobile no-print"
            style={{ minHeight: 38, padding: "5px 11px", width: "100%", maxWidth: "100%", minWidth: 0, justifyContent: "space-between", overflow: "hidden" }}
            onClick={() => setMobileTocOpen(true)}
            data-testid="open-chapter-sheet-btn"
          >
            <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, flex: 1 }}>
              <List size={14} style={{ flexShrink: 0 }} />
              <span className="truncate" style={{ fontSize: 12.5 }}>Kap. {unit.section_num}: {unit.title}</span>
            </span>
            <span className="lx-badge" style={{ minHeight: 20, padding: "1px 6px", fontSize: 10.5, flexShrink: 0 }}>
              {currentIndex + 1}/{units.length}
            </span>
          </button>
          <button
            type="button"
            className="lx-btn lx-hide-mobile no-print"
            onClick={() => window.print()}
            title="Dieses 1-Seiten-Ankerblatt ausdrucken"
          >
            <Printer size={14} />
            <span>1-Seite drucken</span>
          </button>
        </div>
      </div>

      {/* Widescreen 2-Spalten-Werkbank */}
      <div className="lx-scripts-workbench">
        <aside className="lx-card lx-chapter-rail no-print" aria-label="Kapitelverzeichnis">
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--fg-muted)", padding: "2px 8px 6px" }}>
            {currentDomain.title}
          </div>

          {groupedUnits.map((grp, gIdx) => (
            <div key={gIdx} style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--fg-muted)",
                  padding: "6px 8px 3px",
                  lineHeight: 1.3,
                }}
              >
                {grp.title}
              </div>
              {grp.items.map((u) => {
                const st = unitProgressMap[u.id]?.status;
                const isSel = u.id === unit.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    className={`lx-chapter-btn ${isSel ? "is-selected" : ""}`}
                    onClick={() => onSelectUnit(u.id)}
                  >
                    <div className="min-w-0" style={{ flex: 1 }}>
                      <div
                        className="lx-chapter-title"
                        style={{ fontWeight: isSel ? 600 : 500, color: isSel ? "var(--fg)" : "var(--fg-secondary)" }}
                      >
                        {u.section_num} {u.title}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>
                        {u.page_label.replace("Original-Skript ", "")}
                      </div>
                    </div>
                    {st === "mastered" && (
                      <CheckCircle2 size={14} style={{ color: "var(--dot-success)", flexShrink: 0, marginTop: 2 }} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* DAS VISUELLE 1-SEITEN-ANKERBLATT (Editorial Buchseiten-Ästhetik) */}
        <article
          className={`lx-anchor-sheet domain-border-${unit.domain}`}
          data-testid="active-anchor-sheet"
        >
          {/* 1. Ruhiger Seitenkopf mit exaktem Ordner-Seitenverweis */}
          <header style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 14, borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span className={`lx-badge domain-badge-${unit.domain}`} style={{ fontWeight: 600, fontSize: 11.5, padding: "2px 8px" }}>
                  {unit.domain} · {unit.section_num}
                </span>
                <span
                  className="lx-badge"
                  style={{ fontWeight: 700, color: "var(--fg)", fontSize: 11.5, padding: "2px 8px" }}
                  data-testid="original-page-badge"
                >
                  <FileText size={11} />
                  <span>{unit.page_label}</span>
                </span>
                {effectiveNote.text && (
                  <span className="lx-badge" style={{ background: activeHighlightHex, fontSize: 11 }}>
                    Notiz
                  </span>
                )}
              </div>

              <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  className="lx-btn"
                  style={{ minHeight: 32, padding: "4px 10px", fontSize: 12 }}
                  onClick={() => onOpenPodcastForUnit(unit)}
                >
                  <Headphones size={13} />
                  <span>Audio</span>
                </button>
                <button
                  type="button"
                  className={`lx-btn ${progress.status === "mastered" ? "lx-btn-primary" : ""}`}
                  style={{ minHeight: 32, padding: "4px 10px", fontSize: 12 }}
                  onClick={() =>
                    onUpdateProgress(unit.id, unit.domain, {
                      status: progress.status === "mastered" ? "seen" : "mastered",
                    })
                  }
                  data-testid="toggle-mastered-btn"
                >
                  <Check size={13} />
                  <span>{progress.status === "mastered" ? "Gelernt ✓" : "Gelernt"}</span>
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11.5, color: "var(--fg-muted)", fontWeight: 500 }}>
                {unit.chapter_group_title}
              </div>
              <h1 style={{ margin: "2px 0 4px", fontSize: "clamp(19px, 2.3vw, 24px)", lineHeight: 1.24 }}>
                {unit.title}
              </h1>
              {unit.subtitle && (
                <div style={{ fontSize: 13, color: "var(--fg-secondary)" }}>{unit.subtitle}</div>
              )}
            </div>

            {unit.visual_anchor_tagline && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  background:
                    activeHighlightHex !== "transparent" && effectiveNote.text
                      ? activeHighlightHex
                      : "var(--bg-subtle)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: 13.5,
                  color: "var(--fg)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 9,
                }}
              >
                <Sparkles size={15} style={{ color: `var(--domain-${unit.domain.toLowerCase()})`, flexShrink: 0, marginTop: 3 }} />
                <span>
                  <strong>Visueller Merksatz:</strong> {unit.visual_anchor_tagline}
                </span>
              </div>
            )}
          </header>

          {/* 2. VOLLE BREITE: Visuelles Struktur-Schaubild / Alters-Zeitstrahl (100% lesbar!) */}
          {unit.custom_visual && (
            <VisualDiagramSvg visual={unit.custom_visual} domain={unit.domain} />
          )}

          {/* 3. Prüfungsrelevante Definitionen (2-spaltiges ruhiges Editorial-Grid ohne blaue Kastenflut!) */}
          {Array.isArray(unit.definitions) && unit.definitions.length > 0 && (
            <section>
              <h2 className="lx-section-kicker">
                Prüfungsrelevante Definitionen (Wortlaut &amp; Urheber)
              </h2>
              <div className="lx-anchor-two-col">
                {unit.definitions.map((def, idx) => (
                  <div key={idx} className={`lx-def-box dom-${unit.domain}`}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                      <strong style={{ fontSize: 13.5, color: "var(--fg)" }}>{def.term}</strong>
                      <span
                        className="lx-badge"
                        style={{ background: "var(--bg-surface)", fontSize: 11, padding: "2px 8px", minHeight: 22 }}
                      >
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

          {/* 4. Strukturierte Kern-Stichpunkte in ruhigen Magazin-Karten */}
          {Array.isArray(unit.sections) && unit.sections.length > 0 && (
            <section>
              <h2 className="lx-section-kicker">Strukturierte Kernaussagen &amp; Modelle</h2>
              <div className="lx-sections-grid">
                {unit.sections.map((sec, sIdx) => (
                  <div
                    key={sIdx}
                    className="lx-card lx-card-subtle"
                    style={{ padding: "15px 17px", display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, lineHeight: 1.3 }}>
                        {sec.heading}
                      </h3>
                      {sec.page_ref && (
                        <span style={{ fontSize: 11.5, color: "var(--fg-muted)", flexShrink: 0 }}>
                          {sec.page_ref}
                        </span>
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

          {/* 5. Original-Abbildungen aus dem PDF & Empirische Studien nebeneinander */}
          {((Array.isArray(unit.original_figures) && unit.original_figures.length > 0) ||
            (Array.isArray(unit.empirical_studies) && unit.empirical_studies.length > 0)) && (
            <div className="lx-anchor-two-col" style={{ alignItems: "start" }}>
              {Array.isArray(unit.empirical_studies) && unit.empirical_studies.length > 0 && (
                <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <h2 className="lx-section-kicker" style={{ marginBottom: 0 }}>
                    Empirische Schlüsselstudien &amp; Befunde
                  </h2>
                  {unit.empirical_studies.map((st, idx) => (
                    <div key={idx} className="lx-empirie-box">
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
                  <h2 className="lx-section-kicker" style={{ marginBottom: 0 }}>
                    Original-Abbildungen aus deinem Skript ({unit.original_figures.length})
                  </h2>
                  {unit.original_figures.map((fig, fIdx) => (
                    <div key={fIdx} className="lx-orig-figure-frame">
                      <img
                        src={`./${fig.path.replace(/^\.?\//, "")}`}
                        alt={fig.caption || "Originalgrafik aus dem Skript"}
                        loading="lazy"
                      />
                      <div
                        style={{
                          width: "100%",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                          color: "#22262c",
                          fontSize: 12,
                        }}
                      >
                        <span style={{ fontWeight: 500, lineHeight: 1.35 }}>
                          {fig.caption} ({fig.page_ref})
                        </span>
                        <button
                          type="button"
                          className="lx-btn no-print"
                          style={{
                            minHeight: 30,
                            padding: "3px 9px",
                            fontSize: 11.5,
                            background: "#ffffff",
                            color: "#1b1e23",
                            borderColor: "#cfc9bc",
                            flexShrink: 0,
                          }}
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

          {/* 6. Vergleichstabelle */}
          {unit.comparison_table && Array.isArray(unit.comparison_table.rows) && unit.comparison_table.rows.length > 0 && (
            <section>
              <h2 className="lx-section-kicker">
                Vergleichstabelle · {unit.comparison_table.title}
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
                          <td key={cIdx} style={{ fontWeight: cIdx === 0 ? 600 : 400 }}>
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

          {/* 7. Grundschul-Praxisbox (Kunst & Sport) */}
          {unit.grundschule_praxis && (
            <section>
              <h2 className="lx-section-kicker">
                Grundschul-Praxis (Klassen 1–4 · Hauptfach Kunst &amp; Didaktikfach Sport)
              </h2>
              <div className="lx-praxis-box">
                <div className="lx-praxis-card">
                  <span style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 7, color: "var(--fg)" }}>
                    <Palette size={15} style={{ color: "var(--domain-a)" }} />
                    <span>Unterrichtsfach Kunst</span>
                  </span>
                  <div style={{ fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.55 }}>
                    <RichText text={unit.grundschule_praxis.kunst} />
                  </div>
                </div>
                <div className="lx-praxis-card">
                  <span style={{ fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 7, color: "var(--fg)" }}>
                    <Trophy size={15} style={{ color: "var(--domain-b)" }} />
                    <span>Didaktikfach Sport</span>
                  </span>
                  <div style={{ fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.55 }}>
                    <RichText text={unit.grundschule_praxis.sport} />
                  </div>
                </div>
                {unit.grundschule_praxis.allgemein && (
                  <div className="lx-praxis-card" style={{ gridColumn: "1 / -1" }}>
                    <strong style={{ fontSize: 13, color: "var(--fg)" }}>
                      Klassenführung / Deutsch / Mathematik (Kl. 1–4)
                    </strong>
                    <div style={{ fontSize: 13, color: "var(--fg-secondary)", lineHeight: 1.55 }}>
                      <RichText text={unit.grundschule_praxis.allgemein} />
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 8. Theorie-Brücken */}
          {Array.isArray(unit.cross_references) && unit.cross_references.length > 0 && (
            <section>
              <h2 className="lx-section-kicker">
                <Link2 size={13} />
                <span>Theorie-Brücken zu den anderen beiden Skripten</span>
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                {unit.cross_references.map((br, idx) => (
                  <div
                    key={idx}
                    className="lx-card lx-card-subtle"
                    style={{ padding: "13px 15px", display: "flex", flexDirection: "column", gap: 6 }}
                  >
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

          {/* 9. LAUT-ERZÄHL-CHECK (5 Ankerpunkte) */}
          <section
            className="lx-card lx-card-subtle no-print"
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
            data-testid="laut-erzaehl-check-section"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15.5 }}>
                  Laut-Erzähl-Check ({checkedList.length}/{(unit.laut_erzaehl_check || []).length} Ankerpunkte)
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--fg-muted)" }}>
                  Schau kurz weg, erzähle das Ankerblatt frei laut nach und klappe die Prüfpunkte zur Kontrolle auf.
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

          {/* 10. Eigene Markierung & Kurznotiz */}
          <section className="lx-card lx-card-subtle no-print" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 7 }}>
                <Highlighter size={15} />
                <span>Eigene Notiz &amp; Papier-Ordner-Vermerk ({unit.page_label})</span>
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
                      border:
                        effectiveNote.highlightColor === col.id
                          ? "1.5px solid var(--fg)"
                          : "1px solid var(--border)",
                      background: col.hex,
                      color: "var(--fg)",
                      fontSize: 11.5,
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

          {/* 11. 5-Schritte-Essay-Baukasten */}
          {unit.essay_recipe && (
            <section className="lx-card lx-card-subtle no-print" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 13.5 }}>
                  5-Schritte-Essay-Baukasten zu „{unit.title}“
                </strong>
                <button type="button" className="lx-btn" onClick={() => setShowEssayRecipe((v) => !v)}>
                  {showEssayRecipe ? "Zuklappen" : "Essay-Rezept öffnen"}
                </button>
              </div>
              {showEssayRecipe && (
                <ol style={{ margin: "6px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 7, fontSize: 13, lineHeight: 1.55 }}>
                  <li>
                    <strong>Einleitung &amp; Definition:</strong> <RichText text={unit.essay_recipe.intro} />
                  </li>
                  <li>
                    <strong>Hauptmodell:</strong> <RichText text={unit.essay_recipe.core_model} />
                  </li>
                  <li>
                    <strong>Empirie-Beleg:</strong> <RichText text={unit.essay_recipe.empirics} />
                  </li>
                  <li>
                    <strong>Kritik &amp; Theorie-Brücke:</strong> <RichText text={unit.essay_recipe.critique_bridge} />
                  </li>
                  <li>
                    <strong>Grundschul-Transfer (Kunst/Sport):</strong>{" "}
                    <RichText text={unit.essay_recipe.school_transfer} />
                  </li>
                </ol>
              )}
            </section>
          )}

          {/* Vor / Zurück */}
          <footer
            className="no-print"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, paddingTop: 6 }}
          >
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
          </footer>
        </article>
      </div>

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
            <img
              src={`./${zoomedFigure.path.replace(/^\.?\//, "")}`}
              alt={zoomedFigure.caption}
              style={{ maxHeight: "70dvh", width: "auto" }}
            />
          </div>
        )}
      </Modal>

      {/* Vaul Bottom-Sheet für Kapitelauswahl auf dem iPhone */}
      <Drawer.Root open={mobileTocOpen} onOpenChange={setMobileTocOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="lx-vaul-overlay" />
          <Drawer.Content className="lx-vaul-content" aria-describedby={undefined}>
            <div className="lx-vaul-handle" />
            <Drawer.Title style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Kapitel wählen · {currentDomain.title}
            </Drawer.Title>
            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, maxHeight: "65dvh" }}>
              {units.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="lx-btn"
                  style={{
                    justifyContent: "space-between",
                    height: "auto",
                    minHeight: 46,
                    padding: "9px 12px",
                    textAlign: "left",
                    borderColor: u.id === unit.id ? "var(--fg)" : "var(--border)",
                  }}
                  onClick={() => {
                    onSelectUnit(u.id);
                    setMobileTocOpen(false);
                  }}
                >
                  <span style={{ fontWeight: u.id === unit.id ? 700 : 500, flex: 1 }}>
                    {u.section_num} {u.title}
                  </span>
                  <span className="lx-badge" style={{ flexShrink: 0 }}>
                    {u.page_label.replace("Original-Skript ", "")}
                  </span>
                </button>
              ))}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
