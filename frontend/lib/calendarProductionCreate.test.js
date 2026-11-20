import { describe, it, expect, vi } from "vitest";
import { canUseProductionCalendarCreate, createProductionCalendarSubmission } from "./calendarProductionCreate";
import { PRODUCTION_CALENDAR_API_ORIGIN, PRODUCTION_CALENDAR_PROJECT } from "./calendarServerProtocol";

const deployment = { flag: "1", projectId: PRODUCTION_CALENDAR_PROJECT, apiOrigin: PRODUCTION_CALENDAR_API_ORIGIN };
const first = { rules: [{ id: "ui1", title: "Class" }], events: [] };
const result = { created: 1, skipped: 0, repeated: false };

describe("production Calendar submission", () => {
  it("requires exact production settings and an active administrator", () => {
    const admin = { active: true, role: "admin" };
    expect(canUseProductionCalendarCreate({ ...deployment, user: admin })).toBe(true);
    expect(canUseProductionCalendarCreate({ ...deployment, user: { ...admin, role: "superadmin" } })).toBe(true);
    for (const patch of [{ flag: undefined }, { projectId: "demo-project" }, { apiOrigin: "https://elsewhere.test" }, { user: { ...admin, role: "staff" } }, { user: { ...admin, active: false } }]) {
      expect(canUseProductionCalendarCreate({ ...deployment, user: admin, ...patch })).toBe(false);
    }
  });

  it("warms the API and rejects a second click while the first write is pending", async () => {
    let settle;
    const transport = { prepareWrite: vi.fn(async () => {}), create: vi.fn(() => new Promise(resolve => { settle = resolve; })) };
    const onState = vi.fn();
    const writer = createProductionCalendarSubmission({ transport, isCurrent: () => true, onState });
    const pending = writer.create(first);
    await expect(writer.create(first)).rejects.toHaveProperty("code", "calendar-write-validation");
    expect(transport.prepareWrite).toHaveBeenCalledOnce();
    expect(transport.create).toHaveBeenCalledOnce();
    settle(result);
    await expect(pending).resolves.toBe(result);
    expect(onState.mock.calls.map(([state]) => state.phase)).toEqual(["connecting", "sending", null]);
  });

  it("keeps the original submission after a lost response and clears it only on a confirmed reply", async () => {
    const transport = { prepareWrite: vi.fn(async () => {}), create: vi.fn()
      .mockRejectedValueOnce(new Error("connection lost")).mockResolvedValue({ ...result, created: 0, skipped: 1, repeated: true }) };
    const onState = vi.fn();
    const writer = createProductionCalendarSubmission({ transport, isCurrent: () => true, onState });
    await expect(writer.create(first)).rejects.toHaveProperty("code", "calendar-write-uncertain");
    expect(onState.mock.lastCall[0].draft).toEqual(first);
    await expect(writer.create({ rules: [{ title: "Different" }], events: [] })).rejects.toHaveProperty("code", "calendar-write-validation");
    await expect(writer.create({ rules: [{ title: "Class", id: "ui2" }], events: [] })).resolves.toMatchObject({ repeated: true });
    expect(transport.create).toHaveBeenCalledTimes(2);
    expect(onState.mock.lastCall[0].draft).toBeNull();
  });

  it("stops a changed session before POST", async () => {
    let current = true;
    const transport = { prepareWrite: vi.fn(async () => { current = false; }), create: vi.fn() };
    const writer = createProductionCalendarSubmission({ transport, isCurrent: () => current, onState: vi.fn() });
    await expect(writer.create(first)).rejects.toHaveProperty("code", "permission-denied");
    expect(transport.create).not.toHaveBeenCalled();
  });

  it("retries a mutation with the exact draft and blocks an unrelated create during reconciliation", async () => {
    const input = { action: "cancel", targets: [{ id: "LegacySchedule", expected: { mutationVersion: 0, isActive: true } }] };
    const mutate = vi.fn().mockRejectedValueOnce(new Error("connection lost")).mockResolvedValue({ action: "cancel", changed: 0, repeated: true });
    const transport = { prepareWrite: vi.fn(async () => {}), mutate, create: vi.fn() };
    const writer = createProductionCalendarSubmission({ transport, isCurrent: () => true, onState: vi.fn() });
    await expect(writer.mutate(input)).rejects.toHaveProperty("code", "calendar-write-uncertain");
    await expect(writer.create(first)).rejects.toHaveProperty("code", "calendar-write-validation");
    input.targets[0].id = "DifferentSchedule";
    await expect(writer.retry()).resolves.toMatchObject({ repeated: true });
    expect(mutate.mock.calls.map(([input]) => input.targets[0].id)).toEqual(["LegacySchedule", "LegacySchedule"]);
    expect(transport.create).not.toHaveBeenCalled();
  });
});
