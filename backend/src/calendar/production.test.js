import express from "express";
import http from "node:http";
import { describe, expect, it, vi } from "vitest";
import { mountProductionCalendar } from "./production.js";
import { createTrustedCalendarService } from "./service.js";
import { PRODUCTION_CALENDAR_API_ORIGIN, PRODUCTION_CALENDAR_PROJECT } from "../../../frontend/lib/calendarServerProtocol.js";
import { productionCalendarTarget } from "../../../frontend/lib/calendarProductionMutation.js";

const project = PRODUCTION_CALENDAR_PROJECT;
const credentials = { uid: "synthetic-user", email_verified: true, email: "admin@example.test" };
const activeAdmin = { role: "admin", active: true, email: credentials.email, displayName: "QA administrator" };
const classrooms = "classroomSchedules";
const dlExams = "dlExamSchedules";
const classroom = { id: "LegacyRoomSchedule11", room: "401", dayOfWeek: "monday", isActive: true, startTime: "08:00", endTime: "10:00", subject: "QA class" };
const bounds = { validFrom: "2027-06-07", validTo: "2027-06-14" };
const dl = { id: "LegacyExam11", date: "2027-06-07", startTime: "17:00", endTime: "18:30", timeSlot: "custom", locations: ["ห้อง 406", "ห้อง 407"], studentCount: 75, examType: "student", proctors: [credentials.uid], isActive: true };
const mutation = (collection, action, rows, changes) => ({
  collection, action, targets: rows.map(row => productionCalendarTarget(collection, row)), changes,
});

function testDb(profile, gate) {
  const tx = {
    get: vi.fn(async key => key === "users/" + credentials.uid
      ? { exists: Boolean(profile), data: () => profile }
      : { exists: Boolean(gate), data: () => gate }),
    create: vi.fn(),
    update: vi.fn(),
  };
  return { tx, db: { projectId: project, doc: key => key, runTransaction: async action => action(tx) } };
}

describe("production Calendar trust boundary", () => {
  it("requires explicit production opt-in and the matching Admin SDK project", () => {
    expect(() => createTrustedCalendarService({ db: { projectId: project }, projectId: project })).toThrow();
    expect(() => createTrustedCalendarService({ db: { projectId: "elsewhere" }, projectId: project, productionCreate: true })).toThrow();
  });

  it.each([
    [activeAdmin, { revision: 0 }, credentials, "calendar-write-disabled"],
    [activeAdmin, undefined, credentials, "calendar-write-disabled"],
    [{ ...activeAdmin, role: "staff", calendarWriter: true }, { revision: 0, mode: "trusted-create-v1" }, credentials, "permission-denied"],
    [{ ...activeAdmin, role: "superadmin", email: "different@example.test" }, { revision: 0, mode: "trusted-create-v1" }, credentials, "permission-denied"],
    [activeAdmin, { revision: 0, mode: "trusted-create-v1" }, { ...credentials, email_verified: false }, "permission-denied"],
  ])("rejects unauthorized writes or a closed cutover gate", async (profile, gate, claim, code) => {
    const { db, tx } = testDb(profile, gate);
    const service = createTrustedCalendarService({ db, projectId: project, productionCreate: true });
    await expect(service("create", credentials.uid, { rules: [], events: [] }, claim)).rejects.toHaveProperty("code", code);
    expect(tx.create).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("mounts a separate calendar health route and keeps the old service healthy with the flag off", async () => {
    const app = express(), getFirebase = vi.fn();
    mountProductionCalendar(app, { getFirebase, environment: "production" });
    app.get("/health", (_req, res) => res.json({ service: "existing" }));
    const listener = app.listen(0, "127.0.0.1");
    await new Promise(resolve => listener.once("listening", resolve));
    function request(path, method = "GET") {
      return new Promise((resolve, reject) => {
        const req = http.request({ hostname: "127.0.0.1", port: listener.address().port, method, path,
          headers: { Host: new URL(PRODUCTION_CALENDAR_API_ORIGIN).host } }, res => {
          let text = "";
          res.on("data", chunk => { text += chunk; });
          res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(text) }));
        });
        req.on("error", reject);
        req.end();
      });
    }
    try {
      expect(await request("/health")).toEqual({ status: 200, body: { service: "existing" } });
      expect(await request("/api/calendar/health")).toMatchObject({ status: 200, body: { projectId: project, mode: "production", writesEnabled: false } });
      expect(await request("/api/calendar/create", "POST")).toMatchObject({ status: 503, body: { code: "calendar-write-disabled" } });
      expect(await request("/api/calendar/mutate", "POST")).toMatchObject({ status: 503, body: { code: "calendar-write-disabled" } });
      expect(getFirebase).not.toHaveBeenCalled();
    } finally {
      await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
    }
  });
});

