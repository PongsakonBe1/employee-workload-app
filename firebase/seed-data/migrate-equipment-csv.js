/**
 * migrate-equipment-csv.js
 * [SA] Migration Script: แบบฟอร์มยืม/คืนหูฟัง CSV → Firestore worklogs
 *
 * Usage:
 *   node migrate-equipment-csv.js --dry-run          (ดู preview ไม่ import จริง)
 *   node migrate-equipment-csv.js                     (import จริง)
 *   node migrate-equipment-csv.js --year 2568         (import เฉพาะปีงบ 2568)
 *   node migrate-equipment-csv.js --year 2569         (import เฉพาะปีงบ 2569)
 *
 * Prerequisites: npm install (firebase-admin, csv-parse อยู่ใน package.json แล้ว)
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// ─── Config ──────────────────────────────────────────────────────────────────
const SERVICE_ACCOUNT_PATH = path.join(__dirname, "serviceAccountKey.json");
const CSV_FILES = {
  2568: path.join(
    "C:\\Users\\Admin\\Downloads",
    "แบบฟอร์มยืมหูฟัง-ปลั้กไฟห้องบริการ - ยืมหูฟัง ปีงบ 2568.csv"
  ),
  2569: path.join(
    "C:\\Users\\Admin\\Downloads",
    "แบบฟอร์มยืมหูฟัง-ปลั้กไฟห้องบริการ - ยืมหูฟัง ปีงบ 2569.csv"
  ),
};
const COLLECTION = "worklogs";
const BATCH_SIZE = 400; // Firestore max 500/batch, ใช้ 400 เพื่อ safety

// ─── Parse args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const YEAR_FILTER = args.includes("--year")
  ? parseInt(args[args.indexOf("--year") + 1])
  : null;

// ─── Init Firebase Admin ──────────────────────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)),
});
const db = admin.firestore();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * แปลงวันที่จาก CSV → ISO string "YYYY-MM-DD"
 * รองรับทั้ง ค.ศ. (d/M/YYYY) และ พ.ศ. (d/M/YYYY ที่ปี > 2500)
 * กรอง typo เช่น 2052 → flag เป็น invalid
 */
function parseDate(rawDate) {
  if (!rawDate || !rawDate.trim()) return null;
  const clean = rawDate.trim();
  const parts = clean.split("/");
  if (parts.length !== 3) return null;

  let [d, m, y] = parts.map((p) => parseInt(p.trim(), 10));
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;

  // พ.ศ. → ค.ศ.
  if (y > 2400 && y < 2700) y -= 543;

  // Sanity check: ปีที่สมเหตุสมผล (2020-2030)
  if (y < 2020 || y > 2030) return { date: null, invalid: true, raw: clean };

  const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  // ตรวจว่า valid date
  const dateObj = new Date(`${dateStr}T00:00:00Z`);
  if (isNaN(dateObj.getTime())) return { date: null, invalid: true, raw: clean };

  return { date: dateStr, invalid: false, dateObj };
}

/** แปลงสภาพอุปกรณ์ภาษาไทย → enum */
function parseCondition(raw) {
  const v = (raw || "").trim();
  if (v === "ชำรุด") return "damaged";
  if (v === "สูญหาย") return "lost";
  return "normal";
}

/** Normalize barcode → uppercase, trim */
function normalizeBarcode(raw) {
  return (raw || "").trim().toUpperCase();
}

/** Clean student ID: ลบ prefix s, trim whitespace, \n */
function cleanStudentId(raw) {
  return (raw || "").replace(/\n/g, "").trim().replace(/^s/i, "");
}

/** Clean name: trim whitespace */
function cleanName(raw) {
  return (raw || "").trim();
}

/**
 * Parse CSV file → array of raw row objects
 * รองรับ encoding UTF-8 (Google Forms CSV)
 */
