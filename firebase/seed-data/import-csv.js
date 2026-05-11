/**
 * Import worklogs from CSV to Firebase Firestore
 * CSV format: วันที่,เวลา,ผู้ให้บริการ,ผู้รับบริการ,หัวข้อหลัก,หัวข้อรอง,Comment,สถานะ
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Map Thai nickname to username/email
const nicknameMap = {
  เปรมปรีดี: {
    username: "prampreedee.y",
    email: "prampreedee.y@icit.kmutnb.ac.th",
  },
  กรวิทย์: { username: "korawit.k", email: "korawit.k@icit.kmutnb.ac.th" },
  กฤตยชญ์: { username: "krittayot.s", email: "krittayot.s@icit.kmutnb.ac.th" },
  ธนกฤต: { username: "thanakit.s", email: "thanakit.s@icit.kmutnb.ac.th" },
  เทอดศักดิ์: { username: "thoedsak.w", email: "thoedsak.w@icit.kmutnb.ac.th" },
  เพียงธาร: { username: "piengtarn.k", email: "piengtarn.k@icit.kmutnb.ac.th" },
  ปิยพงษ์: { username: "piyapong.t", email: "piyapong.t@icit.kmutnb.ac.th" },
  กฤตยศ: { username: "krittayot.s", email: "krittayot.s@icit.kmutnb.ac.th" },
};

// Parse Thai date (D/M/YYYY) to ISO format (YYYY-MM-DD)
function parseThaiDate(dateStr) {
  if (!dateStr) return "";
  const [day, month, year] = dateStr.split("/");
  if (!day || !month || !year) return "";
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

// Parse time to HH:MM format
function parseTime(timeStr) {
  if (!timeStr) return "00:00";
  const [hours, minutes] = timeStr.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

async function importCSV() {
  console.log("\n📄 Starting CSV import to Firestore...\n");

  // Read CSV file
  const csvPath =
    process.argv[2] ||
    "C:\\Users\\ICIT-Admin\\Downloads\\แบบบันทึกปริมาณงานช่างเทคนิค - Main.csv";

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`);
    console.log("\nUsage: node import-csv.js [path-to-csv-file]");
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n");

  // Skip header rows (rows 1-3 are headers)
  const dataRows = lines.slice(3).filter((line) => line.trim());

  console.log(`📊 Found ${dataRows.length} records to import\n`);

  // Get users from Firestore for mapping
  console.log("📥 Fetching users from Firestore...");
  const usersSnapshot = await db.collection("users").get();
  const usersMap = new Map();

  usersSnapshot.forEach((doc) => {
    const user = doc.data();
    usersMap.set(user.email, { uid: doc.id, ...user });
    usersMap.set(user.nickname, { uid: doc.id, ...user });
    usersMap.set(user.username, { uid: doc.id, ...user });
  });

  console.log(`✅ Found ${usersMap.size} users\n`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const columns = row.split(",");

    try {
      // Parse columns
      const rawDate = columns[0]?.trim();
      const rawTime = columns[1]?.trim();
      const employeeNickname = columns[2]?.trim();
      const recipient = columns[3]?.trim();
      const mainDuty = columns[4]?.trim();
      const minorTask = columns[5]?.trim();
      const comment = columns[6]?.trim();
      const status = columns[7]?.trim() || "บันทึกแล้ว";

      // Skip if empty
      if (!rawDate || !employeeNickname) {
        skippedCount++;
        continue;
      }

      // Parse date and time
      const date = parseThaiDate(rawDate);
      const time = parseTime(rawTime);

      // Find employee
      let employeeId = "unknown";
      let employeeEmail = null;

      const mapped = nicknameMap[employeeNickname];
      if (mapped) {
        const user =
          usersMap.get(mapped.email) || usersMap.get(mapped.nickname);
        if (user) {
          employeeId = user.uid;
          employeeEmail = user.email;
        }
      } else {
        // Try direct lookup
        const user = usersMap.get(employeeNickname);
        if (user) {
          employeeId = user.uid;
          employeeEmail = user.email;
        }
      }

      // Create unique ID
      const legacyId =
        `${date}_${time}_${employeeNickname}_${mainDuty || "task"}`.replace(
          /[^a-zA-Z0-9_-]/g,
          "_",
        );

      // Check for duplicates
      const existingQuery = await db
        .collection("worklogs")
        .where("_legacyId", "==", legacyId)
        .limit(1)
        .get();

      if (!existingQuery.empty) {
        skippedCount++;
        process.stdout.write(
          `⏭️  Skipped (duplicate): ${legacyId.substring(0, 30)}...\r`,
        );
        continue;
      }

      // Create document
      const firestoreData = {
        _legacyId: legacyId,
        _source: "csv-import",
        date: date,
        time: time,
        recipient: recipient || "",
        dutyGroup: "main",
        mainDuty: mainDuty || "ไม่ระบุ",
        minorTask: minorTask || "",
        comment: comment || "",
        status: status,
        employeeId: employeeId,
        employeeNickname: employeeNickname,
        employeeEmail: employeeEmail,
        locked: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: null,
      };

      await db.collection("worklogs").add(firestoreData);
      successCount++;

      process.stdout.write(`✅ Imported: ${successCount}/${dataRows.length}\r`);

      // Small delay
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (err) {
      errorCount++;
      console.error(`\n❌ Error at row ${i + 4}: ${err.message}`);
    }
  }

  // Summary
  console.log("\n\n📊 Import Summary:");
  console.log(`  ✅ Successfully imported: ${successCount}`);
  console.log(`  ⏭️  Skipped (duplicates/empty): ${skippedCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  📦 Total processed: ${dataRows.length}\n`);

  if (successCount > 0) {
    console.log("🎉 CSV import completed!");
    console.log("   Check Firestore Database to see the imported data.\n");
  }

  process.exit(0);
}

importCSV().catch((err) => {
  console.error("\n❌ Import failed:", err.message);
  process.exit(1);
});
