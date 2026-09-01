/**
 * Seed script: เพิ่มอุปกรณ์ทั้งหมดลง Firestore collection "equipmentItems"
 * 
 * Usage:
 *   cd firebase/seed-data
 *   node seed-equipment-items.js
 * 
 * อุปกรณ์ทั้งหมด 29 รายการ:
 *   - หูฟัง ICIT01–ICIT12 (ห้องบริการชั้น 3)
 *   - หูฟัง ICIT13–ICIT20 (ห้อง Finn ชั้น 4)
 *   - ปลั๊กไฟ ICIT21–ICIT23 (ห้องบริการชั้น 3)
 *   - ปลั๊กไฟ ICIT24–ICIT25 (ห้อง Finn ชั้น 4)
 *   - USB ICIT26–ICIT29 (ห้องบริการชั้น 3)
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");

// Init Firebase Admin
const serviceAccountPath = path.join("C:", "Users", "Admin", "Downloads", "labboy-workload-app-firebase-adminsdk-fbsvc-b679ced080.json");
let app;
try {
  app = initializeApp({ credential: cert(require(serviceAccountPath)) });
} catch (e) {
  // fallback: ถ้าไม่มี service account ให้ใช้ default (gcloud auth)
  app = initializeApp();
}
const db = getFirestore(app);

const items = [
  // === หูฟัง — ห้องบริการชั้น 3 (ICIT01–ICIT12) ===
  ...Array.from({ length: 12 }, (_, i) => ({
    name: `ICIT${String(i + 1).padStart(2, "0")}`,
    minorTask: "ยืมหูฟัง",
    location: "ห้องบริการชั้น 3",
    active: true,
    order: i + 1,
  })),

  // === หูฟัง — ห้อง Finn ชั้น 4 (ICIT13–ICIT20) ===
  ...Array.from({ length: 8 }, (_, i) => ({
    name: `ICIT${String(i + 13).padStart(2, "0")}`,
    minorTask: "ยืมหูฟัง",
    location: "ห้องบริการชั้น 4 (Finn)",
    active: true,
    order: i + 13,
  })),

  // === ปลั๊กไฟ — ห้องบริการชั้น 3 (ICIT21–ICIT23) ===
  ...Array.from({ length: 3 }, (_, i) => ({
    name: `ICIT${21 + i}`,
    minorTask: "ยืมปลั๊กไฟ",
    location: "ห้องบริการชั้น 3",
    active: true,
    order: 21 + i,
  })),

  // === ปลั๊กไฟ — ห้อง Finn ชั้น 4 (ICIT24–ICIT25) ===
  ...Array.from({ length: 2 }, (_, i) => ({
    name: `ICIT${24 + i}`,
    minorTask: "ยืมปลั๊กไฟ",
    location: "ห้องบริการชั้น 4 (Finn)",
    active: true,
    order: 24 + i,
  })),

  // === USB — ห้องบริการชั้น 3 (ICIT26–ICIT29) ===
  ...Array.from({ length: 4 }, (_, i) => ({
    name: `ICIT${26 + i}`,
    minorTask: "ยืม USB",
    location: "ห้องบริการชั้น 3",
    active: true,
    order: 26 + i,
  })),
];

async function seed() {
  const collRef = db.collection("equipmentItems");

  // ตรวจสอบว่ามีข้อมูลอยู่แล้วหรือไม่
  const existing = await collRef.limit(1).get();
  if (!existing.empty) {
    console.log("⚠️  equipmentItems collection มีข้อมูลอยู่แล้ว — ข้ามการ seed");
    console.log("   หากต้องการ seed ใหม่ ให้ลบ collection เดิมก่อน");
    process.exit(0);
  }

  const batch = db.batch();
  const now = new Date();

  items.forEach((item) => {
    const ref = collRef.doc(); // auto-generated ID
    batch.set(ref, {
      ...item,
      createdAt: now,
      updatedAt: now,
      createdBy: "seed-script",
    });
  });

  await batch.commit();
  console.log(`✅ Seed สำเร็จ — เพิ่มอุปกรณ์ ${items.length} รายการ`);
  console.log("   หูฟัง:    ICIT01–ICIT20 (12 ชั้น3 + 8 Finn)");
  console.log("   ปลั๊กไฟ:  ICIT21–ICIT25 (3 ชั้น3 + 2 Finn)");
  console.log("   USB:      ICIT26–ICIT29 (4 ชั้น3)");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
