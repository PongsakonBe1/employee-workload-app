"use client";

import { useState } from "react";
import { Bell, CalendarDays, FileText, Headphones, Check, Trash2, X } from "lucide-react";
import { WorkspaceFrame } from "../../../components/ui/WorkspaceFrame";
import { Dialog } from "../../../components/ui/Dialog";
import { MetricCard } from "../../../components/MetricCard";
import { EmptyState } from "../../../components/EmptyState";
import ViewToggle from "../../../components/ViewToggle";
import { useAppearance } from "../../../components/ui/AppearanceProvider";
import { GlassButton } from "../../../components/ui/GlassControls";

// This route mounts real shared components with local display fixtures only.
// It does not supply AuthContext, tokens, API clients or a production identity.
export default function DevelopmentWorkspace() {
  const { resolved } = useAppearance();
  const [role, setRole] = useState("staff"), [pathname, setPathname] = useState("/worklogs/new");
  const [view, setView] = useState("week"), [dialog, setDialog] = useState(null), [status, setStatus] = useState("");
  const [glassMode, setGlassMode] = useState("quick");
  const [demoActive, setDemoActive] = useState(true);
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
      <a href="/dev/calendar" className="ui-choice">เปิดหน้าปฏิทิน · Liquid Glass</a>
      <a href="/dev/resources" className="ui-choice">เปิดห้องและทรัพยากร</a>
      <a href="/dev/equipment" className="ui-choice">เปิดทะเบียนอุปกรณ์</a>
      <a href="/dev/equipment/usage" className="ui-choice">เปิดการใช้งานและสภาพอุปกรณ์</a>
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
    <section className="apple-panel ui-dev-form ui-button-demo" aria-label="สีและบทบาทของปุ่ม">
      <h2 className="ui-section-title">สีและบทบาทของปุ่ม</h2>
      <p className="ui-caption">ตัวอย่าง controls กลาง · ไม่ลบข้อมูลหรือปฏิเสธคำขอจริง · สลับธีมและวัสดุเพื่อตรวจได้</p>
      <div className="ui-button-demo-grid">
        <div><h3>การกระทำหลัก</h3><GlassButton mode={glassMode} variant="prominent" onClick={() => setStatus("ตรวจปุ่มหลักแล้ว ไม่มีการบันทึกจริง")}><Check size={17} aria-hidden="true" />บันทึกตัวอย่าง</GlassButton></div>
        <div><h3>ยกเลิก / กลับ</h3><GlassButton mode={glassMode} onClick={() => setStatus("ตรวจปุ่มยกเลิกแล้ว")}><X size={17} aria-hidden="true" />ยกเลิกตัวอย่าง</GlassButton></div>
        <div><h3>การลบ / ปฏิเสธที่มีผลสำคัญ</h3><GlassButton mode={glassMode} variant="destructive" onClick={() => setStatus("ตรวจสีคำสั่งลบแล้ว ไม่มีการลบข้อมูล")}><Trash2 size={17} aria-hidden="true" />ลบตัวอย่าง</GlassButton><GlassButton mode={glassMode} variant="destructive" onClick={() => setStatus("ตรวจสีคำสั่งปฏิเสธแล้ว ไม่มีคำขอจริง")}><X size={17} aria-hidden="true" />ปฏิเสธตัวอย่าง</GlassButton></div>
        <div><h3>หยุดใช้ชั่วคราว / เปิดกลับ</h3><span className="ui-button-demo-status" data-active={demoActive}>{demoActive ? "เปิดใช้อยู่" : "หยุดใช้อยู่"}</span><GlassButton mode={glassMode} onClick={() => setDemoActive(value => !value)}>{demoActive ? "หยุดใช้ตัวอย่าง" : "เปิดใช้ตัวอย่าง"}</GlassButton></div>
        <div><h3>ยังใช้คำสั่งไม่ได้</h3><GlassButton mode={glassMode} variant="destructive" disabled><Trash2 size={17} aria-hidden="true" />ลบไม่ได้</GlassButton></div>
      </div>
    </section>
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
            <GlassButton mode={glassMode} type="reset">ล้างตัวอย่าง</GlassButton>
            <GlassButton mode={glassMode} type="submit" variant="prominent">ตรวจฟอร์ม</GlassButton>
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
        <GlassButton mode={glassMode} variant="prominent"
          type="button"
          onClick={() => setDialog(null)}
        >
          เสร็จสิ้น
        </GlassButton>
      </div>
    </Dialog>
  </WorkspaceFrame>;
}
