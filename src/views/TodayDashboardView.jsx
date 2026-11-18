import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Headphones,
  Layers,
  Scale,
  Sparkles,
  Zap,
} from "lucide-react";
import { computeDaysUntilExam, buildDailyCorePlan, buildBonusStage } from "../lib/adaptivePlanner";
import {
  computeDailyMasteryRings,
  computeLevelInfo,
  computeNonPunitiveStreak,
  computeTotalLearnerXp,
  evaluateUnlockedAchievements,
} from "../lib/gamificationEngine";
import { analyzeLearnerProfile } from "../lib/learnerIntelligence";
import { buildSevenDayWeekStrip } from "../lib/calendarExport";
import { MasteryRingsHero, AtelierGardenCard } from "../components/MasteryRingsAndGarden";

export function TodayDashboardView({
  allUnits = [],
  unitProgressMap = {},
  fsrsStatesMap = {},
  examAttempts = [],
  activityLogs = [],
  confusionCounts = {},
  confusionPairs = [],
  examSets = [],
  todayLog = null,
  examDate = "2027-02-17",
  dailyTargetMinutes = 32,
  energyMode = "normal",
  activeProfile = null,
  activeCourseTitle = "EWS Psychologie",
  onChangeEnergyMode,
  onOpenProfileModal,
  onOpenCalendarModal,
  onOpenFocusTimer,
  onOpenWeaknessPodcast,
  onStartStep,
  onStartSofaDemoAudio,
  onTriggerBonusRound,
}) {
  const [showConfusionAnswer, setShowConfusionAnswer] = useState(false);

  const daysLeft = computeDaysUntilExam(examDate);
  const plan = useMemo(
    () =>
      buildDailyCorePlan({
        units: allUnits,
        unitProgressMap,
        confusionCounts,
        confusionPairs,
        examSets,
        todayLog,
      }),
    [allUnits, unitProgressMap, confusionCounts, confusionPairs, examSets, todayLog]
  );

  const bonus = useMemo(
    () =>
      buildBonusStage({
        units: allUnits,
        unitProgressMap,
        focusDomain: plan.focusDomain,
      }),
    [allUnits, unitProgressMap, plan.focusDomain]
  );

  const totalXp = useMemo(
    () =>
      computeTotalLearnerXp({
        activityLogs,
        unitProgressMap,
        fsrsStatesMap,
        examAttempts,
      }),
    [activityLogs, unitProgressMap, fsrsStatesMap, examAttempts]
  );

  const levelInfo = useMemo(() => computeLevelInfo(totalXp), [totalXp]);
  const streakInfo = useMemo(() => computeNonPunitiveStreak(activityLogs), [activityLogs]);
  const masteryRings = useMemo(
    () => computeDailyMasteryRings(todayLog, energyMode, dailyTargetMinutes),
    [todayLog, energyMode, dailyTargetMinutes]
  );
  const achievements = useMemo(
    () =>
      evaluateUnlockedAchievements({
        activityLogs,
        unitProgressMap,
        fsrsStatesMap,
        examAttempts,
      }),
    [activityLogs, unitProgressMap, fsrsStatesMap, examAttempts]
  );

  const weekStrip = useMemo(
    () => buildSevenDayWeekStrip(activityLogs, streakInfo.protectedPauseDays),
    [activityLogs, streakInfo.protectedPauseDays]
  );

  const learnerDna = useMemo(
    () =>
      analyzeLearnerProfile({
        allUnits,
        unitProgressMap,
        fsrsStatesMap,
        confusionCounts,
        confusionPairs,
        examAttempts,
        activityLogs,
        examDate,
        dailyTargetMinutes,
      }),
    [
      allUnits,
      unitProgressMap,
      fsrsStatesMap,
      confusionCounts,
      confusionPairs,
      examAttempts,
      activityLogs,
      examDate,
      dailyTargetMinutes,
    ]
  );

  const firstUndoneIdx = plan.steps.findIndex((s) => !s.done);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-testid="today-dashboard-view">
      {/* 1. Schlanke Apple-HIG Kontext- & Countdown-Leiste (immer exakt 1 Zeile!) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "nowrap",
          minWidth: 0,
        }}
      >
        <button
          type="button"
          className="lx-badge"
          onClick={() => onOpenProfileModal?.("profiles")}
          style={{
            cursor: "pointer",
            background: "var(--bg-surface)",
            borderColor: "var(--border-strong)",
            color: "var(--fg)",
            fontWeight: 600,
            padding: "5px 10px",
            minHeight: 34,
            minWidth: 0,
            flex: "0 1 auto",
          }}
          data-testid="active-profile-pill"
        >
          <span style={{ flexShrink: 0 }}>{activeProfile?.avatarEmoji || "🎨"}</span>
          <span className="truncate">
            {activeCourseTitle}
          </span>
          <ChevronDown size={13} style={{ flexShrink: 0, color: "var(--fg-muted)" }} />
        </button>

        <button
          type="button"
          className="lx-badge"
          onClick={onOpenCalendarModal}
          style={{
            cursor: "pointer",
            background: "var(--bg-surface)",
            borderColor: "var(--border-strong)",
            color: "var(--fg)",
            fontWeight: 700,
            padding: "5px 10px",
            minHeight: 34,
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
          data-testid="open-calendar-pill"
        >
          <Calendar size={13} style={{ color: "var(--domain-a)", flexShrink: 0 }} />
          <span className="tabular">{daysLeft !== null ? `${daysLeft} Tage` : "Termin"}</span>
          <span style={{ color: "var(--fg-muted)", fontWeight: 500, fontSize: 11 }}>
            · {examDate?.slice(5) || "Feb"}
          </span>
        </button>
      </div>

      {/* 2. Top-Hero-Grid: Links Mastery-Ringe + Tagesform, Rechts 7-Tage-Streifen + 3-Gebiete-Trio */}
      <div className="lx-top-hero-grid">
        <MasteryRingsHero
          masteryRings={masteryRings}
          energyMode={energyMode}
          onChangeEnergyMode={onChangeEnergyMode}
          levelInfo={levelInfo}
          streakInfo={streakInfo}
          nextUnit={plan.nextUnit}
          onStartSofaAudio={onStartSofaDemoAudio}
          onOpenNextSheet={() =>
            plan.nextUnit &&
            onStartStep({
              targetView: "scripts",
              unitId: plan.nextUnit.id,
              domain: plan.nextUnit.domain,
            })
          }
          onOpenFocusTimer={onOpenFocusTimer}
        />

        {/* Rechte Top-Karte: 7-Tage-Wochenstreifen + Kompaktes 3-Gebiete-Trio */}
        <div
          className="lx-card"
          style={{
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 13,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                marginBottom: 9,
              }}
            >
              <strong style={{ fontSize: 13.5, whiteSpace: "nowrap" }}>Deine Lernwoche</strong>
              <button
                type="button"
                className="lx-badge"
                style={{ cursor: "pointer", background: "var(--bg-subtle)", fontSize: 11, minHeight: 24, whiteSpace: "nowrap", flexShrink: 0 }}
                onClick={onOpenCalendarModal}
              >
                Kalender (.ics)
              </button>
            </div>

            <div className="lx-week-strip" data-testid="seven-day-week-strip">
              {weekStrip.map((d) => (
                <div
                  key={d.dateKey}
                  className={`lx-week-day ${d.isToday ? "is-today" : ""} ${d.isActive ? "is-active" : ""} ${
                    d.isShielded ? "is-shielded" : ""
                  }`}
                >
                  <span style={{ fontSize: 10, color: "var(--fg-muted)", fontWeight: 600 }}>
                    {d.dayShort}
                  </span>
                  <strong className="tabular" style={{ fontSize: 12.5 }}>
                    {d.dayNum}
                  </strong>
                  <span style={{ height: 12, display: "flex", alignItems: "center", fontSize: 10 }}>
                    {d.isActive ? (
                      <Check size={11} style={{ color: "var(--domain-b)" }} />
                    ) : d.isShielded ? (
                      "🛡️"
                    ) : d.isToday ? (
                      "•"
                    ) : (
                      ""
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Kompaktes 3-Spalten Gebiets-Trio (A · B · C nebeneinander ohne Abschneiden!) */}
          <div className="lx-domain-trio">
            {[
              { key: "A", short: "A · Lernen", color: "var(--domain-a)" },
              { key: "B", short: "B · Entwickl.", color: "var(--domain-b)" },
              { key: "C", short: "C · Diagnostik", color: "var(--domain-c)" },
            ].map((dom) => {
              const m = plan.mastery[dom.key] || { total: 0, mastered: 0, percent: 0 };
              return (
                <button
                  key={dom.key}
                  type="button"
                  onClick={() =>
                    onStartStep({
                      targetView: "scripts",
                      domain: dom.key,
                    })
                  }
                  className={`lx-card lx-card-subtle domain-border-${dom.key}`}
                  style={{
                    padding: "9px 10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    cursor: "pointer",
                    textAlign: "left",
                    minWidth: 0,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--fg-secondary)" }} className="truncate">
                    {dom.short}
                  </span>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 4 }}>
                    <strong className="tabular" style={{ fontSize: 16, color: dom.color }}>
                      {m.percent}%
                    </strong>
                    <span className="tabular" style={{ fontSize: 10.5, color: "var(--fg-muted)" }}>
                      {m.mastered}/{m.total}
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
                    <div style={{ width: `${m.percent}%`, height: "100%", background: dom.color }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Hauptbereich: Links Heutige Etappen-Schritte + Mitlernende Lern-DNA, Rechts Atelier-Garten & Verwechslungs-Radar */}
      <div className="lx-dashboard-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Heutige Etappen-Schritte */}
          <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16 }}>Dein klarer Fahrplan für heute</h2>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--fg-muted)" }}>
                  Schwerpunkt Gebiet {plan.focusDomain} · Abgestimmt auf Seitengedächtnis &amp; Wahlformat
                </p>
              </div>
              <button
                type="button"
                className="lx-badge"
                style={{ cursor: "pointer", background: "var(--bg-subtle)" }}
                onClick={() => onOpenProfileModal?.("courses")}
              >
                + Eigenes Fach
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                      padding: "11px 13px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      borderColor: isNextActive
                        ? "var(--border-strong)"
                        : step.done
                        ? "var(--callout-success-border)"
                        : "var(--border-subtle)",
                      background: isNextActive ? "var(--bg-surface)" : "var(--bg-subtle)",
                    }}
                  >
                    <div className="min-w-0" style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          background: step.done ? "var(--callout-success-bg)" : "var(--bg-subtle)",
                          border: "1px solid var(--border)",
                          color: step.done ? "var(--dot-success)" : "var(--fg-secondary)",
                        }}
                      >
                        {step.done ? <CheckCircle2 size={15} /> : <StepIcon size={15} />}
                      </div>
                      <div className="min-w-0" style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }} className="truncate">
                          {i + 1}. {step.title}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--fg-muted)" }} className="truncate">
                          {step.minutes} Min. · {step.subtitle}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`lx-btn ${isNextActive ? "lx-btn-primary" : ""}`}
                      style={{ minHeight: 36, padding: "5px 11px", fontSize: 12.5, flexShrink: 0 }}
                      onClick={() => onStartStep(step)}
                    >
                      <span>{step.done ? "Nochmal" : "Start"}</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* +12-Min.-Bonus-Etappe */}
            <div
              className="lx-praxis-card"
              style={{
                padding: "11px 14px",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div className="min-w-0" style={{ flex: "1 1 210px" }}>
                <strong style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={14} style={{ color: "var(--domain-b)", flexShrink: 0 }} />
                  <span className="truncate">{bonus.title}</span>
                </strong>
                <div style={{ fontSize: 12, color: "var(--fg-secondary)" }}>{bonus.description}</div>
              </div>
              <button
                type="button"
                className="lx-btn"
                style={{ minHeight: 36, padding: "5px 12px", fontSize: 12.5 }}
                onClick={() => onTriggerBonusRound(bonus)}
              >
                <Zap size={13} style={{ color: "var(--domain-c)" }} />
                <span>+12m Bonus</span>
              </button>
            </div>
          </div>

          {/* MITLERNENDE LERN-DNA & ZEITZIEL-PROGNOSE */}
          <div
            className="lx-card"
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
            data-testid="adaptive-dna-card"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 7 }}>
                <BrainCircuit size={16} style={{ color: "var(--domain-a)" }} />
                <span>Mitlernendes Lernprofil &amp; Examens-Prognose</span>
              </strong>
              <span className="lx-badge">
                Empfehlung: ~{learnerDna.adaptiveRecommendedDailyMinutes} Min./Lerntag
              </span>
            </div>

            <div
              className="lx-card lx-card-subtle"
              style={{ padding: "11px 13px", fontSize: 12.5, color: "var(--fg-secondary)", lineHeight: 1.5 }}
            >
              {learnerDna.coachInsight}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              {learnerDna.dna.map((axis) => (
                <div key={axis.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                    <span className="truncate" style={{ color: "var(--fg-secondary)" }}>
                      {axis.label}
                    </span>
                    <strong className="tabular">{axis.score}%</strong>
                  </div>
                  <div style={{ height: 5, borderRadius: 999, background: "var(--bg-subtle)", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.max(4, axis.score)}%`,
                        height: "100%",
                        background: "var(--domain-a)",
                        borderRadius: 999,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="lx-btn"
              onClick={onOpenWeaknessPodcast}
              data-testid="open-weakness-podcast-btn"
            >
              <Headphones size={14} style={{ color: "var(--domain-b)" }} />
              <span>Persönlichen Schwachstellen-Podcast erzeugen</span>
            </button>
          </div>
        </div>

        {/* Rechte Spalte: Atelier-Garten + Verwechslungs-Radar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <AtelierGardenCard
            levelInfo={levelInfo}
            streakInfo={streakInfo}
            achievements={achievements}
          />

          {plan.activeConfusion && (
            <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <strong style={{ fontSize: 14.5 }}>Verwechslungs-Radar</strong>
                <span className={`lx-badge domain-badge-${plan.activeConfusion.domain || "A"}`}>
                  {plan.activeConfusion.page_label}
                </span>
              </div>
              <div
                className="lx-card lx-card-subtle"
                style={{ padding: "11px 13px", display: "flex", flexDirection: "column", gap: 6 }}
              >
                <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.35 }}>
                  {plan.activeConfusion.term_a} vs. {plan.activeConfusion.term_b}
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-secondary)" }}>
                  Kannst du die Abgrenzung frei in einem Satz erklären?
                </div>
                {showConfusionAnswer && (
                  <div
                    style={{
                      marginTop: 4,
                      paddingTop: 9,
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
