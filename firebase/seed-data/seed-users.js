// Seed script สำหรับสร้าง users ใน Firestore
// รันผ่าน Firebase Console หรือใช้ Firebase Admin SDK

// ==========================================
// ข้อมูล User ที่ต้องสร้าง
// ==========================================

const USERS_TO_SEED = [
  {
    // 1. pongsagon.r@icit.kmutnb.ac.th - เป็น staff
    docId: "pongsagon.r", // หรือ UID จริงจาก Firebase Auth
    data: {
      active: true,
      createdAt: new Date(),
      email: "pongsagon.r@icit.kmutnb.ac.th",
      displayName: "พงศกร", // ชื่อที่แสดง (ให้พนักงานแก้เองหลัง login)
      fullName: "Pongsagon Rawangwong",
      lastLoginAt: null,
      nickname: "พงศกร",
      role: "staff",
      uid: "pongsagon.r",
      username: "pongsagon.r",
    },
  },
  {
    // 2. kanok.b@icit.kmutnb.ac.th - superadmin
    docId: "kanok.b", // หรือ UID จริงจาก Firebase Auth
    data: {
      active: true,
      createdAt: new Date(),
      email: "kanok.b@icit.kmutnb.ac.th",
      displayName: "กนก", // ชื่อที่แสดง
      fullName: "Kanok Boonpanjantee",
      lastLoginAt: null,
      nickname: "กนก",
      role: "superadmin",
      uid: "kanok.b",
      username: "kanok.b",
    },
  },
  // หมายเหตุ: staff คนอื่นๆ ให้สร้างผ่านหน้า "จัดการผู้ใช้" หรือ import จาก users.json
];

// ==========================================
// วิธีการใช้งาน (Firebase Console)
// ==========================================

console.log("=== คำแนะนำการสร้าง/อัพเดต Users ===\n");

console.log("1. สำหรับ pongsagon.r@icit.kmutnb.ac.th (staff):");
console.log("   - Firestore Console > users > iZYs1jxTJoRl8wFS7Q2u1vPfRPl1");
console.log("   - แก้ไข field: role = 'staff' (จาก 'admin')");
console.log("   - ค่าอื่นๆ คงเดิม\n");

console.log("2. สำหรับ pongsagon.be1@gmail.com (superadmin):");
console.log("   วิธีที่ 1: ให้ AuthProvider สร้างอัตโนมัติ (แนะนำ)");
console.log("   - ลบ user ใน Authentication (ถ้ามี)");
console.log("   - ลบ document ใน Firestore users (ถ้ามี)");
console.log("   - รีเฟรชหน้าเว็บ > Login ด้วย Google");
console.log("   - AuthProvider จะสร้าง user ใหม่อัตโนมัติ\n");

console.log("   วิธีที่ 2: สร้างด้วยตนเองใน Firebase Console");
console.log("   - Authentication > Add user");
console.log("   - Email: pongsagon.be1@gmail.com");
console.log("   - ตั้งรหัสผ่าน > Copy UID ที่ได้");
console.log("   - Firestore > users > สร้าง document ด้วย UID นั้น");
console.log("   - ใส่ข้อมูลตามด้านล่าง:\n");

console.log("   ข้อมูลที่ต้องใส่:");
console.log("   - active: true (boolean)");
console.log("   - createdAt: [timestamp]");
console.log("   - email: 'pongsagon.be1@gmail.com' (string)");
console.log("   - fullName: 'Pongsagon Rawangwong' (string)");
console.log("   - lastLoginAt: null (null)");
console.log("   - nickname: 'แม็ก (Super Admin)' (string)");
console.log("   - role: 'superadmin' (string)");
console.log("   - uid: [UID เดียวกับ Document ID] (string)");
console.log("   - username: 'superAdmin' (string)\n");

// ==========================================
// Firebase Admin SDK (ถ้าติดตั้ง CLI)
// ==========================================
/*
const admin = require('firebase-admin');

async function seedUsers() {
  // อัพเดต pongsagon.r เป็น staff
  await admin.firestore().doc('users/iZYs1jxTJoRl8wFS7Q2u1vPfRPl1').update({
    role: 'staff'
  });
  
  console.log('อัพเดต pongsagon.r เป็น staff สำเร็จ');
  
  // สร้าง superadmin ใหม่
  const userRecord = await admin.auth().createUser({
    email: 'pongsagon.be1@gmail.com',
    displayName: 'Pongsagon Rawangwong',
  });
  
  await admin.firestore().doc(`users/${userRecord.uid}`).set({
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    email: 'pongsagon.be1@gmail.com',
    fullName: 'Pongsagon Rawangwong',
    lastLoginAt: null,
    nickname: 'แม็ก (Super Admin)',
    role: 'superadmin',
    uid: userRecord.uid,
    username: 'superAdmin',
  });
  
  console.log('สร้าง superadmin สำเร็จ:', userRecord.uid);
}

seedUsers().catch(console.error);
*/

console.log("=== หมายเหตุสำคัญ ===");
console.log("- pongsagon.r: ต้องอัพเดต role เป็น staff ใน Firestore");
console.log("- pongsagon.be1: ต้อง deploy Firestore Rules ใหม่ก่อน login");
console.log(
  "- ถ้าเจอ 'Missing or insufficient permissions' -> Deploy Rules ใหม่",
);
