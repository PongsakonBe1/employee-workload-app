import { isSuperAdminRole } from "./authUtils";

export const nicknameMaxLength = 200;

export function canEditUserNickname(actor, target) {
  if (actor?.active !== true || !actor.uid || !target?.id) return false;
  return isSuperAdminRole(actor) || (actor.role === "admin" &&
    (target.role === "staff" || (target.role === "admin" && target.id === actor.uid)));
}

export function canEditWorklogDisplayName(actor, target) {
  return canEditUserNickname(actor, target) && target.id !== actor.uid && target.role !== "superadmin";
}

export function getUserNameChanges(original, draft, editableDisplayName) {
  const changes = {};
  const nickname = draft.nickname.trim();
  if (nickname !== (original.nickname ?? "").trim()) {
    if (nickname.length > nicknameMaxLength) return null;
    changes.nickname = nickname;
  }
  if (editableDisplayName) {
    const displayName = draft.displayName.trim();
    if (displayName !== (original.displayName ?? "").trim()) {
      if (!displayName) return null;
      changes.displayName = displayName;
    }
  }
  return changes;
}
