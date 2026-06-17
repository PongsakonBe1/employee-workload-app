"use client";

import { CalendarDays, Calendar, LayoutGrid } from "lucide-react";

export default function ViewToggle({ currentView, onChangeView }) {
  const views = [
    { id: "week", label: "สัปดาห์", icon: CalendarDays },
    { id: "day", label: "วัน", icon: Calendar },
    { id: "compact", label: "กระชับ", icon: LayoutGrid },
  ];

  return (
    <div className="inline-flex bg-slate-100/80 backdrop-blur-sm rounded-xl p-1.5 gap-1 shadow-sm">
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = currentView === view.id;

        return (
          <button
            key={view.id}
            onClick={() => onChangeView(view.id)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
              transition-all duration-200 ease-out
              ${
                isActive
                  ? "bg-white text-blue-600 shadow-md scale-105"
                  : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-800"
              }
            `}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-blue-500" : ""}`} />
            <span className="hidden sm:inline">{view.label}</span>
          </button>
        );
      })}
    </div>
  );
}
