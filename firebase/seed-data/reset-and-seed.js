// ============================================================================
// RESET & SEED SCRIPT - ลบ users ทั้งหมดและสร้างใหม่
// ============================================================================
// 
// วิธีใช้:
// 1. ไปที่ Firebase Console > Authentication > Users
// 2. ลบทุก user ออกให้หมด
// 3. ไปที่ Firestore Database > users
// 4. ลบทุก document ใน collection users
// 5. Login ด้วย email ที่ต้องการผ่านหน้าเว็บ
// 6. เอา UID ที่ได้มาใส่ในข้อมูลด้านล่าง
// 7. รัน Firebase Admin SDK หรือสร้างด้วยตนเองใน Console
//
// ============================================================================

// ข้อมูล Users ที่ต้องสร้างใหม่
const USERS_DATA = [
  {
    // User 1: pongsagon.r@icit.kmutnb.ac.th -> STAFF
    // ต้อง login ก่อนเพื่อได้ UID จริง แล้วเอามาใส่ตรงนี้
    uid: "UID_FROM_FIREBASE_AUTH_1", // เปลี่ยนเป็น UID จริง
    email: "pongsagon.r@icit.kmutnb.ac.th",
    fullName: "Pongsagon Rawangwong",
    nickname: "พงศกร",
    username: "pongsagon.r",
    role: "staff", // เปลี่ยนเป็น staff ตามที่ต้องการ
    active: true,
    lastLoginAt: null,
  },
  {
    // User 2: pongsagon.be1@gmail.com -> SUPERADMIN
    // ต้อง login ก่อนเพื่อได้ UID จริง แล้วเอามาใส่ตรงนี้
    uid: "UID_FROM_FIREBASE_AUTH_2", // เปลี่ยนเป็น UID จริง
    email: "pongsagon.be1@gmail.com",
    fullName: "Pongsagon Rawangwong",
    nickname: "แม็ก (Super Admin)",
    username: "superAdmin",
    role: "superadmin",
    active: true,
    lastLoginAt: null,
  }
];

// ============================================================================
// ขั้นตอนการทำงานแบบละเอียด
// ============================================================================

console.log(`
========================================
RESET & SEED USERS - คำแนะนำ
========================================

ขั้นตอนที่ 1: ลบข้อมูลเก่า
-----------------------------
1. Firebase Console > Authentication > Users
   - ลบทุก user ออกให้หมด
   
2. Firestore Database > users
   - ลบทุก document ใน collection นี้

3. Firestore Database > pendingUsers (ถ้ามี)
   - ลบทุก document ออกให้หมด


ขั้นตอนที่ 2: Deploy Firestore Rules ใหม่
-----------------------------------------
ตรวจสอบว่า rules ปัจจุบันอนุญาตให้:
- ทุกคนอ่าน users ได้
- สร้าง users ได้

ถ้ายังไม่ได้ Deploy ให้รัน:
  cd firebase
  firebase deploy --only firestore:rules


ขั้นตอนที่ 3: Login ครั้งแรกเพื่อได้ UID
---------------------------------------
1. รีเฟรชหน้าเว็บ http://localhost:3000
2. กด "เข้าสู่ระบบด้วย Google"
3. เลือกบัญชี pongsagon.r@icit.kmutnb.ac.th
4. ถ้า AuthProvider ทำงานถูกต้อง จะสร้าง user อัตโนมัติ
   (แต่จะเป็น pending ถ้าเป็น ICIT email)
   
   *** ถ้าเป็น Gmail (pongsagon.be1@gmail.com) ***
   AuthProvider จะสร้าง user ให้อัตโนมัติเป็น superadmin
   ไม่ต้องรออนุมัติ!

5. ไปดูที่ Firebase Console > Authentication > Users
   - จะเห็น UID ของ user ที่เพิ่งสร้าง
   - Copy UID นี้


ขั้นตอนที่ 4: ตรวจสอบ/แก้ไขข้อมูลใน Firestore
----------------------------------------------
ไปที่ Firestore Database > users > {UID}
ตรวจสอบว่ามี field ครบ:
  - active: true
  - email: "..."
  - fullName: "..."
  - nickname: "..."
  - role: "staff" หรือ "superadmin"
  - uid: "..."
  - username: "..."


ขั้นตอนที่ 5: ทดสอบ
--------------------
1. รีเฟรชหน้าเว็บ
2. ลอง login อีกครั้ง
3. ถ้ายัง error ให้ดู Console ว่า error จาก collection ไหน


========================================
TROUBLESHOOTING - แก้ปัญหาเฉพาะหน้า
========================================

ปัญหา: "Missing or insufficient permissions"
-------------------------------------------
สาเหตุที่เป็นไปได้:
1. Firestore Rules ยังไม่ได้ Deploy
   -> Deploy ใหม่
   
2. isAdmin() หรือ isSuperAdmin() ไปอ่าน users collection
   แต่ user ยังไม่มี permission อ่าน
   -> แก้ rules ให้อ่าน users ได้ทั้งหมดก่อน
   
3. User ยังไม่มี document ใน Firestore
   -> ต้องสร้าง document ก่อน หรือให้ AuthProvider สร้างอัตโนมัติ


ปัญหา: "Permission denied on worklogs"
---------------------------------------
-> แก้ rules ให้ allow read: if isAuthenticated();


ปัญหา: "Cannot read users collection"
-------------------------------------
-> แก้ rules ให้ allow read: if isAuthenticated();


========================================
FIRESTORE RULES ที่แนะนำ (ชั่วคราว)
========================================

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ทุกคนอ่านได้ (ชั่วคราว)
    match /{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}

*** ใช้ชั่วคราวเท่านั้น แล้วค่อยเปลี่ยนกลับ ***
`);


// ============================================================================
// FIREBASE ADMIN SDK CODE (ถ้าติดตั้ง CLI)
// ============================================================================
/*
const admin = require('firebase-admin');

async function resetAndSeed() {
  const db = admin.firestore();
  const auth = admin.auth();
  
  console.log('1. ลบ users ทั้งหมดใน Authentication...');
  const listUsers = await auth.listUsers();
  for (const user of listUsers.users) {
    await auth.deleteUser(user.uid);
    console.log('  ลบ:', user.email);
  }
  
  console.log('2. ลบ documents ทั้งหมดใน Firestore...');
  const usersSnap = await db.collection('users').get();
  for (const doc of usersSnap.docs) {
    await doc.ref.delete();
    console.log('  ลบ users/', doc.id);
  }
  
  const pendingSnap = await db.collection('pendingUsers').get();
  for (const doc of pendingSnap.docs) {
    await doc.ref.delete();
    console.log('  ลบ pendingUsers/', doc.id);
  }
  
  console.log('3. สร้าง users ใหม่...');
  for (const userData of USERS_DATA) {
    // สร้างใน Authentication
    const userRecord = await auth.createUser({
      email: userData.email,
      displayName: userData.fullName,
    });
    
    // สร้างใน Firestore
    await db.collection('users').doc(userRecord.uid).set({
      ...userData,
      uid: userRecord.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log('  สร้าง:', userData.email, '->', userRecord.uid);
  }
  
  console.log('เสร็จสิ้น!');
}

resetAndSeed().catch(console.error);
*/
