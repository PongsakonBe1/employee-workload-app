import { collection, getDocsFromServer, limit, orderBy, query, startAfter, where } from "firebase/firestore";
import { planningAdmin, planningQueryPlan } from "./planningPreview";

export const ANALYTICS_PAGE_SIZE = 1000;
const allowedRoles = ["staff", "admin", "superadmin"];
const text = value => typeof value === "string" ? value : "";

export function analyticsActor(profile, uid) {
  if (!uid || profile?.uid !== uid || profile.active !== true || !allowedRoles.includes(profile.role)) return null;
  return { id: uid, role: profile.role };
}

export function analyticsPerson(id, profile) {
  const fullName = text(profile.fullName);
  const displayName = text(profile.displayName).trim() || text(profile.nickname).trim() || fullName.trim() || "ไม่ระบุชื่อ";
  return { id, displayName, fullName, initial: Array.from(displayName)[0] };
}

export function analyticsDirectory(docs) {
  const people = [], inactiveIds = new Set();
  for (const doc of docs) {
    const profile = doc.data();
    if (profile.active !== true) inactiveIds.add(doc.id);
    else if (allowedRoles.includes(profile.role)) people.push(analyticsPerson(doc.id, profile));
  }
  people.sort((a, b) => a.displayName.localeCompare(b.displayName, "th") || a.id.localeCompare(b.id));
  return { people, inactiveIds };
}

export function filterAnalyticsTeamRows(rows, inactiveIds) {
  return inactiveIds?.size ? rows.filter(row => !inactiveIds.has(row.employeeId)) : rows;
}

export function createAnalyticsReader(db, currentUid, actor) {
  function assertSession() {
    if (currentUid() !== actor.id) throw new Error("Analytics session changed");
  }

  return {
    async directory() {
      if (!planningAdmin(actor)) throw new Error("Team directory requires an administrator");
      assertSession();
      const snapshot = await getDocsFromServer(collection(db, "users"));
      assertSession();
      return analyticsDirectory(snapshot.docs);
    },
    async page(range, employee, cursor) {
      assertSession();
      const plan = planningQueryPlan(range, actor, employee);
      const ref = query(
        collection(db, plan.collection),
        ...plan.where.map(([key, op, value]) => where(key, op, value)),
        // Reuse the existing employeeId/date DESC index. A snapshot also carries the tie-breaking document ID.
        orderBy("date", "desc"),
        ...(cursor ? [startAfter(cursor)] : []),
        limit(ANALYTICS_PAGE_SIZE + 1)
      );
      const snapshot = await getDocsFromServer(ref);
      assertSession();
      const docs = snapshot.docs.slice(0, ANALYTICS_PAGE_SIZE);
      const rows = docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          employeeId: text(data.employeeId),
          date: text(data.date),
          time: text(data.time),
          minorTask: text(data.minorTask),
          title: text(data.title),
          mainDuty: text(data.mainDuty),
          comment: text(data.comment) || text(data.detail),
          comboGroupId: text(data.comboGroupId)
        };
      });
      return { rows, cursor: snapshot.size > ANALYTICS_PAGE_SIZE ? docs.at(-1) : null };
    }
  };
}
