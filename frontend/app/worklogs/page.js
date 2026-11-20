"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
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
  List,
  CalendarDays,
} from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { EmptyState } from "../../components/EmptyState";
import { WorklogHistoryCalendar } from "../../components/WorklogHistoryCalendar";
import { WorklogHistoryDetails, WorklogHistoryList, WorklogHistoryToolbar } from "../../components/WorklogHistoryWorkspace";
import { Dialog } from "../../components/ui/Dialog";
import { GlassButton } from "../../components/ui/GlassControls";
import "../dev/history/history.css";
import "./worklog-workspace.css";
import { useAuth } from "../../components/AuthProvider";
import { db } from "../../lib/firebase";
import { addCalendarDays, addCalendarMonths, calendarRange, calendarToday } from "../../lib/calendarView";
import { WORKLOG_HISTORY_READ_LIMIT, worklogHistoryMonth, worklogHistoryRange } from "../../lib/worklogHistoryRange";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
  getDoc,
  deleteField,
  runTransaction,
  serverTimestamp,
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
import { getDutyGroupFromMinorTask, normalizeStatus } from "../../lib/worklogUtils";
import { indexedWorklogEdit } from "../../lib/resourceStatusIndex";
import { isAdminRole, worklogEntryPath } from "../../lib/authUtils";
import { DL_WORKLOG_TASK, isDlRoundWorklog, validateDlWorklogDate } from "../../lib/dlQuickLog";

const workspaceEnabled = process.env.NEXT_PUBLIC_WORKLOG_WORKSPACE === "1";
const emptyResult = { items: [], total: 0, truncated: false, error: "" };

export default function WorkLogsPage() {
  const { user } = useAuth();
  return <WorklogHistory key={user?.uid || "anonymous"} user={user} />;
}

