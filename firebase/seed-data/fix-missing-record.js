/**
 * fix-missing-record.js
 * เพิ่ม 1 record ที่ถูก skip เพราะวันที่ typo 16/7/2052 → แก้เป็น 16/7/2025
 * ICIT02 | กรวิทย์ | ปีงบ 2568
 */

const admin = require("firebase-admin");
const path = require("path");

admin.initializeApp({
  credential: admin.credential.cert(
    require(path.join(__dirname, "serviceAccountKey.json"))
  ),
});
const db = admin.firestore();

async function main() {
  const doc = {
    date: "2025-07-16",
    createdAt: admin.firestore.Timestamp.fromDate(new Date("2025-07-16T00:00:00+07:00")),
    minorTask: "คืนหูฟัง",
    comment: "[นำเข้า CSV] ICIT02 024467AK00014",
    equipment: "ICIT02",
    equipmentBarcode: "024467AK00014",
    equipmentCondition: "normal",
    equipmentNote: null,
    employeeDisplayName: "กรวิทย์",
    returnedBy: "กรวิทย์",
    studentId: "",
    borrowTime: "",
    returnTime: "",
    source: "csv_import",
    fiscalYear: "2568",
    importedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await db.collection("worklogs").add(doc);
  console.log("✅ เพิ่ม record สำเร็จ — ID:", ref.id);
  console.log("   date:", doc.date, "| equipment:", doc.equipment, "| staff:", doc.employeeDisplayName);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