async function parseCSV(filePath) {
  const rows = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let headers = null;
  let lineNum = 0;

  for await (const line of rl) {
    lineNum++;
    const cleanLine = line.replace(/\r/g, "");
    if (!cleanLine.trim()) continue; // skip blank lines

    // parse CSV line แบบ simple (handle quoted fields ที่มี \n ด้วย)
    const cols = parseCSVLine(cleanLine);

    if (lineNum === 1) {
      // ลบ BOM, trim, กรอง header ว่าง (trailing comma สร้าง empty column)
      headers = cols
        .map((h) => h.replace(/^\uFEFF/, "").trim())
        .filter((h, i, arr) => {
          // เก็บทุก header ยกเว้น empty ท้ายสุด
          if (h !== "") return true;
          // เช็คว่ามี non-empty ตามหลังไหม
          return arr.slice(i + 1).some((x) => x !== "");
        });
      continue;
    }

    if (cols.length < 3) continue; // skip rows ที่มีข้อมูลน้อยเกินไป

    // skip rows ที่วันที่และชื่ออุปกรณ์ว่างทั้งคู่ (blank/footer rows)
    const firstCol = (cols[0] || "").trim();
    const thirdCol = (cols[3] || "").trim(); // ชื่ออุปกรณ์
    if (!firstCol && !thirdCol) continue;

    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] || "").replace(/\r/g, "").trim();
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Simple CSV line parser — handles basic quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Map CSV row → Firestore worklog document
 */
