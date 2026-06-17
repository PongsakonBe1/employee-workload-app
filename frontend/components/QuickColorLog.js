"use client";

import { useState } from "react";

const COLOR_OPTIONS = [
  { id: "done", color: "#22c55e", label: "เสร็จแล้ว", bg: "bg-green-500" },
  { id: "inprogress", color: "#3b82f6", label: "กำลังทำ", bg: "bg-blue-500" },
  { id: "issue", color: "#eab308", label: "ติดปัญหา", bg: "bg-yellow-500" },
  { id: "urgent", color: "#ef4444", label: "เร่งด่วน", bg: "bg-red-500" },
  { id: "other", color: "#9ca3af", label: "อื่นๆ", bg: "bg-gray-400" },
];

export default function QuickColorLog({ onLog }) {
  const [selected, setSelected] = useState(null);

  const handleClick = (colorId) => {
    setSelected(colorId);
    onLog?.(colorId);
    // Reset after animation
    setTimeout(() => setSelected(null), 300);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        {COLOR_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handleClick(opt.id)}
            title={opt.label}
            className={`
              w-10 h-10 rounded-full ${opt.bg}
              shadow-md hover:shadow-lg
              transition-all duration-200
              hover:scale-110 active:scale-95
              ${selected === opt.id ? "ring-4 ring-offset-2 ring-slate-300 scale-110" : ""}
            `}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" /> เสร็จ
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> กำลังทำ
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" /> ติดปัญหา
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> เร่งด่วน
        </span>
      </div>
    </div>
  );
}
