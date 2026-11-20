import { collection, doc, getDocFromServer, getDocsFromServer, query, where } from "firebase/firestore";
import { adaptLegacyCalendarForDisplay } from "./calendarDataAdapter";
import { timeMinutes, validCalendarDate } from "./calendarView";
import { assignedDlRounds, DL_SHIFTS, DL_WORKLOG_TASK, dlRoundLabel } from "./dlQuickLog";
import { auth, db } from "./firebase";
import { logFromTemplate } from "./quickLogTemplates";
import { sanitizeInput } from "./validation";

async function dlWriteId(employeeId, date, selection) {
  const identity = JSON.stringify([employeeId, date, selection.roundId ? ["scheduled", selection.roundId] : ["manual", selection.shift]]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
  return `dl-quick-${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function saveDlQuickLog({ actorId, person, templateId, date, time, round, shift, note }) {
  if (!actorId || !person?.id || !validCalendarDate(date) || auth.currentUser?.uid !== actorId) {
    throw new Error("The worklog context is no longer available");
  }
  let selection;
  if (round) {
    const snapshot = await getDocFromServer(doc(db, "dlExamSchedules", round.id));
    const records = snapshot.exists() ? [{ ...snapshot.data(), id: snapshot.id }] : [];
    const { data } = adaptLegacyCalendarForDisplay({ classroomSchedules: [], dlExamSchedules: records, users: [] });
    const current = assignedDlRounds(data.events, records, person.id)[0];
    if (!current || current.date !== date || current.start !== round.start || current.end !== round.end || current.rooms.join() !== round.rooms.join()) {
      return { status: "schedule-changed" };
    }
    selection = { roundId: current.id, start: current.start, end: current.end, rooms: current.rooms };
  } else {
    if (!Object.hasOwn(DL_SHIFTS, shift) || !Number.isFinite(timeMinutes(time))) throw new Error("Invalid manual DL round");
    selection = { shift };
  }

  const writeId = await dlWriteId(person.id, date, selection);
  const worklogQuery = query(collection(db, "worklogs"), where("employeeId", "==", person.id), where("date", "==", date));
  async function existing() {
    const snapshot = await getDocsFromServer(worklogQuery);
    const record = snapshot.docs.find(entry => entry.id === writeId);
    return record ? { status: "duplicate", worklog: record.data() } : null;
  }

  const recorded = await existing();
  if (recorded) return recorded;
  const comment = [dlRoundLabel(selection), sanitizeInput(note)].filter(Boolean).join("\n");
  try {
    const id = await logFromTemplate(templateId, person.id, {
      date, time: round ? round.start : time, minorTask: DL_WORKLOG_TASK, comment,
      employeeDisplayName: person.displayName || person.label || "", employeeNickname: person.nickname || "", employeeFullName: person.fullName || "",
      dlRound: { actorId, writeId, selection },
    });
    return { status: "created", id };
  } catch (error) {
    // A concurrent create or an interrupted confirmation can leave a valid log.
    const committed = await existing().catch(() => null);
    if (committed) return committed;
    throw error;
  }
}
