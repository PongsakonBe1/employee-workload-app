import { collection, doc, getDocFromServer, getDocsFromServer, query, where } from "firebase/firestore";
import { adaptLegacyCalendarForDisplay } from "./calendarDataAdapter";
import { timeMinutes } from "./calendarView";
import { assignedDlRounds, DL_SHIFTS, DL_WORKLOG_TASK, dlRoundLabel, dlRoundSlot, validateDlWorklogDate } from "./dlQuickLog";
import { auth, db } from "./firebase";
import { logFromTemplate } from "./quickLogTemplates";
import { sanitizeInput } from "./validation";

async function dlRoundKey(employeeId, date, selection) {
  const identity = JSON.stringify([employeeId, date, selection.roundId ? ["scheduled", selection.roundId] : ["manual", selection.shift]]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(identity));
  return `dl-quick-${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function saveDlQuickLog({ actorId, person, templateId, date, time, round, shift, note }) {
  if (!actorId || !person?.id || auth.currentUser?.uid !== actorId) {
    throw new Error("The worklog context is no longer available");
  }
  const validation = validateDlWorklogDate(date);
  if (!validation.valid) return { status: "invalid-date", message: validation.error };
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

  const key = await dlRoundKey(person.id, date, selection);
  const worklogQuery = query(collection(db, "worklogs"), where("employeeId", "==", person.id), where("dlRoundKey", "==", key));
  async function readSlot() {
    const snapshot = await getDocsFromServer(worklogQuery);
    return dlRoundSlot(snapshot.docs.map(entry => ({ ...entry.data(), id: entry.id })), key, date, selection);
  }

  const { duplicate, writeId } = await readSlot();
  if (duplicate) return { status: "duplicate", worklog: duplicate };
  const comment = [dlRoundLabel(selection), sanitizeInput(note)].filter(Boolean).join("\n");
  try {
    const id = await logFromTemplate(templateId, person.id, {
      date, time: round ? round.start : time, minorTask: DL_WORKLOG_TASK, comment,
      employeeDisplayName: person.displayName || person.label || "", employeeNickname: person.nickname || "", employeeFullName: person.fullName || "",
      dlRound: { actorId, key, writeId, selection },
    });
    return { status: "created", id };
  } catch (error) {
    // A concurrent create or an interrupted confirmation can leave a valid log.
    const committed = await readSlot().catch(() => null);
    if (committed?.duplicate) return { status: "duplicate", worklog: committed.duplicate };
    throw error;
  }
}
