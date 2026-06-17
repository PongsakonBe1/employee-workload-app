/**
 * import-equipment-log.js
 * 
 * Migrate ข้อมูลจาก sheet ยืม/คืนหูฟัง-ปลั๊กไฟ (แบบฟอร์มเก่า) เข้า Firestore
 * 
 * Format คอลัมน์ (tab-separated หรือ comma-separated):
 *   [0] วันที่        — D/M/YYYY (เช่น 1/10/2025)
 *   [1] เวลายืม      — HH:MM:SS หรือ HH:MM (เช่น 16:46:20)
 *   [2] รหัสบัตร     — รหัสนักศึกษา/บัตร (เช่น 024467AK00014 หรือ s6501031611091)
 *   [3] อุปกรณ์      — ICIT01-ICIT25 (เช่น ICIT02)
 *   [4] รหัสผู้รับบริการ — รหัสนักศึกษา (เช่น s6501031611091) อาจซ้ำกับ [2]
 *   [5] ผู้บันทึก    — ชื่อเล่นพนักงาน (เช่น อัจฉริยพงษ์)
 *   [6] สถานะ        — "คืนแล้ว" | "ยืม" | "ยังไม่คืน" | ""
 *   [7] ผู้รับบริการ — ชื่อเล่นพนักงานที่รับคืน (เช่น เพียงธาร)
 *   [8] เวลาคืน      — HH:MM:SS หรือ HH:MM (เช่น 20:14:01)
 *   [9] สภาพ         — "" | "สมบูรณ์" | "ชำรุด" | "สูญหาย"
 *  [10] หมายเหตุ     — ข้อความอิสระ (เช่น สายน่าจะหัก)
 * 
 * สิ่งที่ script นี้ทำ:
 *   1. แต่ละแถว → สร้าง worklog "ยืม" (minorTask = ยืมหูฟัง/ยืมปลั๊กไฟ)
 *   2. ถ้ามีเวลาคืน → สร้าง worklog "คืน" แยกอีก 1 รายการ พร้อม equipmentCondition/Note
 *   3. ตรวจ duplicate ด้วย _legacyId ก่อน insert
 *   4. DRY RUN mode by default
 * 
 * Usage:
 *   cd firebase/seed-data
 *   node import-equipment-log.js path/to/sheet.csv
 *   node import-equipment-log.js path/to/sheet.csv --live   # apply จริง
 *   node import-equipment-log.js path/to/sheet.csv --tab    # tab-separated (default: auto-detect)
 */

const admin = require("firebase-admin");
const fs    = require("fs");
const path  = require("path");

// ─── Firebase Init ─────────────────────────────────────────────────────────────
const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ serviceAccountKey.json not found at:", serviceAccountPath);
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(require(serviceAccountPath)) });
const db = admin.firestore();

// ─── Config ────────────────────────────────────────────────────────────────────
const DRY_RUN    = !process.argv.includes("--live");
const FORCE_TAB  = process.argv.includes("--tab");
const CSV_PATH   = process.argv.find(a => a.endsWith(".csv") || a.endsWith(".tsv") || a.endsWith(".txt"))
                   || null;

