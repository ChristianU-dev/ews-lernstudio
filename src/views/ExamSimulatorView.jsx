import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  Compass,
  FileText,
} from "lucide-react";
import { Select } from "../design/ui";
import {
  scoreSingleChoice,
  scoreMultipleChoice,
  evaluateOpenResponse,
  validateTestformatSet,
} from "../lib/examScoring";
import { RichText } from "../components/RichText";

function cleanSetLabel(s) {
  const raw = String(s.title || "");
  if (raw.toLowerCase().startsWith(`gebiet ${s.domain.toLowerCase()}`)) {
    return raw;
  }
  return `Gebiet ${s.domain} · ${raw}`;
}

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

  const [openTexts, setOpenTexts] = useState({});
  const [openRubrics, setOpenRubrics] = useState({});
  const [scAnswers, setScAnswers] = useState({});
  const [mcAnswers, setMcAnswers] = useState({});
  const [revealedQuestions, setRevealedQuestions] = useState({});
  const [submittedAll, setSubmittedAll] = useState(false);

  const [drillChoices, setDrillChoices] = useState({});
  const [selectedEssayId, setSelectedEssayId] = useState(() => essaySets[0]?.id || "");
  const [essayDraft, setEssayDraft] = useState("");

  const setValidation = useMemo(
    () => (activeSet ? validateTestformatSet(activeSet) : null),
    [activeSet]
  );

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
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }} data-testid="exam-simulator-view">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 19 }}>Staatsexamens-Simulator (Wahlformat Bayern)</h2>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--fg-muted)" }}>
            Mind. 75 % offene Fallvignetten &amp; Kurzantworten mit Satzlimit-Zähler · 0,5-Pkt.-MC · Operatoren · Essay-Baukasten.
          </p>
        </div>

        <div className="lx-segmented">
          {[
            { id: "testformat", label: "Testformat (48 Pkt.)" },
            { id: "compass", label: "Examens-Kompass" },
            { id: "operators", label: "Operatoren" },
            { id: "essay", label: "Essay-Aufgaben" },
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

      {/* TAB 1: TESTFORMAT-SIMULATOR */}
      {subTab === "testformat" && activeSet && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="lx-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0, flex: "1 1 320px" }}>
              <label style={{ fontSize: 12, color: "var(--fg-muted)", fontWeight: 600, display: "block", marginBottom: 6 }}>
                Prüfungssatz wählen (~80 Minuten Richtzeit im Examen):
              </label>
              <Select
                value={activeSet.id}
                onValueChange={(val) => {
                  setSelectedSetId(val);
                  setSubmittedAll(false);
                }}
                options={testSets.map((s) => ({
                  value: s.id,
                  label: `${cleanSetLabel(s)} (${s.total_points || 48} Pkt.)`,
                }))}
                ariaLabel="Prüfungssatz wählen"
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {setValidation && (
                <span className="lx-badge">
                  Offene Punkte: {setValidation.openPoints}/{setValidation.totalPoints} (
                  {Math.round(setValidation.openShare * 100)} %)
                </span>
              )}
              <span className="lx-badge" style={{ fontWeight: 700, color: "var(--fg)" }} data-testid="exam-live-score">
                Stand: {scoreSummary.earned} / {scoreSummary.max} Pkt.
              </span>
              <button
                type="button"
                className="lx-btn lx-btn-primary"
                onClick={handleFinishSet}
                data-testid="evaluate-exam-btn"
              >
                <Award size={15} />
                <span>Gesamtauswertung</span>
              </button>
            </div>
          </div>

          {(activeSet.questions || []).map((q, qIdx) => {
            const isRevealed = Boolean(revealedQuestions[q.id]) || submittedAll;

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
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                  data-testid={`question-card-${q.id}`}
                >
                  {q.vignette_text && (
                    <div
                      className="lx-card lx-card-subtle"
                      style={{ padding: "13px 15px" }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: "var(--fg)" }}>
                        {q.vignette_title || "Fallvignette (Grundschulalltag)"}
                      </div>
                      <div style={{ fontSize: 13.5, color: "var(--fg-secondary)", lineHeight: 1.55 }}>
                        {q.vignette_text}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.4, flex: "1 1 280px" }}>
                      Aufgabe {qIdx + 1}: <RichText text={q.prompt} />
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {q.operator && <span className="lx-badge">Operator: {q.operator}</span>}
                      {q.sentence_limit_label && (
                        <span className={`lx-badge domain-badge-${activeSet.domain}`}>
                          {q.sentence_limit_label}
                        </span>
                      )}
                      <span className="lx-badge" style={{ fontWeight: 700, color: "var(--fg)" }}>
                        {q.points} {q.points === 1 ? "Pkt." : "Pkt."}
                      </span>
                    </div>
                  </div>

                  <textarea
                    className="lx-textarea"
                    rows={3}
                    placeholder="Deine Antwort wie auf dem Reinschriftpapier im Staatsexamen..."
                    value={openTexts[q.id] || ""}
                    onChange={(e) => setOpenTexts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    data-testid={`open-input-${q.id}`}
                  />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span
                        className="lx-badge"
                        style={{
                          color: evalRes.withinSentenceLimit ? "var(--dot-success)" : "var(--dot-warning)",
                        }}
                      >
                        Sätze: {evalRes.sentenceCount} ({evalRes.wordCount} Wörter)
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
                      {isRevealed ? "Musterlösung zuklappen" : "Mit Musterlösung abgleichen"}
                    </button>
                  </div>

                  {evalRes.warnings.length > 0 && (openTexts[q.id] || "").trim().length > 0 && (
                    <div
                      className="lx-empirie-box"
                      style={{ padding: "9px 12px", fontSize: 12.5 }}
                    >
                      {evalRes.warnings.map((w, wi) => (
                        <div key={wi} style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                          <AlertTriangle size={14} style={{ color: "var(--dot-warning)", flexShrink: 0, marginTop: 2 }} />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {isRevealed && (
                    <div
                      className="lx-card lx-card-subtle"
                      style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11 }}
                    >
                      <div>
                        <strong style={{ fontSize: 13, color: "var(--dot-success)" }}>
                          Musterlösung (Erwartungshorizont):
                        </strong>
                        <div style={{ fontSize: 13.5, marginTop: 4, lineHeight: 1.55 }}>
                          <RichText text={q.model_answer} />
                        </div>
                      </div>

                      {evalRes.criteria.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <strong style={{ fontSize: 12.5 }}>
                            Punkteschlüssel ({evalRes.earned}/{q.points} Pkt.):
                          </strong>
                          {evalRes.criteria.map((c, cIdx) => (
                            <label
                              key={cIdx}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 10,
                                padding: "8px 11px",
                                borderRadius: 8,
                                background: "var(--bg-surface)",
                                border: "1px solid var(--border)",
                                cursor: "pointer",
                                fontSize: 13,
                              }}
                            >
                              <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
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
                              <span className="lx-badge" style={{ flexShrink: 0 }}>{c.points} Pkt.</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            if (q.type === "single_choice") {
              const scRes = scoreSingleChoice(q, scAnswers[q.id]);
              return (
                <div
                  key={q.id}
                  className="lx-card"
                  style={{ display: "flex", flexDirection: "column", gap: 11 }}
                  data-testid={`question-card-${q.id}`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, flex: "1 1 260px" }}>
                      Aufgabe {qIdx + 1} (Single Choice): <RichText text={q.prompt} />
                    </div>
                    <span className="lx-badge">1 Punkt</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
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
                            padding: "9px 13px",
                            textAlign: "left",
                            borderColor: isRevealed
                              ? isRight
                                ? "var(--dot-success)"
                                : chosen
                                ? "var(--dot-danger)"
                                : "var(--border)"
                              : chosen
                              ? "var(--fg)"
                              : "var(--border)",
                            background: chosen ? "var(--bg-subtle)" : "var(--bg-surface)",
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
                    <div className="lx-card lx-card-subtle" style={{ padding: "10px 13px", fontSize: 13 }}>
                      <strong>Erklärung ({scRes.earned}/1 Pkt.):</strong> <RichText text={q.explanation} />
                    </div>
                  )}
                </div>
              );
            }

            if (q.type === "multiple_choice") {
              const curMap = mcAnswers[q.id] || {};
              const mcRes = scoreMultipleChoice(q, curMap);

              return (
                <div
                  key={q.id}
                  className="lx-card"
                  style={{ display: "flex", flexDirection: "column", gap: 11 }}
                  data-testid={`question-card-${q.id}`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, flex: "1 1 260px" }}>
                      Aufgabe {qIdx + 1} (Multiple Choice): <RichText text={q.prompt} />
                    </div>
                    <span className="lx-badge">2 Pkt. (je Zeile 0,5 Pkt.)</span>
                  </div>

                  {/* Mobile-freundliche Zeilen-Karten statt horizontal quetschender Tabelle */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(q.statements || []).map((st, sIdx) => {
                      const key = st.id || String.fromCharCode(97 + sIdx);
                      const val = curMap[key];
                      const rowEval = mcRes.rowResults[sIdx];
                      return (
                        <div
                          key={key}
                          className="lx-card lx-card-subtle"
                          style={{
                            padding: "11px 14px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ flex: "1 1 260px", fontSize: 13.5, lineHeight: 1.5 }}>
                            <strong>{key})</strong> <RichText text={st.text} />
                            {isRevealed && st.explanation && (
                              <div
                                style={{
                                  marginTop: 5,
                                  fontSize: 12,
                                  color: rowEval?.isCorrect ? "var(--dot-success)" : "var(--dot-danger)",
                                }}
                              >
                                {rowEval?.isCorrect ? "✓ +0,5 Pkt." : "✗ 0 Pkt."} — {st.explanation}
                              </div>
                            )}
                          </div>

                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <button
                              type="button"
                              className={`lx-btn ${val === true ? "lx-btn-primary" : ""}`}
                              style={{ minHeight: 36, padding: "4px 11px" }}
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
                            <button
                              type="button"
                              className={`lx-btn ${val === false ? "lx-btn-primary" : ""}`}
                              style={{ minHeight: 36, padding: "4px 11px" }}
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
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{q.page_label}</span>
                    <button
                      type="button"
                      className="lx-btn"
                      onClick={() => setRevealedQuestions((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                      data-testid={`mc-check-${q.id}`}
                    >
                      {isRevealed ? `Auswertung: ${mcRes.earned} / 2,0 Pkt.` : "Zeilenweise prüfen"}
                    </button>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}

      {/* TAB 2: EXAMENS-KOMPASS */}
      {subTab === "compass" && (
        <div className="lx-dashboard-grid">
          <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Compass size={18} style={{ color: "var(--domain-a)" }} />
              <h3 style={{ margin: 0, fontSize: 16 }}>
                So läuft dein Staatsexamen EWS Psychologie in Bayern ab
              </h3>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5, lineHeight: 1.55 }}>
              <li>
                <strong>4 Stunden Gesamtzeit (~80 Minuten je Gebiet):</strong> Genau 3 Aufgaben – je eine aus <strong>Gebiet A (Lernen &amp; Lehren)</strong>, <strong>Gebiet B (Entwicklungspsychologie)</strong> und <strong>Gebiet C (Diagnostik)</strong>.
              </li>
              <li>
                <strong>Freie Formatwahl pro Gebiet:</strong> In jedem Gebiet liegen ein <strong>Testformat (A1, B1, C1)</strong> und ein <strong>Essay (A2, B2, C2)</strong> vor. Du entscheidest in der Prüfung spontan pro Gebiet!
              </li>
              <li>
                <strong>Testformat = 48 Punkte (mindestens 75 % offene Antworten!):</strong> Rund 36–38 Punkte stammen aus Fallvignetten und kurzen offenen Fragen auf <strong>Reinschriftpapier</strong>. Nur SC und MC kreuzt du auf dem Aufgabenblatt an.
              </li>
              <li>
                <strong>Multiple Choice = 0,5 Punkte je Zeile:</strong> 4 Aussagen mit „Trifft zu“ / „Trifft nicht zu“ ergeben zusammen 2 Punkte. Es können 0, 1, 2, 3 oder alle 4 Aussagen zutreffen – <strong>keine Minuspunkte</strong>!
              </li>
            </ul>
          </div>

          <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Zitierregeln: Testformat vs. Essay-Format</h3>
            <div className="lx-def-box dom-A">
              <strong>Im Testformat (A1 / B1 / C1):</strong>
              <span style={{ fontSize: 13.5, color: "var(--fg-secondary)" }}>
                Autoren und Jahreszahlen sind nur dann Pflicht, wenn die Frage ausdrücklich danach verlangt (z. B. <em>„Nennen Sie eine passende Studie inkl. Autor/in“</em>).
              </span>
            </div>
            <div className="lx-empirie-box">
              <strong>Im Essay-Format (A2 / B2 / C2):</strong>
              <span style={{ fontSize: 13.5, color: "var(--fg-secondary)" }}>
                Durchgängig wissenschaftlich belegen: direkt <code>Seligman (1979)</code>, indirekt <code>(vgl. Baddeley &amp; Hitch, 1974)</code>, Sekundärzitat <code>(zit. nach Urhahne et al., 2019)</code>.
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
              Operatoren &amp; typische Klausur-Zeitfallen
            </h3>
            <div className="lx-table-scroll">
              <table className="lx-table">
                <thead>
                  <tr>
                    <th>Operator</th>
                    <th>AB</th>
                    <th>Was Prüfer erwarten</th>
                    <th>Klausur-Falle vermeiden</th>
                  </tr>
                </thead>
                <tbody>
                  {operators.map((op) => (
                    <tr key={op.id || op.operator}>
                      <td style={{ fontWeight: 700 }}>{op.operator}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{op.ab_level}</td>
                      <td>{op.what_graders_expect || op.official_definition}</td>
                      <td style={{ color: "var(--dot-warning)", fontWeight: 500 }}>{op.trap_warning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {operatorDrills.length > 0 && (
            <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Schnell-Check: Erkennst du die Operatoren-Falle?</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                {operatorDrills.slice(0, 6).map((dr, idx) => {
                  const picked = drillChoices[dr.id || idx];
                  return (
                    <div key={dr.id || idx} className="lx-card lx-card-subtle" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <strong style={{ fontSize: 13.5, lineHeight: 1.4 }}>{dr.question}</strong>
                      {(dr.options || []).map((opt, oi) => (
                        <button
                          key={oi}
                          type="button"
                          className="lx-btn"
                          style={{
                            justifyContent: "flex-start",
                            height: "auto",
                            minHeight: 38,
                            padding: "7px 11px",
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
                        <div style={{ fontSize: 12.5, color: "var(--fg-secondary)", lineHeight: 1.45 }}>{dr.explanation}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ESSAY-AUFGABEN */}
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
              <p style={{ margin: 0, fontSize: 13.5, color: "var(--fg-secondary)", lineHeight: 1.55 }}>{activeEssay.prompt_intro}</p>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, display: "flex", flexDirection: "column", gap: 5 }}>
                {(activeEssay.subtasks || []).map((st, i) => (
                  <li key={i} style={{ fontWeight: 600 }}>
                    {st}
                  </li>
                ))}
              </ol>
            </div>

            <label style={{ fontSize: 12.5, fontWeight: 600 }}>
              15-Minuten-Gliederungs-Training:
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
            <h3 style={{ margin: 0, fontSize: 15.5 }}>Mustergliederung, Pflicht-Zitate &amp; Kunst/Sport-Transfer</h3>
            <div className="lx-card lx-card-subtle" style={{ fontSize: 13, lineHeight: 1.55 }}>
              <strong>Empfohlene 15-Minuten-Gliederung:</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
                {(activeEssay.outline_15min || []).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            {Array.isArray(activeEssay.must_cite_authors) && (
              <div className="lx-def-box dom-A" style={{ fontSize: 13 }}>
                <strong>Wichtige Zitate (Autor, Jahr):</strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {activeEssay.must_cite_authors.map((a, i) => (
                    <li key={i}>{typeof a === "string" ? a : `${a.author_year}: ${a.claim}`}</li>
                  ))}
                </ul>
              </div>
            )}

            {activeEssay.grundschule_kunst_sport_transfer && (
              <div className="lx-praxis-card" style={{ fontSize: 13 }}>
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
