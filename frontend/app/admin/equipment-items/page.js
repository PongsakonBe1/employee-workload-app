"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  MapPin,
  Search,
  X,
  Save,
} from "lucide-react";
import { AppShell } from "../../../components/AppShell";
import { useAuth } from "../../../components/AuthProvider";
import { isAdminRole } from "../../../lib/authUtils";
import { db } from "../../../lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { MINOR_TASKS } from "../../../lib/commentSuggestions";

// Equipment tasks ที่ใช้ในระบบยืม/คืน
const EQUIPMENT_MINOR_TASKS = MINOR_TASKS.filter(
  (t) => t.includes("ยืม") || t.includes("คืน")
);

// Location presets
const LOCATION_PRESETS = [
  "ห้องบริการชั้น 3",
  "ห้องบริการชั้น 4 (Finn)",
  "ห้อง 401",
  "ห้อง 402",
  "ห้อง 406",
  "ห้อง 407",
];

const EMPTY_FORM = {
  name: "",
  minorTask: "",
  location: "",
  active: true,
  order: 0,
};

export default function EquipmentItemsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTask, setFilterTask] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const isAdmin = isAdminRole(user);

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [user, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) loadItems();
  }, [user]);

  async function loadItems() {
    setLoading(true);
    setError("");
    try {
      const q = query(collection(db, "equipmentItems"), orderBy("minorTask"), orderBy("order"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(data);
    } catch (err) {
      console.error("[EquipmentItems] Error loading:", err);
      // fallback: try without orderBy (index may not exist yet)
      try {
        const snapshot = await getDocs(collection(db, "equipmentItems"));
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (a.minorTask || "").localeCompare(b.minorTask || "") || (a.order || 0) - (b.order || 0));
        setItems(data);
      } catch (err2) {
        setError("โหลดข้อมูลไม่สำเร็จ: " + err2.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name.trim() || !formData.minorTask) {
      setError("กรุณากรอกชื่ออุปกรณ์และเลือกหัวข้อรอง");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingItem) {
        await updateDoc(doc(db, "equipmentItems", editingItem.id), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "equipmentItems"), {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.uid,
        });
      }
      resetForm();
      await loadItems();
    } catch (err) {
      setError("บันทึกไม่สำเร็จ: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(item) {
    try {
      await updateDoc(doc(db, "equipmentItems", item.id), {
        active: !item.active,
        updatedAt: serverTimestamp(),
      });
      await loadItems();
    } catch (err) {
      setError("อัปเดตไม่สำเร็จ: " + err.message);
    }
  }

  async function handleDelete(item) {
    if (!confirm(`ต้องการลบ "${item.name}" ใช่หรือไม่?`)) return;
    try {
      await deleteDoc(doc(db, "equipmentItems", item.id));
      await loadItems();
    } catch (err) {
      setError("ลบไม่สำเร็จ: " + err.message);
    }
  }

  function handleEdit(item) {
    setEditingItem(item);
    setFormData({
      name: item.name || "",
      minorTask: item.minorTask || "",
      location: item.location || "",
      active: item.active !== false,
      order: item.order || 0,
    });
    setShowForm(true);
  }

  function resetForm() {
    setEditingItem(null);
    setFormData({ ...EMPTY_FORM });
    setShowForm(false);
  }

  // Unique minorTasks from items for filter
  const taskOptions = useMemo(() => {
    const tasks = [...new Set(items.map((i) => i.minorTask).filter(Boolean))];
    return tasks.sort();
  }, [items]);

  // Filtered + searched items
  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchTask = filterTask === "all" || item.minorTask === filterTask;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (item.name || "").toLowerCase().includes(q) ||
        (item.location || "").toLowerCase().includes(q) ||
        (item.minorTask || "").toLowerCase().includes(q);
      return matchTask && matchSearch;
    });
  }, [items, filterTask, searchQuery]);

  // Group by minorTask
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((item) => {
      const key = item.minorTask || "ไม่ระบุ";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [filtered]);

  const activeCount = items.filter((i) => i.active).length;
  const inactiveCount = items.filter((i) => !i.active).length;

  if (!user || !isAdmin) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-slate-500">ไม่มีสิทธิ์เข้าถึง</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* Header */}
      <section className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white">
            <Package size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Admin</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">จัดการอุปกรณ์</h1>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          เพิ่ม/แก้ไข/ปิดการใช้งานอุปกรณ์ที่แสดงใน comment suggestions ของระบบยืม-คืน
        </p>
      </section>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <div className="apple-panel p-4">
          <p className="text-sm text-slate-500">อุปกรณ์ทั้งหมด</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{items.length}</p>
        </div>
        <div className="apple-panel p-4">
          <p className="text-sm text-emerald-600">ใช้งานได้</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{activeCount}</p>
        </div>
        <div className="apple-panel p-4">
          <p className="text-sm text-red-500">ปิดการใช้งาน (ชำรุด)</p>
          <p className="mt-1 text-2xl font-semibold text-red-600">{inactiveCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="apple-button flex items-center gap-2"
        >
          <Plus size={16} />
          เพิ่มอุปกรณ์
        </button>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            className="apple-input pl-10 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาอุปกรณ์..."
          />
        </div>
        <select
          value={filterTask}
          onChange={(e) => setFilterTask(e.target.value)}
          className="apple-input text-sm max-w-[200px]"
        >
          <option value="all">ทุกหัวข้อ</option>
          {taskOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="apple-panel p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-950">
              {editingItem ? "แก้ไขอุปกรณ์" : "เพิ่มอุปกรณ์ใหม่"}
            </h2>
            <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="apple-label">ชื่ออุปกรณ์ *</label>
              <input
                type="text"
                className="apple-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="เช่น ICIT25"
                required
              />
            </div>
            <div>
              <label className="apple-label">หัวข้อรอง (minorTask) *</label>
              <select
                className="apple-input"
                value={formData.minorTask}
                onChange={(e) => setFormData({ ...formData, minorTask: e.target.value })}
                required
              >
                <option value="">-- เลือกหัวข้อ --</option>
                {EQUIPMENT_MINOR_TASKS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="apple-label">สถานที่ประจำ</label>
              <input
                type="text"
                className="apple-input"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="เช่น ห้องบริการชั้น 3"
                list="location-presets"
              />
              <datalist id="location-presets">
                {LOCATION_PRESETS.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="apple-label">ลำดับ (order)</label>
              <input
                type="number"
                className="apple-input"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">ใช้งานได้ (แสดงใน suggestions)</span>
              </label>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" disabled={saving} className="apple-button flex items-center gap-2 disabled:opacity-50">
                <Save size={16} />
                {saving ? "กำลังบันทึก..." : editingItem ? "อัปเดต" : "เพิ่มอุปกรณ์"}
              </button>
              <button type="button" onClick={resetForm} className="apple-button-secondary px-4">
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Equipment List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
        </div>
      ) : (
        Object.entries(grouped).map(([task, taskItems]) => (
          <div key={task} className="apple-panel overflow-hidden mb-4">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">{task} ({taskItems.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/60 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-5 py-3">ชื่อ</th>
                    <th className="px-5 py-3">สถานที่</th>
                    <th className="px-5 py-3">สถานะ</th>
                    <th className="px-5 py-3">ลำดับ</th>
                    <th className="px-5 py-3">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {taskItems.map((item) => (
                    <tr key={item.id} className={`${item.active ? "bg-white/45" : "bg-red-50/30"}`}>
                      <td className="px-5 py-3 font-medium text-slate-950">{item.name}</td>
                      <td className="px-5 py-3 text-slate-600">
                        {item.location ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} className="text-slate-400" />
                            {item.location}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {item.active ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <ToggleRight size={14} />
                            ใช้งานได้
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
                            <ToggleLeft size={14} />
                            ปิดใช้งาน
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{item.order || 0}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleToggleActive(item)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                              item.active
                                ? "bg-red-50 text-red-600 hover:bg-red-100"
                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            }`}
                          >
                            {item.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                          </button>
                          <button
                            onClick={() => handleEdit(item)}
                            className="rounded-lg px-2.5 py-1 text-xs font-medium bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center gap-1"
                          >
                            <Pencil size={12} />
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="rounded-lg px-2.5 py-1 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1"
                          >
                            <Trash2 size={12} />
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {!loading && filtered.length === 0 && (
        <div className="apple-panel py-12 text-center text-slate-500">
          {items.length === 0
            ? "ยังไม่มีอุปกรณ์ในระบบ กดปุ่ม \"เพิ่มอุปกรณ์\" เพื่อเริ่มต้น"
            : "ไม่พบอุปกรณ์ตามเงื่อนไขที่เลือก"}
        </div>
      )}
    </AppShell>
  );
}
