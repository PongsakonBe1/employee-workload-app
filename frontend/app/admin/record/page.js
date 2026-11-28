"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { collection, doc, getDocsFromServer, query, runTransaction, serverTimestamp, where } from "firebase/firestore";
import { AppShell } from "../../../components/AppShell";
import { useAuth } from "../../../components/AuthProvider";
import { Toast } from "../../../components/Toast";
import { RecordHeading, WorklogRecordReview, WorklogRecordWorkspace } from "../../../components/WorklogRecordWorkspace";
import { useAutoUpdateDateTime } from "../../../hooks/useAutoUpdateDateTime";
import { isAdminRole } from "../../../lib/authUtils";
import { nowTime, today } from "../../../lib/dateUtils";
import { auth, db } from "../../../lib/firebase";
import { withWorklogResourceIndex } from "../../../lib/resourceStatusIndex";
import { logSystemAction, SystemActions } from "../../../lib/systemLog";
import { sanitizeInput, validateWorklogForm } from "../../../lib/validation";
import { labelWorklogOperators } from "../../../lib/worklogOperatorLabels";
import { dispatchEquipmentStatusEvents } from "../../../lib/worklogUtils";

const priority = { superadmin: 3, admin: 2, staff: 1 };

function emptyForm(date = today()) {
  return { date, time: nowTime(), recipient: "", minorTask: "", mainDuty: "", dutyGroup: "", comment: "" };
}

export default function AdminRecordPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = isAdminRole(user);

  useEffect(() => {
    if (user && !isAdmin) router.replace("/dashboard");
  }, [isAdmin, router, user]);

  return <AppShell showBreadcrumb={false}>
    {isAdmin && <TeamRecord key={user.uid} user={user} />}
  </AppShell>;
}