function WorklogHistory({ user }) {
  const t = useTranslations();
  const router = useRouter();
  const [filters, setFilters] = useState({ search: "", from: "", to: "" });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [result, setResult] = useState(null);
  const [revision, setRevision] = useState(0);
  const [sortConfig, setSortConfig] = useState({
    key: "date",
    direction: "desc",
  });
  const [filterError, setFilterError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [actionError, setActionError] = useState("");

  // Bulk operations state
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // View mode: list | calendar
  const [viewMode, setViewMode] = useState(workspaceEnabled ? "list" : "calendar");
  const [detailId, setDetailId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const [calendarMonth, setCalendarMonth] = useState(() => calendarRange(calendarToday(), "month").start);
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(null);
  const monthScope = viewMode === "calendar" ? calendarMonth : null;
  const isStaff = !isAdminRole(user);
  const uid = user?.uid;
  const queryKey = JSON.stringify([uid, isStaff, appliedFilters, monthScope, revision]);
  const current = result?.key === queryKey ? result : null;
  const data = current || emptyResult;
  const loading = Boolean(uid && !current);
  const error = filterError || data.error;
  const reload = () => setRevision(version => version + 1);
  const openRecord = () => router.push(worklogEntryPath(user?.role));

  // Users cache for display name lookup
  const [usersCache, setUsersCache] = useState({});

  // Load users for display name lookup
  useEffect(() => {
    if (!user?.uid) return;
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
      } catch (err) {
        console.error("[Worklogs] Error loading users for display names:", err);
      }
    }
    loadUsers();
  }, [user?.uid]);

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
        router.push(worklogEntryPath(user?.role));
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
  }, [editingId, deleteConfirmId, bulkDeleteConfirm, router, t, user?.role]);

  useEffect(() => {
    if (!uid) return;
    let active = true;
    const range = worklogHistoryRange(appliedFilters, monthScope);
    setVisibleCount(30);
    if (range.empty) {
      setResult({ ...emptyResult, key: queryKey });
      return;
    }

    async function readHistory() {
      try {
        const conditions = [];
        if (isStaff) conditions.push(where("employeeId", "==", uid));
        const legacyStaffList = isStaff && !workspaceEnabled && !monthScope;
        if (!legacyStaffList) {
          if (range.start) conditions.push(where("date", ">=", range.start));
          if (range.end) conditions.push(where("date", "<=", range.end));
          conditions.push(orderBy("date", "desc"));
        }
        const snapshot = await getDocs(query(collection(db, "worklogs"), ...conditions, limit(WORKLOG_HISTORY_READ_LIMIT)));
        if (!active) return;

        const keyword = appliedFilters.search.toLowerCase();
        const items = snapshot.docs.map(document => ({ ...document.data(), id: document.id })).filter(item => {
          if (legacyStaffList && ((range.start && !(item.date >= range.start)) || (range.end && !(item.date <= range.end)))) return false;
          return !keyword || [item.employeeDisplayName || item.employeeName, item.minorTask, item.mainDuty, item.recipient, item.comment]
            .some(value => (value || "").toLowerCase().includes(keyword));
        });
        items.sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.time || "").localeCompare(a.time || ""));
        setResult({ ...emptyResult, key: queryKey, items, total: items.length, truncated: snapshot.size === WORKLOG_HISTORY_READ_LIMIT });
      } catch (err) {
        if (active) setResult({ ...emptyResult, key: queryKey, error: workspaceEnabled ? "โหลดประวัติไม่สำเร็จ กรุณาลองใหม่" : err.message });
      }
    }
    readHistory();
    return () => { active = false; };
  }, [uid, isStaff, appliedFilters, monthScope, queryKey]);

  function setMonth(month, day = null) {
    setCalendarMonth(month);
    setCalendarSelectedDate(day);
    setDetailId(null);
    setDetailOpen(false);
  }

  function changeView(view) {
    if (view === viewMode) return;
    if (view === "calendar") {
      const month = worklogHistoryMonth(appliedFilters, calendarMonth);
      if (month !== calendarMonth) setMonth(month);
    }
    setViewMode(view);
    setDetailId(null);
    setDetailOpen(false);
    clearSelection();
  }

  function submit(event) {
    event.preventDefault();
    if (worklogHistoryRange(filters).empty) {
      setFilterError("วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด");
      return;
    }
    setFilterError("");
    if (workspaceEnabled) {
      setDetailId(null);
      setDetailOpen(false);
      clearSelection();
    }
    if (monthScope) {
      const month = worklogHistoryMonth(filters, calendarMonth);
      if (month !== calendarMonth) setMonth(month);
    }
    setAppliedFilters(filters);
    reload();
  }

  function openDetail(item, inCalendar = false) {
    setDetailId(item.id);
    setDetailOpen(inCalendar || window.matchMedia("(max-width:1100px)").matches);
  }

  // Sort functions - memoized
  const handleSort = useCallback((key) => {
    setSortConfig((prev) => {
      const direction =
        prev.key === key && prev.direction === "asc" ? "desc" : "asc";
      return { key, direction };
    });
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
    if (isAdminRole(user)) return true;
    const isOwner =
      item.employeeId === user.uid ||
      item.createdBy === user.uid;
    if (isOwner) {
      if (item.locked === true) return false;
      // ล็อคหลัง 23:59 ของวันที่บันทึก
      const recordDate = new Date(item.date);
      const lockTime = new Date(recordDate);
      lockTime.setHours(23, 59, 0, 0);
      return new Date() < lockTime;
    }
    return false;
  }

  function startEdit(item) {
    if (workspaceEnabled) {
      if (!canEdit(item)) return;
      setDetailOpen(false);
    }
    setEditingId(item.id);
    setEditForm({
      recipient: item.recipient || "",
      minorTask: item.minorTask || "",
      mainDuty: item.mainDuty || "",
      comment: item.comment || "",
      status: item.status || "บันทึกแล้ว",
      ...(isDlRoundWorklog(item) ? { date: item.date } : {}),
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
      if (Object.hasOwn(editForm, "date")) {
        const validation = validateDlWorklogDate(editForm.date);
        if (!validation.valid) throw new Error(validation.error);
      }
      const ref = doc(db, "worklogs", id);
      await runTransaction(db, async tx => {
        const current = await tx.get(ref);
        if (!current.exists()) throw Error("ไม่พบบันทึกงาน");
        const worklog = current.data();
        const fields = { ...editForm, updatedAt: serverTimestamp() };
        if (isDlRoundWorklog(worklog)) {
          if (fields.minorTask !== DL_WORKLOG_TASK) fields.dutyGroup = getDutyGroupFromMinorTask(fields.minorTask);
          if (fields.minorTask !== DL_WORKLOG_TASK || (fields.date ?? worklog.date) !== worklog.date) {
            // Retain dlRoundKey so this history document's ID stays reserved.
            fields.dlProctoring = deleteField();
          }
        }
        tx.update(ref, indexedWorklogEdit(worklog, fields));
      });
      window.dispatchEvent(new Event("worklogUpdated"));

      // Log action
      await logSystemAction(
        SystemActions.UPDATE_WORKLOG,
        `Updated worklog ${id}`,
        user?.uid,
      );
      setEditingId(null);
      if (editSuccessTimer.current) clearTimeout(editSuccessTimer.current);
      setShowEditSuccess(true);
      editSuccessTimer.current = setTimeout(() => setShowEditSuccess(false), 3000);
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  function confirmDelete(id) {
    if (workspaceEnabled) {
      const item = data.items.find(row => row.id === id);
      if (!item || !canEdit(item)) return;
      setDetailOpen(false);
    }
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
  const [showEditSuccess, setShowEditSuccess] = useState(false);
  const editSuccessTimer = useRef(null);

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

      // Dispatch event สำหรับแต่ละ worklog ที่ถูกลบ เพื่อให้ components อื่นอัปเดตสถานะ
      itemsToDelete.forEach(item => {
        window.dispatchEvent(new CustomEvent('worklogDeleted', {
          detail: {
            id: item.id,
            minorTask: item.minorTask,
            comment: item.comment,
            room: item.room,
            equipment: item.equipment,
            date: item.date,
            time: item.time
          }
        }));
      });

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
      reload();
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

      reload();
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

      // Dispatch event เพื่อให้ components อื่นอัปเดตสถานะ
      if (docSnap.exists()) {
        const deletedData = docSnap.data();
        window.dispatchEvent(new CustomEvent('worklogDeleted', {
          detail: {
            id: id,
            minorTask: deletedData.minorTask,
            comment: deletedData.comment,
            room: deletedData.room,
            equipment: deletedData.equipment,
            date: deletedData.date,
            time: deletedData.time
          }
        }));
      }

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

      reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  // ฟังก์ชันบันทึก Audit Log
  async function logAuditEvent(action, details) {
    await logSystemAction(action, JSON.stringify(details), user?.uid);
  }

  const editSuggestions = editingId
    ? getCommentSuggestions(editForm.minorTask)
    : [];
  const hasEditSuggestions = hasCommentSuggestions(editForm.minorTask);

  const activeDetail = data.items.find(item => item.id === detailId);
  const detailProps = { item: activeDetail, displayName: getDisplayName, editable: !!activeDetail && canEdit(activeDetail), onEdit: startEdit, onDelete: confirmDelete };
  const listRows = sortConfig.key === "date" && sortConfig.direction === "asc" ? [...data.items].reverse() : data.items;

  return (
    <>
    {showEditSuccess && typeof document !== 'undefined' && createPortal(
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-yellow-400 text-yellow-900 px-5 py-3 rounded-2xl shadow-xl font-medium text-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        แก้ไขรายการเรียบร้อยแล้ว
      </div>,
      document.body
    )}
    <AppShell>
      {workspaceEnabled ? <WorklogHistoryToolbar
        view={viewMode} onView={changeView} onNew={openRecord}
        filters={filters} onFilters={setFilters} onSubmit={submit} loading={loading} canRecord={Boolean(user)}
      /> : <>
      <section className="mb-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            {t("worklog.history")}
          </p>
          <h1 className="mt-3 text-5xl font-semibold tracking-tight text-slate-950">
            {t("navigation.worklogs")}
          </h1>
        </div>
        {/* View Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => changeView("list")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              viewMode === "list" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <List size={15} /> รายการ
          </button>
          <button
            onClick={() => changeView("calendar")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              viewMode === "calendar" ? "bg-white shadow-sm text-slate-950" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <CalendarDays size={15} /> ปฏิทิน
          </button>
        </div>
      </section>

      <form
        onSubmit={submit}
        className="apple-panel mb-6 flex flex-col gap-3 p-4 sm:grid sm:grid-cols-[1fr_auto] md:grid-cols-[1.5fr_0.7fr_0.7fr_auto]"
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
        <div className="flex gap-2 sm:contents">
          <input
            className="apple-input flex-1"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
          <input
            className="apple-input flex-1"
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
        </div>
        <button className="apple-button w-full sm:w-auto" disabled={loading}>
          {loading ? t("common.loading") : t("common.filter")}
        </button>
      </form>
      </>}

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

      {viewMode === "calendar" && <WorklogHistoryCalendar
        month={calendarMonth} day={calendarSelectedDate} items={data.items}
        loading={loading} error={data.error} truncated={data.truncated}
        onMoveMonth={offset => setMonth(addCalendarMonths(calendarMonth, offset))}
        onToday={() => { const today = calendarToday(); setMonth(calendarRange(today, "month").start, today); }}
        onDay={setCalendarSelectedDate} getDisplayName={getDisplayName}
        onOpen={workspaceEnabled ? item => openDetail(item, true) : undefined}
        canEdit={canEdit} onEdit={startEdit} onDelete={confirmDelete}
      />}

      {workspaceEnabled && viewMode === "list" && <>
        <div className="history-summary" role="status"><span>{loading ? "กำลังโหลดประวัติ…" : `${data.items.length} รายการ${data.truncated ? " · แสดงจากผลค้นหาสูงสุด 500 รายการ" : ""}`}</span>{data.items.some(canEdit) && <button className="history-link" type="button" onClick={toggleSelectAll}>เลือกทั้งหมดที่แก้ไขได้</button>}</div>
        {selectedIds.length > 0 && <div className="history-selection">
          <span>เลือก {selectedIds.length} รายการ</span><GlassButton mode="quick" disabled={bulkProcessing} onClick={clearSelection}>ล้างการเลือก</GlassButton>
          <GlassButton mode="quick" variant="destructive" disabled={bulkProcessing} onClick={() => setBulkDeleteConfirm(true)}>ลบรายการที่เลือก</GlassButton>
        </div>}
        <div className="history-layout">
          <div className="history-content" aria-busy={loading}>
            {loading ? <TableSkeleton rows={4} columns={3} /> : <WorklogHistoryList items={listRows.slice(0, visibleCount)} activeId={detailId} onOpen={openDetail} displayName={getDisplayName} selectable={canEdit} selectedIds={selectedIds} onSelect={toggleSelect} ascending={sortConfig.direction === "asc"} onSort={() => setSortConfig(previous => ({ key: "date", direction: previous.direction === "asc" ? "desc" : "asc" }))} />}
            {!loading && visibleCount < listRows.length && <GlassButton mode="quick" onClick={() => setVisibleCount(count => count + 30)}>แสดงเพิ่ม</GlassButton>}
          </div>
          <aside className="history-inspector" aria-label="รายละเอียดงาน" aria-live="polite"><h2>รายละเอียดงาน</h2><WorklogHistoryDetails {...detailProps} /></aside>
        </div>
      </>}

      {!workspaceEnabled && viewMode === "list" ? (
        loading ? (
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
                {listRows.map((item) => (
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
                          {/* สำหรับ QuickLog (มี equipment/room) แสดงเฉพาะชื่ออุปกรณ์/ห้องเรียน */}
                          {(item.equipment || item.room) ? (
                            <div className="text-slate-600">
                              {item.equipment || item.room}
                            </div>
                          ) : (
                            /* สำหรับการบันทึกปกติ แสดง comment */
                            item.comment || "—"
                          )}
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
                disabled
              >
                {t("common.previous") || "Previous"}
              </button>
              <button
                className="apple-button-secondary py-2"
                disabled
              >
                {t("common.next") || "Next"}
              </button>
            </div>
          </div>
        </div>
        )
      ) : null}

      {/* ── Edit Modal (Calendar view) ── */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <button type="button" tabIndex={-1} aria-label="ปิดหน้าต่างแก้ไข" className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={cancelEdit} />
          {/* Sheet */}
          <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-950">แก้ไขรายการ</h3>
              <button onClick={cancelEdit} aria-label="ปิดหน้าต่างแก้ไข" className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition">
                <X size={18} />
              </button>
            </div>

            {actionError && (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <AlertCircle size={15} /> {actionError}
              </div>
            )}

            <div className="space-y-4">
              {Object.hasOwn(editForm, "date") && <div>
                <label className="apple-label" htmlFor="worklog-edit-date">วันที่บันทึกงาน</label>
                <input id="worklog-edit-date" type="date" className="apple-input"
                  max={addCalendarDays(calendarToday(), 1)} value={editForm.date}
                  onChange={event => setEditForm(previous => ({ ...previous, date: event.target.value }))} />
              </div>}
              {/* Recipient */}
              <div>
                <label className="apple-label" htmlFor="worklog-edit-recipient">ผู้รับบริการ</label>
                <input id="worklog-edit-recipient"
                  className="apple-input"
                  value={editForm.recipient || ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, recipient: e.target.value }))}
                  placeholder="ระบุผู้รับบริการ"
                />
              </div>

              {/* Minor Task */}
              <MinorTaskSelector
                value={editForm.minorTask || ""}
                onChange={handleMinorTaskChange}
                label="หัวข้อรอง"
              />

              {/* Main Duty (read-only) */}
              {editForm.mainDuty && (
                <div>
                  <p className="apple-label">หัวข้อหลัก</p>
                  <div className="apple-input bg-slate-50 text-slate-600 flex items-center justify-between">
                    <span>{editForm.mainDuty}</span>
                    <span className="text-xs text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full ml-2 shrink-0">อัตโนมัติ</span>
                  </div>
                </div>
              )}

              {/* Comment */}
              <div>
                <label className="apple-label" htmlFor="worklog-edit-comment">รายละเอียด</label>
                <textarea id="worklog-edit-comment"
                  className="apple-input min-h-20 resize-y"
                  value={editForm.comment || ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, comment: e.target.value }))}
                  placeholder="รายละเอียดเพิ่มเติม"
                />
                <CommentSuggestions
                  minorTask={editForm.minorTask}
                  selected={editForm.comment}
                  onSelect={(s) => setEditForm((p) => ({ ...p, comment: s }))}
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => saveEdit(editingId)}
                className="apple-button flex-1"
              >
                <Check size={16} className="inline mr-1" /> บันทึก
              </button>
              <button onClick={cancelEdit} className="apple-button-secondary flex-1">
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {(viewMode === "calendar" || workspaceEnabled) && (
        <Dialog
          open={Boolean(deleteConfirmId)}
          onClose={cancelDelete}
          title="ยืนยันการลบ"
          footer={<>
            <GlassButton mode="quick" onClick={cancelDelete}>ยกเลิก</GlassButton>
            <GlassButton mode="quick" variant="destructive" onClick={() => executeDelete(deleteConfirmId)}>
              ลบรายการ
            </GlassButton>
          </>}
        >
          <p className="ui-caption">ใช้ Undo เพื่อกู้คืนรายการได้ภายใน 30 วินาทีหลังลบ</p>
          {actionError && (
            <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </p>
          )}
        </Dialog>
      )}
      {workspaceEnabled && <>
        <Dialog open={detailOpen && Boolean(activeDetail)} onClose={() => setDetailOpen(false)} title="รายละเอียดงาน" className="history-dialog"><WorklogHistoryDetails {...detailProps} /></Dialog>
        <Dialog open={bulkDeleteConfirm} busy={bulkProcessing} onClose={() => setBulkDeleteConfirm(false)} title="ยืนยันลบรายการ" footer={<><GlassButton mode="quick" disabled={bulkProcessing} onClick={() => setBulkDeleteConfirm(false)}>ยกเลิก</GlassButton><GlassButton mode="quick" variant="destructive" disabled={bulkProcessing || selectedIds.length === 0} onClick={executeBulkDelete}>ลบรายการ</GlassButton></>}>
          <p>ลบ {selectedIds.length} รายการ สามารถเลิกทำได้ภายใน 30 วินาที</p>
        </Dialog>
      </>}
    </AppShell>
    </>
  );
}
