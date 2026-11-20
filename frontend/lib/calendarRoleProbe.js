// Read-only developer QA. The receipt is from the four approved synthetic cloud cases.
export const CALENDAR_ROLE_QA_RECEIPT = "op-9f37ac6504fbcab5a05641d9ca2e8321eaae59ebdc8aec73862b7de391388d9b";
export async function probeCalendarWriterReads(read, isCurrent) {
  if (!isCurrent()) throw Object.assign(new Error("No active QA session"), { code: "unauthenticated" });
  const results = await Promise.all([
    ["gate", "calendarWriteState", "main"],
    ["receipt", "calendarWriteOperations", CALENDAR_ROLE_QA_RECEIPT]
  ].map(async ([alias, collection, id]) => {
    try {
      const record = await read(collection, id);
      const exists = record.exists();
      const revision = alias === "gate" && exists ? record.data().revision : null;
      return [alias, { outcome: exists ? "found" : "missing", ...(alias === "gate" ? { revision: Number.isSafeInteger(revision) ? revision : null } : {}) }];
    } catch (error) {
      return [alias, { outcome: error.code === "permission-denied" ? "permission-denied" : "error" }];
    }
  }));
  if (!isCurrent()) throw Object.assign(new Error("QA session changed"), { code: "session-changed" });
  return Object.fromEntries(results);
}
