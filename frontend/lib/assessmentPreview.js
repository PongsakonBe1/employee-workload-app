// Assessment headings are transcribed from the user-supplied form, not its identities or counts.
import { calendarLabel } from "./calendarView";
import { planningAdmin, planningData, planningFiscalYear, planningRange } from "./planningPreview";
export const ASSESSMENT_ROUNDS = {
  "1": "รอบที่ 1",
  "2": "รอบที่ 2",
  "3": "รอบที่ 3",
  newhire: "พนักงานใหม่ · 3 เดือนแรก"
};
export const ASSESSMENT_SECTIONS = [{
  id: "1.1",
  label: "ซ่อมบำรุงคอมพิวเตอร์ของบุคลากรภายในสำนักคอมพิวเตอร์ฯ",
  tone: "pink"
}, {
  id: "1.2",
  label: "ซ่อมบำรุงคอมพิวเตอร์ของหน่วยงานสังกัดสำนักงานอธิการบดี",
  tone: "red"
}, {
  id: "1.3",
  label: "ห้องบริการ ห้องแลกเปลี่ยนความรู้ ห้องเรียน ห้องฝึกอบรม และเครื่องพิมพ์",
  tone: "blue"
}, {
  id: "1.4",
  label: "อุปกรณ์ที่ให้บริการและการยืม–คืน",
  tone: "teal"
}, {
  id: "1.5",
  label: "แก้ปัญหาและแนะนำระบบสารสนเทศ",
  tone: "purple"
}, {
  id: "1.6",
  label: "ติดตั้งและแก้ปัญหาระบบบัญชี 3 มิติ",
  tone: "indigo"
}, {
  id: "1.7",
  label: "ติดตั้งซอฟต์แวร์และซ่อมบำรุงในบริการ IT Clinic",
  tone: "green"
}, {
  id: "1.8",
  label: "จัดเตรียมห้องสอบและควบคุมการสอบสมรรถนะดิจิทัล",
  tone: "orange"
}, {
  id: "2.1",
  label: "สนับสนุนการทำงานของสำนักคอมพิวเตอร์ฯ (ฝ่ายอื่น ๆ)",
  tone: "brown"
}, {
  id: "3.1",
  label: "ปฏิบัติงานตามที่ผู้บังคับบัญชามอบหมายและงานอื่น ๆ",
  tone: "neutral"
}];
export const DEFAULT_ASSESSMENT_MAPPING = Object.freeze(Object.fromEntries([...["เช็คอินห้องแลกเปลี่ยนความรู้", "ปิดห้องแลกเปลี่ยนความรู้", "เปิดห้องเรียนชั้น 4", "ปิดห้องเรียนชั้น 4", "ช่วยเหลือการใช้งานคอมพิวเตอร์", "แก้ไขปัญหาการปริ้น", "การเติมเงินงานพิมพ์"].map(task => [task, "1.3"]), ...["ยืมหูฟัง", "คืนหูฟัง", "ยืมปลั๊กไฟ", "คืนปลั๊กไฟ", "ยืม USB", "คืน USB"].map(task => [task, "1.4"]), ...["ICIT account", "Microsoft Authenticator", "Software ลิขสิทธิ์", "Gmail", "Microsoft Email", "Wifi", "Microsoft365", "รับแจ้งและแก้ปัญหาทางโทรศัพท์", "แก้ไขปัญหาการเชื่อมต่อ"].map(task => [task, "1.5"]), ["คุมสอบ DL", "1.8"], ["สนับสนุนการทำงานของสำนักคอมพิวเตอร์(ฝ่ายอื่นๆ)", "2.1"], ["ปฏิบัติงานตามที่ผู้บังคับบัญชามอบหมาย", "3.1"]]));
export const assessmentSection = (task, mapping) => Object.hasOwn(mapping, task) && ASSESSMENT_SECTIONS.some(section => section.id === mapping[task]) ? mapping[task] : "unmapped";
export function assessmentTaskCatalog(rows, catalog) {
  const entries = new Map(catalog.map(task => [task.label, {
    task: task.label,
    major: task.major || "ยังไม่ระบุหมวด",
    count: 0,
    known: true
  }]));
  for (const row of rows) {
    const task = row.task || row.minorTask || "ไม่ระบุหัวข้อรอง";
    if (!entries.has(task)) entries.set(task, {
      task,
      major: row.mainDuty || "นอกบัญชีหัวข้อปัจจุบัน",
      count: 0,
      known: false
    });
    entries.get(task).count++;
  }
  return [...entries.values()];
}
export function validateAssessment(value, people, actor) {
  const fail = (field, message) => {
    throw Object.assign(new Error(message), {
      field
    });
  };
  if (!Object.hasOwn(ASSESSMENT_ROUNDS, value.round)) fail("round", "เลือกรอบ 1–3 หรือพนักงานใหม่");
  if (!people.some(person => person.id === value.personId) || !planningAdmin(actor) && (actor?.role !== "staff" || actor.id !== value.personId)) fail("personId", "ไม่มีสิทธิ์ดูสรุปของบุคคลนี้");
  let range;
  try {
    range = planningRange("custom", value.start, undefined, value);
  } catch {
    fail("start", "เลือกวันที่เริ่มต้นและสิ้นสุดให้ถูกต้อง");
  }
  if (Number(value.year) !== planningFiscalYear(range.end)) fail("year", "ปีงบประมาณต้องตรงกับวันสิ้นสุดรอบ");
  return {
    ...range,
    year: Number(value.year),
    personId: value.personId,
    round: value.round
  };
}
export function assessmentResult(raw, people, value, actor, catalog, mapping, limit = 1000) {
  const criteria = validateAssessment(value, people, actor);
  const data = planningData(raw, people, criteria, actor, criteria.personId, limit);
  const taskRows = assessmentTaskCatalog(data.rows, catalog);
  const sections = ASSESSMENT_SECTIONS.map(section => ({
    ...section,
    tasks: taskRows.filter(task => assessmentSection(task.task, mapping) === section.id)
  })).map(section => ({
    ...section,
    count: section.tasks.reduce((sum, task) => sum + task.count, 0)
  }));
  const unmapped = taskRows.filter(task => assessmentSection(task.task, mapping) === "unmapped");
  return {
    ...data,
    criteria,
    sections,
    unmapped,
    unmappedCount: unmapped.reduce((sum, task) => sum + task.count, 0),
    canCopy: !data.partial && data.invalid === 0
  };
}
export function assessmentText(result, person) {
  if (!result.canCopy) throw Error("โหลดข้อมูลให้ครบและตรวจวันที่ผิดก่อนคัดลอกสรุป");
  const {
    criteria,
    sections,
    unmapped
  } = result;
  return ["สรุปบันทึกประกอบแบบประเมินพนักงานพิเศษ", person.displayName, `ปีงบประมาณ ${criteria.year} · ${ASSESSMENT_ROUNDS[criteria.round]}`, `${calendarLabel(criteria.start)} – ${calendarLabel(criteria.end)}`, "นับ 1 บันทึกหัวข้อรอง = 1 ครั้ง รวมแต่ละรายการย่อยใน Combo", "", ...sections.flatMap(section => [`${section.id} ${section.label}`, ...(section.tasks.length ? section.tasks.map(task => `- ${task.task} / ${task.count} ครั้ง`) : ["- ยังไม่มีหัวข้อที่จับคู่กับข้อนี้ กรุณาตรวจว่าต้องใช้ข้อมูลเพิ่มเติมหรือไม่"]), ""]), "หัวข้อที่ยังไม่จับคู่กับแบบประเมิน", ...unmapped.map(task => `- ${task.task} / ${task.count} ครั้ง`), "", "0 หมายถึงไม่พบบันทึกในช่วงนี้ ไม่ได้ยืนยันว่างานไม่ได้เกิดขึ้น", "เป็นข้อมูลประกอบ ไม่ใช่คะแนนผลงาน 80 หรือคะแนนพฤติกรรม 20"].join("\n");
}
export function assessmentDistribution(rows, people, mapping) {
  return people.map(person => {
    const counts = new Map();
    for (const row of rows.filter(row => row.employeeId === person.id)) {
      const section = assessmentSection(row.task, mapping);
      counts.set(section, (counts.get(section) || 0) + 1);
    }
    const segments = [...ASSESSMENT_SECTIONS, {
      id: "unmapped",
      label: "ยังไม่จับคู่",
      tone: "neutral"
    }].map(section => ({
      ...section,
      count: counts.get(section.id) || 0
    }));
    return {
      ...person,
      segments,
      total: segments.reduce((sum, segment) => sum + segment.count, 0)
    };
  });
}
