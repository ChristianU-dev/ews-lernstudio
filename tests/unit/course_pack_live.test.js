import { describe, it, expect } from "vitest";
import { getActiveCoursePack } from "../../src/lib/coursePackRegistry";
import { validateCoursePack, buildCommandSearchIndex } from "../../src/lib/courseSchema";
import { validateTestformatSet } from "../../src/lib/examScoring";

describe("Live EWS-Psychologie Course-Pack Integrity", () => {
  it("loads all 3 strictly separated scripts, 460+ cards, 6x 48-pt exam sets & knowledge graph", () => {
    const pack = getActiveCoursePack("ews-psychologie");
    const check = validateCoursePack(pack);
    expect(check.errors).toEqual([]);
    expect(check.valid).toBe(true);
    expect(check.stats.domainCount).toBe(3);
    expect(check.stats.unitCount).toBeGreaterThanOrEqual(80);
    expect(check.stats.flashcardCount).toBeGreaterThanOrEqual(400);
    expect(check.stats.examSetCount).toBe(6);

    for (const set of pack.examBank.testformat_sets) {
      const v = validateTestformatSet(set);
      expect(v.isValid48).toBe(true);
      expect(v.meets75PercentOpen).toBe(true);
    }

    const idx = buildCommandSearchIndex(pack);
    expect(idx.length).toBeGreaterThan(100);
    expect(idx.some((i) => i.keywords.includes("PISA 2025"))).toBe(true);
  });
});
