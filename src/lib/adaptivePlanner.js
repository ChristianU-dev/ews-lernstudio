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
    title: bonusUnit
      ? `+12-Min.-Bonus-Runde: Theorie-Brücke zu Gebiet ${bonusUnit.domain} („${bonusUnit.title}“)`
      : "+12-Min.-Bonus-Runde: Wissensnetz & Schnell-Karten",
    description:
      "Du bist gerade im Flow! Hol dir stressfrei einen zusätzlichen Knoten auf deiner Wissenslandkarte.",
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
 * Generiert einen maßgeschneiderten 1-Klick-Prompt für Google NotebookLM (Audio Overview),
 * abgestimmt auf das gewählte Kapitel, Kunst & Sport in der Grundschule sowie ihre aktuellen Verwechslungsfallen.
 */
export function generateNotebookLMPrompt({
  unit,
  weakConfusions = [],
  mode = "sofa_intro",
  customFocus = "",
}) {
  const title = unit ? `${unit.section_num} ${unit.title} (${unit.page_label})` : "Überblick EWS Psychologie";
  const defs = (unit?.definitions || [])
    .map((d) => `- ${d.term} (${d.author_year}): ${d.definition}`)
    .join("\n");
  const studies = (unit?.empirical_studies || [])
    .map((s) => `- ${s.authors_year}: ${s.title} -> ${s.finding}`)
    .join("\n");
  const bridges = (unit?.cross_references || [])
    .map((b) => `- Brücke zu ${b.target_hint}: ${b.bridge_explanation}`)
    .join("\n");
  const confusionBlock =
    weakConfusions.length > 0
      ? `\nGeht bitte besonders klar und einprägsam auf diese typischen Prüfungs-Verwechslungsfallen ein:\n${weakConfusions
          .slice(0, 3)
          .map((c) => `- ${c.term_a} vs. ${c.term_b}: ${c.core_difference}`)
          .join("\n")}\n`
      : "";

  const styleHint =
    mode === "exam_crunch"
      ? "Fokussiert euch auf prüfungssichere Definitionen mit Autor/Jahr, eine einprägsame Fallvignette aus der Grundschule und knackige Abgrenzungen für das bayerische Testformat."
      : "Gestaltet das Gespräch herzlich, motivierend, lebendig und bildhaft – perfekt zum entspannten Einstieg auf dem Sofa oder im Zug, ohne trockenen Vorlesungston.";

  return `Bitte erstellt einen deutschsprachigen Deep-Dive-Podcast (ca. 8–12 Minuten) für eine Lehramtsstudentin der Grundschule in Bayern (FAU Erlangen-Nürnberg, Erstes Staatsexamen EWS Psychologie) zu folgendem Thema:

THEMA: ${title} — Gebiet ${unit?.domain || "A"}

WICHTIGER KONTEXT ZUR HÖRERIN:
- Ihre Fächer in der Grundschule (Klasse 1–4) sind Hauptfach KUNST und Didaktikfach SPORT. Baut deshalb anschauliche Unterrichtsbeispiele direkt aus dem Kunstunterricht (z. B. Malen, Werkmappe/Portfolio, Gestaltung) und dem Sportunterricht (z. B. Gerätturnen, kooperative Spiele, Ausdauer/Bewegung) ein!
- Sie hat ein starkes visuelles Gedächtnis und erzählt Inhalte danach gerne laut frei nach: Gebt ihr am Ende einen klaren „5-Finger-Merksatz“ zum Mitsprechen mit.
- ${styleHint}

ZENTRALE DEFINITIONEN & URHEBER (bitte exakt nennen):
${defs || "- Alle im hochgeladenen Skriptabschnitt fett markierten Definitionen mit Autor und Jahreszahl"}

EMPIRISCHE STUDIEN (bitte Versuchsaufbau + Befund anschaulich erzählen):
${studies || "- Alle unterstrichenen empirischen Befunde des Abschnitts"}

VERNETZUNGS-BRÜCKEN ZU DEN ANDEREN SKRIPTEN:
${bridges || "- Verknüpft das Thema explizit mit Entwicklungspsychologie und Diagnostik"}
${confusionBlock}${customFocus ? `\nZUSÄTZLICHER WUNSCHFOKUS: ${customFocus}\n` : ""}
Nennt zwischendurch kurz den Seitenverweis (${unit?.page_label || "Original-Skript"}), damit sie die Stelle direkt in ihrem ausgedruckten Ordner wiedererkennt.`;
}
