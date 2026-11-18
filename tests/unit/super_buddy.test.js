import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  computeLevelInfo,
  computeNonPunitiveStreak,
  computeDailyMasteryRings,
  evaluateUnlockedAchievements,
  computeTotalLearnerXp,
} from "../../src/lib/gamificationEngine";
import {
  analyzeLearnerProfile,
  generatePersonalWeaknessPodcastPrompt,
} from "../../src/lib/learnerIntelligence";
import { buildSevenDayWeekStrip, buildStudyScheduleIcs } from "../../src/lib/calendarExport";
import {
  createEmptyCustomCourse,
  parseRawNotesIntoUnitAndCards,
} from "../../src/lib/customCourseBuilder";
import {
  db,
  MAIN_PROFILE_ID,
  ensureProfilesInitialized,
  createProfile,
  deleteSecondaryProfile,
  upsertUnitProgress,
  loadProfileDataSlice,
  saveCustomCourse,
  loadCustomCourses,
} from "../../src/lib/db";

describe("Super-Learning-Buddy: Non-Punitive Gamification, Adaptive DNA, Calendar & Multi-Profile", () => {
  beforeEach(async () => {
    await db.profiles.clear();
    await db.customCourses.clear();
    await db.unitProgress.clear();
  });

  it("computes XP levels, mastery rings by energy mode & protects streaks with pause shields", () => {
    const lvl1 = computeLevelInfo(0);
    expect(lvl1.level).toBe(1);
    const lvl4 = computeLevelInfo(1200);
    expect(lvl4.level).toBe(4);

    // Tagesform-Schalter: Sanft (15m) vs. Normal (32m) vs. Flow (50m)
    const gentleRings = computeDailyMasteryRings({ minutesStudied: 15, unitsCompleted: 1, cardsReviewed: 8 }, "gentle");
    expect(gentleRings.allClosed).toBe(true);

    const flowRings = computeDailyMasteryRings({ minutesStudied: 25, unitsCompleted: 1, cardsReviewed: 10 }, "flow");
    expect(flowRings.rings.time.target).toBe(50);
    expect(flowRings.allClosed).toBe(false);

    // Pausentag-Schutzschild: Gestern Pause, aber davor 2 aktive Tage -> Serie bleibt erhalten!
    const now = new Date("2026-11-18T12:00:00");
    const logs = [
      { dateKey: "2026-11-18", minutesStudied: 20 },
      // 2026-11-17 ist ein freier Ruhetag!
      { dateKey: "2026-11-16", minutesStudied: 32 },
      { dateKey: "2026-11-15", minutesStudied: 30 },
    ];
    const streak = computeNonPunitiveStreak(logs, now);
    expect(streak.streakDays).toBe(3);
    expect(streak.protectedPauseDays).toContain("2026-11-17");

    const xp = computeTotalLearnerXp({
      activityLogs: logs,
      unitProgressMap: { "A-01-01": { status: "mastered", domain: "A" } },
      fsrsStatesMap: { c1: { reviewCount: 30 } },
      examAttempts: [{ id: "e1" }],
    });
    expect(xp).toBeGreaterThan(300);

    const badges = evaluateUnlockedAchievements({
      activityLogs: [{ podcastListened: true, bonusRounds: 1 }],
      unitProgressMap: {
        a1: { status: "mastered", domain: "A" },
        b1: { status: "seen", domain: "B" },
        c1: { status: "seen", domain: "C" },
      },
      fsrsStatesMap: { c1: { reviewCount: 30 } },
      examAttempts: [{ id: "e1" }],
    });
    expect(badges.filter((b) => b.unlocked).length).toBeGreaterThanOrEqual(5);
  });

  it("analyzes personal learning pace, exam buffer forecast & generates weakness podcast prompts", () => {
    const units = Array.from({ length: 20 }, (_, i) => ({ id: `A-01-${i}`, domain: "A" }));
    const profileAnalysis = analyzeLearnerProfile({
      allUnits: units,
      unitProgressMap: {
        "A-01-0": { status: "mastered", lautCheckCount: 5 },
        "A-01-1": { status: "mastered", lautCheckCount: 5 },
      },
      fsrsStatesMap: {
        "card-shaky": { cardId: "card-shaky", reviewCount: 3, lapses: 2, lastRating: 1, card: { stability: 1.5 } },
      },
      confusionCounts: { "cp-1": 3 },
      confusionPairs: [
        { id: "cp-1", term_a: "Assimilation", term_b: "Akkommodation", page_label: "S. 20", core_difference: "Schema nutzen vs. umbauen" },
      ],
      activityLogs: [{ dateKey: "2026-11-18", minutesStudied: 28, podcastListened: true }],
      examDate: "2027-02-17",
      now: new Date("2026-11-18T12:00:00"),
    });

    expect(profileAnalysis.masteredUnits).toBe(2);
    expect(profileAnalysis.shakyCardIds).toContain("card-shaky");
    expect(profileAnalysis.coachInsight).toContain("Assimilation vs. Akkommodation");

    const prompt = generatePersonalWeaknessPodcastPrompt({
      flashcards: [{ id: "card-shaky", front: "Was ist Assimilation?", back: "Integration ins Schema", page_label: "S. 20" }],
      shakyCardIds: profileAnalysis.shakyCardIds,
      topConfusions: profileAnalysis.topConfusions,
    });
    expect(prompt).toContain("Assimilation");
    expect(prompt).toContain("Kunst");
    expect(prompt).toContain("Sport");
  });

  it("exports valid RFC 5545 .ics calendar schedules and 7-day week strips", () => {
    const now = new Date("2026-11-18T12:00:00");
    const strip = buildSevenDayWeekStrip([{ dateKey: "2026-11-18", minutesStudied: 25 }], ["2026-11-17"], now);
    expect(strip).toHaveLength(7);
    expect(strip.find((d) => d.isToday)?.isActive).toBe(true);
    expect(strip.find((d) => d.dateKey === "2026-11-17")?.isShielded).toBe(true);

    const ics = buildStudyScheduleIcs({
      profileName: "Staatsexamen",
      courseTitle: "EWS Psychologie",
      examDate: "2027-02-17",
      preferredHour: 16,
      dailyMinutes: 32,
      now,
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART;VALUE=DATE:20270217");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("isolates multiple user profiles, protects her main profile, and converts custom subject notes into cards", async () => {
    await ensureProfilesInitialized();
    const christian = await createProfile({ name: "Christian", avatarEmoji: "🚀" });

    // Ihr Hauptprofil darf NIEMALS gelöscht werden!
    await expect(deleteSecondaryProfile(MAIN_PROFILE_ID)).rejects.toThrow(/geschützte Hauptprofil/);

    // Fortschritte zwischen ihrem Hauptprofil und Christians Profil sind 100 % isoliert
    await upsertUnitProgress("A-01-01", "A", { status: "mastered" }, MAIN_PROFILE_ID);
    await upsertUnitProgress("B-01-01", "B", { status: "mastered" }, christian.id);

    const mainSlice = await loadProfileDataSlice(MAIN_PROFILE_ID);
    const chrisSlice = await loadProfileDataSlice(christian.id);

    expect(mainSlice.unitProgressMap["A-01-01"]?.status).toBe("mastered");
    expect(mainSlice.unitProgressMap["B-01-01"]).toBeUndefined();
    expect(chrisSlice.unitProgressMap["B-01-01"]?.status).toBe("mastered");
    expect(chrisSlice.unitProgressMap["A-01-01"]).toBeUndefined();

    // Eigenes Studienfach + 1-Klick Notiz-Konverter
    const customCourse = createEmptyCustomCourse({
      title: "Schulpädagogik",
      domainNames: ["Unterrichtsqualität", "Schulentwicklung", "Bildungstheorie"],
    });
    const converted = parseRawNotesIntoUnitAndCards({
      courseId: customCourse.id,
      domain: "A",
      unitTitle: "Klassenführung nach Kounin",
      pageLabel: "Vorlesung S. 12",
      rawText:
        "Allgegenwärtigkeit: Lehrkraft signalisiert Überblick im gesamten Klassenzimmer\nReibungslosigkeit: Flüssiger Unterrichtsfluss ohne abrupte Themenbrüche",
    });
    expect(converted.unit.definitions).toHaveLength(2);
    expect(converted.cards.length).toBeGreaterThanOrEqual(2);
    expect(converted.unit.laut_erzaehl_check).toHaveLength(5);

    customCourse.domains[0].units.push(converted.unit);
    customCourse.flashcards.push(...converted.cards);
    await saveCustomCourse(customCourse, christian.id);
    const loadedCourses = await loadCustomCourses();
    expect(loadedCourses).toHaveLength(1);
    expect(loadedCourses[0].manifest.title).toBe("Schulpädagogik");
  });
});
