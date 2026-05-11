// Script สำหรับอัพเดต users ใน Firestore
// รันผ่าน Firebase Console > Firestore Database > หรือใช้ Firebase Admin SDK

// ==========================================
// ขั้นตอนการใช้งาน:
// 1. ไปที่ Firebase Console > Firestore Database > Data
// 2. หา document: users/iZYs1jxTJoRl8wFS7Q2u1vPfRPl1
// 3. แก้ไข role จาก "admin" เป็น "staff"
// 4. สร้าง document ใหม่สำหรับ superadmin
// ==========================================

// ข้อมูลที่ต้องอัพเดต:
const updates = {
  // 1. อัพเดต pongsagon.r เป็น staff
  existingUser: {
    docId: "iZYs1jxTJoRl8wFS7Q2u1vPfRPl1",
    changes: {
      role: "staff", // เปลี่ยนจาก "admin" เป็น "staff"
      // ค่าอื่นๆ คงเดิม
    },
  },

  // 2. สร้าง superadmin ใหม่ (ต้อง login ด้วย Gmail ก่อนเพื่อได้ UID)
  // รูปแบบเดียวกับ users อื่นในระบบ
  newSuperAdmin: {
    email: "pongsagon.be1@gmail.com",
    fullName: "Pongsagon Rawangwong",
    nickname: "พงศกร",
    role: "superadmin",
    active: true,
    createdAt: new Date(),
    lastLoginAt: null,
    // uid: จะได้จาก Firebase Auth หลังสร้าง user
    // username: ไม่มี (เพราะเป็น Gmail ไม่ใช่ ICIT account)
  },
};

// ==========================================
// วิธีการสร้าง SuperAdmin (รูปแบบเดียวกับ users อื่น):
// ==========================================

// วิธีที่ 1: ใช้ Firebase Console (แนะนำ)
/*
ขั้นตอนที่ 1: สร้าง User ใน Authentication
1. ไปที่ Firebase Console > Authentication > Users
2. กด "Add user"
3. ใส่ email: pongsagon.be1@gmail.com
4. ตั้งรหัสผ่านชั่วคราว (จะได้ UID มา เช่น AbCdEfGhIjKlMnOpQrStUvWxYz123)
5. กด "Add user"

ขั้นตอนที่ 2: สร้าง Document ใน Firestore
1. ไปที่ Firestore Database > users
2. กด "Start collection" (ถ้ายังไม่มี) หรือ "Add document"
3. Document ID: ใส่ UID ที่ได้จากขั้นตอนที่ 1 (เช่น AbCdEfGhIjKlMnOpQrStUvWxYz123)
4. ใส่ข้อมูลฟิลด์ตามด้านล่างนี้:
*/

const superAdminData = {
  // Field: active (boolean)
  active: true,

  // Field: createdAt (timestamp)
  // ใน Console เลือก type: Timestamp, ค่า: now
  createdAt: new Date(),

  // Field: email (string)
  email: "pongsagon.be1@gmail.com",

  // Field: fullName (string)
  fullName: "Pongsagon Rawangwong",

  // Field: lastLoginAt (null)
  // type: Null, ค่า: null
  lastLoginAt: null,

  // Field: nickname (string)
  nickname: "พงศกร",

  // Field: role (string)
  role: "superadmin",

  // Field: uid (string)
  // ค่าเดียวกับ Document ID (เช่น AbCdEfGhIjKlMnOpQrStUvWxYz123)
  uid: "[UID_FROM_FIREBASE_AUTH]",

  // Field: username (string) - ไม่มีสำหรับ Gmail
  // สามารถเว้นว่างหรือใช้ส่วนหน้าของ email
  username: "pongsagon.be1", // หรือปล่อย null
};

// วิธีที่ 2: ใช้ Firebase Admin SDK (ถ้าติดตั้ง CLI)
/*
const admin = require('firebase-admin');

// สร้าง user ใหม่
admin.auth().createUser({
  email: 'pongsagon.be1@gmail.com',
  displayName: 'Pongsagon Rawangwong',
}).then((userRecord) => {
  console.log('Created user:', userRecord.uid);
  
  // สร้าง document ใน Firestore
  return admin.firestore().doc(`users/${userRecord.uid}`).set({
    email: 'pongsagon.be1@gmail.com',
    fullName: 'Pongsagon Rawangwong',
    nickname: 'พงศกร',
    role: 'superadmin',
    active: true,
    uid: userRecord.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});
*/

// ==========================================
// คำสั่งที่ต้องรันใน Firestore Console:
// ==========================================

// 1. อัพเดต existing user เป็น staff:
// db.collection("users").doc("iZYs1jxTJoRl8wFS7Q2u1vPfRPl1").update({
//   role: "staff"
// });

// 2. สร้าง superadmin (หลังจากสร้าง user ใน Authentication แล้ว):
// เอา UID ที่ได้มาใส่แทน [UID_FROM_AUTH]
// db.collection("users").doc("[UID_FROM_AUTH]").set({
//   email: "pongsagon.be1@gmail.com",
//   fullName: "Pongsagon Rawangwong",
//   nickname: "พงศกร",
//   role: "superadmin",
//   active: true,
//   createdAt: firebase.firestore.FieldValue.serverTimestamp()
// });

console.log("ดูคำแนะนำในไฟล์นี้เพื่ออัพเดตข้อมูลผู้ใช้");
