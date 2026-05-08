"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { MINOR_TASKS, minorTaskToMainDuty } from "../lib/commentSuggestions";

const DUTY_GROUP_LABELS = {
  ดูแลห้องบริการคอมพิวเตอร์: "งานในหน้าที่หลัก (ห้องบริการ)",
  ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ: "งานในหน้าที่หลัก (รับแจ้งปัญหา)",
};

export function MinorTaskSelector({ value, onChange, label, placeholder }) {
  const t = useTranslations("worklog");
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Build a flat list of all minor tasks with their duty group info
  const allMinorTasks = useMemo(() => {
    return MINOR_TASKS.map((task) => {
      const duty =
        minorTaskToMainDuty[task] ||
        "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ";
      return {
        task,
        duty,
        dutyGroup: DUTY_GROUP_LABELS[duty] || duty,
        dutyKey: duty === "ดูแลห้องบริการคอมพิวเตอร์" ? "room" : "support",
      };
    }).sort((a, b) => a.task.localeCompare(b.task, "th"));
  }, []);

  // Filter tasks based on search
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return allMinorTasks;

    const query = searchQuery.toLowerCase();
    return allMinorTasks.filter(
      (item) =>
        item.task.toLowerCase().includes(query) ||
        item.duty.toLowerCase().includes(query),
    );
  }, [allMinorTasks, searchQuery]);

  // Group tasks by duty group for display
  const groupedTasks = useMemo(() => {
    const groups = {};
    filteredTasks.forEach((item) => {
      if (!groups[item.dutyGroup]) {
        groups[item.dutyGroup] = [];
      }
      groups[item.dutyGroup].push(item);
    });
    return groups;
  }, [filteredTasks]);

  const selectedTask = allMinorTasks.find((t) => t.task === value);

  return (
    <div className="relative">
      <label className="apple-label">{label}</label>

      {/* Display selected value or trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="apple-input text-left flex items-center justify-between"
      >
        <span className={value ? "text-slate-950" : "text-slate-400"}>
          {value || placeholder}
        </span>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 apple-panel max-h-96 overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("table.search")}
                className="w-full pl-10 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-slate-900 focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Task list */}
          <div className="overflow-y-auto max-h-80">
            {Object.entries(groupedTasks).map(([group, tasks]) => (
              <div
                key={group}
                className="border-b border-slate-100 last:border-0"
              >
                <div className="px-3 py-2 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {group}
                </div>
                {tasks.map((item) => (
                  <button
                    key={item.task}
                    type="button"
                    onClick={() => {
                      onChange(item.task);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className={`
                      w-full px-3 py-2.5 text-left text-sm transition-colors
                      hover:bg-slate-50 flex items-center justify-between
                      ${value === item.task ? "bg-slate-100 text-slate-950 font-medium" : "text-slate-700"}
                    `}
                  >
                    <span>{item.task}</span>
                    {value === item.task && (
                      <svg
                        className="w-5 h-5 text-slate-950"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            ))}

            {filteredTasks.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                {t("errors.noData")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected task info */}
      {selectedTask && (
        <p className="mt-1.5 text-xs text-slate-500">
          {selectedTask.dutyGroup}
        </p>
      )}
    </div>
  );
}
