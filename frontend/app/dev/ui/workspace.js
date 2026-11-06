"use client";

import { useState } from "react";
import { Bell, CalendarDays, FileText, Headphones } from "lucide-react";
import { WorkspaceFrame } from "../../../components/ui/WorkspaceFrame";
import { Dialog } from "../../../components/ui/Dialog";
import { MetricCard } from "../../../components/MetricCard";
import { EmptyState } from "../../../components/EmptyState";
import ViewToggle from "../../../components/ViewToggle";
import { useAppearance } from "../../../components/ui/AppearanceProvider";

// This route mounts real shared components with local display fixtures only.
// It does not supply AuthContext, tokens, API clients or a production identity.
export default function DevelopmentWorkspace() {
  const { resolved } = useAppearance();
  const [role, setRole] = useState("staff"), [pathname, setPathname] = useState("/worklogs/new");
  const [view, setView] = useState("week"), [dialog, setDialog] = useState(null), [status, setStatus] = useState("");
  const [glassMode, setGlassMode] = useState("quick");
  const user = { uid: "UI-FIXTURE-ONLY", displayName: "เจ้าหน้าที่ตัวอย่าง A", role };
  const title = pathname === "/calendar" ? "ตารางและการใช้ห้อง" : pathname === "/resources" ? "ห้องและทรัพยากร" : pathname === "/dashboard" ? "ภาพรวมงาน" : pathname === "/worklogs" ? "ประวัติงาน" : pathname.startsWith("/admin/") && pathname !== "/admin/record" ? "เครื่องมือผู้ดูแล" : "บันทึกงาน";
  return <WorkspaceFrame
    user={user} pathname={pathname}
    glassMode={glassMode}
    onNavigate={setPathname} onLogout={() => setStatus("ตรวจปุ่มออกจากระบบแล้ว — ไม่มี session จริง")}
    notificationSlot={<button
      type="button" className="ui-icon-button"
      aria-label="การแจ้งเตือนตัวอย่าง" onClick={() => setDialog("notifications")}
    >
      <Bell size={20} aria-hidden="true" />
    </button>}
  >
    <section className="ui-dev-toolbar" aria-label="ตัวเลือกตรวจ development">
      <span>Development · ตรวจส่วนกลางด้วยข้อมูลสังเคราะห์</span>
      <a href="/dev/record" className="ui-choice">เปิดหน้าบันทึกงาน · Review 10 + Glass</a>
      <div
        className="ui-glass-comparison" role="group"
        aria-label="เปรียบเทียบวัสดุกระจก"
      >
        <button
          type="button" className="ui-choice"
          aria-pressed={glassMode === "css"} onClick={() => setGlassMode("css")}
        >
          CSS เดิม
        </button>
        <button
          type="button" className="ui-choice"
          aria-pressed={glassMode === "quick"} onClick={() => setGlassMode("quick")}
        >
          QuickLiquid
        </button>
      </div>
      <label>
        บทบาท
        <select
          className="apple-input" aria-label="บทบาทตัวอย่าง"
          value={role} onChange={event => { setRole(event.target.value);setPathname(event.target.value === "staff" ? "/worklogs/new" : "/admin/record"); }}
        >
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select>
      </label>
    </section>
    <p className="ui-caption ui-glass-pilot-note">{glassMode === "css" ? "วัสดุ CSS เดิม · เปรียบเทียบได้โดยไม่ล้างร่างฟอร์ม" : resolved.solid ? "ใช้พื้นทึบตามการตั้งค่าของคุณ · ปิดลดความโปร่งใสเพื่อเปรียบเทียบกระจก" : resolved.reducedMotion ? "QuickLiquid · ลดการเคลื่อนไหวตามการตั้งค่าของคุณ · Safari ใช้ CSS fallback" : "ทดลองขอบแสงและการหักเหเฉพาะแถบควบคุม · Safari ใช้ CSS fallback · ยังต้องตรวจอุปกรณ์จริง"}</p>
    <div className="ui-page-heading">
      <h1>{title}</h1>
      <p>พื้นที่ตรวจ component จริงก่อนทยอยย้ายรายละเอียดแต่ละหน้า</p>
    </div>
    <div className="ui-dev-grid">
      <section>
        <h2 className="ui-section-title">บันทึกด่วน</h2>
        <div className="ui-dev-quick-grid">
          {[["rooms", "เปิด–ปิดห้อง", CalendarDays, "purple"], ["equipment", "ยืม–คืนอุปกรณ์", Headphones, "green"], ["manual", "กรอกบันทึกงาน", FileText, "blue"]].map(([id, label, Icon, tone]) => <button
            key={id} type="button"
            className="apple-panel ui-dev-quick" onClick={() => setDialog(id)}
          >
            <span className="ui-nav-symbol" data-tone={tone}><Icon size={24} aria-hidden="true" /></span>
            <strong>{label}</strong>
            <small>ตรวจรูปแบบ controls</small>
          </button>)}
        </div>
        <form
          className="apple-panel ui-dev-form" aria-label="ฟอร์มตรวจ controls"
          onSubmit={event => { event.preventDefault();setStatus("ตรวจฟอร์มสำเร็จ — ไม่มีการบันทึกข้อมูลจริง"); }}
        >
          <h2 className="ui-section-title">กรอกเอง</h2>
          <div className="ui-dev-form-grid">
            <label className="ui-field">
              <span>วันที่</span>
              <input
                className="apple-input" type="date"
                name="ui-date" defaultValue="2026-11-06"
                required
              />
            </label>
            <label className="ui-field">
              <span>เวลา</span>
              <input
                className="apple-input" type="time"
                name="ui-time" defaultValue="09:00"
                required
              />
            </label>
          </div>
          <label className="ui-field">
            <span>หัวข้อรอง</span>
            <select className="apple-input" name="ui-task">
              <option>ช่วยเหลือการใช้งานคอมพิวเตอร์</option>
              <option>เปิดห้องบริการ</option>
              <option>คุมสอบ DL</option>
            </select>
          </label>
          <label className="ui-field">
            <span>รายละเอียด</span>
            <textarea
              className="apple-input" rows={3}
              name="ui-notes" placeholder="ข้อมูลสังเคราะห์สำหรับตรวจฟอร์ม"
            />
          </label>
          <label className="ui-check-row">
            <span>
              <strong>เลือกงานเพิ่มเติม</strong>
              <small>ตรวจ native checkbox และการใช้ Space</small>
            </span>
            <input type="checkbox" name="ui-extra" />
          </label>
          <div className="ui-dev-actions">
            <button type="reset" className="apple-button-secondary">ล้างตัวอย่าง</button>
            <button type="submit" className="apple-button">ตรวจฟอร์ม</button>
          </div>
        </form>
      </section>
      <aside>
        <h2 className="ui-section-title">ข้อมูลตัวอย่าง</h2>
        <div className="ui-dev-metrics">
          <MetricCard
            label="กิจกรรมที่บันทึก" value="55"
            hint="รายการสังเคราะห์"
          />
          <MetricCard
            label="ผู้มีบันทึก" value="8"
            hint="ไม่ใช่คะแนนผลงาน"
          />
        </div>
        <section className="apple-panel ui-dev-form">
          <h2 className="ui-section-title">ตัวเลือกมุมมอง</h2>
          <ViewToggle currentView={view} onChangeView={setView} />
          <p className="ui-caption">
            สถานะ:
            {view}
            {' '}
            · controls กลางที่ใช้ในหน้าจริง
          </p>
        </section>
        <EmptyState title="ยังไม่มีข้อมูลตัวอย่างเพิ่มเติม" message="ทดลองสลับเมนูและธีมเพื่อตรวจส่วนกลาง" />
      </aside>
    </div>
    <p
      className="ui-caption" role="status"
      aria-live="polite"
    >
      {status}
    </p>
    <Dialog
      open={Boolean(dialog)} onClose={() => setDialog(null)}
      title={dialog === "notifications" ? "การแจ้งเตือนตัวอย่าง" : "ตรวจหน้าต่างและ controls"} description="ข้อมูลสังเคราะห์ ใช้ตรวจ layout, focus และการปิดหน้าต่าง"
    >
      <p>หน้าต่างนี้ใช้ component เดียวกับเมนูบัญชีและการตั้งค่ารูปแบบการแสดงผล</p>
      <div className="ui-dev-actions">
        <button
          type="button" className="apple-button"
          onClick={() => setDialog(null)}
        >
          เสร็จสิ้น
        </button>
      </div>
    </Dialog>
  </WorkspaceFrame>;
}
