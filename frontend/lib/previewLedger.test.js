import { describe, expect, it } from "vitest";
import { createPreviewLedger, canManagePreviewLog, canViewPreviewLog } from "./previewLedger";
import { manualRecordEntry, comboRecordEntries, phoneRecordEntry } from "./recordPreview";
import { historyRows, historyCSV } from "./historyPreview";
const actor = {
    id: "a",
    role: "staff"
  },
  admin = {
    id: "b",
    role: "admin"
  };
const dateTime = {
    date: "2026-11-07",
    time: "10:00"
  },
  now = Date.parse("2026-11-07T10:00:00+07:00");
const entry = (extra = {}) => ({
  ...manualRecordEntry({
    taskId: "ติดตั้ง Software",
    recipient: "หน่วยงานตัวอย่าง",
    notes: "MATLAB"
  }, dateTime).entry,
  employeeId: "a",
  person: "เจ้าหน้าที่ A",
  ...extra
});
const create = () => createPreviewLedger({
  logs: [],
  rooms: [{
    id: "303",
    open: false
  }],
  devices: [{
    id: "d1",
    student: null
  }]
});
const command = (entries, extra = {}) => ({
  actor,
  requestId: "one",
  entries,
  ...extra
});
describe("preview ledger transaction contract", () => {
  it("commits a selected Combo atomically with source task classification", () => {
    const ledger = create(),
      combo = {
        tasks: ["ติดตั้ง A", "ติดตั้ง B"],
        minorTasks: ["ติดตั้ง Software", "ติดตั้ง Software"]
      };
    const entries = comboRecordEntries(combo, [1], "ทีมตัวอย่าง", dateTime).map(row => ({
      ...row,
      employeeId: "a",
      person: "เจ้าหน้าที่ A"
    }));
    ledger.transact(command(entries));
    const snapshot = ledger.getSnapshot();
    expect(snapshot.revision).toBe(1);
    expect(snapshot.data.logs).toHaveLength(1);
    expect(snapshot.data.logs[0]).toMatchObject({
      title: "ติดตั้ง B",
      minorTask: "ติดตั้ง Software",
      recipient: "ทีมตัวอย่าง"
    });
    expect(snapshot.undo.count).toBe(1);
    expect(Object.isFrozen(snapshot.data.logs[0])).toBe(true);
  });
  it("failure leaves logs, resource projections and revision unchanged; retry uses the same key", () => {
    const ledger = create(),
      initial = ledger.getSnapshot();
    ledger.failNext();
    expect(() => ledger.transact(command([entry({
      resource: {
        kind: "room",
        id: "303",
        open: true
      }
    })]))).toThrow(/จำลอง/);
    expect(ledger.getSnapshot()).toBe(initial);
    ledger.transact(command([entry({
      resource: {
        kind: "room",
        id: "303",
        open: true
      }
    })]));
    expect(ledger.getSnapshot().data.rooms[0].open).toBe(true);
  });
  it("repeated successful requests do not duplicate worklogs or undo history", () => {
    const ledger = create();
    const result = ledger.transact(command([entry()])),
      snapshot = ledger.getSnapshot();
    expect(ledger.transact(command([entry()]))).toMatchObject({
      duplicate: true,
      ids: result.ids
    });
    expect(ledger.getSnapshot()).toBe(snapshot);
  });
  it("rejects stale transactions and stale Undo without overwriting newer work", () => {
    const ledger = create();
    ledger.transact(command([entry()]));
    const old = ledger.getSnapshot().undo.id;
    ledger.transact(command([entry()], {
      requestId: "two"
    }));
    const current = ledger.getSnapshot();
    expect(() => ledger.transact(command([entry()], {
      requestId: "three",
      expectedRevision: 0
    }))).toThrow(/ข้อมูลเปลี่ยน/);
    expect(() => ledger.undo(actor, old)).toThrow(/เปลี่ยน/);
    expect(ledger.getSnapshot()).toBe(current);
  });
  it("rolls back all Combo entries and resource status in one Undo", () => {
    const ledger = create();
    ledger.transact(command([entry({
      resource: {
        kind: "room",
        id: "303",
        open: true
      }
    }), entry({
      resource: {
        kind: "device",
        id: "d1",
        student: "0000000000000"
      }
    })]));
    ledger.undo(actor, ledger.getSnapshot().undo.id);
    expect(ledger.getSnapshot().data.logs).toHaveLength(0);
    expect(ledger.getSnapshot().data.rooms[0].open).toBe(false);
    expect(ledger.getSnapshot().data.devices[0].student).toBe(null);
  });
  it("publishes stable snapshots and releases subscribers", () => {
    const ledger = create();
    let changes = 0;
    const unsubscribe = ledger.subscribe(() => changes++);
    expect(ledger.getSnapshot()).toBe(ledger.getSnapshot());
    ledger.transact(command([entry()]));
    unsubscribe();
    ledger.undo(actor, ledger.getSnapshot().undo.id);
    expect(changes).toBe(1);
  });
  it("projects declared seed events and rejects an identity-free role object", () => {
    const ledger = createPreviewLedger({
      rooms: [],
      devices: [{
        id: "d1",
        student: null
      }],
      logs: [{
        ...entry(),
        id: "seed",
        resource: {
          kind: "device",
          id: "d1",
          student: "0000000000000"
        }
      }]
    });
    expect(ledger.getSnapshot().data.devices[0].student).toBe("0000000000000");
    expect(canViewPreviewLog(entry(), {
      role: "admin"
    })).toBe(false);
    ledger.transact(command([entry()]));
    expect(() => ledger.undo({
      role: "admin"
    }, ledger.getSnapshot().undo.id)).toThrow(/สิทธิ์/);
  });
  it("rejects invalid batch members or resource effects without a partial commit", () => {
    const ledger = create(),
      before = ledger.getSnapshot();
    expect(() => ledger.transact(command([entry(), entry({
      date: "2026-02-30"
    })]))).toThrow();
    expect(ledger.getSnapshot()).toBe(before);
    expect(() => ledger.transact(command([entry({
      resource: {
        kind: "device",
        id: "missing",
        student: null
      }
    })]))).toThrow();
    expect(ledger.getSnapshot()).toBe(before);
  });
});
describe("record to history adapter integration (synthetic SIT)", () => {
  it("queries only the actor's rows for Staff, even if an earlier Admin filter targeted someone else", () => {
    const ledger = create();
    ledger.transact(command([entry(), entry({
      employeeId: "b"
    })], {
      actor: admin
    }));
    const filters = {
      start: dateTime.date,
      end: dateTime.date,
      search: "matlab",
      person: "b"
    };
    expect(historyRows(ledger.getSnapshot().data.logs, actor, filters).map(row => row.employeeId)).toEqual(["a"]);
    expect(historyRows(ledger.getSnapshot().data.logs, admin, {
      ...filters,
      person: "all"
    })).toHaveLength(2);
    expect(canViewPreviewLog(entry(), {
      id: "b",
      role: "staff"
    })).toBe(false);
    expect(canViewPreviewLog(entry(), {
      id: "a",
      role: "unknown"
    })).toBe(false);
  });
  it("enforces ownership, locked records and the Bangkok 23:59 edit deadline", () => {
    expect(canManagePreviewLog(entry(), actor, now)).toBe(true);
    expect(canManagePreviewLog(entry(), actor, Date.parse("2026-11-07T23:59:00+07:00"))).toBe(false);
    expect(canManagePreviewLog(entry({
      locked: true
    }), actor, now)).toBe(false);
    expect(canManagePreviewLog(entry({
      locked: true
    }), admin, now)).toBe(true);
    const ledger = create();
    ledger.transact(command([entry({
      employeeId: "b"
    })], {
      actor: admin
    }));
    expect(() => ledger.transact({
      kind: "delete",
      ids: ledger.getSnapshot().data.logs.map(row => row.id),
      actor,
      requestId: "remove",
      now
    })).toThrow(/สิทธิ์/);
    expect(() => ledger.undo(actor, ledger.getSnapshot().undo.id)).toThrow(/สิทธิ์/);
  });
  it("retains required phone fields after edit and can undo an allowed edit", () => {
    const ledger = create();
    const phone = phoneRecordEntry("ทีมตัวอย่าง", "รับแจ้งปัญหา", dateTime).entry;
    ledger.transact(command([entry(phone)]));
    const id = ledger.getSnapshot().data.logs[0].id;
    expect(() => ledger.transact({
      kind: "edit",
      ids: [id],
      entries: [{
        recipient: "",
        comment: ""
      }],
      actor,
      requestId: "bad",
      now
    })).toThrow(/จำเป็น/);
    ledger.transact({
      kind: "edit",
      ids: [id],
      entries: [{
        recipient: "ทีมตัวอย่าง",
        comment: "ติดตามผล"
      }],
      actor,
      requestId: "edit",
      now
    });
    expect(ledger.getSnapshot().data.logs[0].comment).toBe("ติดตามผล");
    ledger.undo(actor, ledger.getSnapshot().undo.id);
    expect(ledger.getSnapshot().data.logs[0].comment).toBe("รับแจ้งปัญหา");
  });
  it("deleting resource events recomputes status, and Undo restores both history and status", () => {
    const ledger = create();
    ledger.transact(command([entry({
      recipient: "0000000000000",
      resource: {
        kind: "device",
        id: "d1",
        student: "0000000000000"
      }
    })]));
    const id = ledger.getSnapshot().data.logs[0].id;
    ledger.transact({
      kind: "delete",
      ids: [id],
      actor: admin,
      requestId: "delete"
    });
    expect(ledger.getSnapshot().data.logs).toHaveLength(0);
    expect(ledger.getSnapshot().data.devices[0].student).toBe(null);
    ledger.undo(admin, ledger.getSnapshot().undo.id);
    expect(ledger.getSnapshot().data.devices[0].student).toBe("0000000000000");
    expect(ledger.getSnapshot().data.logs).toHaveLength(1);
  });
  it("rejects incomplete bulk permissions atomically and validates filter bounds", () => {
    const ledger = create();
    ledger.transact(command([entry(), entry({
      employeeId: "b"
    })], {
      actor: admin
    }));
    const ids = ledger.getSnapshot().data.logs.map(row => row.id),
      before = ledger.getSnapshot();
    expect(() => ledger.transact({
      kind: "delete",
      ids,
      actor,
      requestId: "delete",
      now
    })).toThrow();
    expect(ledger.getSnapshot()).toBe(before);
    expect(() => historyRows(before.data.logs, actor, {
      start: "2026-11-08",
      end: "2026-11-07"
    })).toThrow();
  });
  it("exports the filtered snapshot with multiline/quote escaping and inert formula text", () => {
    const csv = historyCSV([entry({
      comment: '=SUM(1,2)\n"detail"'
    })]);
    expect(csv).toContain('"\'=SUM(1,2)\n""detail"""');
    expect(csv.split("\r\n")).toHaveLength(2);
  });
});
