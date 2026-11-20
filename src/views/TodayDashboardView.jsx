import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  Headphones,
  Layers,
  Scale,
  Smartphone,
  Sparkles,
  Timer,
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
import { MasteryRingsSummary, AtelierGardenCard } from "../components/MasteryRingsAndGarden";

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
  studyClockRunning = false,
  onToggleStudyClock,
  onChangeEnergyMode,
  onOpenProfileModal,
  onOpenCalendarModal,
  onOpenFocusTimer,
  onOpenInstallStarter,
  onOpenWeaknessPodcast,
  onStartStep,
  onStartSofaDemoAudio,
  onTriggerBonusRound,
}) {
  const [rightSubTab, setRightSubTab] = useState("garden"); // garden | week | confusion
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} data-testid="today-dashboard-view">
      {/* 1. SCHLANKE KONTEXT- & TAGESFORM-LEISTE */}
      <div
        className="lx-card"
        style={{
          padding: "14px 18px",
          borderLeft: "5px solid var(--lilac)",
          display: "flex",
          flexDirection: "column",
          gap: 11,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            className="lx-badge lx-badge-lilac"
            onClick={() => onOpenProfileModal?.("profiles")}
            style={{ cursor: "pointer", minHeight: 32, padding: "3px 10px", maxWidth: "56%" }}
            data-testid="active-profile-pill"
          >
            <span style={{ flexShrink: 0 }}>{activeProfile?.avatarEmoji || "🎨"}</span>
            <span className="truncate">{activeCourseTitle}</span>
            <ChevronDown size={12} style={{ flexShrink: 0 }} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              className="lx-badge"
              onClick={onOpenInstallStarter}
              style={{ cursor: "pointer", minHeight: 32, padding: "3px 9px", background: "var(--bg-surface)" }}
              data-testid="open-app-starter-pill"
            >
              <Smartphone size={12} style={{ color: "var(--domain-b)" }} />
              <span>App-Icon</span>
            </button>

            <button
              type="button"
              className="lx-badge"
              onClick={onOpenCalendarModal}
              style={{ cursor: "pointer", minHeight: 32, padding: "3px 9px", fontWeight: 700, background: "var(--bg-surface)" }}
              data-testid="open-calendar-pill"
            >
              <Calendar size={12} style={{ color: "var(--lilac)" }} />
              <span className="tabular">{daysLeft !== null ? `${daysLeft} T.` : "Termin"}</span>
            </button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 260px" }}>
            <h1 style={{ margin: 0, fontSize: "clamp(17px, 2vw, 21px)", lineHeight: 1.25 }}>
              Schritt für Schritt entspannt ins Ziel
            </h1>
            <div style={{ fontSize: 12, color: "var(--fg-secondary)", marginTop: 3, display: "flex", alignItems: "flex-start", gap: 6 }}>
              <Timer size={13} style={{ color: studyClockRunning ? "var(--domain-b)" : "var(--lilac)", flexShrink: 0, marginTop: 2 }} />
              <span>
                {studyClockRunning
                  ? "Deine Lernuhr läuft automatisch mit!"
                  : "Deine Lernuhr startet automatisch, sobald du unten loslegst."}
              </span>
            </div>
          </div>

          <div
            className="lx-tagesform-strip"
            style={{ minWidth: 270, flex: "0 1 340px" }}
            role="group"
            aria-label="Tagesform wählen"
            data-testid="energy-mode-selector"
          >
            {[
              { id: "gentle", label: "Sanft · 15m", emoji: "🛋️" },
              { id: "normal", label: "Normal · 32m", emoji: "✨" },
              { id: "flow", label: "Flow · 50m", emoji: "🚀" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                className={`lx-tagesform-btn ${energyMode === m.id ? "is-active" : ""}`}
                onClick={() => onChangeEnergyMode(m.id)}
                data-testid={`energy-btn-${m.id}`}
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. SYMMETRISCHES 2-SPALTEN-BOARD (GLEICHE HÖHE, ZERO ÜBERFORDERUNG!) */}
      <div className="lx-dashboard-grid">
        {/* LINKE SPALTE: GENAU 3 KLARE SCHRITTE FÜR HEUTE */}
        <div className="lx-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: 16 }}>Deine 3 klaren Schritte für heute</strong>
              <span className={`lx-badge domain-badge-${plan.focusDomain}`}>
                Schwerpunkt Gebiet {plan.focusDomain}
              </span>
            </div>

            {/* SCHRITT 1: SOFA-EINSTIEG (AUDIO vs NOTEBOOKLM KLAR GETRENNT!) */}
            <div className="lx-cat-merksatz" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <strong style={{ fontSize: 13.5, color: "var(--cat-merksatz-fg)" }}>
                  1. Zuhören &amp; ankommen (7 Min. · Null-Hürde)
                </strong>
                {todayLog?.podcastListened && <Check size={15} style={{ color: "var(--dot-success)" }} />}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--fg-secondary)" }}>
                {plan.nextUnit
                  ? `Passend zu Kap. ${plan.nextUnit.section_num}: ${plan.nextUnit.title} (${plan.nextUnit.page_label})`
                  : "Entspannter Audio-Start auf dem Sofa"}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="lx-btn lx-btn-primary"
                  style={{ flex: "1 1 160px" }}
                  onClick={() => onStartSofaDemoAudio(plan.nextUnit)}
                  data-testid="sofa-start-audio-btn"
                >
                  <Headphones size={14} />
                  <span>Fokus-Audio sofort abspielen</span>
                </button>
                <button
                  type="button"
                  className="lx-btn"
                  onClick={() =>
                    onStartStep({
                      targetView: "podcast",
                      unitId: plan.nextUnit?.id,
                      domain: plan.nextUnit?.domain || plan.focusDomain,
                    })
                  }
                >
                  <span>NotebookLM-Podcast</span>
                </button>
              </div>
            </div>

            {/* SCHRITT 2: ANKERBLATT IM BLÄTTER-MODUS */}
            <div className="lx-cat-def" style={{ gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <strong style={{ fontSize: 13.5, color: "var(--cat-def-fg)" }}>
                  2. Visuell im Blätter-Modus durchgehen (12 Min.)
                </strong>
                {(todayLog?.unitsCompleted || 0) >= 1 && <Check size={15} style={{ color: "var(--dot-success)" }} />}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--fg-secondary)" }}>
                {plan.nextUnit
                  ? `${plan.nextUnit.section_num} ${plan.nextUnit.title} · ohne langes Scrollen Seite für Seite umblättern`
                  : "Ankerblatt visuell einprägen & 5 Begriffe laut erzählen"}
              </div>
              <button
                type="button"
                className="lx-btn"
                style={{ alignSelf: "flex-start" }}
                onClick={() =>
                  onStartStep({
                    targetView: "scripts",
                    unitId: plan.nextUnit?.id,
                    domain: plan.nextUnit?.domain || plan.focusDomain,
                  })
                }
              >
                <BookOpen size={14} style={{ color: "var(--domain-a)" }} />
                <span>Seitenweise durchklicken ({plan.nextUnit?.page_label || "Skript"})</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* SCHRITT 3: KURZ ABRUFEN & FESTIGEN */}
            <div className="lx-cat-check" style={{ gap: 8 }}>
              <strong style={{ fontSize: 13.5, color: "var(--cat-check-fg)" }}>
                3. Kurz festigen &amp; prüfen (10 Min.)
              </strong>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button
                  type="button"
                  className="lx-btn"
                  onClick={() => onStartStep({ targetView: "cards", domain: plan.focusDomain })}
                >
                  <Layers size={14} style={{ color: "var(--domain-c)" }} />
                  <span>Karten-Sprint</span>
                </button>
                <button
                  type="button"
                  className="lx-btn"
                  onClick={() => onStartStep({ targetView: "exam", domain: plan.focusDomain })}
                >
                  <Scale size={14} style={{ color: "var(--lilac)" }} />
                  <span>1 Fallvignette</span>
                </button>
              </div>
            </div>
          </div>

          {/* +12-Min.-Bonus als ruhiger Abschluss */}
          <div
            className="lx-cat-praxis"
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div className="min-w-0" style={{ flex: "1 1 190px" }}>
              <strong style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 5, color: "var(--cat-praxis-fg)" }}>
                <Sparkles size={13} />
                <span>Im Flow? Freiwillige Bonus-Etappe</span>
              </strong>
              <div style={{ fontSize: 11.5, color: "var(--fg-secondary)" }} className="truncate">
                {bonus.description}
              </div>
            </div>
            <button type="button" className="lx-btn" style={{ minHeight: 34, fontSize: 12 }} onClick={() => onTriggerBonusRound(bonus)}>
              <Zap size={13} style={{ color: "var(--domain-c)" }} />
              <span>+12m Bonus</span>
            </button>
          </div>
        </div>

        {/* RECHTE SPALTE: TAGESRINGE + 3 FARBIGE SKRIPTE + AUFGERÄUMTE 3-TAB-BOX */}
        <div className="lx-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <MasteryRingsSummary
            masteryRings={masteryRings}
            levelInfo={levelInfo}
            streakInfo={streakInfo}
            onOpenFocusTimer={onOpenFocusTimer}
          />

          {/* 3 klar getrennte Skript-Balken */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {[
              { key: "A", title: "A · Lernen", col: "var(--domain-a)" },
              { key: "B", title: "B · Entwickl.", col: "var(--domain-b)" },
              { key: "C", title: "C · Diagnostik", col: "var(--domain-c)" },
            ].map((d) => {
              const m = plan.mastery[d.key] || { total: 0, mastered: 0, percent: 0 };
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => onStartStep({ targetView: "scripts", domain: d.key })}
                  className={`lx-card lx-card-subtle domain-border-${d.key}`}
                  style={{ padding: "8px 10px", textAlign: "left", cursor: "pointer", minWidth: 0 }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--fg-secondary)" }} className="truncate">
                    {d.title}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 4, marginTop: 2 }}>
                    <strong className="tabular" style={{ fontSize: 16, color: d.col }}>
                      {m.percent}%
                    </strong>
                    <span className="tabular" style={{ fontSize: 10.5, color: "var(--fg-muted)" }}>
                      {m.mastered}/{m.total}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 3-TAB-MOTIVATIONS- & INTELLIGENZ-BEREICH (KEINE KARTEN-FLUT!) */}
          <div className="lx-segmented cols-3" style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[
              { id: "garden", label: "🌱 Garten" },
              { id: "week", label: "📅 Prognose" },
              { id: "confusion", label: "⚡ Abgrenzung" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                className={`lx-seg-btn ${rightSubTab === t.id ? "is-active" : ""}`}
                onClick={() => setRightSubTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {rightSubTab === "garden" && (
            <AtelierGardenCard levelInfo={levelInfo} streakInfo={streakInfo} achievements={achievements} compact />
          )}

          {rightSubTab === "week" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div className="lx-week-strip">
                {weekStrip.map((d) => (
                  <div
                    key={d.dateKey}
                    className={`lx-week-day ${d.isToday ? "is-today" : ""} ${d.isActive ? "is-active" : ""} ${
                      d.isShielded ? "is-shielded" : ""
                    }`}
                  >
                    <span style={{ fontSize: 10, color: "var(--fg-muted)", fontWeight: 700 }}>{d.dayShort}</span>
                    <strong className="tabular" style={{ fontSize: 12.5 }}>{d.dayNum}</strong>
                    <span style={{ fontSize: 10 }}>
                      {d.isActive ? "✓" : d.isShielded ? "🛡️" : d.isToday ? "•" : ""}
                    </span>
                  </div>
                ))}
              </div>

              <div className="lx-card lx-card-subtle" style={{ padding: "11px 13px", fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-secondary)" }}>
                <strong>Mitlernende Prognose:</strong> {learnerDna.coachInsight}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="lx-btn" style={{ flex: 1 }} onClick={onOpenCalendarModal}>
                  <Calendar size={13} />
                  <span>Kalender-Export (.ics)</span>
                </button>
                <button type="button" className="lx-btn" style={{ flex: 1 }} onClick={onOpenWeaknessPodcast}>
                  <Headphones size={13} />
                  <span>Aha-Podcast</span>
                </button>
              </div>
            </div>
          )}

          {rightSubTab === "confusion" && plan.activeConfusion && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="lx-card lx-card-subtle" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span className={`lx-badge domain-badge-${plan.activeConfusion.domain || "A"}`}>
                    {plan.activeConfusion.page_label}
                  </span>
                </div>
                <strong style={{ fontSize: 14 }}>
                  {plan.activeConfusion.term_a} vs. {plan.activeConfusion.term_b}
                </strong>
                {showConfusionAnswer && (
                  <div style={{ fontSize: 12.5, color: "var(--fg-secondary)", lineHeight: 1.5, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                    <strong>Unterschied:</strong> {plan.activeConfusion.core_difference}
                    {plan.activeConfusion.memory_bridge && (
                      <div style={{ marginTop: 4 }}>
                        <strong>Eselsbrücke:</strong> {plan.activeConfusion.memory_bridge}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button type="button" className="lx-btn" onClick={() => setShowConfusionAnswer((v) => !v)}>
                {showConfusionAnswer ? "Verdecken" : "Auflösung & Eselsbrücke zeigen"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
