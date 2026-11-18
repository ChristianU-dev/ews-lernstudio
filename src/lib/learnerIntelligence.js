/**
 * Mitlernende Lern-DNA & Prüfungs-Prognose-Engine (`learnerIntelligence.js`).
 * Beobachtet laufend, WIE die Nutzerin lernt (Tempo, Lieblings-Zugangsweg,
 * Gedächtnis-Stabilität in FSRS, Verwechslungsfallen & Prüfungs-Sicherheit)
 * und passt Empfehlungen, Zeitziel-Prognose und NotebookLM-Wiederholungspodcasts automatisch an.
 */

import { computeDaysUntilExam } from "./adaptivePlanner";

export function analyzeLearnerProfile({
  allUnits = [],
  unitProgressMap = {},
  fsrsStatesMap = {},
  confusionCounts = {},
  confusionPairs = [],
  examAttempts = [],
  activityLogs = [],
  examDate = "2027-02-17",
  dailyTargetMinutes = 32,
  now = new Date(),
}) {
  const totalUnits = Math.max(1, allUnits.length);
  const masteredUnits = allUnits.filter((u) => unitProgressMap[u.id]?.status === "mastered").length;
  const seenUnits = allUnits.filter(
    (u) => unitProgressMap[u.id]?.status === "seen" || unitProgressMap[u.id]?.status === "mastered"
  ).length;
  const remainingUnits = Math.max(0, totalUnits - masteredUnits);

  // Gemessenes persönliches Lerntempo (Fallback: 14 Min. pro neuem Ankerblatt inkl. Karten)
  const totalMins = activityLogs.reduce((s, l) => s + (l.minutesStudied || 0), 0);
  const measuredMinsPerUnit =
    masteredUnits >= 2 && totalMins >= 20
      ? Math.max(8, Math.min(30, Math.round(totalMins / masteredUnits)))
      : 14;

  const daysUntilExam = computeDaysUntilExam(examDate, now) ?? 60;
  // Reserviere die letzten 8 Tage vor der Prüfung als ruhigen Generalproben-Puffer!
  const effectivePrepDays = Math.max(5, daysUntilExam - 8);
  // Realistisch 5 aktive Lerntage pro Woche (~71 % der Kalendertage), damit Pausentage fest eingeplant sind!
  const plannedActiveDays = Math.max(4, Math.round(effectivePrepDays * 0.72));

  const minutesRemaining = remainingUnits * measuredMinsPerUnit;
  const adaptiveRecommendedDailyMinutes = Math.max(
    18,
    Math.min(75, Math.round(minutesRemaining / plannedActiveDays))
  );

  // FSRS Gedächtnis-Stabilität auswerten
  const cardRecords = Object.values(fsrsStatesMap).filter((r) => (r?.reviewCount || 0) > 0);
  const avgStability =
    cardRecords.length > 0
      ? cardRecords.reduce((s, r) => s + (r.card?.stability || 0), 0) / cardRecords.length
      : 0;
  const memoryScore = Math.min(100, Math.round((cardRecords.length / 80) * 55 + Math.min(45, avgStability * 5)));

  // Visuelle & Laut-Erzähl-Stärke
  const lautChecksTotal = Object.values(unitProgressMap).reduce(
    (s, u) => s + (u?.lautCheckCount || 0),
    0
  );
  const visualScore = Math.min(100, Math.round((seenUnits / totalUnits) * 70 + Math.min(30, lautChecksTotal * 2)));

  // Auditive Nutzung
  const audioDays = activityLogs.filter((l) => l.podcastListened).length;
  const audioScore = Math.min(100, audioDays * 18);

  // Klausur-Sicherheit
  const avgExamPct =
    examAttempts.length > 0
      ? Math.round(
          (examAttempts.reduce((s, a) => s + (a.totalScore || 0) / Math.max(1, a.maxScore || 48), 0) /
            examAttempts.length) *
            100
        )
      : 0;

  // Schwächste Karten & Top-Verwechslungen identifizieren
  const shakyCardIds = Object.values(fsrsStatesMap)
    .filter((r) => (r?.lapses || 0) > 0 || r?.lastRating === 1 || r?.lastRating === 2)
    .sort((a, b) => (b.lapses || 0) - (a.lapses || 0))
    .slice(0, 6)
    .map((r) => r.cardId);

  const topConfusions = [...confusionPairs]
    .map((cp) => ({ ...cp, hits: confusionCounts[cp.id] || 0 }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 3);

  // Persönliche Coach-Botschaft ableiten
  let coachInsight = "";
  if (masteredUnits === 0 && cardRecords.length === 0) {
    coachInsight = `Perfekt auf dein Februar-Ziel abgestimmt: Mit rund ${adaptiveRecommendedDailyMinutes} Min. an 5 Tagen pro Woche schaffst du alle ${totalUnits} Ankerblätter entspannt inklusive 8 Tagen Generalproben-Puffer vor dem Examen!`;
  } else if (topConfusions[0]?.hits >= 2) {
    coachInsight = `Dein Lern-Radar hat gemerkt, dass „${topConfusions[0].term_a} vs. ${topConfusions[0].term_b}“ zuletzt knifflig war – ich habe deine Karten-Priorität und deinen Wiederholungs-Podcast automatisch darauf eingestellt.`;
  } else if (adaptiveRecommendedDailyMinutes <= dailyTargetMinutes) {
    coachInsight = `Du liegst super im Fahrplan! Bei deinem aktuellen Tempo (~${measuredMinsPerUnit} Min. je Ankerblatt) reichen schon ${adaptiveRecommendedDailyMinutes} Min. pro aktivem Lerntag inklusive freier Erholungstage.`;
  } else {
    coachInsight = `Um 8 Tage vor der Prüfung entspannt fertig zu sein, empfehle ich dir an guten Tagen ca. ${adaptiveRecommendedDailyMinutes} Min. (z. B. Kern-Etappe + eine kurze +12-Min.-Bonusrunde).`;
  }

  return {
    totalUnits,
    masteredUnits,
    remainingUnits,
    measuredMinsPerUnit,
    daysUntilExam,
    plannedActiveDays,
    adaptiveRecommendedDailyMinutes,
    coachInsight,
    dna: [
      { id: "visual", label: "Seitengedächtnis & Laut-Erzählen", score: visualScore },
      { id: "memory", label: "FSRS-Langzeitgedächtnis", score: memoryScore },
      { id: "audio", label: "Sofa- & Zug-Audio", score: audioScore },
      { id: "exam", label: "Staatsexamens-Routine", score: avgExamPct },
    ],
    shakyCardIds,
    topConfusions,
  };
}

/**
 * Erzeugt auf Knopfdruck einen persönlichen „Schwachstellen- & Wiederholungs-Podcast-Prompt“
 * für NotebookLM basierend auf ihren echten FSRS-Wackelkandidaten & Verwechslungspaaren!
 */
export function generatePersonalWeaknessPodcastPrompt({
  flashcards = [],
  shakyCardIds = [],
  topConfusions = [],
  primarySubject = "Kunst",
  didacticSubject = "Sport",
}) {
  const shakyCards = flashcards.filter((c) => shakyCardIds.includes(c.id)).slice(0, 5);

  const cardsSection =
    shakyCards.length > 0
      ? shakyCards
          .map((c, i) => `${i + 1}. Frage (${c.page_label}): ${c.front}\n   Kernantwort: ${c.back}`)
          .join("\n\n")
      : "Bitte wählt 4 typische Prüfungs-Stolpersteine quer durch Lernen & Lehren, Entwicklungspsychologie und Diagnostik aus.";

  const confSection =
    topConfusions.length > 0
      ? topConfusions
          .map((cp) => `- ${cp.term_a} vs. ${cp.term_b} (${cp.page_label}): ${cp.core_difference}`)
          .join("\n")
      : "- Negative Verstärkung vs. Bestrafung\n- Assimilation vs. Akkommodation\n- Status- vs. Prozessdiagnostik";

  return `Bitte erstellt eine motivierende, glasklare 10-Minuten-Wiederholungsfolge („Persönlicher Aha-Moment-Podcast“) für mein Staatsexamen EWS Psychologie (Grundschule Bayern, Hauptfach ${primarySubject}, Didaktikfach ${didacticSubject}).

In meinen letzten Kartendurchgängen waren genau diese Punkte noch etwas wackelig – bitte erklärt sie mir im lockeren Dialog mit einprägsamen Alltags- und Unterrichtsbildern aus ${primarySubject} und ${didacticSubject}, sodass ich sie danach nie wieder verwechsle:

1. MEINE AKTUELLEN VERWECHSLUNGS-PAARE:
${confSection}

2. MEINE WACKELKANDIDATEN AUS DEM KARTENTRAINER:
${cardsSection}

Gebt mir am Schluss einen kurzen 30-Sekunden-Schnellcheck zum lauten Mitsprechen!`;
}