function mutationFixture({ profile = activeAdmin, gate = { revision: 4, mode: "trusted-write-v1" }, classes = [], exams = [] } = {}) {
  const rows = new Map([
    ["users/" + credentials.uid, profile],
    ["calendarWriteState/main", gate],
    ...classes.map(row => [classrooms + "/" + row.id, row]),
    ...exams.map(row => [dlExams + "/" + row.id, row]),
  ]);
  const snap = key => ({ id: key.split("/").at(-1), exists: rows.has(key), data: () => rows.get(key) });
  const tx = {
    get: vi.fn(async ref => typeof ref === "string" ? snap(ref) : {
      docs: [...rows.keys()].filter(key => key.startsWith(ref.name + "/"))
        .filter(key => ref.filters.every(([field, op, value]) => {
          const current = rows.get(key)[field];
          if (op === "in") return value.includes(current);
          if (op === ">=") return current >= value;
          if (op === "<=") return current <= value;
          return current === value;
        })).map(snap),
    }),
    getAll: vi.fn(async (...keys) => keys.map(snap)),
    update: vi.fn((key, patch) => rows.set(key, { ...rows.get(key), ...patch })),
    create: vi.fn((key, value) => rows.set(key, value)),
  };
  function query(name) {
    return { name, filters: [], limit() { return this; }, orderBy() { return this; },
      where(...filter) { this.filters.push(filter); return this; } };
  }
  const db = { projectId: project, doc: key => key, collection: query, runTransaction: action => action(tx) };
  const service = createTrustedCalendarService({ db, projectId: project, productionCreate: true, timestamp: () => "synthetic timestamp" });
  return { rows, tx, mutate: input => service("mutate", credentials.uid, input, credentials) };
}

describe("production Calendar management", () => {
  it("repairs a legacy classroom in place, replays by receipt, and rejects a stale edit", async () => {
    const { rows, mutate } = mutationFixture({ classes: [classroom] });
    const input = mutation(classrooms, "edit", [classroom], { ...bounds, teacher: "QA teacher" });
    const committed = await mutate(input);
    expect(committed).toMatchObject({ changed: 1, repeated: false });
    expect(rows.get(classrooms + "/" + classroom.id)).toMatchObject({ ...bounds, dayOfWeek: "monday", teacher: "QA teacher", mutationVersion: 1 });
    await expect(mutate(input)).resolves.toMatchObject({ changed: 0, repeated: true, operationId: committed.operationId });
    await expect(mutate(mutation(classrooms, "edit", [classroom], { ...bounds, room: "407" }))).rejects.toHaveProperty("code", "calendar-write-stale");
    expect(rows.get("calendarWriteState/main").revision).toBe(5);
  });

  it("keeps the original legacy document and can stop use without inferring a time slot or proctors", async () => {
    const legacy = { id: dl.id, date: dl.date, timeSlot: "evening", isActive: true };
    const { rows, tx, mutate } = mutationFixture({ exams: [legacy] });
    await expect(mutate(mutation(dlExams, "cancel", [legacy]))).resolves.toMatchObject({ changed: 1 });
    expect(rows.get(dlExams + "/" + dl.id)).toMatchObject({ ...legacy, isActive: false, mutationVersion: 1 });
    expect(tx.get.mock.calls.every(([ref]) => typeof ref === "string")).toBe(true);
  });

  it("checks overlapping DL rooms and proctors while retaining explicit evening times", async () => {
    const inactive = { ...dl, id: "ExamToActivate", isActive: false };
    const { rows, tx, mutate } = mutationFixture({ exams: [dl, inactive] });
    await expect(mutate(mutation(dlExams, "edit", [inactive], { isActive: true }))).rejects.toThrow("ห้องหรือผู้คุมชน");
    expect(tx.update).not.toHaveBeenCalled();
    await expect(mutate(mutation(dlExams, "edit", [inactive], { isActive: true, date: "2027-06-08" }))).resolves.toMatchObject({ changed: 1 });
    expect(rows.get(dlExams + "/" + inactive.id)).toMatchObject({ startTime: "17:00", endTime: "18:30", locations: dl.locations, studentCount: 75, isActive: true });
  });

  it("opens selected classroom schedules atomically and rejects overlap within the same batch", async () => {
    const a = { ...classroom, ...bounds, isActive: false };
    const b = { ...a, id: "AnotherLegacyClassroom", subject: "QA second class" };
    const { tx, mutate } = mutationFixture({ classes: [a, b] });
    await expect(mutate(mutation(classrooms, "bulk-status", [a, b], { isActive: true }))).rejects.toThrow("ห้องหรือผู้คุมชน");
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.create).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...activeAdmin, role: "staff" }, "trusted-write-v1", "permission-denied"],
    [activeAdmin, "trusted-create-v1", "calendar-write-disabled"],
  ])("rejects mutation before any change without a trusted-write gate and administrator", async (profile, mode, code) => {
    const { tx, mutate } = mutationFixture({ profile, gate: { revision: 0, mode } });
    await expect(mutate(mutation(classrooms, "cancel", [classroom]))).rejects.toHaveProperty("code", code);
    expect(tx.getAll).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });
});