function TeamRecord({ user }) {
  const t = useTranslations("worklog");
  const [form, setForm] = useState(emptyForm);
  const [mode, setMode] = useState("quick");
  const [employeeId, setEmployeeId] = useState("");
  const [directory, setDirectory] = useState(null);
  const [directoryAttempt, setDirectoryAttempt] = useState(0);
  const [revision, setRevision] = useState(0);
  const [review, setReview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submitLock = useRef(false);
  const drafts = useRef(new Map());

  useAutoUpdateDateTime(setForm, mode === "quick" && !form.dateTimeEdited);

  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    let current = true;
    const assignedRoles = query(collection(db, "users"), where("role", "in", Object.keys(priority)));
    getDocsFromServer(assignedRoles).then(snapshot => {
      const activePeople = snapshot.docs
        .map(document => ({ ...document.data(), id: document.id, uid: document.id }))
        .filter(person => person.active !== false);
      const people = labelWorklogOperators(activePeople)
        .sort((a, b) => priority[b.role] - priority[a.role] || a.label.localeCompare(b.label, "th"));
      if (current) setDirectory({ people, status: "ready", attempt: directoryAttempt });
    }).catch(() => {
      if (current) setDirectory({ people: [], status: "error", attempt: directoryAttempt });
    });
    return () => { current = false; };
  }, [directoryAttempt]);

  const directoryLoading = directory?.attempt !== directoryAttempt;
  const people = directoryLoading ? [] : directory.people;
  const person = people.find(person => person.id === employeeId);

  function selectPerson(nextId) {
    if (submitLock.current) return;
    if (employeeId) drafts.current.set(employeeId, form);
    setForm(drafts.current.get(nextId) || emptyForm());
    setEmployeeId(nextId);
    setError("");
    setMessage("");
  }

  function onReview(event) {
    event.preventDefault();
    if (submitLock.current || !person || auth.currentUser?.uid !== user.uid) return;
    const validation = validateWorklogForm(form);
    if (!validation.valid) {
      setError(Object.values(validation.errors)[0]);
      return;
    }
    setError("");
    setReview({
      actorId: user.uid,
      employeeId: person.id,
      employeeLabel: person.label,
      employeeFullName: typeof person.fullName === "string" ? person.fullName.trim() || "—" : "—",
      fields: { ...form },
    });
  }

  async function confirm() {
    if (!review || submitLock.current) return;
    const { fields, actorId, employeeId: targetId } = review;
    if (!isAdminRole(user) || auth.currentUser?.uid !== actorId || user.uid !== actorId || person?.id !== targetId) {
      setError("บัญชีหรือผู้ปฏิบัติงานเปลี่ยน กรุณาตรวจรายการอีกครั้ง");
      return;
    }
    submitLock.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const targetRef = doc(db, "users", targetId);
      const worklogRef = doc(collection(db, "worklogs"));
      const worklog = await runTransaction(db, async transaction => {
        const target = await transaction.get(targetRef);
        const staff = target.data();
        if (!staff || !Object.hasOwn(priority, staff.role) || staff.active === false) {
          throw new Error("ผู้ปฏิบัติงานไม่พร้อมรับบันทึก กรุณาเลือกผู้ปฏิบัติงานใหม่");
        }
        if (auth.currentUser?.uid !== actorId) throw new Error("บัญชีเปลี่ยน กรุณาเข้าสู่ระบบอีกครั้ง");

        const worklog = withWorklogResourceIndex({
          date: fields.date,
          time: fields.time,
          employeeId: targetId,
          employeeEmail: staff.email || "",
          employeeNickname: staff.nickname || "",
          employeeDisplayName: staff.displayName || staff.nickname || staff.fullName?.split(" ")[0] || "",
          employeeFullName: staff.fullName || "",
          recipient: sanitizeInput(fields.recipient) || "-",
          dutyGroup: fields.dutyGroup,
          mainDuty: fields.mainDuty,
          minorTask: fields.minorTask,
          comment: sanitizeInput(fields.comment) || "",
          status: "บันทึกโดยผู้ดูแลระบบ",
          source: "admin-created",
          createdBy: actorId,
          createdByEmail: user.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        transaction.set(worklogRef, worklog);
        return worklog;
      });

      drafts.current.delete(targetId);
      setForm(emptyForm(fields.date));
      setReview(null);
      setRevision(current => current + 1);
      setMessage(t("form.saved"));
      dispatchEquipmentStatusEvents(fields.minorTask, fields.comment);
      if (worklog.resourceKeys.length) window.dispatchEvent(new Event("worklogUpdated"));
      if (auth.currentUser?.uid === actorId) {
        await logSystemAction(SystemActions.ADMIN_CREATE_WORKLOG, `Created worklog: ${fields.date} ${fields.time}`, targetId);
      }
    } catch (failure) {
      setError(failure.message || "บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  }

  const picker = <div className="worklog-record-person">
    <label className="ui-field">
      <span>ผู้ปฏิบัติงาน</span>
      <select className="apple-input" value={person?.id || ""} disabled={directoryLoading || !people.length || saving} onChange={event => selectPerson(event.target.value)}>
        <option value="">{directoryLoading ? "กำลังโหลดรายชื่อ…" : "เลือกผู้ปฏิบัติงาน"}</option>
        {people.map(person => <option key={person.id} value={person.id}>{person.label}</option>)}
      </select>
    </label>
    {!directoryLoading && directory.status === "error" && <button type="button" className="record-link" onClick={() => setDirectoryAttempt(current => current + 1)}>ลองโหลดรายชื่ออีกครั้ง</button>}
    {!directoryLoading && directory.status === "ready" && !people.length && <span>ไม่พบผู้ปฏิบัติงานที่เปิดใช้งาน</span>}
  </div>;

  return <>
    <RecordHeading />
    <Toast message={message} error={review ? "" : error} onDismissMessage={() => setMessage("")} onDismissError={() => setError("")} />
    <WorklogRecordWorkspace form={form} setForm={setForm} mode={mode} setMode={setMode} person={person}
      directory={picker} busy={saving} onReview={onReview} revision={revision}
      onQuickResult={(value, type) => {
        if (type === "error") { setError(value); return; }
        setError("");
        setMessage(value || t("form.saved"));
        setRevision(current => current + 1);
      }} />
    <WorklogRecordReview review={review} saving={saving} error={review ? error : ""}
      onClose={() => { if (!submitLock.current) { setReview(null); setError(""); } }} onConfirm={confirm} />
  </>;
}
