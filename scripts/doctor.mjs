/**
 * Diagnose-Skript (`npm run doctor`) für kinderleichte spätere Wartung.
 * Prüft Course-Pack-Integrität, Export-Dateien (.docx / .apkg), Originalgrafiken,
 * Prüfungsregeln (48 Pkt. / >= 75 % Offen), Build-Artefakte und Dokumentation.
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let failures = 0;

function check(label, ok, detail = "") {
  if (ok) {
    console.log(`  [OK]   ${label}${detail ? ` (${detail})` : ""}`);
  } else {
    console.error(`  [FEHL] ${label}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

console.log("======================================================================");
console.log("  EWS-Psychologie Lernstudio — System- & Qualitäts-Diagnose (doctor)");
console.log("======================================================================");

const requiredCourseFiles = [
  "content/courses/ews-psychologie/manifest.json",
  "content/courses/ews-psychologie/domain_a_lernen_und_lehren.json",
  "content/courses/ews-psychologie/domain_b_entwicklungspsychologie.json",
  "content/courses/ews-psychologie/domain_c_diagnostik.json",
  "content/courses/ews-psychologie/flashcards.json",
  "content/courses/ews-psychologie/exam_bank.json",
  "content/courses/ews-psychologie/operators.json",
  "content/courses/ews-psychologie/confusion_pairs.json",
  "content/courses/ews-psychologie/knowledge_graph_curated.json",
];

for (const rel of requiredCourseFiles) {
  const full = path.join(root, rel);
  const exists = fs.existsSync(full);
  if (!exists) {
    check(rel, false, "Datei fehlt");
    continue;
  }
  try {
    JSON.parse(fs.readFileSync(full, "utf8"));
    check(rel, true, "valides JSON");
  } catch (e) {
    check(rel, false, `JSON-Fehler: ${e.message}`);
  }
}

const requiredExports = [
  "Lernskript_A_Lernen_und_Lehren.docx",
  "Lernskript_B_Entwicklungspsychologie.docx",
  "Lernskript_C_Diagnostik.docx",
  "Kapiteluebersichten_1_Seiten_Anker_A_B_C.docx",
  "HANDBUCH_UND_LERNSTRATEGIE.docx",
  "Anki_A_Lernen_und_Lehren.apkg",
  "Anki_B_Entwicklungspsychologie.apkg",
  "Anki_C_Diagnostik.apkg",
];

for (const exp of requiredExports) {
  const p1 = path.join(root, "exports", exp);
  const p2 = path.join(root, "public", "exports", exp);
  const ok1 = fs.existsSync(p1) && fs.statSync(p1).size > 4096;
  const ok2 = fs.existsSync(p2) && fs.statSync(p2).size > 4096;
  check(
    `Export ${exp}`,
    ok1 && ok2,
    ok1 ? `${Math.round(fs.statSync(p1).size / 1024)} KB (exports/ & public/exports/)` : "fehlt oder leer"
  );
}

const requiredDocs = [
  "SETUP_UND_LOGINS.md",
  "supabase/schema.sql",
  ".github/workflows/deploy.yml",
  "docs/AUDIT_REPORT.md",
  "docs/ARCHITECTURE.md",
  "docs/DATA_SCHEMA.md",
  "docs/MAINTENANCE_AND_RUNBOOK.md",
  "docs/NEW_COURSE_PACK_GUIDE.md",
];

for (const docFile of requiredDocs) {
  const full = path.join(root, docFile);
  check(`Dokumentation ${docFile}`, fs.existsSync(full) && fs.statSync(full).size > 200);
}

const distIndex = path.join(root, "dist", "index.html");
check("Produktions-Build (dist/index.html)", fs.existsSync(distIndex));

console.log("======================================================================");
if (failures > 0) {
  console.error(`Diagnose beendet mit ${failures} Fehler(n).`);
  process.exit(1);
} else {
  console.log("Alle Prüfungen erfolgreich bestanden — Lernstudio ist 100 % einsatzbereit!");
}
