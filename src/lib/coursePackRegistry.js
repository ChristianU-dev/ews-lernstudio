import manifest from "@content/courses/ews-psychologie/manifest.json";
import domainA from "@content/courses/ews-psychologie/domain_a_lernen_und_lehren.json";
import domainB from "@content/courses/ews-psychologie/domain_b_entwicklungspsychologie.json";
import domainC from "@content/courses/ews-psychologie/domain_c_diagnostik.json";
import flashcards from "@content/courses/ews-psychologie/flashcards.json";
import examBank from "@content/courses/ews-psychologie/exam_bank.json";
import operatorsData from "@content/courses/ews-psychologie/operators.json";
import confusionPairs from "@content/courses/ews-psychologie/confusion_pairs.json";
import knowledgeGraph from "@content/courses/ews-psychologie/knowledge_graph_curated.json";

export const BUILTIN_PACKS = {
  "ews-psychologie": {
    id: "ews-psychologie",
    manifest,
    domains: [
      { id: "A", title: "Skript A: Lernen und Lehren (108 S.)", units: domainA.units || [] },
      { id: "B", title: "Skript B: Entwicklungspsychologie (82 S.)", units: domainB.units || [] },
      { id: "C", title: "Skript C: Diagnostik & Evaluation (73 S.)", units: domainC.units || [] },
    ],
    flashcards: Array.isArray(flashcards) ? flashcards : flashcards.cards || [],
    examBank,
    operatorsData: Array.isArray(operatorsData)
      ? { operators: operatorsData, operator_drills: [] }
      : operatorsData,
    operators: Array.isArray(operatorsData) ? operatorsData : operatorsData.operators || [],
    confusionPairs: Array.isArray(confusionPairs) ? confusionPairs : confusionPairs.pairs || [],
    knowledgeGraph,
  },
};

export function listAllCoursePacks(customCourses = []) {
  const builtinList = Object.values(BUILTIN_PACKS).map((p) => ({
    id: p.id || p.manifest?.id || "ews-psychologie",
    title: p.manifest?.title || "EWS Psychologie (Grundschule Bayern)",
    isCustom: false,
    unitCount: (p.domains || []).reduce((s, d) => s + (d.units?.length || 0), 0),
    cardCount: (p.flashcards || []).length,
  }));

  const customList = (customCourses || []).map((c) => ({
    id: c.id || c.manifest?.id,
    title: c.manifest?.title || "Eigenes Lernfach",
    isCustom: true,
    unitCount: (c.domains || []).reduce((s, d) => s + (d.units?.length || 0), 0),
    cardCount: (c.flashcards || []).length,
  }));

  return [...builtinList, ...customList];
}

export function getActiveCoursePack(courseId = "ews-psychologie", customCourses = []) {
  if (BUILTIN_PACKS[courseId]) {
    return BUILTIN_PACKS[courseId];
  }
  const foundCustom = (customCourses || []).find(
    (c) => c.id === courseId || c.manifest?.id === courseId
  );
  if (foundCustom) {
    return foundCustom;
  }
  return BUILTIN_PACKS["ews-psychologie"];
}
