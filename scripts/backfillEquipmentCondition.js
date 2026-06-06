/**
 * EH-5: Backfill Equipment Condition from Comments
 * 
 * Parse existing worklog comments for damage/loss indicators
 * and populate equipmentCondition + equipmentNote fields
 * 
 * Prerequisites:
 * 1. serviceAccountKey.json exists in firebase/seed-data/
 * 2. Run: cd scripts && node backfillEquipmentCondition.js
 * 
 * Safety:
 * - DRY RUN mode by default (set DRY_RUN=false to apply)
 * - Test on dev environment first
 * - Backup Firestore before production run
 */

const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, "..", "firebase", "seed-data", "serviceAccountKey.json");
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Configuration
const CONFIG = {
  DRY_RUN: process.env.DRY_RUN !== "false", // default true
  BATCH_SIZE: 500, // Firestore batch limit
  DELAY_MS: 100, // Rate limiting between batches
  // Only process worklogs with these minorTasks (equipment-related)
  TARGET_MINOR_TASKS: [
    "คืนหูฟัง",
    "ยืมหูฟัง", 
    "คืนปลั๊กไฟ",
    "ยืมปลั๊กไฟ",
    "เช็คอินห้องแลกเปลี่ยนความรู้",
    "ปิดห้องแลกเปลี่ยนความรู้",
    "เปิดห้องเรียนชั้น 4",
    "ปิดห้องเรียนชั้น 4"
  ],
};

// Keywords for condition detection (Thai + English variants)
const DAMAGE_KEYWORDS = [
  "ชำรุด", "เสีย", "หัก", "พัง", "ใช้ไม่ได้", "ไม่ทำงาน",
  "broken", "damaged", "not working", "defective",
  "ขาด", "ร้าว", "แตก", "บึ้ม", "เสียงไม่ออก", "สายขาด"
];

const LOST_KEYWORDS = [
  "สูญหาย", "หาย", "ไม่ได้คืน", "ยืมไม่คืน", "เอาไปไม่คืน",
  "lost", "missing", "not returned", "stolen"
];

/**
 * Detect equipment condition from comment text
 * @param {string} comment
 * @returns {{condition: string|null, note: string|null, matchedKeyword: string|null}}
 */
function detectCondition(comment) {
  if (!comment || typeof comment !== "string") {
    return { condition: null, note: null, matchedKeyword: null };
  }

  const lowerComment = comment.toLowerCase();

  // Check for lost (more specific, check first)
  for (const keyword of LOST_KEYWORDS) {
    if (lowerComment.includes(keyword.toLowerCase())) {
      return {
        condition: "lost",
        note: comment.trim(),
        matchedKeyword: keyword
      };
    }
  }

  // Check for damaged
  for (const keyword of DAMAGE_KEYWORDS) {
    if (lowerComment.includes(keyword.toLowerCase())) {
      return {
        condition: "damaged",
        note: comment.trim(),
        matchedKeyword: keyword
      };
    }
  }

  return { condition: null, note: null, matchedKeyword: null };
}

/**
 * Fetch worklogs that need backfill
 * Query: equipment-related minorTasks AND (no equipmentCondition OR equipmentCondition == "")
 */
async function fetchWorklogsToProcess() {
  console.log("📥 Fetching worklogs to process...\n");

  const worklogs = [];
  
  // We'll query in batches by minorTask to avoid large queries
  for (const minorTask of CONFIG.TARGET_MINOR_TASKS) {
    try {
      const snapshot = await db
        .collection("worklogs")
        .where("minorTask", "==", minorTask)
        .get();

      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only include if equipmentCondition is not set (null, undefined, or empty)
        if (!data.equipmentCondition) {
          worklogs.push({
            id: doc.id,
            ...data
          });
        }
      });

      process.stdout.write(`  ${minorTask}: ${snapshot.size} docs (pending: ${worklogs.length})\r`);
    } catch (err) {
      console.error(`\n❌ Error querying ${minorTask}:`, err.message);
    }
  }

  console.log(`\n✅ Found ${worklogs.length} worklogs to process\n`);
  return worklogs;
}

/**
 * Process worklogs in batches
 */
