import { getDocFromServer, getDocsFromServer, doc, collection, query, where, orderBy, limit } from "firebase/firestore";
import { CALENDAR_READ_LIMIT } from "./calendarReadOnly.js";
// Shared read-only query contract for isolated Emulator and staging clients.
export function calendarSdkTransport(db) {
  const records = async request => (await getDocsFromServer(request)).docs.map(record => ({
    ...record.data(),
    id: record.id
  }));
  return {
    identity: async uid => {
      const record = await getDocFromServer(doc(db, "users", uid));
      return record.exists() ? {
        ...record.data(),
        id: record.id
      } : null;
    },
    directory: () => records(query(collection(db, "users"), where("role", "in", ["staff", "admin", "superadmin"]), where("active", "==", true), limit(CALENDAR_READ_LIMIT + 1))),
    classrooms: () => records(query(collection(db, "classroomSchedules"), where("isActive", "==", true), limit(CALENDAR_READ_LIMIT + 1))),
    exams: (start, end) => records(query(collection(db, "dlExamSchedules"), where("isActive", "==", true), where("date", ">=", start), where("date", "<=", end), orderBy("date"), limit(CALENDAR_READ_LIMIT + 1)))
  };
}
