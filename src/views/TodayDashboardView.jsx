import React, { useState } from "react";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Flame,
  Headphones,
  Sparkles,
  Target,
  Zap,
  BookOpen,
  Layers,
  Scale,
} from "lucide-react";
import { computeDaysUntilExam, buildDailyCorePlan, buildBonusStage } from "../lib/adaptivePlanner";

export function TodayDashboardView({
  allUnits = [],
  unitProgressMap = {},
  confusionCounts = {},
  confusionPairs = [],
  examSets = [],
  todayLog = null,
  weeklyGrowth = { totalMinutes: 0, unitsCompleted: 0, cardsReviewed: 0, bonusRounds: 0, activeDays: 0 },
  examDate,
  onUpdateExamDate,
  onStartStep,
  onStartSofaDemoAudio,
  onTriggerBonusRound,
}) {
  const [editingDate, setEditingDate] = useState(false);
  const [showConfusionAnswer, setShowConfusionAnswer] = useState(false);

  const daysLeft = computeDaysUntilExam(examDate);
  const plan = buildDailyCorePlan({
    units: allUnits,
    unitProgressMap,
    confusionCounts,
    confusionPairs,
    examSets,
    todayLog,
  });
  const bonus = buildBonusStage({
    units: allUnits,
    unitProgressMap,
    focusDomain: plan.focusDomain,
  });

  const progressPct = Math.min(100, Math.round(((plan.minutesDone || 0) / plan.targetMinutes) * 100));
  const firstUndoneIdx = plan.steps.findIndex((s) => !s.done);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }} data-testid="today-dashboard-view">
      {/* Ruhige, warme Atelier-Willkommenskarte ohne grelle Blau-Flächen */}
      <div
        className="lx-card"
        style={{
          padding: "22px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div className="min-w-0" style={{ flex: "1 1 380px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="lx-badge">Lehramt Grundschule Bayern · Kunst &amp; Sport</span>
              <span className={`lx-badge domain-badge-${plan.focusDomain}`}>
                Heutiger Schwerpunkt: Gebiet {plan.focusDomain}
              </span>
            </div>
            <h1 style={{ margin: "4px 0 0", fontSize: 23, lineHeight: 1.25 }}>
              Ruhig starten – Schritt für Schritt sicher ins Examen
            </h1>
            <p style={{ margin: 0, color: "var(--fg-secondary)", fontSize: 14, maxWidth: 680, lineHeight: 1.55 }}>
              Keine roten „Überfällig!“-Warnungen nach Pausentagen: Hör zum Ankommen erst kurz in deinen Sofa-Überblick rein oder nimm dir direkt ein visuelles 1-Seiten-Ankerblatt vor.
            </p>
          </div>

          {/* Ruhige Countdown-Box */}
          <div
            className="lx-card lx-card-subtle"
            style={{ padding: "12px 15px", minWidth: 215, flexShrink: 0 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 12, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar size={13} />
                <span>Prüfung im Februar</span>
              </span>
              <button
                type="button"
                className="lx-badge"
                style={{ cursor: "pointer", minHeight: 22, padding: "2px 8px", fontSize: 11, background: "var(--bg-surface)" }}
                onClick={() => setEditingDate((v) => !v)}
              >
                {editingDate ? "Fertig" : "Ändern"}
              </button>
            </div>
            {editingDate ? (
              <input
                type="date"
                className="lx-input"
                style={{ marginTop: 8, padding: "6px 9px" }}
                value={examDate || "2027-02-17"}
                onChange={(e) => onUpdateExamDate(e.target.value)}
                aria-label="Prüfungsdatum im Februar wählen"
              />
            ) : (
              <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 8 }}>
                <strong className="tabular" style={{ fontSize: 21, color: "var(--fg)" }}>
                  {daysLeft !== null ? `${daysLeft} Tage` : "Flexibel"}
                </strong>
                <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{examDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* Klare Button-Hierarchie: Nur 1 ruhiger Primärbutton! */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button
            type="button"
            className="lx-btn lx-btn-primary lx-hero-btn"
            style={{ minHeight: 42, padding: "8px 18px", fontSize: 13.5 }}
            onClick={() => onStartSofaDemoAudio(plan.nextUnit)}
            data-testid="sofa-start-audio-btn"
          >
            <Headphones size={16} />
            <span>Sofa-Audio starten ({plan.nextUnit ? `Kap. ${plan.nextUnit.section_num}` : "Intro"})</span>
          </button>

          {plan.nextUnit && (
            <button
              type="button"
              className="lx-btn lx-hero-btn"
              style={{ minHeight: 42, padding: "8px 16px", fontSize: 13.5 }}
              onClick={() =>
                onStartStep({
                  targetView: "scripts",
                  unitId: plan.nextUnit.id,
                  domain: plan.nextUnit.domain,
                })
              }
            >
              <BookOpen size={16} />
              <span>1-Seiten-Ankerblatt ({plan.nextUnit.page_label})</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 4 ruhige Fortschritts-Karten */}
      <div className="lx-kpi-row">
        <div className="lx-kpi-card">
          <span style={{ fontSize: 12, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <Target size={13} />
            <span>Heutige Kern-Etappe</span>
          </span>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
            <strong className="tabular" style={{ fontSize: 20, whiteSpace: "nowrap" }}>
              {plan.minutesDone} / {plan.targetMinutes} Min.
            </strong>
            <span style={{ fontSize: 12, color: "var(--dot-success)", fontWeight: 600, whiteSpace: "nowrap" }}>
              {plan.isCoreGoalReached ? "Geschafft" : `${progressPct} %`}
            </span>
          </div>
          <div style={{ height: 5, borderRadius: 999, background: "var(--bg-subtle)", overflow: "hidden", marginTop: 2 }}>
            <div
              style={{
                width: `${progressPct}%`,
                height: "100%",
                background: "var(--fg)",
                borderRadius: 999,
                transition: "width 240ms ease",
              }}
            />
          </div>
        </div>

        {[
          { key: "A", title: "A · Lernen", fullTitle: "A · Lernen & Lehren", pages: "108 S.", color: "var(--domain-a)" },
          { key: "B", title: "B · Entwicklung", fullTitle: "B · Entwicklung", pages: "82 S.", color: "var(--domain-b)" },
          { key: "C", title: "C · Diagnostik", fullTitle: "C · Diagnostik", pages: "73 S.", color: "var(--domain-c)" },
        ].map((d) => {
          const m = plan.mastery[d.key] || { total: 0, mastered: 0, seen: 0, percent: 0 };
          return (
            <div key={d.key} className={`lx-kpi-card domain-border-${d.key}`} title={d.fullTitle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6, fontSize: 12, color: "var(--fg-secondary)" }}>
                <span style={{ fontWeight: 600 }}>{d.title}</span>
                <span className="tabular" style={{ color: "var(--fg-muted)", flexShrink: 0 }}>{d.pages}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <strong className="tabular" style={{ fontSize: 20, color: d.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {m.percent} %
                </strong>
                <span style={{ fontSize: 11.5, color: "var(--fg-muted)" }} className="truncate">
                  {m.mastered}/{m.total} sicher
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 999, background: "var(--bg-subtle)", overflow: "hidden", marginTop: 2 }}>
                <div style={{ width: `${m.percent}%`, height: "100%", background: d.color, borderRadius: 999 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Hauptbereich: Links die 4 ruhigen Etappen-Schritte, Rechts Wochenzuwachs & Verwechslungs-Radar */}
      <div className="lx-dashboard-grid">
        <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17 }}>Deine 32-Minuten-Etappe für heute</h2>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--fg-muted)" }}>
              Abgestimmt auf dein visuelles Seitengedächtnis, lautes Nacherzählen und das bayerische Testformat.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {plan.steps.map((step, i) => {
              const StepIcon =
                step.kind === "podcast"
                  ? Headphones
                  : step.kind === "script"
                  ? BookOpen
                  : step.kind === "cards"
                  ? Layers
                  : Scale;
              const isNextActive = i === firstUndoneIdx;

              return (
                <div
                  key={step.id}
                  className="lx-card lx-card-subtle"
                  style={{
                    padding: "13px 15px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 14,
                    borderColor: isNextActive
                      ? "var(--border-strong)"
                      : step.done
                      ? "var(--callout-success-border)"
                      : "var(--border-subtle)",
                    background: isNextActive ? "var(--bg-surface)" : "var(--bg-subtle)",
                  }}
                >
                  <div className="min-w-0" style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 2,
                        background: step.done ? "var(--callout-success-bg)" : "var(--bg-subtle)",
                        border: "1px solid var(--border)",
                        color: step.done ? "var(--dot-success)" : "var(--fg-secondary)",
                      }}
                    >
                      {step.done ? <CheckCircle2 size={16} /> : <StepIcon size={16} />}
                    </div>
                    <div className="min-w-0" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 13.5,
                          lineHeight: 1.35,
                          color: "var(--fg)",
                        }}
                      >
                        {i + 1}. {step.title}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.4 }}>
                        ca. {step.minutes} Min. · {step.subtitle}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`lx-btn ${isNextActive ? "lx-btn-primary" : ""}`}
                    style={{ flexShrink: 0 }}
                    onClick={() => onStartStep(step)}
                  >
                    <span>{step.done ? "Wiederholen" : "Öffnen"}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Ruhige +12-Min.-Bonus-Etappe */}
          <div
            className="lx-praxis-card"
            style={{
              marginTop: 2,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div className="min-w-0" style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 3 }}>
              <strong style={{ fontSize: 13.5, display: "flex", alignItems: "center", gap: 6, color: "var(--fg)" }}>
                <Sparkles size={15} style={{ color: "var(--domain-b)", flexShrink: 0 }} />
                <span>{bonus.title}</span>
              </strong>
              <span style={{ fontSize: 12.5, color: "var(--fg-secondary)" }}>{bonus.description}</span>
            </div>
            <button type="button" className="lx-btn" onClick={() => onTriggerBonusRound(bonus)}>
              <Zap size={14} style={{ color: "var(--domain-c)" }} />
              <span>+12-Min.-Bonus</span>
            </button>
          </div>
        </div>

        {/* Rechte Spalte: Individuelle Bezugsnorm & Verwechslungs-Radar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Flame size={16} style={{ color: "var(--domain-b)" }} />
              <h3 style={{ margin: 0, fontSize: 15.5 }}>Dein Wochen-Rückblick</h3>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45 }}>
              Individuelle Bezugsnorm nach Rheinberg – du misst dich nur an deinem eigenen Fortschritt:
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              {[
                { label: "Lernzeit (7 Tage)", val: `${weeklyGrowth.totalMinutes} Min.` },
                { label: "Ankerblätter sicher", val: weeklyGrowth.unitsCompleted },
                { label: "FSRS-Karten geübt", val: weeklyGrowth.cardsReviewed },
                { label: "Bonus-Etappen", val: weeklyGrowth.bonusRounds },
              ].map((stat, idx) => (
                <div key={idx} className="lx-card lx-card-subtle" style={{ padding: "11px 13px" }}>
                  <div style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>{stat.label}</div>
                  <strong className="tabular" style={{ fontSize: 18, color: "var(--fg)" }}>
                    {stat.val}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          {plan.activeConfusion && (
            <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 14.5 }}>Verwechslungs-Radar</strong>
                <span className={`lx-badge domain-badge-${plan.activeConfusion.domain || "A"}`}>
                  {plan.activeConfusion.page_label}
                </span>
              </div>
              <div
                className="lx-card lx-card-subtle"
                style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}
              >
                <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.35 }}>
                  {plan.activeConfusion.term_a} vs. {plan.activeConfusion.term_b}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--fg-secondary)" }}>
                  Kannst du die Abgrenzung frei in einem Satz erklären?
                </div>
                {showConfusionAnswer && (
                  <div
                    style={{
                      marginTop: 6,
                      paddingTop: 10,
                      borderTop: "1px solid var(--border)",
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div>
                      <strong>Abgrenzung:</strong> {plan.activeConfusion.core_difference}
                    </div>
                    {plan.activeConfusion.memory_bridge && (
                      <div>
                        <strong>Merksatz:</strong> {plan.activeConfusion.memory_bridge}
                      </div>
                    )}
                    {plan.activeConfusion.kunst_sport_example && (
                      <div style={{ color: "var(--domain-b)" }}>
                        <strong>Kunst/Sport-Beispiel:</strong> {plan.activeConfusion.kunst_sport_example}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="lx-btn"
                onClick={() => setShowConfusionAnswer((v) => !v)}
              >
                {showConfusionAnswer ? "Auflösung zuklappen" : "Auflösung & Eselsbrücke zeigen"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
