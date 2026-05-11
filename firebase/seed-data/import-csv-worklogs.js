/**
 * Script to import worklogs from CSV to Firestore
 * Usage: node import-csv-worklogs.js <path-to-csv>
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Initialize Firebase Admin
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Cache for user lookups
let userCache = null;

// Load all users from Firestore and create lookup maps
async function loadUsers() {
  if (userCache) return userCache;

  const snapshot = await db.collection("users").get();
  userCache = {
    byNickname: {},
    byDisplayName: {},
    byFullName: {},
    byUsername: {},
    all: [],
  };

  snapshot.forEach((doc) => {
    const user = { id: doc.id, ...doc.data() };
    userCache.all.push(user);

    // Map by various name fields
    if (user.nickname) {
      userCache.byNickname[user.nickname] = user;
    }
    if (user.displayName) {
      userCache.byDisplayName[user.displayName] = user;
    }
    if (user.fullName) {
      userCache.byFullName[user.fullName] = user;
    }
    if (user.username) {
      userCache.byUsername[user.username] = user;
    }
  });

  console.log(`Loaded ${userCache.all.length} users from Firestore`);
  console.log("Available nicknames:", Object.keys(userCache.byNickname));
  console.log("Available displayNames:", Object.keys(userCache.byDisplayName));

  return userCache;
}

// Find user by name from CSV
function findUserByName(users, name) {
  if (!name) return null;

  // Try exact match on various fields
  return (
    users.byNickname[name] ||
    users.byDisplayName[name] ||
    users.byFullName[name] ||
    users.byUsername[name] ||
    null
  );
}

// Parse Thai date (D/M/YYYY) to ISO format (YYYY-MM-DD)
// Supports both B.E. (>= 2500) and A.D. (< 2500) year formats
function parseThaiDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;

  const day = parts[0].padStart(2, "0");
  const month = parts[1].padStart(2, "0");
  const year = parseInt(parts[2]);

  // If year >= 2500, it's B.E. (Buddhist Era), convert to A.D.
  // If year < 2500, it's already A.D.
  const adYear = year >= 2500 ? year - 543 : year;
  return `${adYear}-${month}-${day}`;
}

// Parse time (HH:MM:SS)
function parseTime(timeStr) {
  if (!timeStr) return "09:00";
  return timeStr.substring(0, 5); // Return HH:MM
}

// Parse CSV/TSV line with quoted fields support
// Auto-detect delimiter (tab or comma)
function parseCSVLine(line) {
  // Detect delimiter: use tab if found, otherwise comma
  const delimiter = line.includes("\t") ? "\t" : ",";

  const columns = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote ("")
        current += '"';
        i += 2;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      columns.push(current.trim());
      current = "";
      i++;
    } else {
      current += char;
      i++;
    }
  }

  // Add last field
  columns.push(current.trim());
  return columns;
}

// Read CSV file
async function readCSV(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Load users from Firestore
  const users = await loadUsers();
  console.log(`Loaded ${Object.keys(users).length} users from Firestore`);

  const worklogs = [];
  let skippedCount = 0;

  // Skip header rows (first 3 lines)
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV with quoted field support
    const columns = parseCSVLine(line);

    // CSV has 8 columns: date, time, employee, requester, mainDuty, minorTask, comment, status
    if (columns.length < 5) {
      skippedCount++;
      console.log(`Line ${i + 1}: Skipped (only ${columns.length} columns)`);
      continue;
    }

    const dateStr = columns[0];
    const timeStr = columns[1];
    const employeeName = columns[2];
    const requester = columns[3];
    const mainDuty = columns[4];
    const minorTask = columns[5] || "";
    const comment = columns[6] || "";
    const rawStatus = columns[7] || "";

    // Convert status: "บันทึกแล้ว" → "completed", otherwise → "pending"
    const status = rawStatus === "บันทึกแล้ว" ? "completed" : "pending";

    if (!dateStr || !employeeName || !mainDuty) {
      skippedCount++;
      continue;
    }

    const date = parseThaiDate(dateStr);
    if (!date) {
      skippedCount++;
      console.log(`Line ${i + 1}: Invalid date "${dateStr}"`);
      continue;
    }

    // Find user by nickname/name from CSV (optional, for enrichment)
    const user = findUserByName(users, employeeName);

    if (!user) {
      console.log(
        `Line ${i + 1}: Employee "${employeeName}" not in Firestore, importing with raw name`,
      );
    }

    // ใช้ชื่อจาก CSV เป็นหลัก (ไม่ override ด้วยชื่อจาก Google Account)
    // เพื่อให้แสดงชื่อภาษาไทยตามที่บันทึกใน CSV
    worklogs.push({
      date,
      time: parseTime(timeStr),
      employeeId: user?.id || null,
      employeeName: employeeName, // ใช้ชื่อจาก CSV ต้นฉบับ
      employeeDisplayName: employeeName, // ใช้ชื่อจาก CSV ต้นฉบับ
      employeeFullName: employeeName, // ใช้ชื่อจาก CSV ต้นฉบับ
      employeeNickname: employeeName, // ใช้ชื่อจาก CSV ต้นฉบับ
      username: user?.username || "",
      requesterName: requester || "",
      mainDuty,
      dutyGroup: mainDuty,
      minorTask: minorTask || "",
      comment: comment || "",
      status: status || "completed",
      source: "imported",
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
  }

  return { worklogs, skippedCount };
}

// Delete all worklogs from Firestore (in batches of 500)
async function deleteAllWorklogs() {
  const collectionRef = db.collection("worklogs");
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log("No worklogs to delete");
    return;
  }

  const docs = [];
  snapshot.forEach((doc) => docs.push(doc));

  // Delete in batches of 500 (Firebase limit)
  const BATCH_SIZE = 500;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const batchDocs = docs.slice(i, i + BATCH_SIZE);

    for (const doc of batchDocs) {
      batch.delete(doc.ref);
    }

    await batch.commit();
    console.log(
      `Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(docs.length / BATCH_SIZE)} (${batchDocs.length} docs)`,
    );
  }

  console.log(`Deleted ${docs.length} existing worklogs`);
}

// Import to Firestore (in batches of 500)
async function importWorklogs(worklogs) {
  const collectionRef = db.collection("worklogs");
  const BATCH_SIZE = 500;
  let importedCount = 0;

  for (let i = 0; i < worklogs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const batchWorklogs = worklogs.slice(i, i + BATCH_SIZE);

    for (const worklog of batchWorklogs) {
      const docRef = collectionRef.doc();
      batch.set(docRef, worklog);
    }

    await batch.commit();
    importedCount += batchWorklogs.length;
    console.log(
      `Imported batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(worklogs.length / BATCH_SIZE)} (${batchWorklogs.length} docs)`,
    );
  }

  console.log(`Total imported: ${importedCount} worklogs`);
}

// Main
async function main() {
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.error("Usage: node import-csv-worklogs.js <path-to-csv>");
    process.exit(1);
  }

  try {
    console.log(`Reading CSV from: ${csvPath}`);

    // Step 1: Delete all existing worklogs
    console.log("\n🗑️  Deleting existing worklogs...");
    await deleteAllWorklogs();

    // Step 2: Read and import new data
    const { worklogs, skippedCount } = await readCSV(csvPath);

    const completedCount = worklogs.filter(
      (w) => w.status === "completed",
    ).length;
    const pendingCount = worklogs.filter((w) => w.status === "pending").length;

    console.log(`\n📊 Summary:`);
    console.log(`  - Found: ${worklogs.length} worklogs to import`);
    console.log(`    - Completed (บันทึกแล้ว): ${completedCount}`);
    console.log(`    - Pending (ยังไม่บันทึก): ${pendingCount}`);
    console.log(`  - Skipped: ${skippedCount} lines`);

    if (worklogs.length > 0) {
      console.log("\nSample entry:", worklogs[0]);
      console.log("\nImporting to Firestore...");
      await importWorklogs(worklogs);
      console.log(`\n✅ Done! Imported ${worklogs.length} worklogs`);
    } else {
      console.log("No worklogs found to import");
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
