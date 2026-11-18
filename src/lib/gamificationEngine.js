/**
 * Nicht-strafende, kompetenzbasierte Gamification-Engine ("Atelier-Garten & Lern-Ringe")
 * Entwickelt nach Deci & Ryan (Kompetenzerleben & Autonomie statt Streak-Angst!):
 * - Kompetenz-XP & 6 motivierende Entwicklungsstufen
 * - Automatischer Pausentag-Schutzschild (Streak Freeze), sodass freie Tage NIEMALS bestraft werden
 * - Wachsender botanischer „Atelier-Garten“ (6 Wachstumsstadien)
 * - 10 sinnstiftende Meilenstein-Abzeichen
 */

export const ATELIER_LEVELS = [
  { level: 1, minXp: 0, title: "Sofa-Starterin", plantStage: "Samenkorn im Atelier", icon: "🌱" },
  { level: 2, minXp: 180, title: "Seiten-Entdeckerin", plantStage: "Zarter Keimling", icon: "🌿" },
  { level: 3, minXp: 500, title: "Theorie-Brückenbauerin", plantStage: "Knospender Zweig", icon: "🪴" },
  { level: 4, minXp: 1000, title: "Grundschul-Pionierin", plantStage: "Blühende Atelier-Pflanze", icon: "🌸" },
  { level: 5, minXp: 1800, title: "Kunst- & Sport-Didaktikerin", plantStage: "Kräftiger Wissensbaum", icon: "🌳" },
  { level: 6, minXp: 3000, title: "Staatsexamens-Meisterin", plantStage: "Goldener Examens-Hain", icon: "✨" },
];

export const ACHIEVEMENT_DEFS = [
  {
    id: "first-audio",
    title: "Sofa-Eisbrecher",
    desc: "Erste Audio-Einheit entspannt gestartet – die Starthürde ist besiegt!",
    icon: "🎧",
  },
  {
    id: "first-anchor",
    title: "Fotografischer Blick",
    desc: "Erstes 1-Seiten-Ankerblatt komplett gemeistert.",
    icon: "📖",
  },
  {
    id: "five-anchors",
    title: "Laut-Erzähl-Profi",
    desc: "5 Ankerblätter visuell eingeprägt und frei gesprochen.",
    icon: "🗣️",
  },
  {
    id: "cards-25",
    title: "Gedächtnis-Spur",
    desc: "25 FSRS-Karten aktiv abgerufen.",
    icon: "🧠",
  },
  {
    id: "cards-100",
    title: "Langzeit-Anker",
    desc: "100 FSRS-Wiederholungen geschafft.",
    icon: "🏛️",
  },
  {
    id: "exam-first",
    title: "Prüfungs-Mut",
    desc: "Erste Staatsexamens-Übung im Wahlformat ausgewertet.",
    icon: "⚖️",
  },
  {
    id: "flow-bonus",
    title: "Im Flow",
    desc: "Eine freiwillige +12-Min.-Bonus-Etappe absolviert.",
    icon: "⚡",
  },
  {
    id: "tri-domain",
    title: "Drei-Gebiete-Vernetzt",
    desc: "In allen drei Gebieten (A, B & C) erste Einheiten verankert.",
    icon: "🔗",
  },
];

export const XP_REWARDS = {
  PODCAST_LISTEN: 25,
  CARD_REVIEW_GOOD: 8,
  CARD_REVIEW_HARD_EFFORT: 12, // Anstrengungs-Lob nach Weiner!
  UNIT_MASTERED: 55,
  EXAM_ATTEMPT: 65,
  BONUS_STAGE: 40,
  FOCUS_TIMER_DONE: 35,
};

