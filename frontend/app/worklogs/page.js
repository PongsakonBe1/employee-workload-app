"use client";

import { useEffect, useState, useCallback, memo } from "react";
import { useTranslations } from "next-intl";
import {
  Search,
  Pencil,
  Trash2,
  X,
  Check,
  AlertCircle,
  ChevronUp,
  ChevronDown,
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
} from "firebase/firestore";
import { MinorTaskSelector } from "../../components/MinorTaskSelector";
import { CommentSuggestions } from "../../components/CommentSuggestions";
import { TableSkeleton } from "../../components/LoadingSkeleton";
import {
  getCommentSuggestions,
  getMainDutyFromMinorTask,
  hasCommentSuggestions,
} from "../../lib/commentSuggestions";

export default function WorkLogsPage() {
  const t = useTranslations();
  const { user } = useAuth();
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

  async function load(page = 1) {
    setLoading(true);
    try {
      let q = query(
        collection(db, "worklogs"),
        orderBy(sortConfig.key, sortConfig.direction),
        limit(20),
      );

      if (user?.role !== "admin") {
        q = query(q, where("employeeId", "==", user.uid));
      }

      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setData({ items, total: items.length, page, pages: 1 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = useCallback((event) => {
    event.preventDefault();
    load(1);
  }, []);

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
    if (user.role === "admin") return true;
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

  async function executeBulkDelete() {
    if (selectedIds.length === 0) return;

    setBulkProcessing(true);
    setActionError("");

    try {
      // TODO: Replace with actual bulk delete API
      // For now, delete one by one
      for (const id of selectedIds) {
        await apiFetch(`/worklogs/${id}`, { method: "DELETE" });
      }
      setSelectedIds([]);
      setBulkDeleteConfirm(false);
      load(data.page);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBulkProcessing(false);
    }
  }

  async function executeDelete(id) {
    try {
      await deleteDoc(doc(db, "worklogs", id));
      setDeleteConfirmId(null);
      load(data.page);
    } catch (err) {
      setActionError(err.message);
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
                          {item.employeeNickname}
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
                          {item.employeeNickname}
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
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              item.status === "ล็อกแล้ว" ||
                              item.status === "locked"
                                ? "bg-slate-200 text-slate-600"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {item.status}
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
          {item.employeeNickname}
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
            item.status === "บันทึกแล้ว"
              ? "bg-green-50 text-green-700"
              : item.status === "รอดำเนินการ"
                ? "bg-yellow-50 text-yellow-700"
                : "bg-slate-50 text-slate-600"
          }`}
        >
          {item.status}
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
