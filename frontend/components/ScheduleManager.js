"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { useClassroomSchedules } from "../hooks/useClassroomSchedules";
import { logSystemAction, SystemActions } from "../lib/systemLog";

export default function ScheduleManager() {
  const { user } = useAuth();
  const {
    schedules,
    todaySchedules,
    FLOOR4_ROOMS,
    DAYS,
    loading,
    error,
    fetchSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  } = useClassroomSchedules();

  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [semester, setSemester] = useState("1/2569");
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
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSchedule) {
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
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  const handleDelete = async (schedule) => {
    if (!confirm(`ต้องการลบตารางเรียน "${schedule.subject}" ใช่หรือไม่?`)) {
      return;
    }
    try {
      await deleteSchedule(schedule.id);
      await logSystemAction(
        SystemActions.DELETE_WORKLOG,
        `Deleted classroom schedule: ${schedule.subject} (${schedule.room})`,
        user?.uid
      );
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  // Group schedules by day
  const schedulesByDay = DAYS.map((day) => ({
    day,
    label: dayLabels[day],
    schedules: schedules.filter((s) => s.dayOfWeek === day),
  }));

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            จัดการตารางเรียนชั้น 4
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ห้อง 401, 402, 406, 407
          </p>
          <div className="flex items-center gap-2 mt-2">
            <label className="text-sm text-slate-600">ภาคเรียน:</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="text-sm border border-slate-300 rounded px-2 py-1"
            >
              <option value="1/2569">ภาคเรียนที่ 1/2569</option>
              <option value="2/2569">ภาคเรียนที่ 2/2569</option>
              <option value="1/2570">ภาคเรียนที่ 1/2570</option>
              <option value="2/2570">ภาคเรียนที่ 2/2570</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
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
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Today's Schedule Summary */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-3">
          ตารางเรียนวันนี้ ({dayLabels[DAYS[new Date().getDay()]]})
        </h3>
        {todaySchedules.length === 0 ? (
          <p className="text-sm text-blue-600">ไม่มีตารางเรียนวันนี้</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {todaySchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="bg-white rounded-lg p-3 border border-blue-100"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    ห้อง {schedule.room}
                  </span>
                  <span className="text-xs text-slate-500">
                    {schedule.startTime} - {schedule.endTime}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-900 truncate">
                  {schedule.subject}
                </p>
                {schedule.teacher && (
                  <p className="text-xs text-slate-500">{schedule.teacher}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              {editingSchedule ? "แก้ไขตารางเรียน" : "เพิ่มตารางเรียน"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    ห้องเรียน *
                  </label>
                  <select
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    วัน *
                  </label>
                  <select
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    เวลาเริ่ม *
                  </label>
                  <input
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    เวลาจบ *
                  </label>
                  <input
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  วิชา / กิจกรรม *
                </label>
                <input
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  อาจารย์ผู้สอน
                </label>
                <input
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  หมายเหตุ
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                />
              </div>

              <div className="flex items-center gap-2">
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
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
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
          </div>
        </div>
      )}

      {/* Schedule Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                  วัน
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                  เวลา
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                  ห้อง
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                  วิชา / กิจกรรม
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                  อาจารย์
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
                  หมายเหตุ
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">
                  สถานะ
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-slate-700">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    ยังไม่มีตารางเรียน
                  </td>
                </tr>
              ) : (
                schedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {dayLabels[schedule.dayOfWeek]}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {schedule.startTime} - {schedule.endTime}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        ห้อง {schedule.room}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {schedule.subject}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {schedule.teacher || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {schedule.note || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          schedule.isActive !== false
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {schedule.isActive !== false ? "เปิด" : "ปิด"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(schedule)}
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
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="ลบ"
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
