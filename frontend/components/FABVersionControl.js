"use client";

import { useState } from "react";
import { GitBranch, GitCommit, Calendar, Clock, X, ChevronDown, ChevronUp } from "lucide-react";

const VERSION_INFO = {
  version: "2.4.0",
  buildDate: "2026-06-16",
  buildTime: "07:15",
  gitCommit: "a1b2c3d",
  branch: "main",
  features: [
    "RoomUsageCalendar - Week/Compact View",
    "iOS Apple Calendar Theme",
    "Thailand Timezone (UTC+7)",
    "DL Exam & Classroom Schedule",
    "Interactive Events",
    "Saturday Schedule Support"
  ],
  changes: [
    "Fixed timezone issues for DL exams",
    "Added user name mapping for proctors",
    "Updated Week View UI to Apple Calendar style",
    "Added Compact View below Week View",
    "Added Saturday option for classroom schedules"
  ]
};

export default function FABVersionControl() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button - Mobile: above save button (bottom-20), Desktop: bottom-4 */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 lg:bottom-4 right-4 z-40 flex items-center gap-2 bg-slate-800 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl hover:bg-slate-700 transition-all duration-300"
      >
        <GitBranch className="w-4 h-4" />
        <span className="text-sm font-medium">v{VERSION_INFO.version}</span>
      </button>

      {/* Version Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <GitBranch className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Version Control</h3>
                  <p className="text-blue-100 text-xs">labboy Workload App</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Version Info Card */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-sm">Version</span>
                  <span className="text-slate-800 font-semibold">{VERSION_INFO.version}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-sm">Branch</span>
                  <span className="text-blue-600 font-medium text-sm">{VERSION_INFO.branch}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-sm">Commit</span>
                  <code className="text-slate-700 bg-slate-200 px-2 py-0.5 rounded text-xs font-mono">
                    {VERSION_INFO.gitCommit}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-sm">Build Date</span>
                  <span className="text-slate-700 text-sm flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {VERSION_INFO.buildDate}
                  </span>
                </div>
              </div>

              {/* Features */}
              <div>
                <h4 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-green-500" />
                  Features
                </h4>
                <ul className="space-y-1">
                  {VERSION_INFO.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recent Changes */}
              <div>
                <h4 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  Recent Changes
                </h4>
                <ul className="space-y-1">
                  {VERSION_INFO.changes.map((change, idx) => (
                    <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                      <span className="text-orange-500 mt-1">•</span>
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-3 text-center border-t border-slate-100">
              <p className="text-xs text-slate-400">
                Built with Next.js + Tailwind + Firebase
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
