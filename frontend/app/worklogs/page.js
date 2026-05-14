"use client";

import { useEffect, useState, useCallback, memo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Search,
  Pencil,
  Trash2,
  X,
  Check,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Undo2,
} from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { EmptyState } from "../../components/EmptyState";
import { useAuth } from "../../components/AuthProvider";
import { db } from "../../lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  getDoc,
  setDoc,
  addDoc,
} from "firebase/firestore";
import { logSystemAction, SystemActions } from "../../lib/systemLog";
import { MinorTaskSelector } from "../../components/MinorTaskSelector";
import { CommentSuggestions } from "../../components/CommentSuggestions";
import { TableSkeleton } from "../../components/LoadingSkeleton";
import {
  getCommentSuggestions,
  getMainDutyFromMinorTask,
  hasCommentSuggestions,
} from "../../lib/commentSuggestions";

// Normalize status: รองรับทั้งค่าเก่า (EN: completed/pending) และใหม่ (TH: บันทึกแล้ว/รอดำเนินการ)
function normalizeStatus(status) {
  if (!status) return "บันทึกแล้ว";
  const map = {
    completed: "บันทึกแล้ว",
    pending: "รอดำเนินการ",
    cancelled: "ยกเลิก",
    canceled: "ยกเลิก",
  };
  return map[status.toLowerCase()] || status;
}

