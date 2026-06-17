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
          <strong>labboy Workload Recorder</strong> คือระบบบันทึกและติดตามภาระงานของบุคลากร
          พัฒนาสำหรับใช้งานภายในองค์กร รองรับทั้ง Desktop และ Mobile (PWA)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {[
            { icon: PlusCircle, label: "บันทึกงาน", desc: "ระบุงาน เวลา และผู้รับงาน" },
            { icon: Calendar, label: "ตารางห้องเรียน", desc: "ดูการใช้ห้องเรียนชั้น 4 แบบ Real-time" },
            { icon: BarChart2, label: "วิเคราะห์ข้อมูล", desc: "สถิติงาน รายเดือน รายปี" },
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
        <p>หน้าหลักหลังเข้าสู่ระบบ แสดงสรุปภาระงานของคุณในวันนี้และสัปดาห์นี้</p>
        <ul className="space-y-2 mt-2">
          {[
            ["สรุปงานวันนี้", "จำนวนงานที่บันทึก, เวลารวม, งานที่เสร็จ"],
            ["กราฟรายสัปดาห์", "แผนภูมิแท่งแสดงภาระงานย้อนหลัง 7 วัน"],
            ["Quick Access", "ปุ่มลัดไปหน้าบันทึกงาน และดูประวัติ"],
            ["การแจ้งเตือน", "แจ้งเตือนงานที่รอดำเนินการหรือใกล้ครบกำหนด"],
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
        <p>บันทึกภาระงานผ่านฟอร์มในหน้า <strong>บันทึกงาน</strong> (สำหรับ Staff) หรือ <strong>บันทึกงานให้พนักงาน</strong> (สำหรับ Admin)</p>

        <div className="rounded-xl border border-green-100 bg-green-50 p-4 space-y-2">
          <p className="font-semibold text-green-800 text-xs uppercase tracking-wider">ขั้นตอนการบันทึก</p>
          {[
            ["1", "เลือก วันที่ และ เวลา ที่ทำงาน"],
            ["2", "ระบุ ผู้รับงาน หรือหน่วยงานที่เกี่ยวข้อง"],
            ["3", "เลือก หัวข้องาน จาก Task Selector"],
            ["4", "เพิ่ม คอมเมนต์ รายละเอียดเพิ่มเติม (ถ้ามี)"],
            ["5", "กด บันทึก เพื่อส่งข้อมูล"],
          ].map(([step, desc]) => (
            <div key={step} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center shrink-0 font-bold">{step}</span>
              <span>{desc}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
          <p className="font-semibold text-amber-700 text-xs mb-1 flex items-center gap-1"><Zap size={12} /> Quick Color Log</p>
          <p className="text-xs text-amber-700">บันทึกด่วนด้วยสีโดยไม่ต้องกรอกฟอร์ม — กดสีที่ต้องการแล้วระบบจะบันทึกสถานะทันที</p>
          <div className="flex gap-2 mt-2">
            {[["🟢","เสร็จแล้ว"],["🔵","กำลังทำ"],["🟡","ติดปัญหา"],["🔴","เร่งด่วน"],["⚪","อื่นๆ"]].map(([dot, label]) => (
              <div key={label} className="text-center">
                <div className="text-base">{dot}</div>
                <div className="text-[10px] text-amber-600">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
          <Clock size={12} className="inline mr-1" />
          แก้ไขงานได้ถึง <strong>23:59 น.</strong> ของวันที่บันทึก หลังจากนั้นระบบจะล็อกอัตโนมัติ
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
    id: "export",
    icon: Download,
    title: "Export ข้อมูล",
    color: "teal",
    content: (
      <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
        <p>Export ข้อมูลภาระงานเป็นไฟล์ Excel หรือ CSV สำหรับทำรายงาน</p>
        <ul className="space-y-2">
          {[
            ["เลือกช่วงเวลา", "เลือกเดือน/ปีที่ต้องการ Export"],
            ["ไฟล์ Excel (.xlsx)", "รองรับสูตร SUM อัตโนมัติ"],
            ["ไฟล์ CSV", "เหมาะสำหรับนำไปวิเคราะห์ต่อ"],
            ["ปีงบประมาณ", "รองรับการ Export แบบปีงบประมาณไทย (ต.ค.–ก.ย.)"],
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
      <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
        <p>ฟีเจอร์สำหรับ Admin และ Superadmin เท่านั้น</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            ["จัดการผู้ใช้", "เพิ่ม/แก้ไข/ระงับบัญชีผู้ใช้"],
            ["บันทึกงานให้พนักงาน", "Admin บันทึกงานแทนพนักงาน"],
            ["ตารางเรียน", "จัดการตารางห้องเรียนชั้น 4"],
            ["ตาราง DL", "จัดการตารางคุมสอบ Distance Learning"],
            ["Audit Log", "ประวัติการเข้าใช้งานระบบ"],
            ["สถิติบุคลากร", "วิเคราะห์ภาระงานรายบุคคล"],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-lg bg-red-50 border border-red-100 p-3">
              <p className="font-semibold text-slate-800 text-xs">{title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
          ))}
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
          ["ลืมบันทึกงานเมื่อวาน ทำอย่างไร?", "ระบบรองรับการเลือกวันที่ย้อนหลัง แต่แก้ไขได้เฉพาะวันที่บันทึกภายใน 23:59 น. ของวันนั้น หากเลยเวลาแล้วให้ติดต่อ Admin"],
          ["ข้อมูลหายไปไหน?", "ข้อมูลทั้งหมดบันทึกใน Firestore Cloud Database ไม่สูญหาย สามารถ Export ได้ตลอดเวลา"],
          ["ใช้บนมือถือได้ไหม?", "รองรับ PWA (Progressive Web App) สามารถ Add to Home Screen เพื่อใช้งานแบบ App ได้เลย"],
          ["ใส่เวลาซ้ำกันได้ไหม?", "ได้ ระบบไม่ได้ล็อกเวลาซ้ำ แต่แนะนำให้บันทึกแต่ละงานแยกกันเพื่อความถูกต้องของสถิติ"],
          ["แก้ไขงานของคนอื่นได้ไหม?", "ไม่ได้ Staff แก้ไขได้เฉพาะงานของตัวเอง Admin เท่านั้นที่แก้ไขงานของทุกคนได้"],
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
              <p className="text-xs text-slate-400">labboy Workload Recorder — v2.5.0</p>
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
          <p className="text-xs text-slate-300 mt-1">labboy Workload Recorder &mdash; v2.5.0</p>
        </div>
      </div>
    </AppShell>
  );
}
