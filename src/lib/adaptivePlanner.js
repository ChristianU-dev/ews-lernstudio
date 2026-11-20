/**
 * Adaptiver Tagesplaner, Individueller Bezugsnorm-Coach & NotebookLM-Prompt-Generator
 * Streng nach Deci & Ryan (Autonomie, Kompetenzerleben, soziale Eingebundenheit)
 * sowie Rheinberg (individuelle Bezugsnorm — NIEMALS rote Überfälligkeits-Warnungen!).
 */

export function computeDaysUntilExam(examDateStr, now = new Date()) {
  if (!examDateStr) return null;
  const target = new Date(`${examDateStr}T08:30:00`);
  if (Number.isNaN(target.getTime())) return null;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfExam = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffDays = Math.round((startOfExam.getTime() - startOfToday.getTime()) / 86400000);
  return Math.max(0, diffDays);
}

export function computeDomainMastery(units = [], unitProgressMap = {}) {
  const summary = {
    A: { total: 0, seen: 0, mastered: 0, percent: 0 },
    B: { total: 0, seen: 0, mastered: 0, percent: 0 },
    C: { total: 0, seen: 0, mastered: 0, percent: 0 },
  };

  for (const u of units) {
    const dom = summary[u.domain];
    if (!dom) continue;
    dom.total += 1;
    const p = unitProgressMap[u.id];
    if (p?.status === "mastered") {
      dom.mastered += 1;
      dom.seen += 1;
    } else if (p?.status === "seen" || (p?.lautCheckCount || 0) > 0) {
      dom.seen += 1;
    }
  }

  for (const k of ["A", "B", "C"]) {
    const d = summary[k];
    d.percent = d.total > 0 ? Math.round(((d.mastered + d.seen * 0.45) / d.total) * 100) : 0;
  }
  return summary;
}

/**
 * Erstellt die ~32-Minuten Kern-Etappe des Tages:
 * - Sanfter Sofa-Podcast-Start gegen die Anfangshürde
 * - 1 visuelles 1-Seiten-Ankerblatt aus dem aktuell am wenigsten abgedeckten Gebiet
 * - Sanfter FSRS-Kartensprint (ca. 8 Min.)
 * - 1 praxisnaher Prüfungs-Check (Fallvignette oder MC-Training)
 */
