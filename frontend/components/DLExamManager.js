"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { useDLExamSchedules } from "../hooks/useDLExamSchedules";
import { useUsers } from "../hooks/useUsers";
import { logSystemAction, SystemActions } from "../lib/systemLog";

export default function DLExamManager() {
  const { user } = useAuth();
  const {
    schedules,
    loading,
    error,
    fetchSchedules,
    fetchExamsByMonth,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  } = useDLExamSchedules();
  const { users, loading: usersLoading, error: usersError, fetchUsers } = useUsers();

  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [monthlyExams, setMonthlyExams] = useState([]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    timeSlot: "morning",
    examType: "staff",
    locations: ["ห้อง 406"],
    proctors: [],
    studentCount: 30,
    notes: "",
    isActive: true,
  });

  // Auto-set rooms when studentCount > 40 (keep CEM if selected)
  useEffect(() => {
    if (formData.studentCount > 40) {
      const current = formData.locations || [];
      const cemSelected = current.includes("CEM");
      const newLocations = cemSelected ? ["ห้อง 406", "ห้อง 407", "CEM"] : ["ห้อง 406", "ห้อง 407"];
      setFormData((prev) => ({ ...prev, locations: newLocations }));
    }
  }, [formData.studentCount]);

  const timeSlots = {
    morning: { label: "09:00-10:30", startTime: "09:00", endTime: "10:30" },
    afternoon: { label: "13:30-15:00", startTime: "13:30", endTime: "15:00" },
    evening: { label: "15:00-16:00", startTime: "15:00", endTime: "16:00" },
  };

  const examTypes = {
    staff: "บุคลากร",
    student: "นักศึกษา",
  };

  // Helper to get staff name from ID
  const getStaffName = (id) => {
    const user = users.find((u) => u.id === id);
    return user?.nickname || user?.name || user?.displayName || id;
  };

  const resetForm = () => {
    setFormData({
      date: "",
      timeSlot: "morning",
      examType: "staff",
      locations: ["ห้อง 406"],
      proctors: [],
      studentCount: 30,
      notes: "",
      isActive: true,
    });
    setEditingSchedule(null);
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      date: schedule.date,
      timeSlot: schedule.timeSlot,
      examType: schedule.examType,
      locations: schedule.locations || (schedule.location ? [schedule.location] : ["ห้อง 406"]),
      proctors: schedule.proctors || [],
      studentCount: schedule.studentCount || 30,
      notes: schedule.notes || "",
      isActive: schedule.isActive !== false,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const slot = timeSlots[formData.timeSlot];
      const data = {
        ...formData,
        startTime: slot.startTime,
        endTime: slot.endTime,
        proctorNames: formData.proctors.map(
          (id) => users.find((u) => u.id === id)?.name || id
        ),
      };

      if (editingSchedule) {
        await updateSchedule(editingSchedule.id, data);
        await logSystemAction(
          SystemActions.DL_EXAM_SCHEDULE_UPDATED,
          `อัปเดตตารางคุมสอบ DL: ${formData.date} ${slot.label}`
        );
      } else {
        await createSchedule(data);
        await logSystemAction(
          SystemActions.DL_EXAM_SCHEDULE_CREATED,
          `สร้างตารางคุมสอบ DL: ${formData.date} ${slot.label}`
        );
      }

      resetForm();
      setShowForm(false);
      loadMonthlyExams();
    } catch (err) {
      console.error("Error saving schedule:", err);
      alert("ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่");
    }
  };

  const handleDelete = async (schedule) => {
    if (!confirm(`ต้องการลบตารางคุมสอบ ${schedule.date} ${timeSlots[schedule.timeSlot]?.label}?`)) {
      return;
    }
    try {
      await deleteSchedule(schedule.id);
      await logSystemAction(
        SystemActions.DL_EXAM_SCHEDULE_DELETED,
        `ลบตารางคุมสอบ DL: ${schedule.date}`
      );
      loadMonthlyExams();
    } catch (err) {
      console.error("Error deleting schedule:", err);
      alert("ไม่สามารถลบข้อมูลได้");
    }
  };

  const loadMonthlyExams = async () => {
    const exams = await fetchExamsByMonth(currentYear, currentMonth);
    setMonthlyExams(exams);
  };

  useEffect(() => {
    loadMonthlyExams();
  }, [currentMonth, currentYear]);

  const monthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">จัดการตารางคุมสอบ DL</h1>
          <p className="text-slate-500 mt-1">จัดการตารางคุมสอบ Digital Literacy</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          {showForm ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              ยกเลิก
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              เพิ่มรอบสอบ
            </>
          )}
        </button>
      </div>

      {/* Month Selector */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <label className="text-sm font-medium text-slate-700">เดือน:</label>
        <select
          value={currentMonth}
          onChange={(e) => setCurrentMonth(Number(e.target.value))}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          {monthNames.map((name, idx) => (
            <option key={idx + 1} value={idx + 1}>
              {name} {currentYear + 543}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2 ml-auto text-sm text-slate-500">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span> บุคลากร
          <span className="w-3 h-3 rounded-full bg-green-500"></span> นักศึกษา
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            {editingSchedule ? "แก้ไขรอบสอบ" : "เพิ่มรอบสอบใหม่"}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">วันที่</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ช่วงเวลา</label>
              <select
                value={formData.timeSlot}
                onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              >
                <option value="morning">09:00-10:30 (เช้า)</option>
                <option value="afternoon">13:30-15:00 (บ่าย)</option>
                <option value="evening">15:00-16:00 (เย็น)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ประเภทผู้เข้าสอบ</label>
              <select
                value={formData.examType}
                onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              >
                <option value="staff">บุคลากร</option>
                <option value="student">นักศึกษา</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                สถานที่
                {formData.studentCount > 40 && (
                  <span className="text-amber-600 text-xs ml-2">(ผู้สอบเกิน 40 คน → ใช้ทั้ง 2 ห้อง)</span>
                )}
              </label>
              <div className="flex gap-4 flex-wrap">
                {["ห้อง 406", "ห้อง 407", "CEM"].map((room) => (
                  <label key={room} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.locations?.includes(room) || false}
                      disabled={room !== "CEM" && formData.studentCount > 40}
                      onChange={(e) => {
                        const current = formData.locations || [];
                        // CEM can be selected independently
                        if (room === "CEM") {
                          const newRooms = e.target.checked
                            ? [...current, room]
                            : current.filter((r) => r !== room);
                          setFormData({ ...formData, locations: newRooms });
                        } else {
                          // Rooms 406/407 follow the >40 rule
                          if (formData.studentCount > 40) {
                            // Auto-managed, don't allow manual changes
                            return;
                          }
                          // If <= 40, can only select 1 room
                          const newRooms = e.target.checked ? [room] : [];
                          // Keep CEM if it was selected
                          const cemSelected = current.includes("CEM");
                          setFormData({
                            ...formData,
                            locations: cemSelected ? [...newRooms, "CEM"] : newRooms,
                          });
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`text-sm ${room !== "CEM" && formData.studentCount > 40 ? "text-slate-400" : "text-slate-700"}`}>
                      {room}
                    </span>
                  </label>
                ))}
              </div>
              {formData.locations?.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  ห้องที่เลือก: {formData.locations.join(", ")}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ผู้คุมสอบ (เลือก 2-3 คน)
                {usersLoading && <span className="text-xs text-slate-400 ml-2">(กำลังโหลด...)</span>}
                {!usersLoading && users.length > 0 && (
                  <span className="text-xs text-slate-400 ml-2">({users.length} คน)</span>
                )}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-white">
                {usersLoading ? (
                  <div className="col-span-full text-center text-sm text-slate-400 py-4">
                    กำลังโหลดรายชื่อ...
                  </div>
                ) : users.length === 0 ? (
                  <div className="col-span-full text-center text-sm text-slate-400 py-4">
                    {usersError ? (
                      <span className="text-red-500">เกิดข้อผิดพลาด: {usersError}</span>
                    ) : (
                      <>ไม่พบรายชื่อผู้ใช้ (ตรวจสอบ console หรือ Firestore index)</>
                    )}
                    <button
                      type="button"
                      onClick={fetchUsers}
                      className="mt-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded"
                    >
                      ลองโหลดใหม่
                    </button>
                  </div>
                ) : (
                  users
                    .filter((u) => u.role !== "user")
                    .map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors"
                        htmlFor={`proctor-${u.id}`}
                      >
                        <input
                          id={`proctor-${u.id}`}
                          type="checkbox"
                          checked={formData.proctors.includes(u.id)}
                          onChange={(e) => {
                            const newProctors = e.target.checked
                              ? [...formData.proctors, u.id]
                              : formData.proctors.filter((id) => id !== u.id);
                            setFormData({ ...formData, proctors: newProctors });
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-slate-700 select-none">{u.name || u.displayName || u.email}</span>
                      </label>
                    ))
                )}
              </div>
              {formData.proctors.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  เลือกแล้ว: {formData.proctors.length} คน
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">จำนวนผู้สอบ (โดยประมาณ)</label>
              <input
                type="number"
                value={formData.studentCount}
                onChange={(e) => setFormData({ ...formData, studentCount: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                min="1"
                max="100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">หมายเหตุ (เผื่อคนสอบแทน)</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="เช่น คนสอบแทน: สมชาย"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="isActiveDL"
                checked={formData.isActive !== false}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActiveDL" className="text-sm font-medium text-slate-700 cursor-pointer">
                เปิดใช้งาน
              </label>
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                {editingSchedule ? "บันทึกการแก้ไข" : "สร้างรอบสอบ"}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2 rounded-lg"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Overview: ภาพรวมตารางคุมสอบ DL เดือนนี้ */}
      {monthlyExams.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden mb-2">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">
              ภาพรวมการคุมสอบ DL — {monthNames[currentMonth - 1]} {currentYear + 543}
            </h3>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-2 pr-4 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">วันที่</th>
                  <th className="py-2 pr-4 text-left text-xs font-semibold text-slate-500">ช่วงเวลา</th>
                  <th className="py-2 pr-2 text-center text-xs font-semibold text-emerald-600">406</th>
                  <th className="py-2 pr-2 text-center text-xs font-semibold text-sky-600">407</th>
                  <th className="py-2 pr-4 text-center text-xs font-semibold text-orange-600">CEM</th>
                  <th className="py-2 text-left text-xs font-semibold text-slate-500">ผู้คุมสอบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {monthlyExams.filter(e => e.isActive !== false).map((exam) => {
                  const locs = exam.locations || (exam.location ? [exam.location] : []);
                  const has406 = locs.some(l => l.includes("406"));
                  const has407 = locs.some(l => l.includes("407"));
                  const hasCEM = locs.some(l => l.includes("CEM"));
                  const proctorStr = usersLoading ? "..." : (exam.proctors?.map(getStaffName).join(" / ") || exam.proctorNames?.join(" / ") || "-");
                  const examDate = new Date(exam.date + "T00:00:00");
                  const todayStr2 = new Date().toLocaleDateString("en-CA");
                  const isExamToday = exam.date === todayStr2;
                  return (
                    <tr key={exam.id} className={isExamToday ? "bg-amber-50" : ""}>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        <span className={`font-semibold ${isExamToday ? "text-amber-700" : "text-slate-800"}`}>
                          {examDate.toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                        </span>
                        {isExamToday && <span className="ml-1 text-[10px] bg-amber-100 text-amber-700 px-1 rounded">วันนี้</span>}
                      </td>
                      <td className="py-2 pr-4 text-slate-600 whitespace-nowrap">{timeSlots[exam.timeSlot]?.label || "-"}</td>
                      <td className="py-2 pr-2 text-center">
                        {has406 ? <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold inline-flex items-center justify-center">✓</span> : <span className="text-slate-200">–</span>}
                      </td>
                      <td className="py-2 pr-2 text-center">
                        {has407 ? <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-xs font-bold inline-flex items-center justify-center">✓</span> : <span className="text-slate-200">–</span>}
                      </td>
                      <td className="py-2 pr-4 text-center">
                        {hasCEM ? <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold inline-flex items-center justify-center">✓</span> : <span className="text-slate-200">–</span>}
                      </td>
                      <td className="py-2 text-slate-600 text-xs">{proctorStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">วันที่</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">เวลา</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">ประเภท</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">สถานที่</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">ผู้คุมสอบ</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">หมายเหตุ</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">สถานะ</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {monthlyExams.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-500">
                    ไม่มีตารางคุมสอบในเดือนนี้
                  </td>
                </tr>
              ) : (
                monthlyExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-800">
                      {new Date(exam.date).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {timeSlots[exam.timeSlot]?.label || exam.startTime + "-" + exam.endTime}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          exam.examType === "staff"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {examTypes[exam.examType]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{exam.locations?.join(", ") || exam.location || "-"}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {usersLoading ? (
                        <span className="text-slate-400">กำลังโหลด...</span>
                      ) : (
                        exam.proctors?.map(getStaffName).join(" / ") || exam.proctorNames?.join(" / ") || "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{exam.notes || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          exam.isActive !== false
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {exam.isActive !== false ? "เปิด" : "ปิด"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(exam)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="แก้ไข"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(exam)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="ลบ"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