export default function WorkLogsPage() {
  const t = useTranslations();
  const { user } = useAuth();
  const router = useRouter();
  const [filters, setFilters] = useState({ search: "", from: "", to: "" });
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "desc",
  });
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [actionError, setActionError] = useState("");

  // Bulk operations state
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Users cache for display name lookup
  const [usersCache, setUsersCache] = useState({});

  // Load users for display name lookup
  useEffect(() => {
    async function loadUsers() {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, limit(100)); // Limit to reduce quota usage
        const snapshot = await getDocs(q);
        const usersMap = {};
        snapshot.docs.forEach((doc) => {
          const userData = doc.data();
          usersMap[doc.id] =
            userData.displayName ||
            userData.fullName ||
            userData.nickname ||
            doc.id;
        });
        setUsersCache(usersMap);
        console.log("[Worklogs] Users loaded:", Object.keys(usersMap).length);
      } catch (err) {
        console.error("[Worklogs] Error loading users:", err);
      }
    }
    loadUsers();
  }, []);

  // Helper to get display name from user cache
  function getDisplayName(item) {
    if (item.employeeId && usersCache[item.employeeId]) {
      return usersCache[item.employeeId];
    }
    // Fallback to stored name
    return (
      item.employeeDisplayName ||
      item.employeeName ||
      item.employeeNickname ||
      "ไม่ระบุ"
    );
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      // Ctrl+N: สร้างรายการใหม่
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        router.push("/worklogs/new");
      }
      // Ctrl+F: โฟกัสที่ช่องค้นหา
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        document
          .querySelector('input[placeholder*="' + t("common.search") + '"]')
          ?.focus();
      }
      // Escape: ยกเลิกการแก้ไขหรือลบ
      if (e.key === "Escape") {
        if (editingId) {
          cancelEdit();
        } else if (deleteConfirmId) {
          cancelDelete();
        } else if (bulkDeleteConfirm) {
          setBulkDeleteConfirm(false);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingId, deleteConfirmId, bulkDeleteConfirm, router, t]);

  async function load(page = 1) {
    setLoading(true);
    console.log("[Worklogs] Loading... user:", user?.uid, "role:", user?.role);
    try {
      const isStaffRole = user?.role !== "admin" && user?.role !== "superadmin";
      const hasDateFilter = filters.from || filters.to;
      let q;

      if (isStaffRole) {
        // Staff: query เฉพาะ employeeId (ไม่ใช้ orderBy เพื่อหลีกเลี่ยง composite index)
        // filter วันที่ที่ client แทน
        q = query(
          collection(db, "worklogs"),
          where("employeeId", "==", user.uid),
          limit(500),
        );
      } else {
        // Admin/Superadmin: ใช้ orderBy date ได้ (ไม่มี where อื่น)
        if (hasDateFilter) {
          const conditions = [];
          if (filters.from) conditions.push(where("date", ">=", filters.from));
          if (filters.to) conditions.push(where("date", "<=", filters.to));
          q = query(
            collection(db, "worklogs"),
            ...conditions,
            orderBy("date", "desc"),
            limit(500),
          );
        } else {
          // ไม่มี filter: ดึงล่าสุด 100 รายการ ประหยัด quota
          q = query(
            collection(db, "worklogs"),
            orderBy("date", "desc"),
            limit(100),
          );
        }
      }

      const snapshot = await getDocs(q);
      console.log("[Worklogs] Got snapshot, size:", snapshot.size);

      let items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Client-side filter: date range สำหรับ staff (admin ใช้ Firestore where แล้ว)
      if (isStaffRole && filters.from) {
        items = items.filter((item) => item.date && item.date >= filters.from);
      }
      if (isStaffRole && filters.to) {
        items = items.filter((item) => item.date && item.date <= filters.to);
      }

      // Client-side filter: search keyword
      if (filters.search) {
        const kw = filters.search.toLowerCase();
        items = items.filter(
          (item) =>
            (item.employeeDisplayName || item.employeeName || "")
              .toLowerCase()
              .includes(kw) ||
            (item.minorTask || "").toLowerCase().includes(kw) ||
            (item.mainDuty || "").toLowerCase().includes(kw) ||
            (item.recipient || "").toLowerCase().includes(kw) ||
            (item.comment || "").toLowerCase().includes(kw),
        );
      }

      // Sort by date+time descending (Firestore orderBy ทำแล้ว แต่ sort time ด้วย)
      items.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        const dateCmp = b.date.localeCompare(a.date);
        if (dateCmp !== 0) return dateCmp;
        return (b.time || "").localeCompare(a.time || "");
      });

      if (sortConfig.direction === "asc" && sortConfig.key === "date") {
        items.reverse();
      }

      console.log("[Worklogs] Items after filter:", items.length);
      setData({ items, total: items.length, page, pages: 1 });
    } catch (err) {
      console.error("[Worklogs] Error loading:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function submit(event) {
    event.preventDefault();
    load(1);
  }

  // Sort functions - memoized
  const handleSort = useCallback((key) => {
    setSortConfig((prev) => {
      const direction =
        prev.key === key && prev.direction === "asc" ? "desc" : "asc";
      return { key, direction };
    });
    load(1);
  }, []);

  const getSortIcon = useCallback(
    (key) => {
      if (sortConfig.key !== key) {
        return <ChevronUp size={14} className="text-slate-300" />;
      }
      return sortConfig.direction === "asc" ? (
        <ChevronUp size={14} className="text-slate-700" />
      ) : (
        <ChevronDown size={14} className="text-slate-700" />
      );
    },
    [sortConfig],
  );

  // Memoized SortableHeader component
  const SortableHeader = useCallback(
    ({ column, label }) => {
      return (
        <th
          className="px-5 py-4 cursor-pointer hover:bg-slate-100/50 transition bg-white/95"
          onClick={() => handleSort(column)}
        >
          <div className="flex items-center gap-1">
            {label}
            {getSortIcon(column)}
          </div>
        </th>
      );
    },
    [handleSort, getSortIcon],
  );

  // Check if user can edit/delete this item
  function canEdit(item) {
    if (!user) return false;
    if (user.role === "admin" || user.role === "superadmin") return true;
    if (
      item.employeeId === user.id ||
      item.employeeNickname === user.nickname
    ) {
      // Check if locked (locked after 23:59 of the record date)
      const recordDate = new Date(item.date);
      const lockTime = new Date(recordDate);
      lockTime.setHours(23, 59, 0, 0);
      const now = new Date();
      return now < lockTime;
    }
    return false;
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditForm({
      recipient: item.recipient || "",
      minorTask: item.minorTask || "",
      mainDuty: item.mainDuty || "",
      comment: item.comment || "",
      status: item.status || "บันทึกแล้ว",
    });
    setActionError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({});
    setActionError("");
  }

  function handleMinorTaskChange(minorTask) {
    const mainDuty = getMainDutyFromMinorTask(minorTask);
    setEditForm((prev) => ({ ...prev, minorTask, mainDuty }));
  }

  async function saveEdit(id) {
    try {
      await updateDoc(doc(db, "worklogs", id), {
        ...editForm,
        updatedAt: new Date(),
      });

      // Log action
      await logSystemAction(
        SystemActions.UPDATE_WORKLOG,
        `Updated worklog: ${editForm.date} ${editForm.time} - ${editForm.recipient}`,
        user?.uid,
      );
      setEditingId(null);
      load(data.page);
    } catch (err) {
      setActionError(err.message);
    }
  }

  function confirmDelete(id) {
    setDeleteConfirmId(id);
    setActionError("");
  }

  function cancelDelete() {
    setDeleteConfirmId(null);
    setActionError("");
  }

  // Bulk operations functions
  function toggleSelect(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }

  function toggleSelectAll() {
    const editableIds = data.items
      .filter((item) => canEdit(item))
      .map((item) => item.id);

    if (selectedIds.length === editableIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(editableIds);
    }
  }

  function clearSelection() {
    setSelectedIds([]);
    setBulkDeleteConfirm(false);
  }

  // เก็บข้อมูลสำหรับ Undo
  const [deletedItems, setDeletedItems] = useState([]);
  const [undoTimeout, setUndoTimeout] = useState(null);
  const [showUndo, setShowUndo] = useState(false);

  async function executeBulkDelete() {
    if (selectedIds.length === 0) return;

    setBulkProcessing(true);
    setActionError("");

    try {
      // ดึงข้อมูลก่อนลบสำหรับ Undo
      const itemsToDelete = [];
      for (const id of selectedIds) {
        const docRef = doc(db, "worklogs", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          itemsToDelete.push({ id, ...docSnap.data() });
        }
      }

      // ใช้ Firestore batch ลบทีละหลายรายการ
      const batch = writeBatch(db);
      for (const id of selectedIds) {
        batch.delete(doc(db, "worklogs", id));
      }
      await batch.commit();

      // เก็บข้อมูลสำหรับ Undo
      setDeletedItems(itemsToDelete);
      setShowUndo(true);

      // ตั้งเวลา 30 วินาทีสำหรับ Undo
      const timeout = setTimeout(() => {
        setShowUndo(false);
        setDeletedItems([]);
        // บันทึก audit log
        logAuditEvent("BULK_DELETE", {
          count: itemsToDelete.length,
          ids: selectedIds,
        });
      }, 30000);
      setUndoTimeout(timeout);

      setSelectedIds([]);
      setBulkDeleteConfirm(false);
      load(data.page);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBulkProcessing(false);
    }
  }

  async function undoDelete() {
    if (deletedItems.length === 0) return;

    try {
      // ใช้ batch สร้างข้อมูลคืน
      const batch = writeBatch(db);
      for (const item of deletedItems) {
        const { id, ...data } = item;
        batch.set(doc(db, "worklogs", id), data);
      }
      await batch.commit();

      // ล้าง timeout และ state
      if (undoTimeout) clearTimeout(undoTimeout);
      setShowUndo(false);
      setDeletedItems([]);

      // บันทึก audit log
      logAuditEvent("UNDO_DELETE", { count: deletedItems.length });

      load(data.page);
    } catch (err) {
      setActionError("ไม่สามารถกู้คืนข้อมูลได้: " + err.message);
    }
  }

  async function executeDelete(id) {
    try {
      // ดึงข้อมูลก่อนลบ
      const docRef = doc(db, "worklogs", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setDeletedItems([{ id, ...docSnap.data() }]);
      }

      await deleteDoc(docRef);

      // Log action
      await logSystemAction(
        SystemActions.DELETE_WORKLOG,
        `Deleted worklog: ${deletedItems[0]?.date} ${deletedItems[0]?.time} - ${deletedItems[0]?.recipient || deletedItems[0]?.requesterName}`,
        user?.uid,
      );

      setDeleteConfirmId(null);
      setShowUndo(true);

      // ตั้งเวลา 30 วินาที
      const timeout = setTimeout(() => {
        setShowUndo(false);
        setDeletedItems([]);
        logAuditEvent("DELETE", { id });
      }, 30000);
      setUndoTimeout(timeout);

      load(data.page);
    } catch (err) {
      setActionError(err.message);
    }
  }

  // ฟังก์ชันบันทึก Audit Log
  async function logAuditEvent(action, details) {
    try {
      await addDoc(collection(db, "auditLogs"), {
        action,
        details,
        userId: user?.uid,
        userEmail: user?.email,
        timestamp: new Date(),
        path: window.location.pathname,
      });
    } catch (err) {
      console.error("Audit log error:", err);
    }
  }

  const editSuggestions = editingId
    ? getCommentSuggestions(editForm.minorTask)
    : [];
  const hasEditSuggestions = hasCommentSuggestions(editForm.minorTask);

  return (
    <AppShell>
      <section className="mb-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            {t("worklog.history")}
          </p>
          <h1 className="mt-3 text-5xl font-semibold tracking-tight text-slate-950">
            {t("navigation.worklogs")}
          </h1>
        </div>
      </section>

      <form
        onSubmit={submit}
        className="apple-panel mb-6 grid gap-4 p-4 md:grid-cols-[1.5fr_0.7fr_0.7fr_auto]"
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            className="apple-input pl-11"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder={t("common.search") + "..."}
          />
        </div>
        <input
          className="apple-input"
          type="date"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
        />
        <input
          className="apple-input"
          type="date"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
        />
        <button className="apple-button" disabled={loading}>
          {loading ? t("common.loading") : t("common.filter")}
        </button>
      </form>

      {error ? (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {actionError ? (
        <div className="mb-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          {actionError}
        </div>
      ) : null}

      {/* Undo Notification */}
      {showUndo && (
        <div className="mb-6 rounded-2xl bg-blue-50 border border-blue-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 text-white rounded-full p-1">
              <Undo2 size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">
                ลบ {deletedItems.length} รายการแล้ว
              </p>
              <p className="text-xs text-blue-600">
                กด Undo เพื่อกู้คืนภายใน 30 วินาที
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={undoDelete}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition flex items-center gap-1"
            >
              <Undo2 size={14} />
              Undo
            </button>
            <button
              onClick={() => {
                if (undoTimeout) clearTimeout(undoTimeout);
                setShowUndo(false);
                setDeletedItems([]);
              }}
              className="px-3 py-2 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="apple-panel overflow-hidden">
          <TableSkeleton rows={5} columns={9} />
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="apple-panel overflow-hidden">
          {/* Bulk Operations Toolbar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">
                  เลือก {selectedIds.length} รายการ
                </span>
                <button
                  onClick={clearSelection}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  ยกเลิกการเลือก
                </button>
              </div>
              <div className="flex gap-2">
                {bulkDeleteConfirm ? (
                  <>
                    <span className="text-xs text-red-600 flex items-center">
                      ยืนยันการลบ {selectedIds.length} รายการ?
                    </span>
                    <button
                      onClick={executeBulkDelete}
                      disabled={bulkProcessing}
                      className="apple-button bg-red-600 hover:bg-red-700 text-sm py-1.5 px-3"
                    >
                      {bulkProcessing ? "กำลังลบ..." : "ยืนยันลบ"}
                    </button>
                    <button
                      onClick={() => setBulkDeleteConfirm(false)}
                      className="apple-button-secondary text-sm py-1.5 px-3"
                    >
                      ยกเลิก
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setBulkDeleteConfirm(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={14} />
                    ลบที่เลือก ({selectedIds.length})
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="overflow-x-auto max-h-[70vh]">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm text-xs uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                <tr>
                  <th className="px-3 py-4 bg-white/95">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      checked={
                        selectedIds.length > 0 &&
                        selectedIds.length ===
                          data.items.filter((i) => canEdit(i)).length
                      }
                      onChange={toggleSelectAll}
                      title="เลือกทั้งหมด"
                    />
                  </th>
                  <SortableHeader
                    column="date"
                    label={t("worklog.table.date")}
                  />
                  <SortableHeader
                    column="employeeNickname"
                    label={t("worklog.table.employee")}
                  />
                  <th className="px-5 py-4 bg-white/95">
                    {t("worklog.table.recipient")}
                  </th>
                  <SortableHeader
                    column="mainDuty"
                    label={t("worklog.table.mainDuty")}
                  />
                  <SortableHeader
                    column="minorTask"
                    label={t("worklog.table.minorTask")}
                  />
                  <th className="px-5 py-4 bg-white/95">
                    {t("worklog.table.comment")}
                  </th>
                  <SortableHeader
                    column="status"
                    label={t("worklog.table.status")}
                  />
                  <th className="px-5 py-4 bg-white/95"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((item) => (
                  <tr
                    key={item.id}
                    className={`bg-white/45 align-top ${selectedIds.includes(item.id) ? "bg-blue-50/50" : ""}`}
                  >
                    {editingId === item.id ? (
                      // Edit Mode
                      <>
                        <td className="px-3 py-4">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            disabled={!canEdit(item)}
                          />
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {item.date}
                          <br />
                          <span className="text-xs">{item.time}</span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-950">
                          {getDisplayName(item)}
                        </td>
                        <td className="px-5 py-4">
                          <input
                            className="apple-input text-sm py-1.5"
                            value={editForm.recipient}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                recipient: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td className="px-5 py-4">
                          <div className="apple-input bg-slate-50 text-sm py-1.5 text-slate-700">
                            {editForm.mainDuty}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <MinorTaskSelector
                            value={editForm.minorTask}
                            onChange={handleMinorTaskChange}
                            placeholder={t("worklog.form.minorTaskPlaceholder")}
                          />
                        </td>
                        <td className="px-5 py-4 min-w-64">
                          <textarea
                            className="apple-input text-sm min-h-20 resize-y"
                            value={editForm.comment}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                comment: e.target.value,
                              })
                            }
                          />
                          {hasEditSuggestions && (
                            <div className="mt-2">
                              <CommentSuggestions
                                suggestions={editSuggestions}
                                selected={editForm.comment}
                                onSelect={(suggestion) =>
                                  setEditForm({
                                    ...editForm,
                                    comment: suggestion,
                                  })
                                }
                              />
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            {t("worklog.table.editable")}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(item.id)}
                              className="rounded-full bg-emerald-100 p-2 text-emerald-700 hover:bg-emerald-200"
                              title={t("common.confirm")}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
                              title={t("common.cancel")}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      // View Mode
                      <>
                        <td className="px-3 py-4">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelect(item.id)}
                            disabled={!canEdit(item)}
                          />
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {item.date}
                          <br />
                          <span className="text-xs">{item.time}</span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-950">
                          {getDisplayName(item)}
                        </td>
                        <td className="min-w-32 px-5 py-4 text-slate-600">
                          {item.recipient || "—"}
                        </td>
                        <td className="min-w-72 px-5 py-4 text-slate-700">
                          {item.mainDuty}
                        </td>
                        <td className="min-w-56 px-5 py-4 text-slate-600">
                          {item.minorTask || "—"}
                        </td>
                        <td className="min-w-64 px-5 py-4 text-slate-600">
                          {item.comment || "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              normalizeStatus(item.status) === "บันทึกแล้ว"
                                ? "bg-green-50 text-green-700"
                                : normalizeStatus(item.status) === "รอดำเนินการ"
                                  ? "bg-yellow-50 text-yellow-700"
                                  : normalizeStatus(item.status) === "ยกเลิก"
                                    ? "bg-red-50 text-red-600"
                                    : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {normalizeStatus(item.status)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          {canEdit(item) && (
                            <div className="flex gap-2">
                              {deleteConfirmId === item.id ? (
                                <>
                                  <button
                                    onClick={() => executeDelete(item.id)}
                                    className="rounded-full bg-red-100 p-2 text-red-700 hover:bg-red-200"
                                    title={t("common.confirm")}
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={cancelDelete}
                                    className="rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
                                    title={t("common.cancel")}
                                  >
                                    <X size={16} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEdit(item)}
                                    className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
                                    title={t("worklog.table.edit")}
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button
                                    onClick={() => confirmDelete(item.id)}
                                    className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-red-100 hover:text-red-700"
                                    title={t("worklog.table.delete")}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
            <span>
              {t("worklog.table.totalRecords")}: {data.total.toLocaleString()}
            </span>
            <div className="flex gap-2">
              <button
                className="apple-button-secondary py-2"
                disabled={data.page <= 1}
                onClick={() => load(data.page - 1)}
              >
                {t("common.previous") || "Previous"}
              </button>
              <button
                className="apple-button-secondary py-2"
                disabled={data.page >= data.pages}
                onClick={() => load(data.page + 1)}
              >
                {t("common.next") || "Next"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// Memoized WorkLogRow component for better performance
const WorkLogRow = memo(function WorkLogRow({
  item,
  isEditing,
  isSelected,
  canEditItem,
  onToggleSelect,
  onStartEdit,
  onConfirmDelete,
  editForm,
  setEditForm,
  handleMinorTaskChange,
  editSuggestions,
  hasEditSuggestions,
  onSaveEdit,
  onCancelEdit,
  t,
}) {
  if (isEditing) {
    return (
      <>
        <td className="px-3 py-4">
          <input
            type="checkbox"
            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            checked={isSelected}
            onChange={onToggleSelect}
            disabled={!canEditItem}
          />
        </td>
        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
          {item.date}
          <br />
          <span className="text-xs">{item.time}</span>
        </td>
        <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-950">
          {getDisplayName(item)}
        </td>
        <td className="px-5 py-4">
          <input
            className="apple-input text-sm py-1.5"
            value={editForm.recipient}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                recipient: e.target.value,
              })
            }
          />
        </td>
        <td className="px-5 py-4">
          <div className="apple-input bg-slate-50 text-sm py-1.5 text-slate-700">
            {editForm.mainDuty}
          </div>
        </td>
        <td className="px-5 py-4">
          <MinorTaskSelector
            value={editForm.minorTask}
            onChange={handleMinorTaskChange}
            placeholder={t("worklog.form.minorTaskPlaceholder")}
          />
        </td>
        <td className="px-5 py-4 min-w-64">
          <textarea
            className="apple-input text-sm min-h-20 resize-y"
            value={editForm.comment}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                comment: e.target.value,
              })
            }
          />
          {hasEditSuggestions && (
            <div className="mt-2">
              <CommentSuggestions
                suggestions={editSuggestions}
                selected={editForm.comment}
                onSelect={(suggestion) =>
                  setEditForm({
                    ...editForm,
                    comment: suggestion,
                  })
                }
              />
            </div>
          )}
        </td>
        <td className="px-5 py-4">
          <select
            className="apple-input text-sm py-1.5"
            value={editForm.status}
            onChange={(e) =>
              setEditForm({ ...editForm, status: e.target.value })
            }
          >
            <option value="บันทึกแล้ว">{t("form.statusRecorded")}</option>
            <option value="รอดำเนินการ">{t("form.statusPending")}</option>
            <option value="ยกเลิก">{t("form.statusCancelled")}</option>
          </select>
        </td>
        <td className="px-5 py-4">
          <div className="flex items-center gap-1">
            <button
              onClick={onSaveEdit}
              className="rounded-lg bg-green-50 p-2 text-green-600 transition hover:bg-green-100"
              title={t("common.save")}
            >
              <Check size={16} />
            </button>
            <button
              onClick={onCancelEdit}
              className="rounded-lg bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100"
              title={t("common.cancel")}
            >
              <X size={16} />
            </button>
          </div>
        </td>
      </>
    );
  }

  return (
    <>
      <td className="px-3 py-4">
        <input
          type="checkbox"
          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          checked={isSelected}
          onChange={onToggleSelect}
          disabled={!canEditItem}
        />
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
        {item.date}
        <br />
        <span className="text-xs">{item.time}</span>
      </td>
      <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-950">
        {item.employeeNickname}
      </td>
      <td className="min-w-32 px-5 py-4 text-slate-600">
        {item.recipient || "—"}
      </td>
      <td className="min-w-72 px-5 py-4 text-slate-700">{item.mainDuty}</td>
      <td className="px-5 py-4">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
          {item.minorTask || "—"}
        </span>
      </td>
      <td className="px-5 py-4">{item.comment || "—"}</td>
      <td className="px-5 py-4">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
            normalizeStatus(item.status) === "บันทึกแล้ว"
              ? "bg-green-50 text-green-700"
              : normalizeStatus(item.status) === "รอดำเนินการ"
                ? "bg-yellow-50 text-yellow-700"
                : normalizeStatus(item.status) === "ยกเลิก"
                  ? "bg-red-50 text-red-600"
                  : "bg-slate-50 text-slate-600"
          }`}
        >
          {normalizeStatus(item.status)}
        </span>
      </td>
      <td className="px-5 py-4">
        {canEditItem && (
          <div className="flex items-center gap-1">
            <button
              onClick={onStartEdit}
              className="rounded-lg bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-100"
              title={t("common.edit")}
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={onConfirmDelete}
              className="rounded-lg bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
              title={t("common.delete")}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </td>
    </>
  );
});
