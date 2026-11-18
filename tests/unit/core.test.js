import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  countGermanSentences,
  scoreSingleChoice,
  scoreMultipleChoice,
  evaluateOpenResponse,
  validateTestformatSet,
} from "../../src/lib/examScoring";
import {
  createInitialFsrsRecord,
  reviewCard,
  selectGentleDailyDeck,
  previewIntervals,
  Rating,
} from "../../src/lib/fsrsEngine";
import {
  computeDaysUntilExam,
  buildDailyCorePlan,
  buildBonusStage,
  computeWeeklyGrowth,
  generateNotebookLMPrompt,
} from "../../src/lib/adaptivePlanner";
import { validateCoursePack, buildCommandSearchIndex } from "../../src/lib/courseSchema";
import { mergeCollectionByTimestamp } from "../../src/lib/syncEngine";
import {
  db,
  upsertUnitProgress,
  saveUnitNote,
  logStudyActivity,
  exportFullBackupJson,
  importFullBackupJson,
} from "../../src/lib/db";

describe("Bavarian EWS Exam Scoring Engine (0,5-Pkt.-MC, SC, Operatoren & Satzlimit)", () => {
  const sampleMc = {
    id: "mc-1",
    points: 2,
    statements: [
      { id: "a", text: "Aussage A", is_true: true },
      { id: "b", text: "Aussage B", is_true: false },
      { id: "c", text: "Aussage C", is_true: true },
      { id: "d", text: "Aussage D", is_true: false },
    ],
  };

  it("awards 0.5 points per correctly classified MC statement (0 to 2.0 pts, never negative)", () => {
    expect(scoreMultipleChoice(sampleMc, { a: true, b: false, c: true, d: false }).earned).toBe(2.0);
    expect(scoreMultipleChoice(sampleMc, { a: true, b: false, c: true, d: true }).earned).toBe(1.5);
    expect(scoreMultipleChoice(sampleMc, { a: true, b: true, c: true, d: true }).earned).toBe(1.0);
    expect(scoreMultipleChoice(sampleMc, { a: false, b: true, c: false, d: false }).earned).toBe(0.5);
    expect(scoreMultipleChoice(sampleMc, { a: false, b: true, c: false, d: true }).earned).toBe(0);
    expect(scoreMultipleChoice(sampleMc, {}).earned).toBe(0);
  });

  it("supports MC items where 0 or all 4 statements are true", () => {
    const zeroTrueMc = {
      points: 2,
      statements: [
        { id: "a", is_true: false },
        { id: "b", is_true: false },
        { id: "c", is_true: false },
        { id: "d", is_true: false },
      ],
    };
    const res = scoreMultipleChoice(zeroTrueMc, { a: false, b: false, c: false, d: false });
    expect(res.earned).toBe(2);
    expect(res.allCorrect).toBe(true);
  });

  it("scores Single Choice with 1 point and no penalty", () => {
    const sc = { id: "sc-1", points: 1, correct_index: 2 };
    expect(scoreSingleChoice(sc, 2).earned).toBe(1);
    expect(scoreSingleChoice(sc, 0).earned).toBe(0);
    expect(scoreSingleChoice(sc, null).earned).toBe(0);
  });

  it("counts German sentences accurately despite abbreviations like z. B., vgl., et al., r = 0.56", () => {
    const txt =
      "Das Arbeitsgedächtnis (vgl. Baddeley & Hitch, 1974) umfasst u. a. die phonologische Schleife, z. B. beim inneren Sprechen. Die Korrelation lag bei r = 0.56.";
    expect(countGermanSentences(txt)).toBe(2);
  });

  it("checks sentence limits and operator traps (Nennen vs. Skizzieren)", () => {
    const skizzierenQ = {
      id: "open-1",
      operator: "Skizzieren",
      points: 4,
      max_sentences: 2,
      sentence_limit_label: "in 1–2 Sätzen",
      rubric_criteria: [
        { criterion: "Individuelle Bezugsnorm", points: 2, keywords: ["individuelle bezugsnorm"] },
        { criterion: "Variable Attribution", points: 2, keywords: ["variabel", "anstrengung"] },
      ],
    };
    const goodRes = evaluateOpenResponse(
      skizzierenQ,
      "Die Lehrkraft nutzt die individuelle Bezugsnorm, um den Lernzuwachs zu betonen. Zudem führt sie das Ergebnis variabel auf Anstrengung zurück."
    );
    expect(goodRes.withinSentenceLimit).toBe(true);
    expect(goodRes.earned).toBe(4);

    const tooLongRes = evaluateOpenResponse(
      skizzierenQ,
      "Erster Satz hier. Zweiter Satz folgt. Dritter Satz sprengt das Limit."
    );
    expect(tooLongRes.withinSentenceLimit).toBe(false);
    expect(tooLongRes.warnings.some((w) => w.includes("Satzlimit"))).toBe(true);
  });

  it("validates 48-point Testformat sets with >= 75% open questions", () => {
    const set = {
      questions: [
        { type: "vignette_open", points: 24 },
        { type: "short_open", points: 14 },
        { type: "single_choice", points: 2 },
        { type: "multiple_choice", points: 8 },
      ],
    };
    const check = validateTestformatSet(set);
    expect(check.isValid48).toBe(true);
    expect(check.meets75PercentOpen).toBe(true);
  });
});