function mapRowToWorklog(row, fiscalYear) {
  const dateResult = parseDate(row["วันที่ยืม"]);

  // Invalid date → skip
  if (!dateResult || !dateResult.date) {
    return { skip: true, reason: `invalid date: "${row["วันที่ยืม"]}"`, row };
  }

  const equipmentName = (row["ชื่ออุปกรณ์"] || "").trim();
  const barcode = normalizeBarcode(row["หมายเลขอุปกรณ์"]);
  const condition = parseCondition(row["สภาพอุปกรณ์หลังให้บริการ"]);
  const staffName = cleanName(row["รายชื่อผู้ให้บริการ"]);
  const returnedBy = cleanName(row["รายชื่อผู้รับคืน"]);
  const studentId = cleanStudentId(row["รหัสนักศึกษา"]);
  const note = (row["โน๊ต"] || "").trim();
  const borrowTime = (row["เวลายืม"] || "").trim();
  const returnTime = (row["เวลาคืน"] || "").trim();

  // สร้าง Timestamp จากวันที่ + เวลาคืน (เป็นเวลาที่ log ถูก record จริง)
  let createdAt;
  try {
    const returnDT = returnTime
      ? new Date(`${dateResult.date}T${returnTime}+07:00`)
      : new Date(`${dateResult.date}T23:59:00+07:00`);
    createdAt = admin.firestore.Timestamp.fromDate(returnDT);
  } catch {
    createdAt = admin.firestore.Timestamp.fromDate(
      new Date(`${dateResult.date}T23:59:00+07:00`)
    );
  }

  return {
    skip: false,
    doc: {
      // ─── Core worklog fields ───────────────────────────────────────────
      date: dateResult.date,
      createdAt,
      minorTask: "คืนหูฟัง",        // ทุก record เป็น "คืนแล้ว" → log คืน
      comment: note
        ? `[นำเข้า CSV] ${equipmentName} ${barcode} | ${note}`
        : `[นำเข้า CSV] ${equipmentName} ${barcode}`,

      // ─── Equipment fields ──────────────────────────────────────────────
      equipment: equipmentName,
      equipmentBarcode: barcode,
      equipmentCondition: condition,
      equipmentNote: note || null,

      // ─── Staff info ────────────────────────────────────────────────────
      employeeDisplayName: staffName,
      returnedBy,
      studentId,
      borrowTime,
      returnTime,

      // ─── Migration metadata ────────────────────────────────────────────
      source: "csv_import",
      fiscalYear: String(fiscalYear),
      importedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Equipment CSV Migration Script");
  console.log(`  Mode   : ${DRY_RUN ? "🔍 DRY RUN (ไม่ import จริง)" : "🚀 LIVE IMPORT"}`);
  console.log(`  Filter : ${YEAR_FILTER ? `ปีงบ ${YEAR_FILTER} เท่านั้น` : "ทุกปีงบ (2568 + 2569)"}`);
  console.log("═══════════════════════════════════════════════════════\n");

  const yearsToProcess = YEAR_FILTER
    ? [YEAR_FILTER]
    : Object.keys(CSV_FILES).map(Number);

  let totalImported = 0;
  let totalSkipped = 0;
  let totalInvalid = 0;
  const allInvalidRows = [];

  for (const year of yearsToProcess) {
    const csvPath = CSV_FILES[year];
    console.log(`\n📂 ประมวลผล ปีงบ ${year}: ${path.basename(csvPath)}`);

    if (!fs.existsSync(csvPath)) {
      console.error(`  ❌ ไม่พบไฟล์: ${csvPath}`);
      continue;
    }

    const rawRows = await parseCSV(csvPath);
    console.log(`  📊 พบ ${rawRows.length} rows`);

    const docsToImport = [];
    const skipped = [];

    for (const row of rawRows) {
      const result = mapRowToWorklog(row, year);
      if (result.skip) {
        // skip rows ที่วันที่ว่าง → ไม่นับเป็น invalid (empty trailing rows)
        const dateVal = (row["วันที่ยืม"] || "").trim();
        if (!dateVal) continue; // silent skip
        skipped.push(result);
        totalSkipped++;
        if (result.reason.includes("invalid date")) {
          totalInvalid++;
          allInvalidRows.push({ year, ...result });
        }
      } else {
        docsToImport.push(result.doc);
      }
    }

    // ─── Summary ──────────────────────────────────────────────────────────
    const damaged = docsToImport.filter((d) => d.equipmentCondition === "damaged").length;
    const lost = docsToImport.filter((d) => d.equipmentCondition === "lost").length;
    console.log(`  ✅ จะ import  : ${docsToImport.length} docs`);
    console.log(`  ⚠️  ชำรุด       : ${damaged} records`);
    console.log(`  🔴 สูญหาย      : ${lost} records`);
    console.log(`  ⏭️  Skip        : ${skipped.length} rows`);
    if (skipped.length > 0) {
      skipped.forEach((s) => console.log(`     → ${s.reason}`));
    }

    if (DRY_RUN) {
      console.log("\n  🔍 DRY RUN — ตัวอย่าง 3 docs แรก:");
      docsToImport.slice(0, 3).forEach((doc, i) => {
        console.log(`  [${i + 1}]`, JSON.stringify({
          date: doc.date,
          equipment: doc.equipment,
          equipmentCondition: doc.equipmentCondition,
          employeeDisplayName: doc.employeeDisplayName,
          fiscalYear: doc.fiscalYear,
          source: doc.source,
        }, null, 4));
      });
      totalImported += docsToImport.length;
      continue;
    }

    // ─── Batch write ───────────────────────────────────────────────────────
    console.log(`\n  ⬆️  กำลัง import ${docsToImport.length} docs เป็น batch...`);
    let batchCount = 0;

    for (let i = 0; i < docsToImport.length; i += BATCH_SIZE) {
      const chunk = docsToImport.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      chunk.forEach((doc) => {
        const ref = db.collection(COLLECTION).doc();
        batch.set(ref, doc);
      });
      await batch.commit();
      batchCount++;
      process.stdout.write(`\r  Batch ${batchCount}: ${Math.min(i + BATCH_SIZE, docsToImport.length)}/${docsToImport.length} docs...`);
    }

    console.log(`\n  ✅ Import สำเร็จ: ${docsToImport.length} docs`);
    totalImported += docsToImport.length;
  }

  // ─── Final Summary ────────────────────────────────────────────────────────
  console.log("\n\n═══════════════════════════════════════════════════════");
  console.log("  สรุปผล");
  console.log(`  ✅ Import  : ${totalImported} docs${DRY_RUN ? " (dry-run)" : ""}`);
  console.log(`  ⏭️  Skipped : ${totalSkipped} rows`);
  console.log(`  ❌ Invalid : ${totalInvalid} rows (วันที่ผิดพลาด)`);

  if (allInvalidRows.length > 0) {
    console.log("\n  ⚠️  Rows ที่มีวันที่ผิดพลาด (ต้องแก้ manual):");
    allInvalidRows.forEach((r) => {
      console.log(`     ปีงบ ${r.year} | วันที่: "${r.row["วันที่ยืม"]}" | ${r.row["ชื่ออุปกรณ์"]} | ${r.row["รายชื่อผู้ให้บริการ"]}`);
    });
  }

  console.log("═══════════════════════════════════════════════════════\n");

  if (!DRY_RUN && totalImported > 0) {
    console.log("✅ Migration เสร็จสมบูรณ์ — ตรวจสอบที่ Equipment Health ได้เลย");
    console.log("   https://labboy-workload-app.web.app/admin/equipment-health\n");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
