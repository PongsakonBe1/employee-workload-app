// Import users from users.json to Firestore
const admin = require("firebase-admin");
const fs = require("fs");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function importUsers() {
  try {
    // อ่าน users.json
    const usersData = JSON.parse(fs.readFileSync("./users.json", "utf8"));

    console.log(`กำลัง import ${usersData.length} users...\n`);

    for (const user of usersData) {
      const docId = user.username;

      // ตรวจสอบว่ามีอยู่แล้วหรือไม่
      const existing = await db.collection("users").doc(docId).get();
      if (existing.exists) {
        console.log(`⏭️  Skipped (exists): ${user.username}`);
        continue;
      }

      const userData = {
        ...user,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: null,
        uid: docId,
      };

      await db.collection("users").doc(docId).set(userData);
      console.log(
        `✅ Created: ${user.username} (${user.email}) - ${user.role}`,
      );
    }

    console.log("\n🎉 Import เสร็จสิ้น!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

importUsers();
