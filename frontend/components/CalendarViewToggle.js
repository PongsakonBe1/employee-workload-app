"use client";

import { CalendarDays, Calendar, LayoutGrid } from "lucide-react";

export default function CalendarViewToggle({ currentView, onChangeView }) {
  const views = [
    { id: "1day", label: "1 วัน", icon: LayoutGrid },
    { id: "3day", label: "3 วัน", icon: Calendar },
    { id: "week", label: "สัปดาห์", icon: CalendarDays },
  ];

  return (
    <div className="inline-flex bg-slate-100/80 backdrop-blur-sm rounded-xl p-1 gap-1 shadow-sm">
      {views.map((v) => {
        const Icon = v.icon;
        const isActive = currentView === v.id;

        return (
          <button
            key={v.id}
            onClick={() => onChangeView(v.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200 ease-out
              ${
                isActive
                  ? "bg-white text-blue-600 shadow-md scale-105"
                  : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-800"
              }
            `}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-blue-500" : ""}`} />
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        );
      })}
    </div>
  );
}
