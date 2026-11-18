/**
 * Modulare Course-Pack Validierung & Such-Indexierung (`cmdk` Ctrl+K Palette).
 * Erlaubt nahtlose Wiederverwendung der Plattform für weitere Staatsexamens-Fächer
 * (z. B. Allgemeine Pädagogik, Schulpädagogik, Grundschuldidaktik, Kunst, Sport).
 */

export function validateCoursePack(pack) {
  const errors = [];
  if (!pack || typeof pack !== "object") {
    return { valid: false, errors: ["Course-Pack ist leer oder kein Objekt."] };
  }
  if (!pack.manifest?.id || !pack.manifest?.title) {
    errors.push("Manifest benötigt 'id' und 'title'.");
  }
  if (!Array.isArray(pack.domains) || pack.domains.length === 0) {
    errors.push("Course-Pack benötigt mindestens ein Themengebiet in 'domains'.");
  }
  const unitIds = new Set();
  for (const dom of pack.domains || []) {
    if (!dom.id || !Array.isArray(dom.units) || dom.units.length === 0) {
      errors.push(`Gebiet '${dom?.id || "?"}' enthält keine Einheiten ('units').`);
      continue;
    }
    for (const u of dom.units) {
      if (!u.id || !u.title || !u.page_label) {
        errors.push(`Unit '${u?.id || "?"}' fehlt Pflichtfeld (id, title oder page_label).`);
      }
      if (unitIds.has(u.id)) {
        errors.push(`Doppelte Unit-ID gefunden: ${u.id}`);
      }
      unitIds.add(u.id);
      if (!Array.isArray(u.laut_erzaehl_check) || u.laut_erzaehl_check.length < 3) {
        errors.push(`Unit '${u.id}' benötigt einen Laut-Erzähl-Check.`);
      }
    }
  }
  if (!Array.isArray(pack.flashcards) || pack.flashcards.length === 0) {
    errors.push("Course-Pack benötigt FSRS-Karteikarten ('flashcards').");
  }
  return {
    valid: errors.length === 0,
    errors,
    stats: {
      domainCount: pack.domains?.length || 0,
      unitCount: unitIds.size,
      flashcardCount: pack.flashcards?.length || 0,
      examSetCount: pack.examBank?.testformat_sets?.length || 0,
    },
  };
}

export function buildCommandSearchIndex(pack) {
  const items = [];
  for (const dom of pack?.domains || []) {
    for (const u of dom.units || []) {
      const defTerms = (u.definitions || []).map((d) => `${d.term} ${d.author_year}`).join(" ");
      const studies = (u.empirical_studies || []).map((s) => `${s.authors_year} ${s.title}`).join(" ");
      const bolds = (u.all_bold_terms_covered || []).join(" ");
      items.push({
        id: `unit:${u.id}`,
        kind: "unit",
        domain: u.domain,
        unitId: u.id,
        title: `${u.section_num} ${u.title}`,
        subtitle: `Gebiet ${u.domain} · ${u.page_label}`,
        keywords: `${u.title} ${u.subtitle || ""} ${u.page_label} ${defTerms} ${studies} ${bolds}`,
      });
    }
  }
  for (const op of pack?.operators || []) {
    items.push({
      id: `op:${op.id}`,
      kind: "operator",
      title: `Operator: ${op.operator} (${op.ab_level})`,
      subtitle: op.what_graders_expect,
      keywords: `${op.operator} ${op.official_definition} ${op.trap_warning}`,
    });
  }
  for (const cp of pack?.confusionPairs || []) {
    items.push({
      id: `conf:${cp.id}`,
      kind: "confusion",
      domain: cp.domain,
      title: `Verwechslungs-Check: ${cp.term_a} vs. ${cp.term_b}`,
      subtitle: cp.core_difference,
      keywords: `${cp.term_a} ${cp.term_b} ${cp.core_difference} ${cp.page_label}`,
    });
  }
  return items;
}
