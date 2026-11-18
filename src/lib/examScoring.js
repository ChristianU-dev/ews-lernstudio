/**
 * Bayerisches Staatsexamen EWS Psychologie — Wahlformat Auswertungs-Engine
 * Setzt exakt die Spielregeln aus FAU StudOn-Leitfaden & Klausuren F25/H25 um:
 * - Single Choice: 1 Punkt (genau 1 aus 4 richtig, keine Minuspunkte)
 * - Multiple Choice: 2 Punkte gesamt -> 4 Aussagen à 0,5 Punkte ("Trifft zu" / "Trifft nicht zu"),
 *   0 bis 4 Aussagen können zutreffen, keine Minuspunkte.
 * - Offene Aufgaben & Fallvignetten (>= 75 % = mind. 36 von 48 Punkten):
 *   Satzlimit-Prüfung (inkl. deutscher Abkürzungen), Operatoren-Check & Rubrik-Auswertung.
 */

const GERMAN_ABBREVIATIONS = [
  "z\\.\\s*b\\.",
  "bzw\\.",
  "vgl\\.",
  "ca\\.",
  "d\\.\\s*h\\.",
  "u\\.\\s*a\\.",
  "u\\.\\s*u\\.",
  "usw\\.",
  "etc\\.",
  "sog\\.",
  "inkl\\.",
  "exkl\\.",
  "ggf\\.",
  "evtl\\.",
  "bspw\\.",
  "et\\s+al\\.",
  "zit\\.\\s*n\\.",
  "s\\.",
  "abb\\.",
  "kap\\.",
  "nr\\.",
  "abs\\.",
  "mio\\.",
  "mrd\\.",
  "prof\\.",
  "dr\\.",
  "st\\.",
  "kl\\.",
  "jg\\.",
  "std\\.",
  "min\\.",
  "sek\\.",
];

const ABBR_REGEX = new RegExp(`\\b(?:${GERMAN_ABBREVIATIONS.join("|")})`, "gi");