describe("FSRS Spaced Repetition Engine (ts-fsrs & Gentle Pause Cap)", () => {
  it("progresses card stability and intervals across ratings", () => {
    const now = new Date("2026-11-18T10:00:00Z");
    const rec0 = createInitialFsrsRecord("card-1", now);
    const preview = previewIntervals(rec0, now);
    expect(preview[Rating.Good]).toBeTruthy();

    const rec1 = reviewCard(rec0, Rating.Good, now);
    expect(rec1.reviewCount).toBe(1);
    expect(new Date(rec1.card.due).getTime()).toBeGreaterThan(now.getTime());

    const recEasy = reviewCard(rec1, Rating.Easy, new Date("2026-11-20T10:00:00Z"));
    expect(recEasy.card.stability).toBeGreaterThan(0);
  });

  it("caps daily review load gently after pause days and prioritizes confusion pairs", () => {
    const now = new Date("2026-11-25T10:00:00Z");
    const past = new Date("2026-11-15T10:00:00Z");
    const cards = Array.from({ length: 40 }, (_, i) => ({
      id: `c-${i}`,
      unit_id: "A-01-01",
      domain: i % 3 === 0 ? "A" : i % 3 === 1 ? "B" : "C",
      confusion_tag: i === 25 ? "assimilation-vs-akkommodation" : null,
    }));
    const states = {};
    for (const c of cards.slice(0, 30)) {
      const init = createInitialFsrsRecord(c.id, past);
      const rev = reviewCard(init, Rating.Again, past);
      states[c.id] = rev;
    }

    const deck = selectGentleDailyDeck(cards, states, {
      dailyCap: 16,
      confusionBoostTags: { "assimilation-vs-akkommodation": 5 },
      now,
    });
    expect(deck.queue.length).toBeLessThanOrEqual(16);
    expect(deck.queue[0].id).toBe("c-25");
  });
});

