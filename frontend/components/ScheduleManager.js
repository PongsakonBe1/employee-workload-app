"use client";

import "../app/ui-detail-layouts.css";
import { MobileDetailCell } from "./ui/MobileDetailCell";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { useClassroomSchedules } from "../hooks/useClassroomSchedules";
import { useProductionCalendarManager } from "../hooks/useProductionCalendarManager";
import { CalendarManagerFeedback } from "./calendar/CalendarManagerFeedback";
import { logSystemAction, SystemActions } from "../lib/systemLog";
import { GlassButton } from "./ui/GlassControls";
import { Dialog } from "./ui/Dialog";

const ROOM_COLORS = {
  "401": { bg: "bg-blue-500",    light: "bg-blue-50",    border: "border-blue-200",   text: "text-blue-700",    pill: "bg-blue-100 text-blue-700 border-blue-200" },
  "402": { bg: "bg-violet-500",  light: "bg-violet-50",  border: "border-violet-200", text: "text-violet-700",  pill: "bg-violet-100 text-violet-700 border-violet-200" },
  "406": { bg: "bg-emerald-500", light: "bg-emerald-50", border: "border-emerald-200",text: "text-emerald-700", pill: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  "407": { bg: "bg-sky-500",     light: "bg-sky-50",     border: "border-sky-200",    text: "text-sky-700",     pill: "bg-sky-100 text-sky-700 border-sky-200" },
  default:{ bg: "bg-slate-500",  light: "bg-slate-50",   border: "border-slate-200",  text: "text-slate-700",  pill: "bg-slate-100 text-slate-600 border-slate-200" },
};
const scheduleSemester = schedule => typeof schedule.semester === "string" ? schedule.semester.trim() : "";

export default function ScheduleManager() {
  const { user } = useAuth();
  const {
    schedules: allSchedules,
    todaySchedules: allTodaySchedules,
    FLOOR4_ROOMS,
    DAYS,
    loading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    fetchSchedules,
    fetchTodaySchedules,
  } = useClassroomSchedules();
  const writer = useProductionCalendarManager(user, "classroomSchedules", () => Promise.all([fetchSchedules(true), fetchTodaySchedules(true)]));
  const blocked = writer.saving || writer.uncertain;

  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [semester, setSemester] = useState("all");
  const semesters = [...new Set(allSchedules.map(scheduleSemester).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th", { numeric: true }));
  const inSemester = schedule => semester === "all" || scheduleSemester(schedule) === (semester === "unspecified" ? "" : semester);
  const schedules = allSchedules.filter(inSemester);
  const todaySchedules = allTodaySchedules.filter(inSemester);
  const [formData, setFormData] = useState({
    room: "401",
    dayOfWeek: "monday",
    startTime: "08:00",
    endTime: "10:00",
    subject: "",
    teacher: "",
    note: "",
    isActive: true,
  });

  const dayLabels = {
    sunday: "อาทิตย์",
    monday: "จันทร์",
    tuesday: "อังคาร",
    wednesday: "พุธ",
    thursday: "พฤหัสบดี",
    friday: "ศุกร์",
    saturday: "เสาร์",
  };

  const resetForm = () => {
    setFormData({
      room: "401",
      dayOfWeek: "monday",
      startTime: "08:00",
      endTime: "10:00",
      subject: "",
      teacher: "",
      note: "",
      isActive: true,
    });
    setEditingSchedule(null);
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      room: schedule.room,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      subject: schedule.subject || "",
      teacher: schedule.teacher || "",
      note: schedule.note || "",
      isActive: schedule.isActive !== false,
      semester: schedule.semester || "",
      validFrom: typeof schedule.validFrom === "string" ? schedule.validFrom : "",
      validTo: typeof schedule.validTo === "string" ? schedule.validTo : "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (blocked) return;
    try {
      if (writer.enabled) {
        if (editingSchedule) await writer.mutate("edit", [editingSchedule], formData);
        else await writer.create(formData);
      } else if (editingSchedule) {
        await updateSchedule(editingSchedule.id, formData);
        await logSystemAction(
          SystemActions.UPDATE_WORKLOG,
          `Updated classroom schedule: ${formData.subject} (${formData.room})`,
          user?.uid
        );
      } else {
        await createSchedule(formData);
        await logSystemAction(
          SystemActions.CREATE_WORKLOG,
          `Created classroom schedule: ${formData.subject} (${formData.room})`,
          user?.uid
        );
      }
      resetForm();
      setShowForm(false);
    } catch (err) {
      if (!writer.enabled) alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  // Bulk toggle selected schedules
  const handleBulkToggle = async (targetActive) => {
    const toUpdate = schedules.filter((s) => selectedIds.includes(s.id));
    if (blocked || !toUpdate.length) return;
    const label = targetActive ? "เปิด" : "ปิด";
    if (!confirm(`ต้องการ${label}ใช้งานรายการที่เลือก (${toUpdate.length} รายการ) ใช่หรือไม่?`)) return;
    try {
      if (writer.enabled) await writer.mutate("bulk-status", toUpdate, { isActive: targetActive });
      else {
        await Promise.all(toUpdate.map((s) => updateSchedule(s.id, { ...s, isActive: targetActive })));
        await logSystemAction(SystemActions.UPDATE_WORKLOG, `Bulk ${label} ${toUpdate.length} classroom schedules`, user?.uid);
      }
      setSelectedIds([]);
    } catch (err) {
      if (!writer.enabled) alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === schedules.length ? [] : schedules.map((s) => s.id));
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleDelete = async (schedule) => {
    if (blocked || !confirm(`ต้องการ${writer.enabled ? "หยุดใช้" : "ลบ"}ตารางเรียน "${schedule.subject}" ใช่หรือไม่?`)) {
      return;
    }
    try {
      if (writer.enabled) {
        await writer.mutate("cancel", [schedule]);
        return;
      }
      await deleteSchedule(schedule.id);
      await logSystemAction(
        SystemActions.DELETE_WORKLOG,
        `Deleted classroom schedule: ${schedule.subject} (${schedule.room})`,
        user?.uid
      );
    } catch (err) {
      if (!writer.enabled) alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto ui-management">
      {/* Header */}
      <div className="management-heading mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            จัดการตารางเรียนชั้น 4
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ห้อง 401, 402, 406, 407
          </p>
          <div className="management-filters mt-2">
            <label className="text-sm text-slate-600" htmlFor="management-semester">ภาคเรียน</label>
            <select
              id="management-semester"
              disabled={writer.saving}
              value={semester}
              onChange={event => { setSemester(event.target.value); setSelectedIds([]); }}
              className="apple-input"
            >
              <option value="all">ทุกภาคเรียน</option>
              {semesters.map(value => <option key={value} value={value}>{value}</option>)}
              <option value="unspecified">ไม่ระบุภาคเรียน</option>
            </select>
          </div>
        </div>
        <GlassButton variant="prominent" disabled={blocked}
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          เพิ่มตารางเรียน
        </GlassButton>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}


      {!showForm && <CalendarManagerFeedback writer={writer} onConfirmed={() => setSelectedIds([])} />}
      <Dialog open={showForm} title={editingSchedule ? "แก้ไขตารางเรียน" : "เพิ่มตารางเรียน"}
        description={writer.enabled ? writer.saving ? "กำลังบันทึกตาราง…" : "บันทึกไปยังปฏิทินที่ใช้งานจริง" : undefined}
        busy={writer.saving} onClose={() => setShowForm(false)} className="ui-management">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="classroom-room" className="block text-sm font-medium text-slate-700 mb-1">
                ห้องเรียน *
              </label>
              <select id="classroom-room"
                value={formData.room}
                onChange={(e) =>
                  setFormData({ ...formData, room: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                {FLOOR4_ROOMS.map((room) => (
                  <option key={room} value={room}>
                    ห้อง {room}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="classroom-dayOfWeek" className="block text-sm font-medium text-slate-700 mb-1">
                วัน *
              </label>
              <select id="classroom-dayOfWeek"
                value={formData.dayOfWeek}
                onChange={(e) =>
                  setFormData({ ...formData, dayOfWeek: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                {DAYS.slice(1, 7).map((day) => (
                  <option key={day} value={day}>
                    {dayLabels[day]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="classroom-startTime" className="block text-sm font-medium text-slate-700 mb-1">
                เวลาเริ่ม *
              </label>
              <input id="classroom-startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({ ...formData, startTime: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="classroom-endTime" className="block text-sm font-medium text-slate-700 mb-1">
                เวลาจบ *
              </label>
              <input id="classroom-endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({ ...formData, endTime: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="classroom-subject" className="block text-sm font-medium text-slate-700 mb-1">
              วิชา / กิจกรรม *
            </label>
            <input id="classroom-subject"
              type="text"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="เช่น: วิชา Digital Literacy"
              required
            />
          </div>

          <div>
            <label htmlFor="classroom-teacher" className="block text-sm font-medium text-slate-700 mb-1">
              อาจารย์ผู้สอน
            </label>
            <input id="classroom-teacher"
              type="text"
              value={formData.teacher}
              onChange={(e) =>
                setFormData({ ...formData, teacher: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="ชื่ออาจารย์ (ถ้ามี)"
            />
          </div>

          <div>
            <label htmlFor="classroom-note" className="block text-sm font-medium text-slate-700 mb-1">
              หมายเหตุ
            </label>
            <textarea id="classroom-note"
              value={formData.note}
              onChange={(e) =>
                setFormData({ ...formData, note: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
            />
          </div>

          {writer.enabled && <>
            <div className="grid grid-cols-2 gap-4">
              {[[ "validFrom", "เริ่มใช้ตาราง" ], [ "validTo", "สิ้นสุดตาราง" ]].map(([field, label]) => (
                <label key={field} className="text-sm font-medium text-slate-700">
                  {label}
                  <input type="date" required className="apple-input w-full" value={formData[field] || ""}
                    onChange={event => setFormData({ ...formData, [field]: event.target.value })} />
                </label>
              ))}
            </div>
            <label className="block text-sm font-medium text-slate-700">ภาคเรียน
              <input className="apple-input w-full" maxLength={32} value={formData.semester || ""}
                onChange={event => setFormData({ ...formData, semester: event.target.value })} />
            </label>
          </>}
          {(!writer.enabled || editingSchedule) && <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive !== false}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer">
              เปิดใช้งาน
            </label>
          </div>}

          {showForm && <CalendarManagerFeedback writer={writer} onConfirmed={() => { resetForm(); setShowForm(false); }} onReload={() => setShowForm(false)} />}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || blocked}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? "กำลังบันทึก..." : editingSchedule ? "บันทึกการแก้ไข" : "สร้างตารางเรียน"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </Dialog>

      {/* Overview: Room-colored cards for today */}
      <div className="mb-6 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">
            ภาพรวมการใช้ห้องเรียนชั้น 4 — วันนี้ ({dayLabels[DAYS[new Date().getDay()]]})
          </h3>
        </div>
        <div className="p-4">
          {FLOOR4_ROOMS.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {FLOOR4_ROOMS.map((room) => {
                const c = ROOM_COLORS[room] || ROOM_COLORS.default;
                const roomScheds = todaySchedules.filter((s) => s.room === room);
                return (
                  <div key={room} className={`rounded-xl border p-3 ${c.light} ${c.border}`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${c.bg}`} />
                      <span className={`text-sm font-bold ${c.text}`}>ห้อง {room}</span>
                    </div>
                    {roomScheds.length === 0 ? (
                      <p className="text-xs text-slate-400">ว่าง</p>
                    ) : (
                      roomScheds.map((s) => (
                        <div key={s.id} className="mb-1 last:mb-0">
                          <p className={`text-xs font-semibold ${c.text} truncate`}>{s.subject}</p>
                          <p className="text-[11px] text-slate-500">{s.startTime}–{s.endTime}</p>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {todaySchedules.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-2">ไม่มีตารางเรียนวันนี้</p>
          )}
        </div>
      </div>

      {/* Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="mb-3 flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-sm font-semibold text-blue-700">เลือกแล้ว {selectedIds.length} รายการ</span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => handleBulkToggle(true)}
              disabled={blocked}
              className="px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
            >
              เปิดที่เลือก
            </button>
            <button
              type="button"
              onClick={() => handleBulkToggle(false)}
              disabled={blocked}
              className="px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-200 transition"
            >
              ปิดที่เลือก
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Schedule Table — all statuses */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">รายการทั้งหมด ({schedules.length})</span>
          <span className="text-xs text-slate-400">
            เปิดใช้งาน {schedules.filter(s => s.isActive !== false).length} / {schedules.length}
          </span>
        </div>
        <div className="overflow-x-auto mobile-table-wrap">
          <table role="table" aria-label="รายการตารางเรียน" className="w-full mobile-detail-table">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr role="row">
                <th scope="col" aria-label="เลือกทั้งหมด" className="px-4 py-3 text-center text-sm font-medium text-slate-700 w-10">
                  <label className="management-select-all">
                    <input type="checkbox" aria-label="เลือกตารางทั้งหมดในมุมมองนี้"
                      checked={schedules.length > 0 && selectedIds.length === schedules.length}
                      onChange={toggleSelectAll} className="ui-checkbox" />
                    <span>เลือกทั้งหมดในมุมมองนี้</span>
                  </label>
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                  วัน
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                  เวลา
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                  ห้อง
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                  วิชา / กิจกรรม
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                  อาจารย์
                </th>
                <th scope="col" className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                  หมายเหตุ
                </th>
                <th scope="col" className="px-4 py-3 text-center text-sm font-medium text-slate-700">
                  สถานะ
                </th>
                <th scope="col" className="px-4 py-3 text-center text-sm font-medium text-slate-700">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {schedules.length === 0 ? (
                <tr role="row">
                  <td data-mobile-span colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    ยังไม่มีตารางเรียน
                  </td>
                </tr>
              ) : (
                schedules.map((schedule) => {
                  const c = ROOM_COLORS[schedule.room] || ROOM_COLORS.default;
                  const isInactive = schedule.isActive === false;
                  const isSelected = selectedIds.includes(schedule.id);
                  return (
                  <tr role="row" key={schedule.id} className={`hover:bg-slate-50 ${isInactive ? "opacity-50" : ""} ${isSelected ? "bg-blue-50/60" : ""}`}>
                    <MobileDetailCell label="เลือก" className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(schedule.id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </MobileDetailCell>
                    <MobileDetailCell label="วัน" className="px-4 py-3 text-sm text-slate-900">
                      {dayLabels[schedule.dayOfWeek]}
                    </MobileDetailCell>
                    <MobileDetailCell label="เวลา" className="px-4 py-3 text-sm text-slate-600">
                      {schedule.startTime} - {schedule.endTime}
                    </MobileDetailCell>
                    <MobileDetailCell label="ห้อง" className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${c.pill}`}>
                        ห้อง {schedule.room}
                      </span>
                    </MobileDetailCell>
                    <MobileDetailCell primary className="px-4 py-3 text-sm font-medium text-slate-900">
                      {schedule.subject}
                    </MobileDetailCell>
                    <MobileDetailCell label="อาจารย์" className="px-4 py-3 text-sm text-slate-600">
                      {schedule.teacher || "-"}
                    </MobileDetailCell>
                    <MobileDetailCell label="หมายเหตุ" className="px-4 py-3 text-sm text-slate-500">
                      {schedule.note || "-"}
                    </MobileDetailCell>
                    <MobileDetailCell label="สถานะ" className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          schedule.isActive !== false
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {schedule.isActive !== false ? "เปิด" : "ปิด"}
                      </span>
                    </MobileDetailCell>
                    <MobileDetailCell actions className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(schedule)}
                          disabled={blocked}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="แก้ไข"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(schedule)}
                          disabled={blocked || writer.enabled && isInactive}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={writer.enabled ? "หยุดใช้" : "ลบ"}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </MobileDetailCell>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