export function countGermanSentences(text) {
  if (!text || typeof text !== "string") return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;

  // Schütze Abkürzungen, Dezimalzahlen (z. B. 0.5 / r = .56) und Aufzählungsnummern (1. / 2.)
  const sanitized = trimmed
    .replace(ABBR_REGEX, (m) => m.replace(/\./g, "§"))
    .replace(/\b\d+\.\d+/g, (m) => m.replace(/\./g, "§"))
    .replace(/(?:^|\n)\s*\d+\./g, (m) => m.replace(/\./g, "§"));

  const parts = sanitized
    .split(/[.!?]+(?:\s+|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

  return parts.length;
}

export function scoreSingleChoice(question, selectedIndex) {
  if (selectedIndex === null || selectedIndex === undefined || selectedIndex < 0) {
    return { earned: 0, max: question.points || 1, isCorrect: false, answered: false };
  }
  const isCorrect = Number(selectedIndex) === Number(question.correct_index);
  const max = question.points || 1;
  return {
    earned: isCorrect ? max : 0,
    max,
    isCorrect,
    answered: true,
  };
}

/**
 * Bewertet eine bayerische Multiple-Choice-Aufgabe (4 Aussagen à 0,5 Punkte = 2,0 Punkte).
 * `userDecisions` ist ein Objekt `{ a: true/false, b: true/false, ... }` oder Array aus 4 Booleans/null.
 */
export function scoreMultipleChoice(question, userDecisions = {}) {
  const statements = question.statements || [];
  let earned = 0;
  const rowResults = statements.map((stmt, idx) => {
    const key = stmt.id ?? String.fromCharCode(97 + idx);
    const userVal = Array.isArray(userDecisions) ? userDecisions[idx] : userDecisions?.[key];
    const answered = userVal === true || userVal === false;
    const isRowCorrect = answered && Boolean(userVal) === Boolean(stmt.is_true);
    const rowPoints = isRowCorrect ? 0.5 : 0;
    earned += rowPoints;
    return {
      id: key,
      answered,
      userVal: answered ? Boolean(userVal) : null,
      expected: Boolean(stmt.is_true),
      isCorrect: isRowCorrect,
      points: rowPoints,
    };
  });

  // Keine Minuspunkte, auf max. 2,0 Punkte gedeckelt
  const safeEarned = Math.max(0, Math.min(question.points || 2, Math.round(earned * 100) / 100));
  return {
    earned: safeEarned,
    max: question.points || 2,
    allCorrect: rowResults.length === 4 && rowResults.every((r) => r.isCorrect),
    correctCount: rowResults.filter((r) => r.isCorrect).length,
    rowResults,
  };
}

export function evaluateOpenResponse(question, answerText = "", selfCheckedCriteria = null) {
  const clean = (answerText || "").trim();
  const sentenceCount = countGermanSentences(clean);
  const wordCount = clean ? clean.split(/\s+/).length : 0;
  const op = (question.operator || "").toLowerCase();
  const isNennen = op.includes("nennen") || question.max_sentences === 0;
  const maxSentences = question.max_sentences || 0;
  const minSentences = question.min_sentences || (isNennen ? 0 : 1);

  const warnings = [];
  if (!clean) {
    warnings.push("Noch keine Antwort eingegeben.");
  } else {
    if (isNennen && sentenceCount >= 3 && wordCount > 35) {
      warnings.push(
        "Zeitspar-Tipp („Nennen“): Reine Stichpunkte/Fachbegriffe genügen hier vollkommen – spare dir im Examen lange Sätze!"
      );
    }
    if (op.includes("skizzieren")) {
      const looksLikeBulletsOnly = !/[.!?]/.test(clean) && clean.split(/\n|;|•|-/).length >= 2;
      if (looksLikeBulletsOnly) {
        warnings.push(
          "Operatoren-Falle („Skizzieren“): Schreibe knappe ganze Sätze statt bloßer Stichworte (und zeichne KEINE Grafik!)."
        );
      }
    }
    if (op.includes("zeichnen") && !op.includes("nachzeichnen") && wordCount < 8) {
      warnings.push(
        "Operatoren-Falle („Zeichnen“): Eine Grafik darf im Examen niemals unkommentiert stehen bleiben – ergänze immer eine kurze Erklärung in Worten!"
      );
    }
    if (maxSentences > 0 && sentenceCount > maxSentences) {
      warnings.push(
        `Satzlimit überschritten: ${sentenceCount} Sätze geschrieben (Vorgabe: ${question.sentence_limit_label || `max. ${maxSentences} Sätze`}). Prüfer bewerten oft nur bis zum Limit!`
      );
    }
    if (!isNennen && minSentences > 0 && sentenceCount < minSentences && wordCount > 0 && !/[.!?]/.test(clean)) {
      warnings.push("Denke an vollständige Sätze (außer bei „Nennen Sie“).");
    }
  }

  const lower = clean.toLowerCase();
  const criteria = (question.rubric_criteria || []).map((c, idx) => {
    const kws = c.keywords || [];
    const matchedKeywords = kws.filter((kw) => lower.includes(String(kw).toLowerCase()));
    const autoSuggested = kws.length > 0 ? matchedKeywords.length >= Math.max(1, Math.ceil(kws.length * 0.4)) : false;
    const checked =
      Array.isArray(selfCheckedCriteria) && typeof selfCheckedCriteria[idx] === "boolean"
        ? selfCheckedCriteria[idx]
        : autoSuggested;
    return {
      ...c,
      matchedKeywords,
      autoSuggested,
      checked,
      awardedPoints: checked ? c.points : 0,
    };
  });

  const earned = Math.min(
    question.points || 0,
    criteria.reduce((sum, c) => sum + (c.awardedPoints || 0), 0)
  );

  return {
    sentenceCount,
    wordCount,
    withinSentenceLimit: maxSentences === 0 || sentenceCount <= maxSentences,
    warnings,
    criteria,
    earned,
    max: question.points || 0,
  };
}

export function validateTestformatSet(examSet) {
  const items = examSet?.questions || [];
  let totalPoints = 0;
  let openPoints = 0;
  let closedPoints = 0;

  for (const q of items) {
    const pts = Number(q.points || 0);
    totalPoints += pts;
    if (q.type === "vignette_open" || q.type === "short_open") {
      openPoints += pts;
    } else if (q.type === "single_choice" || q.type === "multiple_choice") {
      closedPoints += pts;
    }
  }

  const openShare = totalPoints > 0 ? openPoints / totalPoints : 0;
  return {
    totalPoints,
    openPoints,
    closedPoints,
    openShare,
    isValid48: Math.abs(totalPoints - 48) < 0.001,
    meets75PercentOpen: openShare >= 0.75,
  };
}
