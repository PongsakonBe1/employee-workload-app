/**
 * Shared auth / role-checking helpers.
 *
 * Replaces the `user?.role === "admin" || user?.role === "superadmin"` pattern
 * that was copy-pasted across nearly every admin page.
 */

/** True when the user holds admin or superadmin privileges. */
export function isAdminRole(user) {
  return user?.role === "admin" || user?.role === "superadmin";
}

/** True only for superadmin. */
export function isSuperAdminRole(user) {
  return user?.role === "superadmin";
}
