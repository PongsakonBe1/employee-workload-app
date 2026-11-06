"use client";

import { CalendarDays, Calendar, LayoutGrid } from "lucide-react";

export default function ViewToggle({ currentView, onChangeView }) {
  const views = [
    { id: "week", label: "สัปดาห์", icon: CalendarDays },
    { id: "day", label: "วัน", icon: Calendar },
    { id: "compact", label: "กระชับ", icon: LayoutGrid },
  ];

  return (
    <div className="ui-segment" role="group" aria-label="มุมมองตาราง">
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = currentView === view.id;

        return (
          <button
            key={view.id}
            type="button"
            aria-label={view.label}
            aria-pressed={isActive}
            onClick={() => onChangeView(view.id)}
            className="ui-segment-option"
          >
            <Icon size={17} aria-hidden="true" />
            <span>{view.label}</span>
          </button>
        );
      })}
    </div>
  );
}