export function computeLevelInfo(totalXp = 0) {
  const safeXp = Math.max(0, Math.round(totalXp));
  let current = ATELIER_LEVELS[0];
  let next = null;
  for (let i = 0; i < ATELIER_LEVELS.length; i++) {
    if (safeXp >= ATELIER_LEVELS[i].minXp) {
      current = ATELIER_LEVELS[i];
      next = ATELIER_LEVELS[i + 1] || null;
    }
  }
  const intoLevel = safeXp - current.minXp;
  const span = next ? next.minXp - current.minXp : 500;
  const progressPct = next ? Math.min(100, Math.round((intoLevel / span) * 100)) : 100;

  return {
    totalXp: safeXp,
    level: current.level,
    title: current.title,
    plantStage: current.plantStage,
    icon: current.icon,
    nextLevelXp: next ? next.minXp : null,
    xpToNext: next ? Math.max(0, next.minXp - safeXp) : 0,
    progressPct,
  };
}

function formatDateOffset(baseDate, deltaDays) {
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + deltaDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Berechnet die aktive Lernserie INKL. automatischem Pausentag-Schutzschild (Streak Freeze)!
 * - Basis-Vorrat: 3 Schutzschilde + alle 3 aktiven Tage 1 weiteres Schutzschild (max. 5 verfügbar).
 * - Ein freier Tag (oder Wochenende) löscht NIEMALS sofort die Serie, sondern nutzt sanft einen Schutzschild.
 */
export function computeNonPunitiveStreak(activityLogs = [], now = new Date()) {
  const activeSet = new Set();
  let totalActiveDays = 0;

  for (const log of activityLogs) {
    const active =
      (log.minutesStudied || 0) >= 3 ||
      (log.cardsReviewed || 0) >= 1 ||
      (log.unitsCompleted || 0) >= 1 ||
      Boolean(log.podcastListened);
    if (active && log.dateKey) {
      activeSet.add(log.dateKey);
      totalActiveDays += 1;
    }
  }

  const earnedShields = 3 + Math.floor(totalActiveDays / 3);
  let shieldsRemaining = Math.min(5, earnedShields);
  let streakDays = 0;
  let protectedPauseDays = [];

  const todayKey = formatDateOffset(now, 0);
  const activeToday = activeSet.has(todayKey);

  // Prüfe rückwärts ab heute (oder gestern, falls heute noch nicht gestartet)
  const startOffset = activeToday ? 0 : -1;
  let consecutiveGap = 0;

  for (let offset = startOffset; offset >= -60; offset--) {
    const key = formatDateOffset(now, offset);
    if (activeSet.has(key)) {
      streakDays += 1;
      consecutiveGap = 0;
    } else {
      // Nur Lücken schützen, hinter denen tatsächlich schon aktive Lerntage liegen!
      const hasEarlierActivity = Array.from({ length: 5 }, (_, k) =>
        activeSet.has(formatDateOffset(now, offset - k - 1))
      ).some(Boolean);
      if (hasEarlierActivity && shieldsRemaining > 0 && consecutiveGap < 2) {
        shieldsRemaining -= 1;
        consecutiveGap += 1;
        protectedPauseDays.push(key);
      } else {
        break;
      }
    }
  }

  return {
    streakDays,
    activeToday,
    shieldsAvailable: Math.max(1, shieldsRemaining),
    protectedPauseDays,
    totalActiveDays,
  };
}

/**
 * Berechnet die 3 täglichen Aktivitäts-Ringe (Zeit, Ankerblatt, Karten) passend zur Tagesform!
 */
export function computeDailyMasteryRings(todayLog = null, energyMode = "normal", baseTargetMinutes = 32) {
  const presets = {
    gentle: { minutes: 15, units: 1, cards: 8, label: "Sanft (Sofa-Tag)" },
    normal: { minutes: baseTargetMinutes || 32, units: 1, cards: 15, label: "Normal (Kernziel)" },
    flow: { minutes: 50, units: 2, cards: 25, label: "Flow-Tag" },
  };
  const target = presets[energyMode] || presets.normal;

  const mins = todayLog?.minutesStudied || 0;
  const units = (todayLog?.unitsCompleted || 0) + (todayLog?.podcastListened ? 0.5 : 0);
  const cards = (todayLog?.cardsReviewed || 0) + (todayLog?.examDrills || 0) * 5;

  const timePct = Math.min(100, Math.round((mins / Math.max(1, target.minutes)) * 100));
  const unitPct = Math.min(100, Math.round((units / Math.max(1, target.units)) * 100));
  const cardPct = Math.min(100, Math.round((cards / Math.max(1, target.cards)) * 100));

  return {
    modeLabel: target.label,
    rings: {
      time: { current: mins, target: target.minutes, pct: timePct, label: "Fokuszeit", unit: "Min." },
      anchor: {
        current: Math.floor(units),
        target: target.units,
        pct: unitPct,
        label: "Ankerblatt",
        unit: target.units === 1 ? "Blatt" : "Blätter",
      },
      recall: { current: cards, target: target.cards, pct: cardPct, label: "Abruf", unit: "Karten" },
    },
    allClosed: timePct >= 100 && unitPct >= 100 && cardPct >= 100,
    averagePct: Math.round((timePct + unitPct + cardPct) / 3),
  };
}

export function evaluateUnlockedAchievements({
  activityLogs = [],
  unitProgressMap = {},
  fsrsStatesMap = {},
  examAttempts = [],
}) {
  const masteredUnits = Object.values(unitProgressMap).filter((u) => u?.status === "mastered");
  const domainsTouched = new Set(
    Object.values(unitProgressMap)
      .filter((u) => u?.status === "mastered" || u?.status === "seen")
      .map((u) => u.domain)
  );
  const totalReviews = Object.values(fsrsStatesMap).reduce((s, r) => s + (r?.reviewCount || 0), 0);
  const anyAudio = activityLogs.some((l) => Boolean(l.podcastListened));
  const anyBonus = activityLogs.some((l) => (l.bonusRounds || 0) > 0);

  const unlockedIds = new Set();
  if (anyAudio) unlockedIds.add("first-audio");
  if (masteredUnits.length >= 1) unlockedIds.add("first-anchor");
  if (masteredUnits.length >= 5) unlockedIds.add("five-anchors");
  if (totalReviews >= 25) unlockedIds.add("cards-25");
  if (totalReviews >= 100) unlockedIds.add("cards-100");
  if (examAttempts.length >= 1) unlockedIds.add("exam-first");
  if (anyBonus) unlockedIds.add("flow-bonus");
  if (domainsTouched.has("A") && domainsTouched.has("B") && domainsTouched.has("C")) {
    unlockedIds.add("tri-domain");
  }

  return ACHIEVEMENT_DEFS.map((a) => ({
    ...a,
    unlocked: unlockedIds.has(a.id),
  }));
}

export function computeTotalLearnerXp({
  activityLogs = [],
  unitProgressMap = {},
  fsrsStatesMap = {},
  examAttempts = [],
}) {
  const masteredCount = Object.values(unitProgressMap).filter((u) => u?.status === "mastered").length;
  const totalReviews = Object.values(fsrsStatesMap).reduce((s, r) => s + (r?.reviewCount || 0), 0);
  const audioDays = activityLogs.filter((l) => l.podcastListened).length;
  const bonusCount = activityLogs.reduce((s, l) => s + (l.bonusRounds || 0), 0);
  const studyMins = activityLogs.reduce((s, l) => s + (l.minutesStudied || 0), 0);

  return (
    masteredCount * XP_REWARDS.UNIT_MASTERED +
    totalReviews * XP_REWARDS.CARD_REVIEW_GOOD +
    audioDays * XP_REWARDS.PODCAST_LISTEN +
    bonusCount * XP_REWARDS.BONUS_STAGE +
    examAttempts.length * XP_REWARDS.EXAM_ATTEMPT +
    studyMins * 2
  );
}
