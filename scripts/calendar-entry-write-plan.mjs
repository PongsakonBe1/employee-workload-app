// Resolve only the immutable, user-reviewed QA proposal. No service access or mutations.
import { createHash } from "node:crypto";
import { prepareCalendarCreate } from "../frontend/lib/calendarCreatePlan.js";
import { calendarWeekday } from "../frontend/lib/calendarView.js";
export const ENTRY_WRITE_MANIFEST_SHA = "23cb6dc5922d7d75ac03dab64078bc0d8305204177bef42679d864343f65b7af";
export async function prepareEntryWriteAudit(proposalText, identities) {
  // Git's Windows checkout may use CRLF; normalize only line endings, never payload or other whitespace.
  const hash = createHash("sha256").update(proposalText.replaceAll("\r\n", "\n")).digest("hex");
  if (hash !== ENTRY_WRITE_MANIFEST_SHA) throw new Error("Entry write manifest changed; review it again before cloud QA");
  const proposal = JSON.parse(proposalText), aliases = ["staff", "superadmin"];
  if (!identities || aliases.some(alias => !/^[A-Za-z0-9:_-]{1,128}$/.test(identities[alias] || "")) || identities.staff === identities.superadmin) throw new Error("Two distinct verified staging identities required");
  const people = aliases.map(alias => ({ id: identities[alias], label: "Synthetic " + alias, identity: "directory" }));
  const operations = [];
  for (const operation of proposal.operations) {
    const rules = operation.classrooms.map(row => ({ title: row.title, kind: "classroom", teacher: row.teacher, semester: row.semester, rooms: [row.room], start: row.start, end: row.end, weekday: calendarWeekday(row.date), validFrom: row.date, validTo: row.date }));
    const events = operation.dl.map(row => ({ title: row.title, kind: "dl", date: row.date, rooms: row.rooms, start: row.start, end: row.end, participants: row.participants, examType: row.examType, semester: row.semester, proctors: row.proctorAliases.map(alias => identities[alias]) }));
    operations.push({ id: operation.id, ...await prepareCalendarCreate({ rules, events }, people) });
  }
  if (operations.length !== 3 || operations.reduce((sum, row) => sum + row.entries.length, 0) !== 5) throw new Error("Entry write budget mismatch");
  return { hash, operations };
}
