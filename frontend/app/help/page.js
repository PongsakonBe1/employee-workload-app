"use client";

import { AppShell } from "../../components/AppShell";
import { useState } from "react";
import {
  BookOpen,
  LayoutDashboard,
  PlusCircle,
  ListChecks,
  Download,
  Calendar,
  Zap,
  Shield,
  ChevronDown,
  ChevronRight,
  Clock,
  Users,
  BarChart2,
  HelpCircle,
  Bell,
  Smartphone,
  Activity,
  Wrench,
} from "lucide-react";

const sections = [
  {
    id: "overview",
    icon: BookOpen,
    title: "ภาพรวมระบบ",
    color: "blue",
    content: (
      <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
        <p>
          <strong>labboy Workload Recorder</strong> คือระบบบันทึกและวิเคราะห์ภาระงานดิจิทัล
          สำหรับบุคลากร ICIT มจพ. รองรับ Desktop และ Mobile (PWA) เข้าสู่ระบบด้วย Google (@icit.kmutnb.ac.th)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {[
            { icon: PlusCircle, label: "บันทึกงาน", desc: "Quick Log, Combo Template และ Manual" },
            { icon: Calendar, label: "ตารางห้องเรียน", desc: "ห้องชั้น 4 + DL Exam แบบ Real-time" },
            { icon: BarChart2, label: "วิเคราะห์ข้อมูล", desc: "Dashboard, Staff Analytics, Equipment Health" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-blue-50 border border-blue-100 p-3 flex items-start gap-3">
              <item.icon size={16} className="text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-slate-800 text-xs">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700 space-y-1">
          <p className="font-semibold">3 บทบาทในระบบ</p>
          {[
            ["👤 Staff", "บันทึกงานตัวเอง, ดู Dashboard, Export ข้อมูลตัวเอง"],
            ["🛡️ Admin", "บันทึกงานให้พนักงาน, จัดการ Users, ดู Staff Analytics"],
            ["⚡ Superadmin", "สิทธิ์ทั้งหมด + Broadcast Push, ดู Audit Logs"],
          ].map(([role, desc]) => (
            <div key={role} className="flex gap-2">
              <span className="shrink-0">{role}</span>
              <span className="text-blue-600">— {desc}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "หน้าแดชบอร์ด",
    color: "violet",
    content: (
      <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
        <p>หน้าหลักหลังเข้าสู่ระบบ แสดงสรุปภาระงานและ Widget ต่างๆ</p>
        <ul className="space-y-2 mt-2">
          {[
            ["Stat Cards", "สรุปงานวันนี้, สัปดาห์นี้, เดือนนี้"],
            ["Heatmap", "แผนที่ความร้อนภาระงานย้อนหลัง 1 ปี"],
            ["Hour-of-Day Chart", "ช่วงเวลาที่ทำงานบ่อยสุดรายชั่วโมง"],
            ["Leaderboard", "อันดับผู้บันทึกงานมากที่สุดในเดือนนี้"],
            ["ตารางห้องเรียน", "Widget แสดงตารางชั้น 4 วันนี้แบบ Compact"],
            ["สถานะห้อง + อุปกรณ์", "Real-time ห้อง 303–407, หูฟัง ICIT01–20, ปลั๊ก ICIT21–25"],
          ].map(([title, desc]) => (
            <li key={title} className="flex gap-2">
              <ChevronRight size={14} className="text-violet-400 mt-0.5 shrink-0" />
              <span><strong>{title}</strong> — {desc}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "record",
    icon: PlusCircle,
    title: "การบันทึกงาน",
    color: "green",
    content: (
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <p>บันทึกภาระงานผ่านหน้า <strong>บันทึกงาน</strong> — มี 3 วิธี</p>

        <div className="rounded-xl border border-green-100 bg-green-50 p-4 space-y-3">
          <div>
            <p className="font-semibold text-green-800 text-xs uppercase tracking-wider mb-2">⚡ Quick Log (เร็วที่สุด)</p>
            <p className="text-xs text-green-700">กดปุ่มสีจาก Template ที่ Admin สร้างไว้ → กรอก Recipient → บันทึกทันที</p>
          </div>
          <div>
            <p className="font-semibold text-green-800 text-xs uppercase tracking-wider mb-2">🔗 Combo Template</p>
            <p className="text-xs text-green-700">บันทึกหลายงานพร้อมกันครั้งเดียว (เช่น เปิดห้อง + เปิดแอร์ + เปิดโปรเจกเตอร์) กดปุ่ม Combo → กรอก Recipient → ยืนยัน</p>
          </div>
          <div>
            <p className="font-semibold text-green-800 text-xs uppercase tracking-wider mb-2">📝 Manual (ละเอียด)</p>
            {[
              ["1", "เลือก วันที่ และ เวลา ที่ทำงาน"],
              ["2", "ระบุ ผู้รับงาน หรือหน่วยงานที่เกี่ยวข้อง"],
              ["3", "เลือก หัวข้องาน จาก Task Selector"],
              ["4", "เพิ่ม คอมเมนต์ รายละเอียดเพิ่มเติม (ถ้ามี)"],
              ["5", "กด บันทึก เพื่อส่งข้อมูล"],
            ].map(([step, desc]) => (
              <div key={step} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center shrink-0 font-bold">{step}</span>
                <span className="text-xs">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
          <Clock size={12} className="inline mr-1" />
          แก้ไขงานได้ถึง <strong>23:59 น.</strong> ของวันที่บันทึก หลังจากนั้นระบบจะล็อกอัตโนมัติ — ติดต่อ Admin ถ้าต้องการแก้ไขย้อนหลัง
        </div>
      </div>
    ),
  },
  {
    id: "calendar",
    icon: Calendar,
    title: "ตารางห้องเรียนชั้น 4",
    color: "sky",
    content: (
      <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
        <p>แสดงตารางการใช้ห้องเรียนชั้น 4 แบบ Real-time พร้อม Time Grid</p>
        <div className="space-y-2">
          {[
            ["📘 ตารางเรียน", "สีน้ำเงิน — ตารางเรียนปกติ แสดงรายวิชาและห้อง"],
            ["📙 สอบ DL", "สีส้ม — ตารางคุมสอบ Distance Learning แสดงผู้คุมสอบ"],
            ["📅 วันหยุด", "สีแดง — วันหยุดราชการ/นักขัตฤกษ์"],
          ].map(([type, desc]) => (
            <div key={type} className="flex gap-2 items-start">
              <span className="text-base shrink-0">{type.split(" ")[0]}</span>
              <span><strong>{type.split(" ").slice(1).join(" ")}</strong> — {desc}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-sky-100 bg-sky-50 p-3 mt-2">
          <p className="font-semibold text-sky-700 text-xs mb-2">View Mode Toggle</p>
          <div className="flex gap-2 flex-wrap">
            {["1 วัน", "3 วัน", "1 สัปดาห์"].map((v) => (
              <span key={v} className="px-3 py-1 rounded-full bg-white border border-sky-200 text-sky-700 text-xs font-medium">{v}</span>
            ))}
          </div>
          <p className="text-xs text-sky-600 mt-2">สลับมุมมองได้ตามต้องการ บน Mobile ใช้ปุ่ม "ดูตารางห้องเรียน" ด้านล่าง</p>
        </div>
      </div>
    ),
  },
  {
    id: "history",
    icon: ListChecks,
    title: "ประวัติงาน",
    color: "orange",
    content: (
      <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
        <p>หน้า <strong>ประวัติงาน</strong> แสดงรายการงานทั้งหมดที่บันทึกไว้ กรองตามวันที่ หัวข้อ และสถานะ</p>
        <ul className="space-y-2">
          {[
            ["กรองข้อมูล", "กรองตามวันที่, หัวข้องาน, หรือผู้รับงาน"],
            ["แก้ไขงาน", "คลิกที่รายการเพื่อแก้ไข (ภายในวันเดียวกัน)"],
            ["ลบงาน", "ลบได้เฉพาะงานที่ยังไม่ล็อก"],
          ].map(([title, desc]) => (
            <li key={title} className="flex gap-2">
              <ChevronRight size={14} className="text-orange-400 mt-0.5 shrink-0" />
              <span><strong>{title}</strong> — {desc}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "notifications",
    icon: Bell,
    title: "การแจ้งเตือน",
    color: "orange",
    content: (
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <p>ระบบมีการแจ้งเตือน 2 ประเภท</p>
        <div className="space-y-3">
          <div className="rounded-xl border border-orange-100 bg-orange-50 p-3">
            <p className="font-semibold text-orange-800 text-xs mb-1 flex items-center gap-1"><Smartphone size={12} /> Push Notification (Background)</p>
            <p className="text-xs text-orange-700">แจ้งเตือนผ่านมือถือแม้ปิดแอปอยู่ — ส่งเมื่อยังไม่ได้บันทึกงานตามเวลาที่ตั้งไว้ (ค่าเริ่มต้น 17:00 จ–ศ)</p>
            <div className="mt-2 space-y-1">
              {[
                ["1", "กดไอคอน 🔔 Bell ที่มุมบนขวา"],
                ["2", "กด \"เปิด\" เพื่ออนุญาตการแจ้งเตือน"],
                ["3", "เห็น \"✓ พร้อมรับ Push\" = ลงทะเบียนสำเร็จ"],
              ].map(([step, desc]) => (
                <div key={step} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center shrink-0 font-bold">{step}</span>
                  <span className="text-xs">{desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
            <p className="font-semibold text-amber-800 text-xs mb-1">🔔 In-App Reminder</p>
            <p className="text-xs text-amber-700">แจ้งเตือนภายในแอปเมื่อถึงเวลาที่กำหนดและยังไม่ได้บันทึกงาน (ต้องเปิดแอปทิ้งไว้)</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
          Admin ปรับเวลาและวันที่ส่งได้ที่ <strong>ตั้งค่าระบบ → การแจ้งเตือน</strong> แล้วกด <strong>บันทึกการตั้งค่า</strong>
        </div>
      </div>
    ),
  },
  {
    id: "export",
    icon: Download,
    title: "Export ข้อมูล",
    color: "teal",
    content: (
      <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
        <p>Export ข้อมูลภาระงานเป็นไฟล์ CSV สำหรับทำรายงาน</p>
        <ul className="space-y-2">
          {[
            ["เลือกช่วงเวลา", "วัน / สัปดาห์ / เดือน / ไตรมาส / ปีงบประมาณ / ปี / กำหนดเอง"],
            ["Staff", "Export เฉพาะข้อมูลของตัวเอง"],
            ["Admin/Superadmin", "Export ข้อมูลทุกคน หรือเลือกรายบุคคล"],
            ["ปีงบประมาณ", "รองรับ ต.ค.–ก.ย. (Thai fiscal year)"],
            ["Equipment Borrow/Return", "Admin Export ประวัติยืม/คืนอุปกรณ์แยกต่างหาก"],
          ].map(([title, desc]) => (
            <li key={title} className="flex gap-2">
              <ChevronRight size={14} className="text-teal-400 mt-0.5 shrink-0" />
              <span><strong>{title}</strong> — {desc}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "admin",
    icon: Shield,
    title: "สำหรับ Admin",
    color: "red",
    content: (
      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
        <p>ฟีเจอร์สำหรับ Admin และ Superadmin เท่านั้น</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            ["จัดการผู้ใช้", "อนุมัติ/ปฏิเสธ/ระงับบัญชี, กำหนด Role"],
            ["บันทึกงานให้พนักงาน", "Admin บันทึกงานแทนพนักงานได้"],
            ["จัดการระบบ", "Templates, ตารางเรียน, ตาราง DL Exam, Broadcast"],
            ["ตั้งค่าระบบ", "Time Lock, Push Notification, Security"],
            ["Audit Logs", "ประวัติทุก action ในระบบ (Superadmin only)"],
            ["Staff Analytics", "Radar Chart 6 มิติ วิเคราะห์ประสิทธิภาพรายบุคคล"],
            ["Equipment Health", "ติดตามสุขภาพอุปกรณ์ หูฟัง/ปลั๊กไฟ"],
            ["Broadcast Push", "ส่ง Push Notification ถึงทุก User (Superadmin only)"],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-lg bg-red-50 border border-red-100 p-3">
              <p className="font-semibold text-slate-800 text-xs">{title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
          <strong>Staff Analytics — 6 มิติ:</strong> Volume · Versatility · Consistency · Peak Handling · Documentation · Combo Usage
        </div>
      </div>
    ),
  },
  {
    id: "faq",
    icon: HelpCircle,
    title: "คำถามที่พบบ่อย (FAQ)",
    color: "purple",
    content: (
      <div className="space-y-4 text-sm text-slate-600">
        {[
          ["ลืมบันทึกงานเมื่อวาน ทำอย่างไร?", "เลือกวันที่ย้อนหลังได้ แต่แก้ไขได้เฉพาะภายใน 23:59 น. ของวันนั้น หากเลยแล้วให้ติดต่อ Admin"],
          ["ข้อมูลหายไปไหน?", "ข้อมูลบันทึกใน Firebase Firestore Cloud Database ไม่สูญหาย Export ได้ตลอดเวลา"],
          ["ใช้บนมือถือได้ไหม?", "รองรับ PWA — เปิดในเบราว์เซอร์แล้วกด \"เพิ่มไปยังหน้าจอหลัก\" เพื่อใช้งานแบบ App"],
          ["ทำไม Bell แสดงว่าลงทะเบียนไม่สำเร็จ?", "ต้องอนุญาต Notification Permission ในเบราว์เซอร์ก่อน → กด Bell → กด \"เปิด\" → รอสักครู่จนเห็น ✓ พร้อมรับ Push"],
          ["ไม่ได้รับ Push Notification เลย?", "1) ตรวจสอบว่าเห็น ✓ พร้อมรับ Push ใน Bell  2) Admin ต้องเปิด Push Notification ใน ตั้งค่าระบบ  3) ตรวจสอบว่าวันนั้นอยู่ใน reminderDays"],
          ["แก้ไขงานของคนอื่นได้ไหม?", "ไม่ได้ Staff แก้ไขได้เฉพาะงานตัวเอง Admin/Superadmin เท่านั้นที่แก้ไขงานของทุกคนได้"],
          ["Login ด้วย email ส่วนตัวได้ไหม?", "ไม่ได้ รองรับเฉพาะ @icit.kmutnb.ac.th เท่านั้น และต้องรอ Admin อนุมัติก่อนใช้งาน"],
        ].map(([q, a]) => (
          <div key={q} className="rounded-xl border border-purple-100 bg-purple-50 p-4">
            <p className="font-semibold text-purple-800 mb-1">Q: {q}</p>
            <p className="text-purple-700 text-xs leading-relaxed">A: {a}</p>
          </div>
        ))}
      </div>
    ),
  },
];

const colorMap = {
  blue: "bg-blue-50 border-blue-200 text-blue-600",
  violet: "bg-violet-50 border-violet-200 text-violet-600",
  green: "bg-green-50 border-green-200 text-green-600",
  sky: "bg-sky-50 border-sky-200 text-sky-600",
  orange: "bg-orange-50 border-orange-200 text-orange-600",
  teal: "bg-teal-50 border-teal-200 text-teal-600",
  red: "bg-red-50 border-red-200 text-red-600",
  purple: "bg-purple-50 border-purple-200 text-purple-600",
};

function AccordionSection({ section, isOpen, onToggle }) {
  const Icon = section.icon;
  const color = colorMap[section.color];
  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${isOpen ? "border-slate-200 shadow-sm" : "border-slate-100"}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition"
      >
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${color}`}>
          <Icon size={16} />
        </div>
        <span className="flex-1 font-semibold text-slate-800 text-sm">{section.title}</span>
        {isOpen ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
      </button>
      {isOpen && (
        <div className="px-4 pb-5 pt-1 border-t border-slate-100 bg-white">
          {section.content}
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [openId, setOpenId] = useState("overview");

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">คู่มือการใช้งาน</h1>
              <p className="text-xs text-slate-400">labboy Workload Recorder — v2.9.0</p>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-3 leading-relaxed">
            ระบบบันทึกและติดตามภาระงานบุคลากร พัฒนาด้วย Next.js + Firebase
            รองรับการใช้งานบน Desktop และ Mobile (PWA)
          </p>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {sections.slice(0, 4).map((s) => {
            const Icon = s.icon;
            const color = colorMap[s.color];
            return (
              <button
                key={s.id}
                onClick={() => setOpenId(s.id)}
                className={`rounded-xl border p-2.5 flex flex-col items-center gap-1 transition hover:shadow-sm ${openId === s.id ? color : "bg-white border-slate-100 text-slate-500"}`}
              >
                <Icon size={16} />
                <span className="text-[10px] font-medium text-center leading-tight">{s.title.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Accordion */}
        <div className="space-y-2">
          {sections.map((section) => (
            <AccordionSection
              key={section.id}
              section={section}
              isOpen={openId === section.id}
              onToggle={() => setOpenId(openId === section.id ? null : section.id)}
            />
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-8 rounded-2xl bg-slate-50 border border-slate-100 p-4 text-center">
          <p className="text-xs text-slate-400">
            หากพบปัญหาการใช้งาน ติดต่อผู้ดูแลระบบ
          </p>
          <p className="text-xs text-slate-300 mt-1">labboy Workload Recorder &mdash; v2.9.0</p>
        </div>
      </div>
    </AppShell>
  );
}