export function buildDailyCorePlan({
  units = [],
  unitProgressMap = {},
  confusionCounts = {},
  confusionPairs = [],
  examSets = [],
  todayLog = null,
}) {
  const mastery = computeDomainMastery(units, unitProgressMap);

  // Wähle das Gebiet mit dem größten Lernpotenzial, aber rotiere harmonisch
  const sortedDomains = ["A", "B", "C"].sort((d1, d2) => mastery[d1].percent - mastery[d2].percent);
  const focusDomain = sortedDomains[0] || "A";

  const nextUnit =
    units.find((u) => u.domain === focusDomain && unitProgressMap[u.id]?.status !== "mastered") ||
    units.find((u) => unitProgressMap[u.id]?.status !== "mastered") ||
    units[0] ||
    null;

  // Aktives Verwechslungs-Paar finden (entweder aus bisherigen Fehlern oder passend zum Fokusgebiet)
  const topConfusionEntry = Object.entries(confusionCounts || {}).sort((a, b) => b[1] - a[1])[0];
  const activeConfusion =
    (topConfusionEntry && confusionPairs.find((p) => p.id === topConfusionEntry[0])) ||
    confusionPairs.find((p) => p.domain === focusDomain) ||
    confusionPairs[0] ||
    null;

  const matchingExamSet =
    examSets.find((s) => s.domain === focusDomain) || examSets[0] || null;

  const minutesDone = todayLog?.minutesStudied || 0;
  const targetMinutes = 32;
  const isCoreGoalReached = minutesDone >= targetMinutes || (todayLog?.unitsCompleted || 0) >= 1 && (todayLog?.cardsReviewed || 0) >= 8;

  const steps = [
    {
      id: "step-podcast",
      kind: "podcast",
      minutes: 7,
      title: nextUnit
        ? `Sofa-Einstieg: Audio-Überblick zu „${nextUnit.title}“`
        : "Sofa-Einstieg: Entspanntes Podcast-Warm-up",
      subtitle: nextUnit
        ? `${nextUnit.page_label} · Null-Hürde zum Reinkommen`
        : "Einfach zuhören und entspannt starten",
      targetView: "podcast",
      unitId: nextUnit?.id || null,
      domain: nextUnit?.domain || focusDomain,
      done: Boolean(todayLog?.podcastListened),
    },
    {
      id: "step-anchor",
      kind: "script",
      minutes: 12,
      title: nextUnit
        ? `1-Seiten-Ankerblatt + Laut-Erzähl-Check: ${nextUnit.title}`
        : "Visuelles Ankerblatt durcharbeiten",
      subtitle: nextUnit
        ? `Gebiet ${nextUnit.domain} · ${nextUnit.page_label} · inkl. Kunst- & Sport-Praxis`
        : "Seite visuell einprägen & 5 Ankerpunkte frei sprechen",
      targetView: "scripts",
      unitId: nextUnit?.id || null,
      domain: nextUnit?.domain || focusDomain,
      done: (todayLog?.unitsCompleted || 0) >= 1,
    },
    {
      id: "step-cards",
      kind: "cards",
      minutes: 8,
      title: activeConfusion
        ? `FSRS-Kartensprint + Verwechslungs-Check (${activeConfusion.term_a} vs. ${activeConfusion.term_b})`
        : "Sanfter FSRS-Kartensprint (15 Karten)",
      subtitle: "Kein Überfälligkeits-Druck · optimale Gedächtnisintervalle",
      targetView: "cards",
      domain: focusDomain,
      done: (todayLog?.cardsReviewed || 0) >= 10,
    },
    {
      id: "step-exam",
      kind: "exam",
      minutes: 6,
      title: matchingExamSet
        ? `Kurz-Transfer im Testformat (${matchingExamSet.domain}1: Fallvignette / 0,5-Pkt.-MC)`
        : "1 kurze Fallvignette mit Satzlimit-Check",
      subtitle: "Sicherheit für die 75 % offenen Punkte im Staatsexamen",
      targetView: "exam",
      examSetId: matchingExamSet?.id || null,
      domain: focusDomain,
      done: (todayLog?.examDrills || 0) >= 1,
    },
  ];

  return {
    focusDomain,
    nextUnit,
    activeConfusion,
    targetMinutes,
    minutesDone,
    isCoreGoalReached,
    steps,
    mastery,
  };
}

export function buildBonusStage({ units = [], unitProgressMap = {}, focusDomain = "A" }) {
  const otherDomains = ["A", "B", "C"].filter((d) => d !== focusDomain);
  const bridgeDomain = otherDomains[0] || "B";
  const bonusUnit =
    units.find((u) => u.domain === bridgeDomain && unitProgressMap[u.id]?.status !== "mastered") ||
    units[0] ||
    null;

  return {
    durationMinutes: 12,
    title: `+12-Min.-Bonus-Etappe · Brücke zu Gebiet ${bonusUnit?.domain || bridgeDomain}`,
    description: bonusUnit
      ? `Nächster Vernetzungs-Knoten: „${bonusUnit.title}“ (${bonusUnit.page_label})`
      : "Hol dir stressfrei einen zusätzlichen Knoten auf deiner Wissenslandkarte.",
    unitId: bonusUnit?.id || null,
    domain: bonusUnit?.domain || bridgeDomain,
  };
}

export function computeWeeklyGrowth(activityLogs = [], now = new Date()) {
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime();
  let totalMinutes = 0;
  let unitsCompleted = 0;
  let cardsReviewed = 0;
  let bonusRounds = 0;
  let activeDays = 0;

  for (const log of activityLogs) {
    const dt = new Date(`${log.dateKey}T12:00:00`).getTime();
    if (!Number.isNaN(dt) && dt >= cutoff) {
      totalMinutes += log.minutesStudied || 0;
      unitsCompleted += log.unitsCompleted || 0;
      cardsReviewed += log.cardsReviewed || 0;
      bonusRounds += log.bonusRounds || 0;
      if ((log.minutesStudied || 0) > 0 || (log.cardsReviewed || 0) > 0 || (log.unitsCompleted || 0) > 0) {
        activeDays += 1;
      }
    }
  }

  return {
    totalMinutes,
    unitsCompleted,
    cardsReviewed,
    bonusRounds,
    activeDays,
  };
}

