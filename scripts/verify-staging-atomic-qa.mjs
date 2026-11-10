// Decode the generated synthetic PDF through the actual app parser, without a browser or cloud.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { classroomPageGeometry } from "../frontend/lib/classroomPdfGeometry.js";
import { parseClassroomPages, planClassroomImport } from "../frontend/lib/classroomImport.js";
import { stagingQaRowsToRules } from "./calendar-staging-qa-plan.mjs";
const plan = JSON.parse(fs.readFileSync("docs/development/calendar-role-concurrency-qa/staging-fixtures.json", "utf8"));
const { getDocument, OPS } = await import(pathToFileURL(path.resolve("node_modules/pdfjs-dist/legacy/build/pdf.mjs")));
const loading = getDocument({ data: new Uint8Array(fs.readFileSync("output/pdf/calendar-role-concurrency-qa/staging-atomic-qa.pdf")), isEvalSupported: false, disableFontFace: true, standardFontDataUrl: path.resolve("node_modules/pdfjs-dist/standard_fonts").replaceAll("\\", "/") + "/" });
try {
  const pdf = await loading.promise, pages = [];
  for (let index = 1; index <= pdf.numPages; index++) pages.push(await classroomPageGeometry(await pdf.getPage(index), OPS));
  const parsed = parseClassroomPages(pages);assert.equal(parsed.rows.length, 2);assert.deepEqual(parsed.warnings, []);
  const converted = planClassroomImport(parsed.rows, { higher: plan.atomicImportTerm }, plan.semester, { rules: [], events: [] });
  assert.deepEqual(converted.issues, []);
  const expected = stagingQaRowsToRules(plan).slice(-2), fields = row => [row.title, row.rooms[0], row.weekday, row.start, row.end, row.validFrom, row.validTo];
  assert.deepEqual(converted.rules.map(fields), expected.map(fields));
  for (const winner of stagingQaRowsToRules(plan).slice(0, 2)) {
    const blocked = planClassroomImport(parsed.rows, { higher: plan.atomicImportTerm }, plan.semester, { rules: [{ ...winner, id: "synthetic-overlap-winner" }], events: [] });
    assert.ok(blocked.issues.some(item => item.code === "overlap"));assert.equal(blocked.rules.length, 0);
  }
  fs.mkdirSync("output/playwright/calendar-role-concurrency-qa", { recursive: true });
  fs.writeFileSync("output/playwright/calendar-role-concurrency-qa/atomic-pdf-report.json", JSON.stringify({ syntheticOnly: true, pages: pdf.numPages, parsedRows: 2, exactPlanFieldsMatched: true, eitherOverlapWinnerBlocksWholeBatch: true, cloudUsed: false }, null, 2));
  console.log("PASS synthetic atomic PDF: exact two rows; either overlap winner blocks the whole batch");
} finally { await loading.destroy(); }
