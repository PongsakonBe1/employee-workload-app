// Script สร้าง Staff User ใน Firestore
const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
});

const db = admin.firestore();

async function createStaff() {
  try {
    // ข้อมูล Staff (แก้ไขตามจริง)
    // หา UID จริงจาก Firebase Console > Authentication > Users
    const uid = process.argv[2] || "pongsagon.r"; // รับ UID จาก command line
    const staffData = {
      email: "pongsagon.r@icit.kmutnb.ac.th",
      role: "staff",
      active: true,
      displayName: "พงศกร",
      fullName: "พงศกร ราวังวง",
      nickname: "แม็ก",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: "pongsakon.be1@gmail.com",
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("users").doc(uid).set(staffData);

    console.log("✅ Staff user created successfully!");
    console.log("UID:", uid);
    console.log("Email:", staffData.email);
    console.log("Role:", staffData.role);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createStaff();
