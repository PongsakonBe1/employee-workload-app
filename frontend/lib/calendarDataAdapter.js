// Pure adapters for the document shapes found in the repository. No Firebase SDK or IO.
import { CALENDAR_ROOMS, calendarDates, timeMinutes, validCalendarDate } from "./calendarView.js";
const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const roles = new Set(["staff", "admin", "superadmin"]);
const text = value => typeof value === "string" ? value.trim() : "";
const recordId = value => typeof value === "string" && value.trim() && !value.includes("/") ? value : "";
const key = (collection, id) => `${collection}:${id}`;
const goodTime = (start, end) => Number.isFinite(timeMinutes(start)) && Number.isFinite(timeMinutes(end)) && timeMinutes(end) > timeMinutes(start);
const goodBounds = (start, end) => validCalendarDate(start) && validCalendarDate(end) && start <= end;
const issue = (collection, id, field, message) => ({
  collection,
  id,
  field,
  message
});
function freeze(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function roomsFrom(values) {
  if (!Array.isArray(values) || !values.length) return null;
  const rooms = values.map(value => text(value).replace(/^ห้อง\s*/, ""));
  return rooms.every(room => CALENDAR_ROOMS.includes(room)) && new Set(rooms).size === rooms.length ? rooms : null;
}
function rosterFrom(users) {
  const people = [],
    issues = [],
    seen = new Set();
  for (const user of users) {
    if (!roles.has(user.role) || user.isActive === false) continue;
    const id = recordId(user.id),
      label = text(user.displayName) || text(user.nickname) || text(user.name);
    if (!id || !label || seen.has(id)) {
      issues.push(issue("users", id, "identity", "รายชื่อเจ้าหน้าที่ขาด ID/ชื่อ หรือ ID ซ้ำ"));
      continue;
    }
    seen.add(id);
    people.push({
      id,
      label,
      identity: "directory"
    });
  }
  return {
    people,
    issues
  };
}
export function adaptCalendarDocuments(documents, {
  boundsById = {},
  timesById = {}
} = {}) {
  const {
    classroomSchedules = [],
    dlExamSchedules = [],
    users = []
  } = documents;
  const {
      people,
      issues
    } = rosterFrom(users),
    warnings = [],
    data = {
      rules: [],
      events: []
    },
    seen = new Set();
  const validPeople = new Set(people.map(person => person.id));
  for (const [collection, records] of [["classroomSchedules", classroomSchedules], ["dlExamSchedules", dlExamSchedules]]) for (const record of records) {
    if (record.isActive === false) continue;
    const id = recordId(record.id),
      sourceKey = key(collection, id),
      fail = (field, message) => issues.push(issue(collection, id, field, message));
    if (!id || seen.has(sourceKey)) {
      fail("id", "ตารางขาด ID หรือ ID ซ้ำใน collection เดียวกัน");
      continue;
    }
    seen.add(sourceKey);
    if (record.isActive !== undefined && typeof record.isActive !== "boolean") {
      fail("isActive", "สถานะใช้งานไม่ใช่ true/false");
      continue;
    }
    const source = {
      collection,
      documentId: id
    };
    if (collection === "classroomSchedules") {
      const weekday = weekdays.indexOf(text(record.dayOfWeek).toLowerCase()),
        rooms = roomsFrom([record.room]);
      const bounds = record.validFrom !== undefined || record.validTo !== undefined ? record : boundsById[id] || {};
      if (!goodBounds(bounds.validFrom, bounds.validTo)) {
        fail("bounds", "ระบุวันเริ่มและสิ้นสุดของตารางเรียนนี้ก่อนแสดงในปฏิทิน");
        continue;
      }
      if (weekday < 0 || !rooms || !goodTime(record.startTime, record.endTime)) {
        fail("schedule", "ตรวจวัน ห้อง และเวลาในตารางเรียนเดิม");
        continue;
      }
      const title = text(record.subject) || text(record.courseName);
      if (!title) {
        fail("title", "ตารางเรียนขาดชื่อวิชา");
        continue;
      }
      data.rules.push({
        id: sourceKey,
        source,
        title,
        kind: "classroom",
        weekday,
        rooms,
        start: record.startTime,
        end: record.endTime,
        validFrom: bounds.validFrom,
        validTo: bounds.validTo,
        semester: text(record.semester),
        teacher: text(record.teacher) || text(record.instructorName),
        note: text(record.note)
      });
      continue;
    }
    // An explicit stored pair wins over timeSlot, including historical evening times.
    const stored = record.startTime !== undefined || record.endTime !== undefined;
    const time = stored ? {
      start: record.startTime,
      end: record.endTime
    } : timesById[id];
    if (!time || !goodTime(time.start, time.end)) {
      fail("time", "ตรวจเวลาเริ่ม–สิ้นสุดจริง ไม่สามารถเดาจากชื่อรอบสอบเดิมได้");
      continue;
    }
    if (!stored) warnings.push(issue(collection, id, "time", "ใช้เวลาที่ผู้ตรวจระบุแยกสำหรับเอกสารนี้ ไม่ได้อนุมานจากชื่อรอบ"));
    const rooms = roomsFrom(record.locations !== undefined ? record.locations : record.location ? [record.location] : []);
    if (!rooms) {
      fail("rooms", "ตรวจห้องสอบเดิม รวมถึงห้องที่ปฏิทินนี้ยังไม่รองรับ");
      continue;
    }
    if (!validCalendarDate(record.date)) {
      fail("date", "ตรวจวันที่สอบในรูปแบบ YYYY-MM-DD");
      continue;
    }
    const proctors = Array.isArray(record.proctors) ? record.proctors.map(value => typeof value === "string" ? value : value?.id || value?.userId) : [];
    if (!proctors.length || proctors.some(id => !validPeople.has(id)) || new Set(proctors).size !== proctors.length) {
      fail("proctors", "จับคู่ผู้คุมกับ ID เจ้าหน้าที่ที่มีอยู่จริง ห้ามใช้ชื่อแทน ID");
      continue;
    }
    if (!Number.isInteger(record.studentCount) || record.studentCount < 1 || record.studentCount > 10000) {
      fail("participants", "ตรวจจำนวนผู้เข้าสอบเดิม");
      continue;
    }
    data.events.push({
      id: sourceKey,
      source,
      kind: "dl",
      title: text(record.subject) || "สอบ Digital Literacy",
      date: record.date,
      start: time.start,
      end: time.end,
      rooms,
      participants: record.studentCount,
      proctors,
      semester: text(record.semester),
      examType: record.examType,
      notes: text(record.notes),
      legacyTimeSlot: text(record.timeSlot),
      repeat: "none"
    });
  }
  return {
    data,
    people,
    issues,
    warnings,
    complete: issues.length === 0
  };
}

// This is a dry-run payload contract, not a Firestore writer or a database migration.
export function planCalendarDocumentChanges(before, after, {
  people = [],
  role
} = {}) {
  const issues = [],
    commands = [],
    allowed = new Set(people.filter(p => p.identity === "directory" && !p.temporary).map(p => p.id));
  if (!roles.has(role) || role === "staff") return {
    commands: [],
    issues: [{
      field: "role",
      message: "เฉพาะ Admin/Superadmin ที่เตรียมการแก้ไขตารางได้"
    }]
  };
  const encode = (row, rule) => {
    const fail = (field, message) => {
      issues.push({
        id: row.id,
        field,
        message
      });
      return null;
    };
    const collection = rule ? "classroomSchedules" : "dlExamSchedules";
    if (row.kind !== (rule ? "classroom" : "dl")) return fail("kind", "ยังไม่มี data contract สำหรับกิจกรรมประเภทนี้");
    if (!text(row.id) || !goodTime(row.start, row.end)) return fail("time", "ตรวจ ID และเวลาเริ่ม–สิ้นสุด");
    const rooms = roomsFrom(row.rooms);
    if (!rooms || rule && rooms.length !== 1) return fail("rooms", "ตรวจห้องก่อนเตรียมบันทึก");
    if (row.source && (row.source.collection !== collection || !recordId(row.source.documentId) || row.id !== key(collection, row.source.documentId))) return fail("source", "แหล่งเอกสารไม่ตรงกับรายการเดิม");
    const reference = row.source || {
      collection,
      documentId: null,
      clientId: row.id
    };
    if (rule) {
      if (!Number.isInteger(row.weekday) || !weekdays[row.weekday] || !goodBounds(row.validFrom, row.validTo) || !text(row.title)) return fail("bounds", "ตรวจชื่อวิชา วัน และช่วงภาคเรียน");
      return {
        reference,
        value: {
          room: rooms[0],
          dayOfWeek: weekdays[row.weekday],
          startTime: row.start,
          endTime: row.end,
          subject: row.title,
          teacher: text(row.teacher),
          note: text(row.note),
          semester: text(row.semester),
          validFrom: row.validFrom,
          validTo: row.validTo,
          isActive: true
        }
      };
    }
    if (!validCalendarDate(row.date) || !Number.isInteger(row.participants) || row.participants < 1 || row.participants > 10000) return fail("date", "ตรวจวันที่และจำนวนผู้เข้าสอบ");
    if (!row.proctors?.length || row.proctors.some(id => !allowed.has(id)) || new Set(row.proctors).size !== row.proctors.length) return fail("proctors", "เลือก UID จากรายชื่อเจ้าหน้าที่ก่อนเตรียมบันทึกจริง ชื่อชั่วคราวใช้ได้เฉพาะทดลอง");
    if (!["staff", "student"].includes(row.examType)) return fail("examType", "ระบุประเภทผู้สอบ บุคลากร/นักศึกษา ก่อนเตรียมบันทึกจริง");
    return {
      reference,
      value: {
        subject: text(row.title) || "สอบ Digital Literacy",
        date: row.date,
        startTime: row.start,
        endTime: row.end,
        timeSlot: row.legacyTimeSlot || "custom",
        locations: rooms.map(room => `ห้อง ${room}`),
        proctors: [...row.proctors],
        proctorNames: row.proctors.map(id => people.find(person => person.id === id).label),
        studentCount: row.participants,
        examType: row.examType,
        semester: text(row.semester),
        notes: text(row.notes),
        isActive: true
      }
    };
  };
  const flatten = data => [...data.rules.map(row => [row, true]), ...data.events.map(row => [row, false])];
  const old = new Map(),
    next = new Set();
  for (const [row, rule] of flatten(before)) {
    if (old.has(row.id)) issues.push({
      id: row.id,
      field: "id",
      message: "ID ตารางเดิมซ้ำ"
    });
    old.set(row.id, {
      row,
      rule
    });
  }
  for (const [row, rule] of flatten(after)) {
    if (next.has(row.id)) {
      issues.push({
        id: row.id,
        field: "id",
        message: "ID ตารางใหม่ซ้ำ"
      });
      continue;
    }
    next.add(row.id);
    const previous = old.get(row.id);
    if (previous && JSON.stringify(previous.row) === JSON.stringify(row)) continue;
    const target = encode(row, rule);
    if (!target) continue;
    if (previous) {
      if (!previous.row.source || previous.rule !== rule || JSON.stringify(previous.row.source) !== JSON.stringify(row.source)) {
        issues.push({
          id: row.id,
          field: "source",
          message: "ไม่สามารถเปลี่ยนแหล่งเอกสารเดิม"
        });
        continue;
      }
      const original = encode(previous.row, previous.rule);
      if (!original || JSON.stringify(original.value) === JSON.stringify(target.value)) continue;
      commands.push({
        operation: "update",
        ...target
      });
    } else {
      if (row.source) {
        issues.push({
          id: row.id,
          field: "source",
          message: "รายการใหม่ต้องไม่อ้างเอกสารที่ยังไม่ได้โหลด"
        });
        continue;
      }
      commands.push({
        operation: "create",
        ...target
      });
    }
  }
  for (const [id, previous] of old) if (!next.has(id)) {
    const target = encode(previous.row, previous.rule);
    if (!target) continue;
    if (!previous.row.source) {
      issues.push({
        id,
        field: "source",
        message: "รายการเดิมขาดแหล่งเอกสาร"
      });
      continue;
    }
    commands.push(previous.rule ? {
      operation: "delete",
      reference: target.reference
    } : {
      operation: "update",
      reference: target.reference,
      value: {
        isActive: false
      }
    });
  }
  return {
    commands: issues.length ? [] : commands,
    issues
  };
}

// Range filtering happens locally. An injected loader can be mocked without any SDK.
export function createCalendarDocumentCache(loadDocuments, options) {
  let snapshot = null,
    pending = null,
    generation = 0,
    loads = 0;
  return {
    read() {
      if (snapshot) return Promise.resolve(snapshot);
      if (pending) return pending;
      const current = generation;
      loads++;
      pending = Promise.resolve().then(loadDocuments).then(documents => {
        const result = freeze(adaptCalendarDocuments(documents, options));
        if (current === generation) snapshot = result;
        return result;
      }).finally(() => {
        if (current === generation) pending = null;
      });
      return pending;
    },
    invalidate() {
      generation++;
      snapshot = null;
      pending = null;
    },
    stats: () => ({
      loads,
      cached: Boolean(snapshot),
      pending: Boolean(pending)
    })
  };
}
export function calendarAdapterRange(data, start, end) {
  // Validate and bound the requested window; a view must never trigger full history reads.
  calendarDates(start, end);
  return {
    rules: data.rules.filter(row => row.validFrom <= end && row.validTo >= start),
    events: data.events.filter(row => row.date >= start && row.date <= end)
  };
}