async function processWorklogs(worklogs) {
  const stats = {
    total: worklogs.length,
    processed: 0,
    updated: 0,
    damaged: 0,
    lost: 0,
    skipped: 0,
    errors: 0,
    dryRun: CONFIG.DRY_RUN
  };

  console.log(CONFIG.DRY_RUN ? "🔍 DRY RUN MODE (no changes will be applied)\n" : "⚠️  LIVE MODE (changes will be applied!)\n");
  console.log("🚀 Processing worklogs...\n");

  // Process in batches
  for (let i = 0; i < worklogs.length; i += CONFIG.BATCH_SIZE) {
    const batch = worklogs.slice(i, i + CONFIG.BATCH_SIZE);
    const firestoreBatch = db.batch();
    let batchHasUpdates = false;

    for (const worklog of batch) {
      try {
        const detection = detectCondition(worklog.comment);

        if (detection.condition) {
          stats.updated++;
          if (detection.condition === "damaged") stats.damaged++;
          if (detection.condition === "lost") stats.lost++;

          if (!CONFIG.DRY_RUN) {
            const docRef = db.collection("worklogs").doc(worklog.id);
            firestoreBatch.update(docRef, {
              equipmentCondition: detection.condition,
              equipmentNote: detection.note,
              _backfilledAt: admin.firestore.FieldValue.serverTimestamp(),
              _backfilledBy: "EH-5-script",
              _backfillReason: `Detected keyword: ${detection.matchedKeyword}`
            });
            batchHasUpdates = true;
          }

          // Log sample for verification
          if (stats.updated <= 5 || stats.updated % 100 === 0) {
            console.log(`  [${detection.condition.toUpperCase()}] ${worklog.id}`);
            console.log(`    Comment: ${worklog.comment?.substring(0, 60)}...`);
            console.log(`    Keyword: ${detection.matchedKeyword}\n`);
          }
        } else {
          stats.skipped++;
        }

        stats.processed++;
        process.stdout.write(`  Progress: ${stats.processed}/${stats.total} (${Math.round(stats.processed/stats.total*100)}%)\r`);

      } catch (err) {
        stats.errors++;
        console.error(`\n❌ Error processing ${worklog.id}:`, err.message);
      }
    }

    // Commit batch if not dry run and has updates
    if (!CONFIG.DRY_RUN && batchHasUpdates) {
      try {
        await firestoreBatch.commit();
      } catch (err) {
        console.error(`\n❌ Batch commit failed:`, err.message);
        stats.errors += batch.length;
      }
    }

    // Rate limiting
    if (i + CONFIG.BATCH_SIZE < worklogs.length) {
      await new Promise((resolve) => setTimeout(resolve, CONFIG.DELAY_MS));
    }
  }

  return stats;
}

/**
 * Print summary report
 */
function printReport(stats) {
  console.log("\n\n" + "=".repeat(50));
  console.log("📊 BACKFILL SUMMARY");
  console.log("=".repeat(50));
  console.log(`Mode:           ${stats.dryRun ? "DRY RUN (no changes)" : "LIVE (changes applied)"}`);
  console.log(`Total scanned:  ${stats.total}`);
  console.log(`Processed:      ${stats.processed}`);
  console.log(`Updated:        ${stats.updated}`);
  console.log(`  - Damaged:    ${stats.damaged}`);
  console.log(`  - Lost:       ${stats.lost}`);
  console.log(`Skipped:        ${stats.skipped}`);
  console.log(`Errors:         ${stats.errors}`);
  console.log("=".repeat(50));

  if (stats.dryRun && stats.updated > 0) {
    console.log("\n⚠️  This was a DRY RUN. No changes were applied.");
    console.log("To apply changes, run: DRY_RUN=false node backfillEquipmentCondition.js");
  }
}

/**
 * Main execution
 */
async function main() {
  console.log("=".repeat(50));
  console.log("EH-5: Equipment Condition Backfill");
  console.log("=".repeat(50));
  console.log(`\n🔧 Configuration:`);
  console.log(`  DRY_RUN: ${CONFIG.DRY_RUN}`);
  console.log(`  BATCH_SIZE: ${CONFIG.BATCH_SIZE}`);
  console.log(`  TARGET_TASKS: ${CONFIG.TARGET_MINOR_TASKS.length} types\n`);

  // Safety check
  if (!CONFIG.DRY_RUN) {
    console.log("⚠️  ⚠️  ⚠️  WARNING  ⚠️  ⚠️  ⚠️");
    console.log("You are about to modify production data!");
    console.log("\nRecommended safety steps:");
    console.log("1. ✓ Run DRY_RUN first to preview changes");
    console.log("2. ✓ Export/backup Firestore before applying");
    console.log("3. ✓ Test on dev environment");
    console.log("\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n");
    
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log("Proceeding with LIVE mode...\n");
  }

  try {
    const worklogs = await fetchWorklogsToProcess();
    
    if (worklogs.length === 0) {
      console.log("✨ No worklogs need processing. Exiting.");
      process.exit(0);
    }

    const stats = await processWorklogs(worklogs);
    printReport(stats);

    console.log("\n✅ Backfill complete!\n");
    process.exit(0);

  } catch (err) {
    console.error("\n❌ Fatal error:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Run
main();
