// Script สำหรับย้ายข้อมูลจาก user เก่า (UID เก่า) ไปยัง user ใหม่ (UID ใหม่)
// ใช้ในกรณีที่ login ด้วย Google แล้วได้ UID ใหม่
// 
// วิธีใช้:
// 1. ให้ user login ด้วย Google ก่อน (เพื่อให้ระบบสร้าง user ใหม่)
// 2. ดู UID ใหม่จาก console log หรือ Firebase Console > Authentication
// 3. แก้ไขค่า OLD_UID และ NEW_UID ในไฟล์นี้
// 4. รันผ่าน Firebase Console > Firestore > Data (import/export) หรือใช้ Admin SDK

const admin = require('firebase-admin');

// ==========================================
// กำหนดค่าที่ต้องเปลี่ยน
// ==========================================

const OLD_UID = "iZYs1jxTJoRl8wFS7Q2u1vPfRPl1";  // UID เก่า (จาก seed)
const NEW_UID = "XXXXXXXXXXXXXXXXXXXXXXXXXXXX";  // UID ใหม่ (จาก Google login) <-- แก้ตรงนี้

const USER_EMAIL = "pongsagon.r@icit.kmutnb.ac.th";  // Email ของ user

// ==========================================
// ฟังก์ชันย้ายข้อมูล
// ==========================================

async function migrateUserData() {
  const db = admin.firestore();
  
  console.log(`[Migrate] เริ่มย้ายข้อมูลจาก ${OLD_UID} ไป ${NEW_UID}`);
  
  // 1. ย้าย worklogs
  const worklogsSnapshot = await db.collection('worklogs')
    .where('employeeId', '==', OLD_UID)
    .get();
    
  console.log(`[Migrate] พบ ${worklogsSnapshot.size} worklogs`);
  
  const batch = db.batch();
  
  worklogsSnapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      employeeId: NEW_UID,
      migratedFrom: OLD_UID,
      migratedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  
  // 2. ลบ user เก่า (ถ้าต้องการ)
  // const oldUserRef = db.collection('users').doc(OLD_UID);
  // batch.delete(oldUserRef);
  
  // 3. อัพเดต user ใหม่ให้มีข้อมูลครบ
  const newUserRef = db.collection('users').doc(NEW_UID);
  batch.update(newUserRef, {
    migratedFrom: OLD_UID,
    previousWorklogs: worklogsSnapshot.size,
  });
  
  await batch.commit();
  
  console.log(`[Migrate] ย้ายข้อมูลสำเร็จ!`);
  console.log(`[Migrate] - Worklogs ที่ย้าย: ${worklogsSnapshot.size}`);
  console.log(`[Migrate] - User ใหม่: ${NEW_UID}`);
  console.log(`[Migrate] - User เก่า: ${OLD_UID} (ยังคงอยู่ ต้องลบเองถ้าต้องการ)`);
}

// ==========================================
// วิธีใช้งานจริง (ไม่ต้องใช้ Admin SDK)
// ==========================================

console.log("=== คำแนะนำการย้ายข้อมูล User ===\n");

console.log("วิธีที่ 1: ใช้ Firebase Console (ง่ายสุด)");
console.log("1. ให้ user login ด้วย Google (pongsagon.r@icit.kmutnb.ac.th)");
console.log("2. ไปที่ Firebase Console > Authentication > Users");
console.log("3. หา email pongsagon.r แล้ว copy UID ใหม่");
console.log("4. ไปที่ Firestore Database > worklogs");
console.log("5. สร้าง query: where employeeId == [OLD_UID]");
console.log("6. Export เป็น JSON");
console.log("7. แก้ไข JSON เปลี่ยน employeeId จาก OLD_UID เป็น NEW_UID");
console.log("8. Import กลับเข้าไป\n");

console.log("วิธีที่ 2: ใช้ Firebase Admin SDK (ถ้ามี)");
console.log("- แก้ไข NEW_UID ในไฟล์นี้");
console.log("- รันด้วย Node.js: node migrate-user-data.js\n");

console.log("วิธีที่ 3: ปล่อยให้ระบบทำงานแบบใหม่ (แนะนำ)");
console.log("- ไม่ต้องย้ายข้อมูลเก่า");
console.log("- ให้ user สร้าง worklogs ใหม่");
console.log("- ข้อมูลเก่าอยู่ในระบบแต่ไม่ได้ใช้ (archive)\n");

console.log("=== ข้อมูลที่ต้องใช้ ===");
console.log(`OLD_UID (UID เก่าจาก seed): ${OLD_UID}`);
console.log("NEW_UID (UID ใหม่จาก Google): ดูได้จาก Firebase Console > Authentication");
console.log(`Email: ${USER_EMAIL}\n`);

// migrateUserData().catch(console.error);
