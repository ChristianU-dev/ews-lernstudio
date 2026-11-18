/**
 * Universeller Multi-Fach Course-Builder (`customCourseBuilder.js`).
 * Macht die App zum dauerhaften Studien- & Lern-Buddy für ihre weiteren Prüfungen
 * (Allgemeine Pädagogik, Schulpädagogik, Grundschuldidaktik, Kunst, Sport)
 * sowie für Christians eigene Lernprojekte & Zertifizierungen!
 */

export function createEmptyCustomCourse({
  title,
  primarySubject = "Kunst",
  didacticSubject = "Sport",
  domainNames = ["Themenfeld A", "Themenfeld B", "Themenfeld C"],
}) {
  const slug =
    "custom-" +
    String(title || "neues-fach")
      .toLowerCase()
      .replace(/[^a-z0-9äöüß]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Date.now().toString(36);

  const ids = ["A", "B", "C"];
  const domains = domainNames.slice(0, 3).map((name, idx) => ({
    id: ids[idx] || `D${idx + 1}`,
    title: `${ids[idx] || idx + 1}: ${name}`,
    units: [],
  }));

  return {
    id: slug,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    manifest: {
      id: slug,
      title: title || "Mein eigenes Lernfach",
      version: "1.0.0",
      isCustom: true,
      learner_subjects: {
        primary: primarySubject,
        didactic: didacticSubject,
      },
      domains: domains.map((d) => ({ id: d.id, title: d.title, total_pages: 0 })),
    },
    domains,
    flashcards: [],
    examBank: {
      exam_compass: {},
      testformat_sets: [],
      essay_sets: [],
    },
    operatorsData: { operators: [], operator_drills: [] },
    operators: [],
    confusionPairs: [],
    knowledgeGraph: { nodes: [], edges: [] },
  };
}

/**
 * Intelligenter 1-Klick-Notiz-Konverter (100 % lokal ohne API-Key!):
 * Verwandelt eingefügte Skript-Stichpunkte oder „Begriff: Erklärung“-Zeilen automatisch
 * in ein visuelles 1-Seiten-Ankerblatt + fertige FSRS-Karteikarten + 5 Laut-Erzähl-Checks!
 */
export function parseRawNotesIntoUnitAndCards({
  courseId,
  domain = "A",
  unitTitle,
  pageLabel = "Eigene Aufzeichnung S. 1",
  rawText = "",
  existingUnitCount = 0,
}) {
  const unitNum = existingUnitCount + 1;
  const unitId = `${courseId}-${domain}-${String(unitNum).padStart(2, "0")}`;
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•▪*]\s*/, "").trim())
    .filter(Boolean);

  const definitions = [];
  const bullets = [];
  const cards = [];

  lines.forEach((line, idx) => {
    const colonMatch = line.match(/^([^:–-]{3,65})\s*[:–-]\s*(.{8,})$/);
    if (colonMatch) {
      const term = colonMatch[1].trim();
      const defText = colonMatch[2].trim();
      definitions.push({
        term,
        definition: defText,
        author_year: "Eigene Notiz",
        page_ref: pageLabel,
      });
      cards.push({
        id: `card-${unitId}-${idx + 1}`,
        unit_id: unitId,
        domain,
        subdeck: unitTitle || "Eigene Karten",
        card_type: "definition",
        front: `Was versteht man unter **${term}**?`,
        back: defText,
        page_label: pageLabel,
        confusion_tag: null,
        tags: ["Eigenes_Fach"],
      });
    } else {
      bullets.push(line);
      if (line.length > 20 && cards.length < 15) {
        cards.push({
          id: `card-${unitId}-${idx + 1}`,
          unit_id: unitId,
          domain,
          subdeck: unitTitle || "Eigene Karten",
          card_type: "concept",
          front: `Erkläre den Kernpunkt aus „${unitTitle}“: **${line.slice(0, 52)}${line.length > 52 ? "…" : ""}**`,
          back: line,
          page_label: pageLabel,
          confusion_tag: null,
          tags: ["Eigenes_Fach"],
        });
      }
    }
  });

  if (cards.length === 0) {
    cards.push({
      id: `card-${unitId}-1`,
      unit_id: unitId,
      domain,
      subdeck: unitTitle || "Eigene Karten",
      card_type: "concept",
      front: `Fasse die Kernaussagen von **${unitTitle || "diesem Thema"}** zusammen!`,
      back: rawText.trim() || "Wichtige Grundlagen des Themas.",
      page_label: pageLabel,
      confusion_tag: null,
      tags: ["Eigenes_Fach"],
    });
  }

  // Baue bis zu 5 Laut-Erzähl-Prüfpunkte
  const checkSources = [
    ...definitions.map((d) => ({ term: d.term, hint: d.definition })),
    ...bullets.map((b, i) => ({ term: `Kernpunkt ${i + 1}`, hint: b })),
  ];
  while (checkSources.length < 5) {
    checkSources.push({
      term: `Ankerpunkt ${checkSources.length + 1}`,
      hint: "Erkläre den Zusammenhang in eigenen Worten.",
    });
  }

  const unit = {
    id: unitId,
    domain,
    chapter_group_num: String(unitNum),
    chapter_group_title: `${domain} · Eigene Lerneinheiten`,
    section_num: `${unitNum}.0`,
    title: unitTitle || `Lerneinheit ${unitNum}`,
    subtitle: "Eigenes visuelles 1-Seiten-Ankerblatt",
    page_start: unitNum,
    page_end: unitNum,
    page_label: pageLabel,
    visual_anchor_tagline:
      definitions[0]?.definition?.slice(0, 110) ||
      bullets[0]?.slice(0, 110) ||
      `Kernwissen zu ${unitTitle}`,
    definitions: definitions.slice(0, 8),
    sections:
      bullets.length > 0
        ? [
            {
              heading: "Wichtige Kernaussagen & Zusammenhänge",
              page_ref: pageLabel,
              bullets,
            },
          ]
        : [],
    empirical_studies: [],
    original_figures: [],
    custom_visual: {
      type: "process_flow",
      title: `Struktur-Überblick: ${unitTitle || `Einheit ${unitNum}`}`,
      steps_or_rows: checkSources.slice(0, 4).map((c) => ({
        label: c.term,
        detail: c.hint.slice(0, 120),
      })),
    },
    comparison_table: null,
    cross_references: [],
    grundschule_praxis: null,
    laut_erzaehl_check: checkSources.slice(0, 5),
    essay_recipe: null,
  };

  return { unit, cards };
}