/**
 * Generiert einen prägnanten 1-Klick-Prompt für Google NotebookLM (Audio Overview)
 * mit klarem Unterschied zwischen Sofa-Einstieg (Story & Kopfkino) und Prüfungs-Fokus (Fallvignette & Autoren).
 */
export function generateNotebookLMPrompt({
  unit,
  weakConfusions = [],
  mode = "sofa_intro",
  customFocus = "",
}) {
  const title = unit ? `${unit.section_num} ${unit.title}` : "EWS Psychologie";
  const pageRef = unit?.page_label || "Original-Skript";
  const defs = (unit?.definitions || [])
    .slice(0, 3)
    .map((d) => `• ${d.term} (${d.author_year}): ${d.definition}`)
    .join("\n");
  const studies = (unit?.empirical_studies || [])
    .slice(0, 2)
    .map((s) => `• ${s.authors_year} (${s.title}): ${s.finding}`)
    .join("\n");
  const confusionBlock =
    weakConfusions.length > 0
      ? `\nWICHTIGE ABGRENZUNG:\n${weakConfusions
          .slice(0, 2)
          .map((c) => `• ${c.term_a} vs. ${c.term_b}: ${c.core_difference}`)
          .join("\n")}\n`
      : "";

  const extraLine = customFocus ? `\nZUSATZWUNSCH: ${customFocus}\n` : "";

  if (mode === "exam_crunch") {
    return `🎯 STAATSEXAMENS-PRÜFUNGSTRAINING & FALLVIGNETTE (KLAUSUR-FOKUS, CA. 10 MIN.)
Thema: ${title} (Gebiet ${unit?.domain || "A"}, ${pageRef})

Bitte führt als strenge, aber wohlwollende bayerische Prüfer durch diesen Abschnitt (Lehramt Grundschule Bayern, KUNST & SPORT):
1. EXAKTE DEFINITIONEN: Nennt die Fachbegriffe wörtlich mit Autor & Jahreszahl:
${defs || "• Alle fett gedruckten Definitionen des Kapitels mit Autor & Jahr"}

2. EMPIRISCHE BELEGE (kurz Versuchsaufbau + Befund):
${studies || "• Zentrale Studien aus diesem Abschnitt"}
${confusionBlock}
3. ECHTE GRUNDSCHUL-FALLVIGNETTE LÖSEN: Erfindet eine praxisnahe Szene aus dem KUNST- oder SPORT-Unterricht (Kl. 1–4) und löst sie Schritt für Schritt wie auf Reinschriftpapier (inkl. Tipp: „Nennen“ = Stichworte vs. „Skizzieren“ = knappe Sätze!).${extraLine}
Nennt am Ende kurz die Seitenzahl (${pageRef}).`;
  }

  return `🎧 SOFA-EINSTIEG: LOCKERER STORY-PODCAST ZUM ANKOMMEN (KEIN PRÜFUNGSDRUCK, CA. 8 MIN.)
Thema: ${title} (Gebiet ${unit?.domain || "A"}, ${pageRef})

Stellt euch vor, ich sitze entspannt mit einer Tasse Tee auf dem Sofa und möchte das Thema ganz leicht über innere Bilder verstehen (Hauptfach KUNST, Didaktikfach SPORT, Grundschule):
• Erklärt mir die Grundidee im lockeren Alltags-Dialog mit maximal 2 bildhaften Geschichten aus dem Kunst- oder Sportunterricht.
• Verzichtet auf trockenen Vorlesungsstil – verankert stattdessen EIN klares Kopfkino-Bild zum visuellen Merken.
• Gebt mir zum Schluss einen kurzen „5-Finger-Merksatz“ zum lauten Mitsprechen mit.${confusionBlock}${extraLine}
Schwerpunkt-Begriffe: ${(unit?.definitions || []).slice(0, 3).map((d) => d.term).join(", ") || title} (${pageRef}).`;
}
