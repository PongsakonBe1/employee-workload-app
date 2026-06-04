/**
 * Migrate worklogs from MongoDB to Firebase Firestore
 *
 * Prerequisites:
 * 1. Backend must be running (npm run dev หรือ npm start ใน backend/)
 * 2. Firebase serviceAccountKey.json must exist
 */

const admin = require("firebase-admin");
const fetch = require("node-fetch");

// Initialize Firebase Admin
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Backend API URL (adjust if needed)
const API_BASE = "http://localhost:4000/api";

async function migrateWorklogs() {
  console.log("\n📦 Starting MongoDB to Firestore migration...\n");

  try {
    // 1. Login to get JWT token (use MongoDB user, not Firestore)
    console.log("🔑 Authenticating with backend (MongoDB)...");
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: process.env.MONGO_ADMIN_USER || "admin",
        password: process.env.MONGO_ADMIN_PASSWORD || (() => { throw new Error("Set MONGO_ADMIN_PASSWORD env var"); })(),
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(
        `Login failed: ${loginResponse.status} ${loginResponse.statusText}`,
      );
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log("✅ Authenticated successfully\n");

    // 2. Get all worklogs from MongoDB with auth token
    console.log("📥 Fetching worklogs from MongoDB...");
    const response = await fetch(`${API_BASE}/worklogs?limit=10000`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Backend API error: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();
    const worklogs = result.items || result.worklogs || result;

    if (!Array.isArray(worklogs) || worklogs.length === 0) {
      console.log("⚠️ No worklogs found in MongoDB");
      return;
    }

    console.log(`✅ Found ${worklogs.length} worklogs in MongoDB\n`);

    // 2. Get all users from Firestore (to map employeeId)
    console.log("📥 Fetching users from Firestore...");
    const usersSnapshot = await db.collection("users").get();
    const usersMap = new Map();

    usersSnapshot.forEach((doc) => {
      const user = doc.data();
      // Map by email or create mapping from old ID
      usersMap.set(user.email, { uid: doc.id, ...user });
    });

    console.log(`✅ Found ${usersMap.size} users in Firestore\n`);

    // 3. Migrate each worklog
    console.log("🚀 Migrating worklogs to Firestore...\n");

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const worklog of worklogs) {
      try {
        // Create unique key for duplicate check (date + time + employee + minorTask)
        const legacyId =
          worklog._id?.toString() ||
          `${worklog.date}_${worklog.time}_${worklog.employeeNickname}_${worklog.minorTask}`;

        // Skip if already exists
        const existingQuery = await db
          .collection("worklogs")
          .where("_legacyId", "==", legacyId)
          .limit(1)
          .get();

        if (!existingQuery.empty) {
          skippedCount++;
          process.stdout.write(
            `⏭️  Skipped (already exists): ${legacyId.substring(0, 30)}...\r`,
          );
          continue;
        }

        // Map employee data - ensure no undefined values
        let employeeId = worklog.employeeId || "unknown";
        let employeeNickname = worklog.employeeNickname || "ไม่ระบุ";
        let employeeEmail = worklog.employeeEmail || null;

        // Try to find matching user in Firestore by email
        if (employeeEmail && usersMap.has(employeeEmail)) {
          const user = usersMap.get(employeeEmail);
          employeeId = user.uid;
          employeeNickname = user.nickname;
        }

        // Create Firestore document - no undefined values allowed
        const firestoreData = {
          _legacyId: legacyId,
          date: worklog.date || "",
          time: worklog.time || "00:00",
          recipient: worklog.recipient || "",
          dutyGroup: worklog.dutyGroup || "main",
          mainDuty: worklog.mainDuty || "ไม่ระบุ",
          minorTask: worklog.minorTask || "",
          comment: worklog.comment || "",
          status: worklog.status || "บันทึกแล้ว",
          employeeId: employeeId || "unknown",
          employeeNickname: employeeNickname || "ไม่ระบุ",
          employeeEmail: employeeEmail || null,
          locked: worklog.locked || false,
          // Convert MongoDB dates to Firestore timestamps
          createdAt: worklog.createdAt
            ? admin.firestore.Timestamp.fromDate(new Date(worklog.createdAt))
            : admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: worklog.updatedAt
            ? admin.firestore.Timestamp.fromDate(new Date(worklog.updatedAt))
            : null,
        };

        await db.collection("worklogs").add(firestoreData);
        successCount++;

        process.stdout.write(
          `✅ Migrated: ${successCount}/${worklogs.length}\r`,
        );

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (err) {
        errorCount++;
        console.error(`\n❌ Error migrating ${worklog._id}: ${err.message}`);
      }
    }

    // Summary
    console.log("\n\n📊 Migration Summary:");
    console.log(`  ✅ Successfully migrated: ${successCount}`);
    console.log(`  ⏭️  Skipped (duplicates): ${skippedCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📦 Total: ${worklogs.length}\n`);

    if (successCount > 0) {
      console.log("🎉 Migration completed successfully!");
      console.log("   Check Firestore Database to see the imported data.\n");
    }
  } catch (err) {
    console.error("\n❌ Migration failed:", err.message);
    console.error("\nTroubleshooting:");
    console.error(
      "  1. Make sure backend is running: cd backend && npm run dev",
    );
    console.error("  2. Check API_BASE URL in this script");
    console.error("  3. Verify serviceAccountKey.json exists\n");
    process.exit(1);
  }
}

// Run migration
migrateWorklogs();
