# Development Log — labboy Workload Recorder

---

**[2024-06-02 16:30] - [SE] Software Engineer:**

**Task:** Implement Combo Template feature (กดครั้งเดียว บันทึกหลายงานพร้อมกัน)

**Files Modified:**
- `frontend/lib/quickLogTemplates.js` — Add `logFromComboTemplate()` function
- `frontend/components/QuickLogButtons.js` — Add combo modal, badge, handler
- `frontend/components/TemplateManager.js` — Add isCombo toggle, comboItems UI

**Implementation Details:**
1. **Backend Layer:** `logFromComboTemplate()` creates multiple worklogs in parallel using `Promise.all()`, records single usage count
2. **Template Management:** Admin can create combo templates with multiple sub-tasks, each with name/minorTask/comment
3. **Staff UI:** Combo buttons show violet badge with task count, modal displays preview of all tasks before logging
4. **UX:** Single recipient input, CTA button shows "บันทึก X งาน" in violet color

**Note to Next Agent:**
- [UX/UI] ตรวจสอบสี violet (bg-violet-100/text-violet-700) ตรงตาม Design System
- [QA] ทดสอบ combo logging → ตรวจ Firestore ว่าสร้าง N docs, recipient ถูกต้องทุก doc, usageCount +1 ครั้ง
- [SA] ไม่ต้องแก้ Firestore Rules (worklog create รองรับอยู่แล้ว)

---
