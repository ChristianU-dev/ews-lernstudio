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
import { StatusBadge } from "../design/ui";
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="today-dashboard-view">
      {/* Sofa-Podcast-Start Hero gegen die Anfangshürde */}
      <div
        className="lx-card"
        style={{
          background:
            "linear-gradient(135deg, var(--accent-soft) 0%, var(--bg-surface) 62%, var(--domain-b-soft) 100%)",
          borderColor: "var(--accent-border)",
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div className="min-w-0" style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <StatusBadge label="Entspannter Einstieg · Null-Hürde" tone="active" />
              <span className="lx-badge">Grundschule Bayern · Kunst &amp; Sport</span>
            </div>
            <h1 style={{ margin: "4px 0 0", fontSize: 21, lineHeight: 1.28 }}>
              Willkommen in deinem EWS-Psychologie Lernstudio
            </h1>
            <p style={{ margin: 0, color: "var(--fg-secondary)", fontSize: 13.5, maxWidth: 740 }}>
              Kein Druck, keine roten „Überfällig!“-Listen nach Pausentagen: Starte gemütlich auf dem Sofa mit
              einem kurzen Audio-Überblick oder präge dir ein 1-Seiten-Ankerblatt visuell ein und erzähle es laut nach.
            </p>
          </div>

          {/* Taggenau einstellbares Februar-Prüfungsdatum */}
          <div className="lx-card lx-card-subtle" style={{ padding: "10px 13px", minWidth: 210 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 11.5, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                <Calendar size={13} />
                <span>Staatsexamen Februar</span>
              </span>
              <button
                type="button"
                className="lx-badge"
                style={{ cursor: "pointer", height: 22, fontSize: 11 }}
                onClick={() => setEditingDate((v) => !v)}
              >
                {editingDate ? "Fertig" : "Tag ändern"}
              </button>
            </div>
            {editingDate ? (
              <input
                type="date"
                className="lx-input"
                style={{ marginTop: 6, padding: "5px 8px" }}
                value={examDate || "2027-02-17"}
                onChange={(e) => onUpdateExamDate(e.target.value)}
                aria-label="Prüfungsdatum im Februar wählen"
              />
            ) : (
              <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 8 }}>
                <strong className="tabular" style={{ fontSize: 20, color: "var(--fg)" }}>
                  {daysLeft !== null ? `${daysLeft} Tage` : "Flexibel"}
                </strong>
                <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>({examDate})</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button
            type="button"
            className="lx-btn lx-btn-primary"
            style={{ height: 42, padding: "0 16px", fontSize: 13.5 }}
            onClick={() => onStartSofaDemoAudio(plan.nextUnit)}
            data-testid="sofa-start-audio-btn"
          >
            <Headphones size={16} />
            <span>Sofa-Audio direkt starten ({plan.nextUnit ? plan.nextUnit.section_num : "Intro"})</span>
          </button>

          {plan.nextUnit && (
            <button
              type="button"
              className="lx-btn"
              style={{ height: 42, padding: "0 15px", fontSize: 13.5 }}
              onClick={() =>
                onStartStep({
                  targetView: "scripts",
                  unitId: plan.nextUnit.id,
                  domain: plan.nextUnit.domain,
                })
              }
            >
              <BookOpen size={16} />
              <span>
                Direkt zum 1-Seiten-Ankerblatt ({plan.nextUnit.page_label})
              </span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 4 KPI-Karten: Individuelle Bezugsnorm (Rheinberg) + 3 Gebiets-Farbcodes */}
      <div className="lx-kpi-row">
        <div className="lx-kpi-card">
          <span style={{ fontSize: 12, color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <Target size={13} style={{ color: "var(--primary-bg)" }} />
            <span>Heutiges Kern-Tagesziel</span>
          </span>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
            <strong className="tabular" style={{ fontSize: 20 }}>
              {plan.minutesDone} / {plan.targetMinutes} Min.
            </strong>
            <span style={{ fontSize: 12, color: "var(--dot-success)", fontWeight: 600 }}>
              {plan.isCoreGoalReached ? "Tagessieg erreicht!" : `${progressPct} %`}
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: "var(--bg-subtle)", overflow: "hidden", marginTop: 2 }}>
            <div
              style={{
                width: `${progressPct}%`,
                height: "100%",
                background: "var(--primary-bg)",
                borderRadius: 999,
                transition: "width 240ms ease",
              }}
            />
          </div>
        </div>

        {[
          { key: "A", title: "A · Lernen & Lehren", pages: "108 S.", color: "var(--domain-a)" },
          { key: "B", title: "B · Entwicklung", pages: "82 S.", color: "var(--domain-b)" },
          { key: "C", title: "C · Diagnostik", pages: "73 S.", color: "var(--domain-c)" },
        ].map((d) => {
          const m = plan.mastery[d.key] || { total: 0, mastered: 0, seen: 0, percent: 0 };
          return (
            <div key={d.key} className={`lx-kpi-card domain-border-${d.key}`}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--fg-secondary)" }}>
                <span style={{ fontWeight: 600 }}>{d.title}</span>
                <span className="tabular">{d.pages}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
                <strong className="tabular" style={{ fontSize: 20, color: d.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                  {m.percent} %
                </strong>
                <span style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>
                  {m.mastered}/{m.total} Ankerblätter sicher
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: "var(--bg-subtle)", overflow: "hidden", marginTop: 2 }}>
                <div style={{ width: `${m.percent}%`, height: "100%", background: d.color, borderRadius: 999 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Hauptbereich: Links 32-Min.-Kern-Etappe + Bonus-Runde, Rechts Wochen-Rückblick & Verwechslungs-Radar */}
      <div className="lx-dashboard-grid">
        <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>Deine 32-Minuten Kern-Etappe für heute</h2>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--fg-muted)" }}>
                Optimaler Mix aus visuellem Einprägen, lautem Nacherzählen, FSRS-Karten und Testformat-Training.
              </p>
            </div>
            <span className={`lx-badge domain-badge-${plan.focusDomain}`}>
              Fokus heute: Gebiet {plan.focusDomain}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {plan.steps.map((step, i) => {
              const StepIcon =
                step.kind === "podcast"
                  ? Headphones
                  : step.kind === "script"
                  ? BookOpen
                  : step.kind === "cards"
                  ? Layers
                  : Scale;
              return (
                <div
                  key={step.id}
                  className="lx-card lx-card-subtle"
                  style={{
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    borderColor: step.done ? "var(--callout-success-border)" : "var(--border)",
                  }}
                >
                  <div className="min-w-0" style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        background: step.done ? "var(--callout-success-bg)" : "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        color: step.done ? "var(--dot-success)" : "var(--primary-bg)",
                      }}
                    >
                      {step.done ? <CheckCircle2 size={17} /> : <StepIcon size={16} />}
                    </div>
                    <div className="min-w-0">
                      <div style={{ fontWeight: 600, fontSize: 13.5 }} className="truncate">
                        {i + 1}. {step.title}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--fg-muted)" }} className="truncate">
                        ca. {step.minutes} Min. · {step.subtitle}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`lx-btn ${step.done ? "" : "lx-btn-primary"}`}
                    style={{ flexShrink: 0 }}
                    onClick={() => onStartStep(step)}
                  >
                    <span>{step.done ? "Nochmal" : "Starten"}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Motivierende +12-Min.-Bonus-Etappe im Flow */}
          <div
            style={{
              marginTop: 4,
              borderRadius: 12,
              padding: "13px 15px",
              background: "var(--callout-success-bg)",
              border: "1px solid var(--callout-success-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div className="min-w-0" style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={15} style={{ color: "var(--dot-success)" }} />
                <span>{bonus.title}</span>
              </span>
              <span style={{ fontSize: 12, color: "var(--fg-secondary)" }}>{bonus.description}</span>
            </div>
            <button type="button" className="lx-btn" onClick={() => onTriggerBonusRound(bonus)}>
              <Zap size={14} style={{ color: "var(--dot-warning)" }} />
              <span>+12-Min.-Bonus starten</span>
            </button>
          </div>
        </div>

        {/* Rechte Spalte: Individuelle Bezugsnorm & Verwechslungs-Radar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Flame size={16} style={{ color: "var(--dot-success)" }} />
              <h3 style={{ margin: 0, fontSize: 15 }}>Was du diese Woche schon gemeistert hast</h3>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--fg-muted)" }}>
              Dein eigener Lernzuwachs (individuelle Bezugsnorm nach Rheinberg): Jede geschaffte Einheit zählt!
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              <div className="lx-card lx-card-subtle" style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>Aktive Lernzeit (7 Tage)</div>
                <strong className="tabular" style={{ fontSize: 18 }}>
                  {weeklyGrowth.totalMinutes} Min.
                </strong>
              </div>
              <div className="lx-card lx-card-subtle" style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>Ankerblätter gemeistert</div>
                <strong className="tabular" style={{ fontSize: 18 }}>
                  {weeklyGrowth.unitsCompleted}
                </strong>
              </div>
              <div className="lx-card lx-card-subtle" style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>FSRS-Karten trainiert</div>
                <strong className="tabular" style={{ fontSize: 18 }}>
                  {weeklyGrowth.cardsReviewed}
                </strong>
              </div>
              <div className="lx-card lx-card-subtle" style={{ padding: "10px 12px" }}>
                <div style={{ fontSize: 11.5, color: "var(--fg-muted)" }}>+12-Min.-Bonus-Etappen</div>
                <strong className="tabular" style={{ fontSize: 18 }}>
                  {weeklyGrowth.bonusRounds}
                </strong>
              </div>
            </div>
          </div>

          {plan.activeConfusion && (
            <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  Verwechslungs-Radar (Beliebte Prüfungsfalle!)
                </span>
                <span className={`lx-badge domain-badge-${plan.activeConfusion.domain || "A"}`}>
                  {plan.activeConfusion.page_label}
                </span>
              </div>
              <div
                className="lx-card lx-card-subtle"
                style={{ padding: "11px 13px", display: "flex", flexDirection: "column", gap: 6 }}
              >
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                  {plan.activeConfusion.term_a} vs. {plan.activeConfusion.term_b}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--fg-secondary)" }}>
                  Kannst du den Unterschied in einem klaren Satz laut vor dir hersagen?
                </div>
                {showConfusionAnswer ? (
                  <div
                    style={{
                      marginTop: 4,
                      paddingTop: 8,
                      borderTop: "1px solid var(--border)",
                      fontSize: 12.5,
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                    }}
                  >
                    <div>
                      <strong>Kern-Unterschied:</strong> {plan.activeConfusion.core_difference}
                    </div>
                    {plan.activeConfusion.memory_bridge && (
                      <div>
                        <strong>Eselsbrücke:</strong> {plan.activeConfusion.memory_bridge}
                      </div>
                    )}
                    {plan.activeConfusion.kunst_sport_example && (
                      <div style={{ color: "var(--dot-success)" }}>
                        <strong>Kunst/Sport-Praxis:</strong> {plan.activeConfusion.kunst_sport_example}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="lx-btn"
                onClick={() => setShowConfusionAnswer((v) => !v)}
              >
                {showConfusionAnswer ? "Auflösung zuklappen" : "Auflösung & Eselsbrücke aufdecken"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
