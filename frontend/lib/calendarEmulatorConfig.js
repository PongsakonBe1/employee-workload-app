// Public synthetic test configuration only. Never replace these with a live project.
export const calendarEmulator = Object.freeze({
  projectId: "demo-calendar-readonly",
  host: "127.0.0.1",
  firestorePort: 18080,
  authPort: 19099
});
export const calendarTestAccounts = [{
  id: "directory-a",
  label: "Admin จำลอง",
  role: "admin"
}, {
  id: "directory-b",
  label: "Staff จำลอง",
  role: "staff"
}, {
  id: "directory-c",
  label: "Superadmin จำลอง",
  role: "superadmin"
}, {
  id: "pending-user",
  label: "บัญชีรออนุมัติจำลอง",
  role: "user"
}, {
  id: "inactive-user",
  label: "บัญชีหยุดใช้จำลอง",
  role: "staff",
  active: false
}];
export const calendarTestPassword = "Synthetic-fixture-only-21!";
