/**
 * mark-icit02-damaged.js
 * 
 * บันทึก worklog "คืนหูฟัง ICIT02 — ชำรุด" วันนี้เข้า Firestore
 * เพื่อให้ SmartEquipmentModal แสดงสถานะ "ยืมไม่ได้ — ชำรุด"
 * 
 * Usage:
 *   cd firebase/seed-data
 *   Set GCLOUD_PROJECT=labboy-workload-app and GOOGLE_APPLICATION_CREDENTIALS
 *   to an absolute credential path outside Git before running this write utility.
 *   node mark-icit02-damaged.js
 */

const path = require("node:path");
const projectId = "labboy-workload-app";
const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
const relativeCredential = path.relative(path.resolve(__dirname, "../.."), path.resolve(credentialPath));
const outsideRepository = relativeCredential === ".." || relativeCredential.startsWith(".." + path.sep) || path.isAbsolute(relativeCredential);
// Fail before SDK initialization; never silently select the old key or a default project.
if (process.env.GCLOUD_PROJECT !== projectId || !path.isAbsolute(credentialPath) || !outsideRepository) {
  throw new Error("Set the explicit GCLOUD_PROJECT and an absolute GOOGLE_APPLICATION_CREDENTIALS path outside Git before running this one-off write utility");
}
const admin = require("firebase-admin");
admin.initializeApp({ projectId, credential: admin.credential.applicationDefault() });
const db = admin.firestore();

async function main() {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-CA"); // YYYY-MM-DD local
  const timeStr = today.toTimeString().slice(0, 5);  // HH:MM local

  const record = {
    date:                dateStr,
    time:                timeStr,
    minorTask:           "คืนหูฟัง",
    comment:             "ICIT02 — ชำรุดตั้งแต่ 1/10/2025 ยังไม่ได้ซ่อม",
    equipment:           "ICIT02",
    equipmentCondition:  "damaged",
    equipmentNote:       "สายน่าจะหัก",
    mainDuty:            "บริการอุปกรณ์",
    dutyGroup:           "main",
    recipient:           "",
    status:              "บันทึกแล้ว",
    employeeNickname:    "admin",
    employeeDisplayName: "Admin",
    locked:              true,
    _source:             "manual-admin-entry",
    createdAt:           admin.firestore.FieldValue.serverTimestamp(),
  };

  console.log("\n📋 จะเพิ่ม record นี้เข้า Firestore:");
  console.log(`   date:               ${record.date}`);
  console.log(`   time:               ${record.time}`);
  console.log(`   minorTask:          ${record.minorTask}`);
  console.log(`   equipment:          ${record.equipment}`);
  console.log(`   equipmentCondition: ${record.equipmentCondition}`);
  console.log(`   equipmentNote:      ${record.equipmentNote}`);
  console.log(`   comment:            ${record.comment}\n`);

  const ref = await db.collection("worklogs").add(record);
  console.log(`✅ บันทึกสำเร็จ — Document ID: ${ref.id}`);
  console.log(`\n🔒 ICIT02 จะแสดง "ยืมไม่ได้ — ชำรุด" ใน SmartEquipmentModal ทันที\n`);

  process.exit(0);
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
