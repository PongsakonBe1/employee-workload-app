import { TRUSTED_CALENDAR_PROJECT } from "./emulatorConfig.js";
import { STAGING_CALENDAR_PROJECT } from "../../../frontend/lib/calendarServerProtocol.js";

// Read at most one document per check. Never return document data or perform writes.
export function createCalendarConnectivityProbe({ db, projectId }) {
  if (![TRUSTED_CALENDAR_PROJECT, STAGING_CALENDAR_PROJECT].includes(projectId) || db.projectId !== projectId) throw new Error("Unreviewed connectivity target");
  return async uid => {
    if (typeof uid !== "string" || !uid || uid.includes("/")) throw Object.assign(new Error("Profile required"), { code: "permission-denied" });
    const profile = await db.doc("users/" + uid).get();
    const user = profile.data();
    if (!profile.exists || user?.active !== true || !["admin", "superadmin"].includes(user.role) || user.calendarWriter !== true) throw Object.assign(new Error("Profile denied"), { code: "permission-denied" });
    const gate = await db.doc("calendarWriteState/main").get();
    if (!gate.exists || !Number.isSafeInteger(gate.data()?.revision) || gate.data().revision < 0 || gate.data().revision >= Number.MAX_SAFE_INTEGER) throw new Error("Gate unavailable");
    await db.collection("classroomSchedules").limit(1).get();
    await db.collection("dlExamSchedules").limit(1).get();
    return { auth: true, profile: true, gate: true, classrooms: true, exams: true };
  };
}
