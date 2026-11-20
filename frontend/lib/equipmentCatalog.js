import { equipmentLoanKind } from "./equipmentLoan.js";

const equipmentCodePattern = /^ICIT(?:0[1-9]|[1-9]\d{1,7})$/;

export const EQUIPMENT_LABELS = { headphones: "หูฟัง", power: "ปลั๊กไฟ", usb: "USB" };

export function equipmentCode(value) {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  return equipmentCodePattern.test(code) ? code : null;
}

export function equipmentLocationGroup(value) {
  if (/finn|ชั้น\s*4(?:\D|$)/i.test(value)) return "finn";
  if (/ชั้น\s*3(?:\D|$)/.test(value)) return "floor3";
  return "other";
}

export function equipmentCatalog(items) {
  const byCode = new Map();
  const conflicts = new Set();
  let invalid = 0;
  for (const item of items) {
    const id = equipmentCode(item.name);
    const kind = equipmentLoanKind({ minorTask: item.minorTask });
    if (!id || !kind) {
      invalid++;
      continue;
    }
    const previous = byCode.get(id);
    if (previous && previous.kind !== kind) conflicts.add(id);
    // Older inventories can have separate borrow and return rows for a code.
    const revision = item.updatedAt?.toMillis?.() ?? item.createdAt?.toMillis?.() ?? 0;
    if (previous && revision <= previous.revision) continue;
    byCode.set(id, {
      id, kind, location: typeof item.location === "string" ? item.location.trim() : "",
      active: item.active !== false, order: Number.isFinite(item.order) ? item.order : 0, revision
    });
  }
  const equipment = [...byCode.values()]
    .filter(item => !conflicts.has(item.id))
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id, "en", { numeric: true }))
    .map(({ revision, ...item }) => item);
  return { equipment, invalid, conflicts: conflicts.size };
}

export function visibleEquipment(catalog, statuses, { kind, template = "" } = {}) {
  const group = equipmentLocationGroup(template);
  return catalog.filter(item => (!kind || item.kind === kind) &&
    (group === "other" || equipmentLocationGroup(item.location) === group) &&
    (item.active || statuses[item.kind]?.[item.id] === "in_use"));
}