// ─── Nickname → employee mapping (อัปเดตตาม users จริง) ──────────────────────
const NICKNAME_MAP = {
  "อัจฉริยพงษ์": "ajchariyapong",
  "เพียงธาร":    "piengtarn.k",
  "กรวิทย์":     "korawit.k",
  "กฤตยชญ์":     "krittayot.s",
  "ธนกฤต":       "thanakit.s",
  "เทอดศักดิ์":  "thoedsak.w",
  "เปรมปรีดี":   "prampreedee.y",
  "ปิยพงษ์":     "piyapong.t",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseThaiDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.trim().split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  const y = parseInt(year, 10);
  // ปีพุทธศักราช (2568+) → แปลงเป็น ค.ศ.
  const ce = y > 2400 ? y - 543 : y;
  return `${ce}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function parseTime(timeStr) {
  if (!timeStr || !timeStr.trim()) return null;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return null;
  return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
}

function detectEquipmentType(equipmentId) {
  const id = (equipmentId || "").trim().toUpperCase();
  const num = parseInt(id.replace("ICIT", ""), 10);
  if (isNaN(num)) return null;
  // ICIT01-ICIT20 = headphones, ICIT21-ICIT25 = power
  return num <= 20 ? "headphones" : "power";
}

function mapCondition(rawCondition) {
  const c = (rawCondition || "").trim();
  if (!c || c === "สมบูรณ์" || c === "ปกติ" || c === "normal") return "normal";
  if (["ชำรุด", "เสีย", "หัก", "พัง", "damaged"].some(k => c.includes(k))) return "damaged";
  if (["สูญหาย", "หาย", "lost"].some(k => c.includes(k))) return "lost";
  return "normal";
}

function splitRow(line) {
  // Auto-detect: ถ้า FORCE_TAB หรือ มี \t มากกว่า , → ใช้ tab
  if (FORCE_TAB || (line.split("\t").length > line.split(",").length)) {
    return line.split("\t").map(c => c.trim());
  }
  return line.split(",").map(c => c.trim());
}

function makeLegacyId(date, timeStr, nickname, equipment, action) {
  return `equip_${date}_${timeStr}_${nickname}_${equipment}_${action}`
    .replace(/[^a-zA-Z0-9_\-]/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 120);
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n📋 Equipment Log Import");
  console.log(`   Mode: ${DRY_RUN ? "🔍 DRY RUN (no changes)" : "⚠️  LIVE MODE"}`);
  console.log(`   File: ${CSV_PATH || "❌ not specified"}\n`);

  if (!CSV_PATH) {
    console.error("❌ Usage: node import-equipment-log.js path/to/file.csv [--live] [--tab]");
    process.exit(1);
  }
  if (!fs.existsSync(CSV_PATH)) {
    console.error("❌ File not found:", CSV_PATH);
    process.exit(1);
  }

  // โหลด users จาก Firestore เพื่อ map nickname → uid
  console.log("📥 Loading users from Firestore...");
  const usersSnap = await db.collection("users").get();
  const usersMap  = new Map();
  usersSnap.forEach(doc => {
    const d = doc.data();
    if (d.nickname)     usersMap.set(d.nickname, { uid: doc.id, ...d });
    if (d.displayName)  usersMap.set(d.displayName, { uid: doc.id, ...d });
    if (d.email)        usersMap.set(d.email, { uid: doc.id, ...d });
    if (d.username)     usersMap.set(d.username, { uid: doc.id, ...d });
    // map จาก NICKNAME_MAP ด้วย
    Object.entries(NICKNAME_MAP).forEach(([nick, uname]) => {
      if (d.username === uname || d.email?.startsWith(uname)) {
        usersMap.set(nick, { uid: doc.id, ...d });
      }
    });
  });
  console.log(`   ✅ ${usersSnap.size} users loaded\n`);

  // อ่าน CSV
  const content = fs.readFileSync(CSV_PATH, "utf-8");
  const lines   = content.split("\n").map(l => l.replace(/\r$/, ""));

  // ข้ามแถว header (ข้ามแถวที่ไม่มีวันที่ในคอลัมน์แรก)
  const dataRows = lines.filter(line => {
    if (!line.trim()) return false;
    const first = splitRow(line)[0];
    return /^\d{1,2}\/\d{1,2}\/\d{4}/.test(first);
  });

  console.log(`📊 Found ${dataRows.length} data rows\n`);

  const stats = { total: 0, borrow: 0, returnLog: 0, skipped: 0, errors: 0 };

  for (let i = 0; i < dataRows.length; i++) {
    const cols = splitRow(dataRows[i]);

    const rawDate          = cols[0]  || "";
    const rawTimeBorrow    = cols[1]  || "";
    const cardId           = cols[2]  || "";
    const equipmentId      = cols[3]  || "";
    const studentId        = cols[4]  || "";
    const recorderNickname = cols[5]  || "";
    const statusRaw        = cols[6]  || "";
    const returnRecorder   = cols[7]  || "";
    const rawTimeReturn    = cols[8]  || "";
    const conditionRaw     = cols[9]  || "";
    const noteRaw          = cols[10] || "";

    const date        = parseThaiDate(rawDate);
    const timeBorrow  = parseTime(rawTimeBorrow);
    const timeReturn  = parseTime(rawTimeReturn);

    if (!date || !equipmentId) {
      stats.skipped++;
      continue;
    }

    const eqType = detectEquipmentType(equipmentId);
    const eqLabel = eqType === "headphones" ? "หูฟัง" : eqType === "power" ? "ปลั๊กไฟ" : "อุปกรณ์";

    // หา employee uid
    const borrowerUser = usersMap.get(recorderNickname) || null;
    const borrowerUid  = borrowerUser?.uid || "unknown";
    const borrowerDisplayName = borrowerUser?.displayName || borrowerUser?.nickname || recorderNickname;

    const returnUser  = usersMap.get(returnRecorder) || null;
    const returnUid   = returnUser?.uid || "unknown";
    const returnDisplayName = returnUser?.displayName || returnUser?.nickname || returnRecorder;

    // recipient = รหัสนักศึกษา (ใช้ studentId ก่อน ถ้าไม่มีใช้ cardId)
    const recipient = (studentId && studentId.startsWith("s")) ? studentId : cardId;

    stats.total++;

    // ─── 1. Worklog "ยืม" ────────────────────────────────────────────────────
    const borrowLegacyId = makeLegacyId(date, timeBorrow || "00:00", recorderNickname, equipmentId, "borrow");
    let borrowExists = false;

    if (!DRY_RUN) {
      const dupCheck = await db.collection("worklogs").where("_legacyId", "==", borrowLegacyId).limit(1).get();
      borrowExists = !dupCheck.empty;
    }

    if (borrowExists) {
      stats.skipped++;
    } else {
      const borrowDoc = {
        _legacyId:            borrowLegacyId,
        _source:              "equipment-sheet-import",
        date:                 date,
        time:                 timeBorrow || "00:00",
        recipient:            recipient,
        dutyGroup:            "main",
        mainDuty:             "บริการอุปกรณ์",
        minorTask:            `ยืม${eqLabel}`,
        comment:              `${equipmentId} — ${cardId}`,
        equipment:            equipmentId,
        status:               "บันทึกแล้ว",
        employeeId:           borrowerUid,
        employeeNickname:     recorderNickname,
        employeeDisplayName:  borrowerDisplayName,
        equipmentCondition:   "normal",
        equipmentNote:        "",
        locked:               true,
        createdAt:            admin.firestore.FieldValue.serverTimestamp(),
      };

      if (!DRY_RUN) {
        await db.collection("worklogs").add(borrowDoc);
      } else {
        console.log(`  [DRY] BORROW  ${date} ${timeBorrow} ${equipmentId} → ${recipient} (${recorderNickname})`);
      }
      stats.borrow++;
    }

    // ─── 2. Worklog "คืน" (ถ้ามีเวลาคืน หรือสถานะ "คืนแล้ว") ──────────────
    const hasReturn = timeReturn || statusRaw.includes("คืน");

    if (hasReturn) {
      const condition     = mapCondition(conditionRaw);
      const note          = noteRaw.trim();
      const returnLegacyId = makeLegacyId(date, timeReturn || timeBorrow || "00:00", returnRecorder || recorderNickname, equipmentId, "return");
      let returnExists = false;

      if (!DRY_RUN) {
        const dupCheck = await db.collection("worklogs").where("_legacyId", "==", returnLegacyId).limit(1).get();
        returnExists = !dupCheck.empty;
      }

      if (returnExists) {
        stats.skipped++;
      } else {
        const returnDoc = {
          _legacyId:            returnLegacyId,
          _source:              "equipment-sheet-import",
          date:                 date,
          time:                 timeReturn || timeBorrow || "00:00",
          recipient:            recipient,
          dutyGroup:            "main",
          mainDuty:             "บริการอุปกรณ์",
          minorTask:            `คืน${eqLabel}`,
          comment:              `${equipmentId}${note ? ` — ${note}` : ""}`,
          equipment:            equipmentId,
          status:               "บันทึกแล้ว",
          employeeId:           returnUid || borrowerUid,
          employeeNickname:     returnRecorder || recorderNickname,
          employeeDisplayName:  returnDisplayName || borrowerDisplayName,
          equipmentCondition:   condition,
          equipmentNote:        note,
          locked:               true,
          createdAt:            admin.firestore.FieldValue.serverTimestamp(),
        };

        if (!DRY_RUN) {
          await db.collection("worklogs").add(returnDoc);
        } else {
          const condIcon = condition === "normal" ? "✅" : condition === "damaged" ? "⚠️" : "❌";
          console.log(`  [DRY] RETURN  ${date} ${timeReturn || "?"} ${equipmentId} → ${condIcon} ${condition}${note ? ` (${note})` : ""} (${returnRecorder || recorderNickname})`);
        }
        stats.returnLog++;
      }
    }

    // progress
    process.stdout.write(`  Progress: ${i + 1}/${dataRows.length}\r`);

    // small delay
    if (!DRY_RUN && i % 50 === 0 && i > 0) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n\n📊 Import Summary");
  console.log(`   Total rows processed : ${stats.total}`);
  console.log(`   Borrow worklogs      : ${stats.borrow}`);
  console.log(`   Return worklogs      : ${stats.returnLog}`);
  console.log(`   Skipped (duplicate)  : ${stats.skipped}`);
  console.log(`   Errors               : ${stats.errors}`);

  if (DRY_RUN) {
    console.log("\n💡 DRY RUN — ไม่มีการเปลี่ยนแปลงใด ๆ");
    console.log("   เพิ่ม --live เพื่อ apply จริง:\n");
    console.log(`   node import-equipment-log.js "${CSV_PATH}" --live\n`);
  } else {
    console.log("\n✅ Import complete — ตรวจสอบใน Firestore > worklogs\n");
  }

  process.exit(0);
}

main().catch(err => {
  console.error("\n❌ Import failed:", err.message);
  process.exit(1);
});
