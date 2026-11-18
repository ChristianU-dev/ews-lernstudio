import React, { useMemo, useState } from "react";
import { Drawer } from "vaul";
import {
  BookOpen,
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
  { id: "yellow", label: "Gelb", hex: "rgba(250, 204, 21, 0.25)" },
  { id: "emerald", label: "Smaragd", hex: "rgba(16, 185, 129, 0.22)" },
  { id: "blue", label: "Blau", hex: "rgba(59, 130, 246, 0.22)" },
  { id: "coral", label: "Koralle", hex: "rgba(244, 63, 94, 0.20)" },
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
      setSpokenTranscript("Hinweis: Dein aktueller Browser unterstützt kein Live-Mikrofon-Diktat – sprich einfach laut frei und hake die 5 Punkte unten ab!");
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
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-testid="anchor-scripts-view">
      {/* Strikte 3-Skript-Trennung: A (Blau), B (Smaragdgrün), C (Bernstein) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="lx-segmented" role="tablist" aria-label="Drei getrennte Pflichtskripte">
          {[
            { id: "A", label: "Skript A · Lernen & Lehren (108 S.)" },
            { id: "B", label: "Skript B · Entwicklung (82 S.)" },
            { id: "C", label: "Skript C · Diagnostik (73 S.)" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={currentDomain.id === tab.id}
              className={`lx-seg-btn ${currentDomain.id === tab.id ? "is-active" : ""}`}
              onClick={() => onSelectDomain(tab.id)}
              data-testid={`domain-tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mobile Kapitel-Drawer Trigger (vaul Bottom-Sheet auf dem iPhone) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="lx-btn no-print"
            onClick={() => setMobileTocOpen(true)}
            data-testid="open-chapter-sheet-btn"
          >
            <List size={15} />
            <span>Kapitel ({currentIndex + 1}/{units.length})</span>
          </button>
          <button
            type="button"
            className="lx-btn no-print"
            onClick={() => window.print()}
            title="Dieses 1-Seiten-Ankerblatt ausdrucken"
          >
            <Printer size={15} />
            <span>1-Seite drucken</span>
          </button>
        </div>
      </div>

      {/* Widescreen 2-Spalten-Werkbank: Links Kapitelbaum, Rechts das visuelle 1-Seiten-Ankerblatt */}
      <div className="lx-scripts-workbench">
        <aside className="lx-card lx-chapter-rail no-print" aria-label="Kapitelverzeichnis">
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-muted)", padding: "2px 6px 6px" }}>
            {currentDomain.title} ({units.length} Ankerblätter)
          </div>
          {units.map((u) => {
            const st = unitProgressMap[u.id]?.status;
            const isSel = u.id === unit.id;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => onSelectUnit(u.id)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: isSel ? "1px solid var(--accent-border)" : "1px solid transparent",
                  background: isSel ? "var(--accent-soft)" : "transparent",
                  color: "var(--fg)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div className="min-w-0">
                  <div style={{ fontSize: 12.5, fontWeight: isSel ? 700 : 500 }} className="truncate">
                    {u.section_num} {u.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--fg-muted)" }}>{u.page_label}</div>
                </div>
                {st === "mastered" && (
                  <CheckCircle2 size={14} style={{ color: "var(--dot-success)", flexShrink: 0, marginTop: 2 }} />
                )}
              </button>
            );
          })}
        </aside>

        {/* DAS VISUELLE 1-SEITEN-ANKERBLATT */}
        <article
          className={`lx-anchor-sheet domain-border-${unit.domain}`}
          data-testid="active-anchor-sheet"
        >
          {/* Kopfzeile mit exakter Original-Seitenzahl für ihren 300-Seiten-Ordner */}
          <header style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className={`lx-badge domain-badge-${unit.domain}`} style={{ fontWeight: 700 }}>
                  Gebiet {unit.domain} · Kap. {unit.section_num}
                </span>
                <span
                  className="lx-badge"
                  style={{ fontWeight: 700, color: "var(--fg)", background: "var(--bg-subtle)" }}
                  data-testid="original-page-badge"
                >
                  <FileText size={12} />
                  <span>{unit.page_label}</span>
                </span>
                {effectiveNote.text && (
                  <span className="lx-badge" style={{ background: activeHighlightHex }}>
                    Eigene Notiz gespeichert
                  </span>
                )}
              </div>

              <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="lx-btn"
                  onClick={() => onOpenPodcastForUnit(unit)}
                >
                  <Headphones size={14} />
                  <span>Sofa-Podcast Prompt</span>
                </button>
                <button
                  type="button"
                  className={`lx-btn ${progress.status === "mastered" ? "lx-btn-primary" : ""}`}
                  onClick={() =>
                    onUpdateProgress(unit.id, unit.domain, {
                      status: progress.status === "mastered" ? "seen" : "mastered",
                    })
                  }
                  data-testid="toggle-mastered-btn"
                >
                  <Check size={14} />
                  <span>{progress.status === "mastered" ? "Sicher verankert" : "Als gelernt markieren"}</span>
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "var(--fg-muted)", fontWeight: 600 }}>
                {unit.chapter_group_title}
              </div>
              <h1 style={{ margin: "2px 0 4px", fontSize: 22, lineHeight: 1.25 }}>{unit.title}</h1>
              {unit.subtitle && (
                <div style={{ fontSize: 13.5, color: "var(--fg-secondary)" }}>{unit.subtitle}</div>
              )}
            </div>

            {unit.visual_anchor_tagline && (
              <div
                style={{
                  padding: "9px 13px",
                  borderRadius: 9,
                  background: activeHighlightHex !== "transparent" && effectiveNote.text ? activeHighlightHex : "var(--bg-subtle)",
                  border: "1px solid var(--border)",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Sparkles size={15} style={{ color: "var(--primary-bg)", flexShrink: 0 }} />
                <span>Visueller Seiten-Anker: {unit.visual_anchor_tagline}</span>
              </div>
            )}
          </header>

          {/* 16:10 Widescreen 2-Spalten-Bento: Links Definitionen & Stichpunkte, Rechts Empirie, Grafiken & Schaubild */}
          <div className="lx-anchor-bento">
            <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
              {/* Feste Definitionen mit Autor & Jahr */}
              {Array.isArray(unit.definitions) && unit.definitions.length > 0 && (
                <section style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--primary-bg)" }}>
                    Prüfungsrelevante Definitionen (Wortlaut + Urheber/Jahr)
                  </h2>
                  {unit.definitions.map((def, idx) => (
                    <div key={idx} className="lx-def-box">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 13.5 }}>{def.term}</strong>
                        <span className="lx-badge" style={{ height: 21, fontSize: 11 }}>
                          {def.author_year} · {def.page_ref}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--fg)" }}>
                        <RichText text={def.definition} />
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* Strukturierte Kern-Stichpunkte (verlustfrei verdichtet) */}
              {Array.isArray(unit.sections) &&
                unit.sections.map((sec, sIdx) => (
                  <section
                    key={sIdx}
                    className="lx-card lx-card-subtle"
                    style={{ padding: "12px 15px", display: "flex", flexDirection: "column", gap: 7 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{sec.heading}</h3>
                      {sec.page_ref && (
                        <span style={{ fontSize: 11.5, color: "var(--fg-muted)", flexShrink: 0 }}>
                          {sec.page_ref}
                        </span>
                      )}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5, fontSize: 13 }}>
                      {(sec.bullets || []).map((b, bIdx) => (
                        <li key={bIdx} style={{ color: "var(--fg-secondary)" }}>
                          <RichText text={b} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
            </div>

            {/* Rechte Bento-Spalte: Vektor-Schaubild, Originalgrafiken & Empirie-Steckbriefe */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
              {unit.custom_visual && (
                <VisualDiagramSvg visual={unit.custom_visual} domain={unit.domain} />
              )}

              {/* Eingebettete Original-Abbildungen aus den PDFs */}
              {Array.isArray(unit.original_figures) && unit.original_figures.length > 0 && (
                <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>
                    Original-Abbildungen aus deinem Skript ({unit.original_figures.length})
                  </h3>
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
                          gap: 8,
                          color: "#1e293b",
                          fontSize: 12,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>
                          {fig.caption} ({fig.page_ref})
                        </span>
                        <button
                          type="button"
                          className="lx-btn no-print"
                          style={{ height: 28, padding: "0 8px", fontSize: 11.5, background: "#fff", color: "#0f172a", borderColor: "#cbd5e1" }}
                          onClick={() => setZoomedFigure(fig)}
                        >
                          <ZoomIn size={13} />
                          <span>Vergrößern</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* Empirische Studien & Befunde */}
              {Array.isArray(unit.empirical_studies) && unit.empirical_studies.length > 0 && (
                <section style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: "var(--dot-warning)" }}>
                    Empirische Studien &amp; Befunde (Unterstrichen im Skript)
                  </h3>
                  {unit.empirical_studies.map((st, idx) => (
                    <div key={idx} className="lx-empirie-box">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 13 }}>{st.title}</strong>
                        <span className="lx-badge" style={{ height: 21, fontSize: 11 }}>
                          {st.authors_year} · {st.page_ref}
                        </span>
                      </div>
                      <div style={{ fontSize: 12.5 }}>
                        <strong>Aufbau:</strong> <RichText text={st.setup} />
                      </div>
                      <div style={{ fontSize: 12.5 }}>
                        <strong>Befund:</strong> <RichText text={st.finding} />
                      </div>
                      {st.implication && (
                        <div style={{ fontSize: 12, color: "var(--fg-secondary)" }}>
                          <em>Schul-Implikation:</em> <RichText text={st.implication} />
                        </div>
                      )}
                    </div>
                  ))}
                </section>
              )}
            </div>
          </div>

          {/* Vergleichstabelle (gekapselt gegen horizontalen Overflow) */}
          {unit.comparison_table && Array.isArray(unit.comparison_table.rows) && unit.comparison_table.rows.length > 0 && (
            <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
                Vergleichstabelle: {unit.comparison_table.title}
              </h3>
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

          {/* Grundschul-Praxisbox (Hauptfach Kunst & Didaktikfach Sport) */}
          {unit.grundschule_praxis && (
            <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--dot-success)" }}>
                Konkreter Grundschul-Unterrichtstransfer (Klasse 1–4 · Kunst &amp; Sport)
              </h3>
              <div className="lx-praxis-box">
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
                    <Palette size={14} style={{ color: "var(--primary-bg)" }} />
                    <span>Unterrichtsfach Kunst (Grundschule)</span>
                  </span>
                  <div style={{ fontSize: 12.5, color: "var(--fg-secondary)" }}>
                    <RichText text={unit.grundschule_praxis.kunst} />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
                    <Trophy size={14} style={{ color: "var(--dot-success)" }} />
                    <span>Didaktikfach Sport (Grundschule)</span>
                  </span>
                  <div style={{ fontSize: 12.5, color: "var(--fg-secondary)" }}>
                    <RichText text={unit.grundschule_praxis.sport} />
                  </div>
                </div>
                {unit.grundschule_praxis.allgemein && (
                  <div style={{ gridColumn: "1 / -1", paddingTop: 6, borderTop: "1px solid var(--callout-success-border)", fontSize: 12.5 }}>
                    <strong>Klassenführung / Deutsch / Mathe (Kl. 1–4):</strong>{" "}
                    <RichText text={unit.grundschule_praxis.allgemein} />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Vernetzungs-Brücken zu den anderen Skripten (A <-> B <-> C) */}
          {Array.isArray(unit.cross_references) && unit.cross_references.length > 0 && (
            <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <Link2 size={15} />
                <span>Theorie-Brücken zwischen den 3 Skripten (Vernetzung fürs Examen)</span>
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                {unit.cross_references.map((br, idx) => (
                  <div
                    key={idx}
                    className="lx-card lx-card-subtle"
                    style={{ padding: "11px 13px", display: "flex", flexDirection: "column", gap: 5 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                      <span className={`lx-badge domain-badge-${br.target_domain || "B"}`}>
                        Brücke zu Gebiet {br.target_domain}
                      </span>
                      <button
                        type="button"
                        className="lx-badge no-print"
                        style={{ cursor: "pointer" }}
                        onClick={() => onJumpToDomainHint(br.target_domain, br.target_hint)}
                      >
                        Öffnen →
                      </button>
                    </div>
                    <strong style={{ fontSize: 12.5 }}>{br.target_hint}</strong>
                    <div style={{ fontSize: 12.5, color: "var(--fg-secondary)" }}>
                      <RichText text={br.bridge_explanation} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* LAUT-ERZÄHL-CHECK (5 Schlüsselpunkte für ihr lautes Vor-sich-hin-Erzählen) */}
          <section
            className="lx-card no-print"
            style={{
              borderColor: "var(--accent-border)",
              background: "var(--bg-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
            data-testid="laut-erzaehl-check-section"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>
                  Laut-Erzähl-Check (5 Ankerbegriffe frei vor dir hersprechen)
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--fg-muted)" }}>
                  Schau kurz weg vom Bildschirm, erzähle die Seite laut in eigenen Worten nach und decke die Prüfpunkte zur Kontrolle auf ({checkedList.length}/{(unit.laut_erzaehl_check || []).length} abgehakt).
                </p>
              </div>
              <button type="button" className="lx-btn" onClick={startSpeechCheck}>
                <Mic size={14} style={{ color: dictating ? "var(--dot-danger)" : "var(--primary-bg)" }} />
                <span>{dictating ? "Höre zu..." : "Optional: Kurz einsprechen"}</span>
              </button>
            </div>

            {spokenTranscript && (
              <div className="lx-card" style={{ padding: "8px 12px", fontSize: 12.5 }}>
                <strong>Dein gesprochener Check:</strong> {spokenTranscript}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {(unit.laut_erzaehl_check || []).map((chk, idx) => {
                const isDone = checkedList.includes(idx);
                const isRevealed = Boolean(revealedChecks[`${unit.id}:${idx}`]) || isDone;
                return (
                  <div
                    key={idx}
                    className="lx-card"
                    style={{
                      padding: "9px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      borderColor: isDone ? "var(--callout-success-border)" : "var(--border)",
                    }}
                  >
                    <div className="min-w-0" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <strong style={{ fontSize: 13 }}>
                        {idx + 1}. {chk.term}
                      </strong>
                      <span
                        style={{
                          fontSize: 12,
                          color: isRevealed ? "var(--fg-secondary)" : "var(--fg-muted)",
                          filter: isRevealed ? "none" : "blur(4px)",
                          userSelect: isRevealed ? "text" : "none",
                          transition: "filter 150ms ease",
                        }}
                      >
                        {chk.hint || chk.check_hint}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <button
                        type="button"
                        className="lx-icon-btn"
                        onClick={() => toggleReveal(idx)}
                        title={isRevealed ? "Hinweis abdecken" : "Hinweis aufdecken"}
                      >
                        {isRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button
                        type="button"
                        className={`lx-btn ${isDone ? "lx-btn-primary" : ""}`}
                        style={{ height: 32, padding: "0 10px" }}
                        onClick={() => toggleCheckItem(idx)}
                        data-testid={`laut-check-btn-${idx}`}
                      >
                        <Check size={13} />
                        <span>{isDone ? "Sitzt!" : "Abhaken"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Digitale Markier- & Kurznotiz-Funktion (mit Bezug zum 300-Seiten-Papierordner) */}
          <section className="lx-card lx-card-subtle no-print" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                <Highlighter size={15} />
                <span>Eigene digitale Markierung &amp; Ordner-Kurznotiz ({unit.page_label})</span>
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
                      height: 26,
                      padding: "0 9px",
                      borderRadius: 6,
                      border:
                        effectiveNote.highlightColor === col.id
                          ? "2px solid var(--primary-bg)"
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
              placeholder={`Deine Eselsbrücke, Randnotiz oder Markierungshinweis für deinen Papier-Ordner (${unit.page_label})...`}
              value={effectiveNote.text}
              onChange={(e) => setNoteDraft({ ...effectiveNote, text: e.target.value })}
              onBlur={() => onSaveNote(unit.id, effectiveNote)}
              data-testid="unit-note-textarea"
            />
          </section>

          {/* 5-Schritte-Essay-Baukasten pro Kapitel */}
          {unit.essay_recipe && (
            <section className="lx-card lx-card-subtle no-print" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <strong style={{ fontSize: 13.5 }}>
                  5-Schritte-Essay-Baukasten zu „{unit.title}“ (Falls dein Traumthema als Essay drankommt!)
                </strong>
                <button type="button" className="lx-btn" onClick={() => setShowEssayRecipe((v) => !v)}>
                  {showEssayRecipe ? "Zuklappen" : "Rezept anzeigen"}
                </button>
              </div>
              {showEssayRecipe && (
                <ol style={{ margin: "4px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5 }}>
                  <li>
                    <strong>1. Einleitung &amp; Definition mit Zitat:</strong> <RichText text={unit.essay_recipe.intro} />
                  </li>
                  <li>
                    <strong>2. Theoretisches Hauptmodell:</strong> <RichText text={unit.essay_recipe.core_model} />
                  </li>
                  <li>
                    <strong>3. Empirischer Studien-Beleg:</strong> <RichText text={unit.essay_recipe.empirics} />
                  </li>
                  <li>
                    <strong>4. Kritische Einordnung &amp; Theorie-Brücke:</strong>{" "}
                    <RichText text={unit.essay_recipe.critique_bridge} />
                  </li>
                  <li>
                    <strong>5. Grundschul-Ableitung (Kunst / Sport / Kl. 1–4):</strong>{" "}
                    <RichText text={unit.essay_recipe.school_transfer} />
                  </li>
                </ol>
              )}
            </section>
          )}

          {/* Vor / Zurück Navigation zwischen den Ankerblättern */}
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
              <span>Vorheriges Ankerblatt</span>
            </button>
            <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>
              Blatt {currentIndex + 1} von {units.length}
            </span>
            <button
              type="button"
              className="lx-btn lx-btn-primary"
              disabled={currentIndex >= units.length - 1}
              onClick={() => currentIndex < units.length - 1 && onSelectUnit(units[currentIndex + 1].id)}
            >
              <span>Nächstes Ankerblatt</span>
              <ChevronRight size={15} />
            </button>
          </footer>
        </article>
      </div>

      {/* Original-Grafik Zoom-Modal (`ui.jsx`) */}
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
                    padding: "8px 12px",
                    borderColor: u.id === unit.id ? "var(--primary-bg)" : "var(--border)",
                  }}
                  onClick={() => {
                    onSelectUnit(u.id);
                    setMobileTocOpen(false);
                  }}
                >
                  <span className="truncate" style={{ fontWeight: 600 }}>
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