describe("Adaptive Planner, Course-Pack Schema & Offline/Supabase Sync", () => {
  beforeEach(async () => {
    await db.unitProgress.clear();
    await db.notes.clear();
    await db.activityLogs.clear();
  });

  it("computes exam countdown, 32-min core plan, +12-min bonus stage & NotebookLM prompt", () => {
    const now = new Date("2026-11-18T12:00:00");
    expect(computeDaysUntilExam("2027-02-16", now)).toBe(90);

    const sampleUnits = [
      {
        id: "A-01-01",
        domain: "A",
        section_num: "1.1",
        title: "Klassisches Konditionieren",
        page_label: "Original-Skript S. 6–10",
        definitions: [{ term: "Lernen", author_year: "Bower & Hilgard, 1983", definition: "..." }],
        empirical_studies: [{ authors_year: "Watson & Rayner, 1920", title: "Little Albert", finding: "..." }],
        cross_references: [{ target_hint: "Gebiet B", bridge_explanation: "Prüfungsangst" }],
        laut_erzaehl_check: [{ term: "1" }, { term: "2" }, { term: "3" }, { term: "4" }, { term: "5" }],
      },
      {
        id: "B-01-01",
        domain: "B",
        section_num: "1.1",
        title: "Piaget",
        page_label: "Original-Skript S. 8–14",
        laut_erzaehl_check: [{ term: "1" }, { term: "2" }, { term: "3" }],
      },
    ];

    const plan = buildDailyCorePlan({
      units: sampleUnits,
      unitProgressMap: { "A-01-01": { status: "mastered" } },
      confusionPairs: [
        { id: "cp-1", domain: "B", term_a: "Assimilation", term_b: "Akkommodation", core_difference: "Schema beibehalten vs. anpassen" },
      ],
    });
    expect(plan.focusDomain).toBe("B");
    expect(plan.steps).toHaveLength(4);

    const bonus = buildBonusStage({ units: sampleUnits, focusDomain: "B" });
    expect(bonus.durationMinutes).toBe(12);

    const prompt = generateNotebookLMPrompt({
      unit: sampleUnits[0],
      weakConfusions: [{ term_a: "Kontiguität", term_b: "Kontingenz", core_difference: "Zeit vs. Regelhaftigkeit" }],
    });
    expect(prompt).toContain("KUNST");
    expect(prompt).toContain("SPORT");
    expect(prompt).toContain("Original-Skript S. 6–10");

    const packCheck = validateCoursePack({
      manifest: { id: "ews-psychologie", title: "EWS Psychologie" },
      domains: [{ id: "A", units: [sampleUnits[0]] }],
      flashcards: [{ id: "f1" }],
    });
    expect(packCheck.valid).toBe(true);
    expect(buildCommandSearchIndex({ domains: [{ id: "A", units: [sampleUnits[0]] }] }).length).toBe(1);
  });

  it("persists offline in Dexie and merges timestamps conflict-free for PC <-> iPhone sync", async () => {
    await upsertUnitProgress("A-01-01", "A", { status: "mastered", lautCheckCount: 5 });
    await saveUnitNote("A-01-01", { highlightColor: "emerald", text: "Wichtig für Kunst-Transfer!" });
    await logStudyActivity({ minutesStudied: 35, unitsCompleted: 1, cardsReviewed: 15 });

    const backup = await exportFullBackupJson();
    expect(backup.collections.unitProgress).toHaveLength(1);
    expect(backup.collections.notes[0].text).toContain("Kunst-Transfer");

    await db.notes.clear();
    await importFullBackupJson(backup);
    expect(await db.notes.count()).toBe(1);

    const merged = mergeCollectionByTimestamp(
      [
        { unitId: "A-01-01", status: "seen", updatedAt: "2026-11-18T10:00:00Z" },
        { unitId: "B-01-01", status: "mastered", updatedAt: "2026-11-18T12:00:00Z" },
      ],
      [
        { unitId: "A-01-01", status: "mastered", updatedAt: "2026-11-18T11:30:00Z" },
        { unitId: "C-01-01", status: "seen", updatedAt: "2026-11-18T09:00:00Z" },
      ],
      "unitId"
    );
    expect(merged.toUpdateLocally.map((x) => x.unitId)).toEqual(["A-01-01", "C-01-01"]);
    expect(merged.toPushRemotely.map((x) => x.unitId)).toEqual(["B-01-01"]);

    const weekly = computeWeeklyGrowth(await db.activityLogs.toArray());
    expect(weekly.totalMinutes).toBe(35);
  });
});
