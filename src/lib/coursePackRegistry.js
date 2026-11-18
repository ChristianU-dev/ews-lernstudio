import manifest from "@content/courses/ews-psychologie/manifest.json";
import domainA from "@content/courses/ews-psychologie/domain_a_lernen_und_lehren.json";
import domainB from "@content/courses/ews-psychologie/domain_b_entwicklungspsychologie.json";
import domainC from "@content/courses/ews-psychologie/domain_c_diagnostik.json";
import flashcards from "@content/courses/ews-psychologie/flashcards.json";
import examBank from "@content/courses/ews-psychologie/exam_bank.json";
import operatorsData from "@content/courses/ews-psychologie/operators.json";
import confusionPairs from "@content/courses/ews-psychologie/confusion_pairs.json";
import knowledgeGraph from "@content/courses/ews-psychologie/knowledge_graph_curated.json";

const BUILTIN_PACKS = {
  "ews-psychologie": {
    manifest,
    domains: [
      { id: "A", title: "Skript A: Lernen und Lehren (108 S.)", units: domainA.units || [] },
      { id: "B", title: "Skript B: Entwicklungspsychologie (82 S.)", units: domainB.units || [] },
      { id: "C", title: "Skript C: Diagnostik & Evaluation (73 S.)", units: domainC.units || [] },
    ],
    flashcards: Array.isArray(flashcards) ? flashcards : flashcards.cards || [],
    examBank,
    operatorsData: Array.isArray(operatorsData) ? { operators: operatorsData, operator_drills: [] } : operatorsData,
    operators: Array.isArray(operatorsData) ? operatorsData : operatorsData.operators || [],
    confusionPairs: Array.isArray(confusionPairs) ? confusionPairs : confusionPairs.pairs || [],
    knowledgeGraph,
  },
};

export function getActiveCoursePack(courseId = "ews-psychologie") {
  return BUILTIN_PACKS[courseId] || BUILTIN_PACKS["ews-psychologie"];
}
