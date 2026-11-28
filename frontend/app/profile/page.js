"use client";

import { useEffect, useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { AppShell } from "../../components/AppShell";
import { useAuth } from "../../components/AuthProvider";
import { ProfileStats } from "../../components/ProfileStats";
import { GlassButton } from "../../components/ui/GlassControls";
import { db } from "../../lib/firebase";
import { isAdminRole } from "../../lib/authUtils";
import "./profile.css";

const roleLabels = { staff: "เจ้าหน้าที่", admin: "Admin", superadmin: "Superadmin" };

function ProfileAvatar({ photoURL, name }) {
  const [failed, setFailed] = useState(false);
  return <span className="profile-account-avatar" aria-hidden="true">
    {!failed && /^https:\/\/(?:[a-z0-9-]+\.)+googleusercontent\.com\//i.test(photoURL ?? "")
      ? <img src={photoURL} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      : Array.from(name)[0]?.toLocaleUpperCase()}
  </span>;
}

function ProfileAccount({ user, setUser }) {
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const editButton = useRef(null);
  const form = useRef(null);
  const editing = Boolean(draft);
  const admin = isAdminRole(user);
  const name = user.displayName || user.nickname || user.fullName || "ผู้ใช้งาน";

  useEffect(() => {
    if (editing) form.current?.querySelector("input")?.focus();
  }, [editing]);

  useEffect(() => {
    if (message && !message.error && !saving) editButton.current?.focus();
  }, [message, saving]);

  function toggleEdit() {
    setMessage(null);
    setDraft(draft ? null : {
      fullName: user.fullName ?? "",
      nickname: user.nickname ?? "",
      displayName: user.displayName ?? "",
    });
  }

  async function save(event) {
    event.preventDefault();
    if (!draft || saving) return;
    const fields = { fullName: draft.fullName.trim(), nickname: draft.nickname.trim() };
    if (admin) fields.displayName = draft.displayName.trim() || fields.fullName;
    setSaving(true);
    setMessage(null);
    try {
      await updateDoc(doc(db, "users", user.uid), fields);
      setUser(current => current?.uid === user.uid ? { ...current, ...fields } : current);
      setDraft(null);
      setMessage({ text: "บันทึกข้อมูลแล้ว" });
    } catch {
      setMessage({ text: "บันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง", error: true });
    } finally {
      setSaving(false);
    }
  }

  return <section className="apple-panel profile-account" aria-labelledby="profile-account-title">
    <div className="profile-account-heading">
      <ProfileAvatar key={user.photoURL} photoURL={user.photoURL} name={name} />
      <div><h2 id="profile-account-title">{name}</h2><p>{user.email}</p></div>
      <GlassButton mode="quick" ref={editButton} aria-expanded={Boolean(draft)} disabled={saving} onClick={toggleEdit}>
        {draft ? "ยกเลิกการแก้ไข" : "แก้ไขข้อมูล"}
      </GlassButton>
    </div>
    <details className="profile-account-disclosure">
      <summary>ข้อมูลบัญชี</summary>
      <dl className="profile-account-details">
        <div><dt>บทบาท</dt><dd>{roleLabels[user.role] ?? "ยังไม่ระบุ"}</dd></div>
        <div><dt>สถานะบัญชี</dt><dd>{user.active === true ? "เปิดใช้งาน" : user.active === false ? "ปิดใช้งาน" : "ยังไม่ยืนยัน"}</dd></div>
        <div><dt>ชื่อที่ใช้ลงงาน</dt><dd>{user.displayName || "ยังไม่ได้กำหนด"}</dd></div>
        <div><dt>ชื่อ–นามสกุล</dt><dd>{user.fullName || "—"}</dd></div>
        <div><dt>ชื่อเล่น</dt><dd>{user.nickname || "—"}</dd></div>
      </dl>
    </details>
    {message && <p className="profile-account-feedback" role={message.error ? "alert" : "status"}>{message.text}</p>}
    {draft && <form ref={form} className="profile-account-edit" onSubmit={save}>
      {admin && <div className="ui-field">
        <label htmlFor="profile-display-name">ชื่อที่ใช้ลงงาน</label>
        <input id="profile-display-name" aria-describedby="profile-display-name-hint" className="apple-input" maxLength={200} value={draft.displayName} disabled={saving}
          onChange={event => setDraft({ ...draft, displayName: event.target.value })} />
        <small id="profile-display-name-hint" className="ui-caption">ใช้แสดงในบันทึกงานและรายงาน</small>
      </div>}
      {!admin && <p className="ui-caption">ผู้ดูแลจัดการชื่อที่ใช้ลงงาน</p>}
      <label className="ui-field">
        <span>ชื่อ–นามสกุล</span>
        <input className="apple-input" autoComplete="name" maxLength={200} value={draft.fullName} disabled={saving}
          onChange={event => setDraft({ ...draft, fullName: event.target.value })} />
      </label>
      <div className="ui-field">
        <label htmlFor="profile-nickname">ชื่อเล่น (ไม่บังคับ)</label>
        <input id="profile-nickname" aria-describedby="profile-nickname-hint" className="apple-input" autoComplete="nickname" maxLength={200} value={draft.nickname} disabled={saving}
          onChange={event => setDraft({ ...draft, nickname: event.target.value })} />
        <small id="profile-nickname-hint" className="ui-caption">บางหน้าจะแสดงชื่อเล่นเมื่อยังไม่ได้กำหนดชื่อที่ใช้ลงงาน</small>
      </div>
      <GlassButton mode="quick" variant="prominent" type="submit" disabled={saving}>{saving ? "กำลังบันทึก…" : "บันทึกข้อมูล"}</GlassButton>
    </form>}
  </section>;
}

export default function ProfilePage() {
  const { user, setUser, loading } = useAuth();
  return <AppShell>
    <div className="profile-workspace">
      <header className="ui-page-heading"><h1>โปรไฟล์ของฉัน</h1></header>
      {loading ? <p role="status">กำลังโหลดโปรไฟล์…</p> : !user ? <p>กรุณาเข้าสู่ระบบ</p> : <>
        <ProfileAccount key={user.uid} user={user} setUser={setUser} />
        <section className="profile-workspace-stats" aria-labelledby="profile-stats-title">
          <h2 id="profile-stats-title">สถิติของฉัน</h2>
          <ProfileStats key={user.uid} user={user} />
        </section>
      </>}
    </div>
  </AppShell>;
}
