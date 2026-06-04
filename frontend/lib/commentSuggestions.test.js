import { describe, it, expect } from "vitest";
import {
  MINOR_TASKS,
  commentSuggestionMap,
  minorTaskToMainDuty,
  getCommentSuggestions,
  getMainDutyFromMinorTask,
  hasCommentSuggestions,
} from "./commentSuggestions.js";

// ── MINOR_TASKS ──────────────────────────────────────────────────────────────

describe("MINOR_TASKS", () => {
  it("contains 28 tasks (25 original + 3 additional)", () => {
    expect(MINOR_TASKS).toHaveLength(28);
  });

  it("has no duplicate entries", () => {
    const unique = new Set(MINOR_TASKS);
    expect(unique.size).toBe(MINOR_TASKS.length);
  });
});

// ── getCommentSuggestions ────────────────────────────────────────────────────

describe("getCommentSuggestions", () => {
  it("returns room numbers for knowledge room check-in task", () => {
    const suggestions = getCommentSuggestions("เช็คอินห้องแลกเปลี่ยนความรู้");
    expect(suggestions).toEqual(["303", "304", "305", "306"]);
  });

  it("returns headphone IDs for borrow headphone task", () => {
    const suggestions = getCommentSuggestions("ยืมหูฟัง");
    expect(suggestions).toHaveLength(12);
    expect(suggestions[0]).toBe("ICIT01");
  });

  it("returns power outlet IDs for borrow power outlet task", () => {
    const suggestions = getCommentSuggestions("ยืมปลั๊กไฟ");
    expect(suggestions).toEqual(["ICIT21", "ICIT22", "ICIT23"]);
  });

  it("returns exam shift options for DL exam proctoring", () => {
    const suggestions = getCommentSuggestions("คุมสอบ DL");
    expect(suggestions).toEqual(["เช้า", "บ่าย", "เช้า/บ่าย"]);
  });

  it("returns software list for software installation task", () => {
    const suggestions = getCommentSuggestions("ติดตั้ง Software");
    expect(suggestions).toContain("Adobe Creative Cloud");
    expect(suggestions).toContain("MATLAB");
  });

  it("returns empty array for task without suggestions", () => {
    expect(getCommentSuggestions("ดูแลความสะอาด")).toEqual([]);
  });

  it("returns empty array for unknown task", () => {
    expect(getCommentSuggestions("NonexistentTask")).toEqual([]);
  });

  it("returns empty array for null/undefined", () => {
    expect(getCommentSuggestions(null)).toEqual([]);
    expect(getCommentSuggestions(undefined)).toEqual([]);
  });
});

// ── getMainDutyFromMinorTask ─────────────────────────────────────────────────

describe("getMainDutyFromMinorTask", () => {
  it("maps room-related tasks to room service duty", () => {
    expect(getMainDutyFromMinorTask("เช็คอินห้องแลกเปลี่ยนความรู้")).toBe(
      "ดูแลห้องบริการคอมพิวเตอร์",
    );
    expect(getMainDutyFromMinorTask("ยืมหูฟัง")).toBe(
      "ดูแลห้องบริการคอมพิวเตอร์",
    );
  });

  it("maps IT-related tasks to IT service duty", () => {
    expect(getMainDutyFromMinorTask("Wifi")).toBe(
      "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ",
    );
    expect(getMainDutyFromMinorTask("Gmail")).toBe(
      "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ",
    );
  });

  it("maps self-referencing tasks to themselves", () => {
    expect(getMainDutyFromMinorTask("คุมสอบ DL")).toBe("คุมสอบ DL");
  });

  it("returns default IT service duty for unknown task", () => {
    expect(getMainDutyFromMinorTask("UnknownTask")).toBe(
      "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ",
    );
  });
});

// ── hasCommentSuggestions ─────────────────────────────────────────────────────

describe("hasCommentSuggestions", () => {
  it("returns true for tasks with suggestions", () => {
    expect(hasCommentSuggestions("ยืมหูฟัง")).toBe(true);
    expect(hasCommentSuggestions("คุมสอบ DL")).toBe(true);
  });

  it("returns false for tasks without suggestions", () => {
    expect(hasCommentSuggestions("ดูแลความสะอาด")).toBe(false);
  });

  it("returns false for unknown tasks", () => {
    expect(hasCommentSuggestions("FakeTask")).toBe(false);
  });
});

// ── minorTaskToMainDuty completeness ─────────────────────────────────────────

describe("minorTaskToMainDuty mapping completeness", () => {
  it("has a mapping for every task in MINOR_TASKS", () => {
    for (const task of MINOR_TASKS) {
      expect(minorTaskToMainDuty[task]).toBeDefined();
    }
  });

  it("all commentSuggestionMap keys are valid minor tasks", () => {
    for (const key of Object.keys(commentSuggestionMap)) {
      expect(MINOR_TASKS).toContain(key);
    }
  });
});
