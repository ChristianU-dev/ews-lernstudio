import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Compass,
  FileText,
  HelpCircle,
  PenTool,
  Scale,
} from "lucide-react";
import { Select } from "../design/ui";
import {
  scoreSingleChoice,
  scoreMultipleChoice,
  evaluateOpenResponse,
  validateTestformatSet,
} from "../lib/examScoring";
import { RichText } from "../components/RichText";

export function ExamSimulatorView({
  examBank = {},
  operatorsData = {},
  initialSetId = null,
  onRecordExamAttempt,
}) {
  const [subTab, setSubTab] = useState("testformat");
  const testSets = examBank?.testformat_sets || [];
  const essaySets = examBank?.essay_sets || [];
  const operators = operatorsData?.operators || [];
  const operatorDrills = operatorsData?.operator_drills || [];

  const [selectedSetId, setSelectedSetId] = useState(
    () => initialSetId || testSets[0]?.id || ""
  );
  const activeSet = useMemo(
    () => testSets.find((s) => s.id === selectedSetId) || testSets[0] || null,
    [testSets, selectedSetId]
  );

  // Antworten für das aktive Testformat-Set
  const [openTexts, setOpenTexts] = useState({});
  const [openRubrics, setOpenRubrics] = useState({});
  const [scAnswers, setScAnswers] = useState({});
  const [mcAnswers, setMcAnswers] = useState({});
  const [revealedQuestions, setRevealedQuestions] = useState({});
  const [submittedAll, setSubmittedAll] = useState(false);

  // Operatoren-Quiz State
  const [drillChoices, setDrillChoices] = useState({});
  // Essay-Auswahl
  const [selectedEssayId, setSelectedEssayId] = useState(() => essaySets[0]?.id || "");
  const [essayDraft, setEssayDraft] = useState("");

  const setValidation = useMemo(
    () => (activeSet ? validateTestformatSet(activeSet) : null),
    [activeSet]
  );

  // Berechne Live-Gesamtpunkte im aktiven Testformat-Satz
  const scoreSummary = useMemo(() => {
    if (!activeSet) return { earned: 0, max: 48 };
    let earned = 0;
    let max = 0;
    for (const q of activeSet.questions || []) {
      max += Number(q.points || 0);
      if (q.type === "single_choice") {
        earned += scoreSingleChoice(q, scAnswers[q.id]).earned;
      } else if (q.type === "multiple_choice") {
        earned += scoreMultipleChoice(q, mcAnswers[q.id]).earned;
      } else {
        const ev = evaluateOpenResponse(q, openTexts[q.id] || "", openRubrics[q.id] || null);
        if (revealedQuestions[q.id] || submittedAll) {
          earned += ev.earned;
        }
      }
    }
    return { earned: Math.round(earned * 100) / 100, max };
  }, [activeSet, scAnswers, mcAnswers, openTexts, openRubrics, revealedQuestions, submittedAll]);

  const handleFinishSet = () => {
    setSubmittedAll(true);
    if (activeSet) {
      onRecordExamAttempt?.({
        setId: activeSet.id,
        domain: activeSet.domain,
        mode: "testformat",
        totalScore: scoreSummary.earned,
        maxScore: scoreSummary.max,
      });
    }
  };

  const activeEssay = essaySets.find((e) => e.id === selectedEssayId) || essaySets[0] || null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="exam-simulator-view">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Bayerischer Staatsexamens-Simulator (Wahlformat)</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--fg-muted)" }}>
            75 % offene Fallvignetten &amp; Kurzantworten mit Satzlimit-Zähler · 0,5-Pkt.-MC · Operatoren · Essay-Baukasten.
          </p>
        </div>

        <div className="lx-segmented">
          {[
            { id: "testformat", label: "Testformat-Klausur (48 Pkt.)" },
            { id: "compass", label: "Examens-Kompass" },
            { id: "operators", label: "Operatoren-Trainer" },
            { id: "essay", label: "Essay-Aufgaben (A2/B2/C2)" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={`lx-seg-btn ${subTab === t.id ? "is-active" : ""}`}
              onClick={() => setSubTab(t.id)}
              data-testid={`exam-tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: TESTFORMAT-SIMULATOR (48 PUNKTE, >= 75 % OFFEN, 0,5-PKT.-MC) */}
      {subTab === "testformat" && activeSet && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="lx-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ minWidth: 260, flex: "1 1 320px" }}>
              <label style={{ fontSize: 11.5, color: "var(--fg-muted)", fontWeight: 600, display: "block", marginBottom: 4 }}>
                Prüfungssatz wählen (ca. 80 Minuten Richtzeit im Staatsexamen):
              </label>
              <Select
                value={activeSet.id}
                onValueChange={(val) => {
                  setSelectedSetId(val);
                  setSubmittedAll(false);
                }}
                options={testSets.map((s) => ({
                  value: s.id,
                  label: `[Gebiet ${s.domain}] ${s.title} (${s.total_points || 48} Pkt.)`,
                }))}
                ariaLabel="Prüfungssatz wählen"
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {setValidation && (
                <span className="lx-badge">
                  Offene Punkte: {setValidation.openPoints}/{setValidation.totalPoints} (
                  {Math.round(setValidation.openShare * 100)} % · mind. 75 % Pflicht)
                </span>
              )}
              <span className="lx-badge" style={{ fontWeight: 700 }} data-testid="exam-live-score">
                Punktestand: {scoreSummary.earned} / {scoreSummary.max} Pkt.
              </span>
              <button
                type="button"
                className="lx-btn lx-btn-primary"
                onClick={handleFinishSet}
                data-testid="evaluate-exam-btn"
              >
                <Award size={15} />
                <span>Gesamtauswertung prüfen</span>
              </button>
            </div>
          </div>

          {/* Alle Aufgaben des gewählten 48-Punkte-Satzes */}
          {(activeSet.questions || []).map((q, qIdx) => {
            const isRevealed = Boolean(revealedQuestions[q.id]) || submittedAll;

            // 1) OFFENE FALLVIGNETTE ODER KURZE OFFENE FRAGE
            if (q.type === "vignette_open" || q.type === "short_open") {
              const evalRes = evaluateOpenResponse(
                q,
                openTexts[q.id] || "",
                openRubrics[q.id] || null
              );
              return (
                <div
                  key={q.id}
                  className={`lx-card domain-border-${activeSet.domain}`}
                  style={{ display: "flex", flexDirection: "column", gap: 11 }}
                  data-testid={`question-card-${q.id}`}
                >
                  {q.vignette_text && (
                    <div
                      className="lx-card lx-card-subtle"
                      style={{ padding: "11px 14px", borderLeft: "3px solid var(--primary-bg)" }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 4 }}>
                        {q.vignette_title || "Fallvignette (Grundschul-Schulalltag)"}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--fg-secondary)" }}>{q.vignette_text}</div>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      Aufgabe {qIdx + 1}: <RichText text={q.prompt} />
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                      {q.operator && <span className="lx-badge">Operator: {q.operator}</span>}
                      {q.sentence_limit_label && (
                        <span className="lx-badge" style={{ color: "var(--primary-bg)" }}>
                          {q.sentence_limit_label}
                        </span>
                      )}
                      <span className="lx-badge" style={{ fontWeight: 700 }}>
                        {q.points} {q.points === 1 ? "Punkt" : "Punkte"}
                      </span>
                    </div>
                  </div>

                  <textarea
                    className="lx-textarea"
                    rows={3}
                    placeholder="Deine Antwort wie auf dem Reinschriftpapier im Examen..."
                    value={openTexts[q.id] || ""}
                    onChange={(e) => setOpenTexts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    data-testid={`open-input-${q.id}`}
                  />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
                      <span
                        className="lx-badge"
                        style={{
                          color: evalRes.withinSentenceLimit ? "var(--dot-success)" : "var(--dot-warning)",
                        }}
                      >
                        Gezählte Sätze: {evalRes.sentenceCount} ({evalRes.wordCount} Wörter)
                      </span>
                      {q.page_label && (
                        <span className="lx-badge">
                          <FileText size={11} />
                          <span>{q.page_label}</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="lx-btn"
                      onClick={() =>
                        setRevealedQuestions((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                      }
                    >
                      {isRevealed ? "Musterlösung ausblenden" : "Mit Musterlösung & Bepunktung abgleichen"}
                    </button>
                  </div>

                  {evalRes.warnings.length > 0 && (openTexts[q.id] || "").trim().length > 0 && (
                    <div
                      style={{
                        padding: "8px 11px",
                        borderRadius: 8,
                        background: "var(--callout-warn-bg)",
                        border: "1px solid var(--callout-warn-border)",
                        fontSize: 12,
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                      }}
                    >
                      {evalRes.warnings.map((w, wi) => (
                        <div key={wi} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <AlertTriangle size={13} style={{ color: "var(--dot-warning)", flexShrink: 0 }} />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {isRevealed && (
                    <div
                      className="lx-card lx-card-subtle"
                      style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}
                    >
                      <div>
                        <strong style={{ fontSize: 12.5, color: "var(--dot-success)" }}>
                          Musterlösung (Erwartungshorizont):
                        </strong>
                        <div style={{ fontSize: 13, marginTop: 3 }}>
                          <RichText text={q.model_answer} />
                        </div>
                      </div>

                      {evalRes.criteria.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <strong style={{ fontSize: 12 }}>
                            Punkteschlüssel (Hake ab, welche Teilaspekte deine Antwort enthält — {evalRes.earned}/{q.points} Pkt.):
                          </strong>
                          {evalRes.criteria.map((c, cIdx) => (
                            <label
                              key={cIdx}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 10,
                                padding: "6px 9px",
                                borderRadius: 7,
                                background: "var(--bg-surface)",
                                border: "1px solid var(--border)",
                                cursor: "pointer",
                                fontSize: 12.5,
                              }}
                            >
                              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={c.checked}
                                  onChange={(e) => {
                                    const base = evalRes.criteria.map((x) => x.checked);
                                    base[cIdx] = e.target.checked;
                                    setOpenRubrics((prev) => ({ ...prev, [q.id]: base }));
                                  }}
                                />
                                <span>{c.criterion}</span>
                              </span>
                              <span className="lx-badge">{c.points} Pkt.</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            // 2) SINGLE CHOICE (1 PUNKT)
            if (q.type === "single_choice") {
              const scRes = scoreSingleChoice(q, scAnswers[q.id]);
              return (
                <div
                  key={q.id}
                  className="lx-card"
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                  data-testid={`question-card-${q.id}`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      Aufgabe {qIdx + 1} (Single Choice): <RichText text={q.prompt} />
                    </div>
                    <span className="lx-badge">1 Punkt (1 aus 4 richtig)</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(q.options || []).map((opt, oIdx) => {
                      const letter = String.fromCharCode(97 + oIdx);
                      const chosen = scAnswers[q.id] === oIdx;
                      const isRight = Number(q.correct_index) === oIdx;
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => setScAnswers((prev) => ({ ...prev, [q.id]: oIdx }))}
                          className="lx-btn"
                          style={{
                            justifyContent: "flex-start",
                            height: "auto",
                            minHeight: 42,
                            padding: "8px 12px",
                            textAlign: "left",
                            borderColor: isRevealed
                              ? isRight
                                ? "var(--dot-success)"
                                : chosen
                                ? "var(--dot-danger)"
                                : "var(--border)"
                              : chosen
                              ? "var(--primary-bg)"
                              : "var(--border)",
                            background: chosen ? "var(--accent-soft)" : "var(--bg-surface)",
                          }}
                        >
                          <strong style={{ marginRight: 6 }}>{letter})</strong>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{q.page_label}</span>
                    <button
                      type="button"
                      className="lx-btn"
                      onClick={() => setRevealedQuestions((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                    >
                      {isRevealed ? `Ausblenden (${scRes.earned}/1 Pkt.)` : "Lösung prüfen"}
                    </button>
                  </div>

                  {isRevealed && q.explanation && (
                    <div className="lx-card lx-card-subtle" style={{ padding: "9px 12px", fontSize: 12.5 }}>
                      <strong>Erklärung ({scRes.earned}/1 Pkt.):</strong> <RichText text={q.explanation} />
                    </div>
                  )}
                </div>
              );
            }

            // 3) MULTIPLE CHOICE (4 AUSSAGEN À 0,5 PUNKTE = 2,0 PUNKTE, 0–4 ZUTREFFEND)
            if (q.type === "multiple_choice") {
              const curMap = mcAnswers[q.id] || {};
              const mcRes = scoreMultipleChoice(q, curMap);

              return (
                <div
                  key={q.id}
                  className="lx-card"
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                  data-testid={`question-card-${q.id}`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      Aufgabe {qIdx + 1} (Multiple Choice): <RichText text={q.prompt} />
                    </div>
                    <span className="lx-badge" style={{ fontWeight: 600 }}>
                      2 Punkte (je Zeile 0,5 Pkt. · 0–4 richtig)
                    </span>
                  </div>

                  <div className="lx-table-scroll">
                    <table className="lx-table">
                      <thead>
                        <tr>
                          <th>Aussage</th>
                          <th style={{ width: 112 }}>Trifft zu</th>
                          <th style={{ width: 128 }}>Trifft nicht zu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(q.statements || []).map((st, sIdx) => {
                          const key = st.id || String.fromCharCode(97 + sIdx);
                          const val = curMap[key];
                          const rowEval = mcRes.rowResults[sIdx];
                          return (
                            <tr key={key}>
                              <td>
                                <strong>{key})</strong> <RichText text={st.text} />
                                {isRevealed && st.explanation && (
                                  <div style={{ marginTop: 4, fontSize: 11.5, color: rowEval?.isCorrect ? "var(--dot-success)" : "var(--dot-danger)" }}>
                                    {rowEval?.isCorrect ? "✓ +0,5 Pkt." : "✗ 0 Pkt."} — {st.explanation}
                                  </div>
                                )}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className={`lx-btn ${val === true ? "lx-btn-primary" : ""}`}
                                  style={{ width: "100%", height: 36 }}
                                  onClick={() =>
                                    setMcAnswers((prev) => ({
                                      ...prev,
                                      [q.id]: { ...(prev[q.id] || {}), [key]: true },
                                    }))
                                  }
                                  data-testid={`mc-${q.id}-${key}-true`}
                                >
                                  Trifft zu
                                </button>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className={`lx-btn ${val === false ? "lx-btn-primary" : ""}`}
                                  style={{ width: "100%", height: 36 }}
                                  onClick={() =>
                                    setMcAnswers((prev) => ({
                                      ...prev,
                                      [q.id]: { ...(prev[q.id] || {}), [key]: false },
                                    }))
                                  }
                                  data-testid={`mc-${q.id}-${key}-false`}
                                >
                                  Trifft nicht zu
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{q.page_label}</span>
                    <button
                      type="button"
                      className="lx-btn"
                      onClick={() => setRevealedQuestions((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                      data-testid={`mc-check-${q.id}`}
                    >
                      {isRevealed
                        ? `Auswertung: ${mcRes.earned} / 2,0 Pkt.`
                        : "Zeilenweise auswerten (0,5 Pkt. je Zeile)"}
                    </button>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}

      {/* TAB 2: EXAMENS-KOMPASS ("SO LÄUFT DEIN STAATSEXAMEN") */}
      {subTab === "compass" && (
        <div className="lx-dashboard-grid">
          <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Compass size={18} style={{ color: "var(--primary-bg)" }} />
              <h3 style={{ margin: 0, fontSize: 16 }}>
                So läuft dein Staatsexamen EWS Psychologie in Bayern ab
              </h3>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5 }}>
              <li>
                <strong>4 Stunden Gesamtzeit = ca. 80 Minuten pro Gebiet:</strong> Du bearbeitest genau 3 Aufgaben – je eine aus <strong>Gebiet A (Lernen &amp; Lehren)</strong>, <strong>Gebiet B (Entwicklungspsychologie)</strong> und <strong>Gebiet C (Diagnostik)</strong>.
              </li>
              <li>
                <strong>Freie Formatwahl in jedem Gebiet (Wahlformat):</strong> In jedem Gebiet liegen dir ein <strong>Testformat (A1, B1, C1)</strong> und ein <strong>Essay (A2, B2, C2)</strong> vor. Du entscheidest direkt in der Prüfung für jedes Gebiet einzeln!
              </li>
              <li>
                <strong>Testformat = 48 Punkte (mindestens 75 % offene Antworten!):</strong> Rund 36–38 Punkte stammen aus Fallvignetten und kurzen offenen Fragen (werden auf <strong>Reinschriftpapier</strong> geschrieben!). Nur SC- und MC-Fragen kreuzt du direkt auf dem Aufgabenblatt an.
              </li>
              <li>
                <strong>Punktzahl verrät dir die Antwortlänge:</strong> 1 Punkt = 1 Begriff/Fakt · 2 Punkte = 1 Aspekt + knappe Begründung (1–2 Sätze) · 4 Punkte = 2 klar getrennte Aspekte mit kurzem Bezug zum Fall.
              </li>
              <li>
                <strong>Multiple Choice ohne Risiko:</strong> 4 Aussagen mit „Trifft zu“ / „Trifft nicht zu“ bringen <strong>je Zeile 0,5 Punkte</strong> (zusammen 2,0 Punkte). Es können 0, 1, 2, 3 oder alle 4 Aussagen stimmen – und es gibt <strong>keine Minuspunkte</strong>!
              </li>
            </ul>
          </div>

          <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Zitierregeln: Testformat vs. Essay-Format</h3>
            <div className="lx-def-box">
              <strong>Im Testformat (A1 / B1 / C1):</strong>
              <span style={{ fontSize: 13 }}>
                Autoren und Jahreszahlen musst du nur dann hinschreiben, wenn die Aufgabe ausdrücklich danach fragt (z. B. <em>„Nennen Sie eine passende Studie inkl. Autor/in“</em>). Präge dir die großen Klassiker &amp; Jahreszahlen deshalb trotzdem sicher ein!
              </span>
            </div>
            <div className="lx-empirie-box">
              <strong>Im Essay-Format (A2 / B2 / C2):</strong>
              <span style={{ fontSize: 13 }}>
                Durchgängig wissenschaftlich belegen: direkt im Satz <code>Seligman (1979) zeigt...</code>, indirekt am Satzende <code>(vgl. Baddeley &amp; Hitch, 1974)</code>, Sekundärzitat <code>(zit. nach Urhahne et al., 2019)</code>. Keine Umgangssprache, keine Sprichwörter, keine eigenen Schulanekdoten!
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OPERATOREN-TRAINER */}
      {subTab === "operators" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              Die wichtigsten Operatoren &amp; typischen Zeitfallen im Examen
            </h3>
            <div className="lx-table-scroll">
              <table className="lx-table">
                <thead>
                  <tr>
                    <th>Operator</th>
                    <th>AB</th>
                    <th>Was Prüfer erwarten</th>
                    <th>Typische Klausur-Falle!</th>
                  </tr>
                </thead>
                <tbody>
                  {operators.map((op) => (
                    <tr key={op.id || op.operator}>
                      <td style={{ fontWeight: 700 }}>{op.operator}</td>
                      <td>{op.ab_level}</td>
                      <td>{op.what_graders_expect || op.official_definition}</td>
                      <td style={{ color: "var(--dot-warning)", fontWeight: 500 }}>{op.trap_warning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {operatorDrills.length > 0 && (
            <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Schnell-Check: Erkennst du die Operatoren-Falle?</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 10 }}>
                {operatorDrills.slice(0, 6).map((dr, idx) => {
                  const picked = drillChoices[dr.id || idx];
                  return (
                    <div key={dr.id || idx} className="lx-card lx-card-subtle" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <strong style={{ fontSize: 13 }}>{dr.question}</strong>
                      {(dr.options || []).map((opt, oi) => (
                        <button
                          key={oi}
                          type="button"
                          className="lx-btn"
                          style={{
                            justifyContent: "flex-start",
                            height: "auto",
                            minHeight: 38,
                            padding: "6px 10px",
                            textAlign: "left",
                            borderColor:
                              picked === undefined
                                ? "var(--border)"
                                : oi === dr.correct_index
                                ? "var(--dot-success)"
                                : picked === oi
                                ? "var(--dot-danger)"
                                : "var(--border)",
                          }}
                          onClick={() => setDrillChoices((prev) => ({ ...prev, [dr.id || idx]: oi }))}
                        >
                          {opt}
                        </button>
                      ))}
                      {picked !== undefined && dr.explanation && (
                        <div style={{ fontSize: 12, color: "var(--fg-secondary)" }}>{dr.explanation}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ESSAY-AUFGABEN & GLIEDERUNGS-BAUKASTEN */}
      {subTab === "essay" && activeEssay && (
        <div className="lx-dashboard-grid">
          <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Select
              value={activeEssay.id}
              onValueChange={setSelectedEssayId}
              options={essaySets.map((e) => ({
                value: e.id,
                label: `[${e.domain}2 Essay] ${e.title}`,
              }))}
              ariaLabel="Essay-Aufgabe wählen"
            />

            <div className="lx-card lx-card-subtle" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className={`lx-badge domain-badge-${activeEssay.domain}`} style={{ alignSelf: "flex-start" }}>
                Gebiet {activeEssay.domain} · {activeEssay.page_label}
              </span>
              <h3 style={{ margin: 0, fontSize: 16 }}>{activeEssay.title}</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--fg-secondary)" }}>{activeEssay.prompt_intro}</p>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
                {(activeEssay.subtasks || []).map((st, i) => (
                  <li key={i} style={{ fontWeight: 600 }}>
                    {st}
                  </li>
                ))}
              </ol>
            </div>

            <label style={{ fontSize: 12.5, fontWeight: 600 }}>
              15-Minuten-Gliederungs-Training (Schreibe deine Stichpunkt-Gliederung vor dem Abgleich):
            </label>
            <textarea
              className="lx-textarea"
              rows={6}
              placeholder="1. Einleitung & Begriffsklärung (...)&#10;2. Theoretisches Modell (...)&#10;3. Empirischer Befund (...)&#10;4. Grundschul-Unterrichtsbeispiel Kunst/Sport (...)"
              value={essayDraft}
              onChange={(e) => setEssayDraft(e.target.value)}
            />
          </div>

          <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Mustergliederung, Pflicht-Zitate &amp; Kunst/Sport-Transfer</h3>
            <div className="lx-card lx-card-subtle" style={{ fontSize: 12.5 }}>
              <strong>Empfohlene 15-Minuten-Gliederung:</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                {(activeEssay.outline_15min || []).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            {Array.isArray(activeEssay.must_cite_authors) && (
              <div className="lx-def-box" style={{ fontSize: 12.5 }}>
                <strong>Wichtige Zitate (Autor, Jahr):</strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {activeEssay.must_cite_authors.map((a, i) => (
                    <li key={i}>{typeof a === "string" ? a : `${a.author_year}: ${a.claim}`}</li>
                  ))}
                </ul>
              </div>
            )}

            {activeEssay.grundschule_kunst_sport_transfer && (
              <div className="lx-empirie-box" style={{ fontSize: 12.5 }}>
                <strong>Grundschul-Transfer (Kunst &amp; Sport):</strong>
                <div>{activeEssay.grundschule_kunst_sport_transfer}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
