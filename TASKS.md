# TASKS.md Plan — labboy Workload Recorder

สรุปงานจาก Audit Results (SA/SE/UX/DA) + Notification Bug พร้อม task ย่อยและผู้รับผิดชอบ

**ก่อนเริ่มแก้โค้ด ให้คุณรันคำสั่งสร้าง branch ใหม่ชื่อ hotfix/critical-issues ใน Terminal ให้เรียบร้อยก่อน แล้วค่อยเริ่มแก้ไฟล์ firestore.rules**
---

## 🔴 Notification Bell Bug (Root Cause)

**ปัญหา:** `deleteNotification()` และ `markAllAsRead()` ใน `NotificationBell.js` เรียก `deleteDoc()` โดยตรงกับ Firestore document เดิม

- Broadcast notifications (userId = `"all"`, `"staff"`, `"admin"`) เก็บเป็น **1 document ร่วมกันทุก user** — เมื่อ user คนใดก็ตาม (รวมถึง superadmin) กด "ลบ" → document นั้นถูกลบออกจาก Firestore จริง → **ทุก user หาย notification ออกไปพร้อมกัน**
- Firestore rule ปัจจุบัน (บรรทัด 195-200) อนุญาตให้ทุก user ที่ see notification นั้นได้ ลบมันได้ด้วย

**Fix แนวคิด:** แทนการ `deleteDoc` → ใช้ `updateDoc` เพิ่ม field `readBy: [uid]` array แล้ว filter client-side ว่า uid ของตัวเองอยู่ใน `readBy` หรือยัง (soft-delete per user)

---

## หมวด 1: Critical & Tech Debt

### 🔴 SEC-1: ปิด TEMPORARY Firestore Rules (3 จุด Critical)
**ไฟล์:** `firebase/firestore.rules`
- [ ] บรรทัด 153: เปลี่ยน `pendingUsers read` → `isAdmin()`
- [ ] บรรทัด 162: เปลี่ยน `pendingUsers delete` → `isAdmin()`
- [ ] บรรทัด 183: เปลี่ยน `notifications create` → `isAdmin() || request.resource.data.userId == request.auth.uid`
- [ ] บรรทัด 85: ลบ `'admin'` ออกจาก self-creation role list (เหลือแค่ `'staff'`)
**ผู้รับผิดชอบ:** Backend/Security
**Priority:** ทำก่อนทุกอย่าง

### 🟠 SEC-2: Worklog Security Rules (3 จุด High)
**ไฟล์:** `firebase/firestore.rules`
- [ ] บรรทัด 112: เพิ่ม `request.resource.data.employeeId == request.auth.uid || isAdmin()` ใน worklog create
- [ ] บรรทัด 122-123: เพิ่ม `resource.data.locked != true` ใน worklog delete สำหรับ non-admin
- [ ] บรรทัด 115-123: เพิ่ม `isSameDay(resource.data)` ใน worklog update/delete สำหรับ non-admin
**ผู้รับผิดชอบ:** Backend/Security

### 🔴 BUG-1: Notification Delete Bug (Broadcast shared document)
**ไฟล์:** `frontend/components/NotificationBell.js`
- [ ] เพิ่ม field `readBy: []` (array of uid) ใน notification document schema
- [ ] แก้ `deleteNotification()` และ `markAsRead()`: ถ้า `userId` เป็น `"all"/"staff"/"admin"` → ใช้ `updateDoc` เพิ่ม uid เข้า `readBy` แทน `deleteDoc`
- [ ] แก้ `markAllAsRead()`: เช่นเดียวกัน แยก personal vs broadcast
- [ ] แก้ Firestore query filter: เพิ่มกรองฝั่ง client ว่า uid ไม่อยู่ใน `readBy`
- [ ] อัปเดต Firestore rule `notifications update`: อนุญาต `readBy` field เพิ่มเติมจาก `read, readAt`
**ผู้รับผิดชอบ:** Frontend

### 🔴 DA-1: Aggregate จาก Truncated Data
**ไฟล์:** `frontend/app/dashboard/page.js:437`
- [ ] ตรวจสอบว่า `worklogs.length` ที่ใช้ aggregate คือ full dataset หรือ truncated (limit 500)
- [ ] ถ้า `hasMoreData === true` ให้แสดง warning บน chart ว่า "แสดงข้อมูลบางส่วน"
- [ ] หรือ fetch แบบ pagination แล้ว aggregate ทั้งหมด
**ผู้รับผิดชอบ:** Frontend

### 🔴 DA-2: ลบ Duplicate Error Block
**ไฟล์:** `frontend/app/dashboard/page.js:783-787, 816-819`
- [ ] ระบุว่า block ไหนซ้ำ ลบออก 1 block
**ผู้รับผิดชอบ:** Frontend

### 🔴 DA-3: Leaderboard Query ซ้ำซ้อน
**ไฟล์:** `frontend/app/dashboard/page.js:528`
- [ ] Merge leaderboard query เข้ากับ main worklogs query แทนการ query แยก
**ผู้รับผิดชอบ:** Frontend

---

## หมวด 2: UX Improvements

### 🔴 UX-1: Toast Notifications — WCAG Fix
**ไฟล์:** `frontend/app/worklogs/new/page.js:269-287`
- [ ] เพิ่ม `role="status"` บน toast container
- [ ] เพิ่มปุ่มปิด (X) ที่ user control ได้
**ผู้รับผิดชอบ:** Frontend

### 🔴 UX-2: Fix Form Labels
**ไฟล์:** `frontend/app/worklogs/new/page.js:328, 355`
- [ ] เพิ่ม `htmlFor` + `id` ให้ label/input คู่กัน
**ผู้รับผิดชอบ:** Frontend

### 🔴 UX-3: Custom Date Modal Accessibility
**ไฟล์:** `frontend/app/dashboard/page.js:724-780`
- [ ] เพิ่ม `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
**ผู้รับผิดชอบ:** Frontend

### 🟠 UX-4: Filter Buttons — aria-pressed
**ไฟล์:** `frontend/app/dashboard/page.js:606-617`
- [ ] เพิ่ม `aria-pressed={isSelected}` และ visible focus ring
**ผู้รับผิดชอบ:** Frontend

### 🟠 UX-5: Icon-Only Buttons — aria-label
**ไฟล์:** `frontend/app/worklogs/new/page.js:304-311`
- [ ] เพิ่ม `aria-label` ให้ทุก icon-only button
**ผู้รับผิดชอบ:** Frontend

### 🟠 DA-4: DOW Heatmap Timezone Fix
**ไฟล์:** `frontend/app/dashboard/page.js:463`
- [ ] แก้ `new Date(log.date).getDay()` → parse date string โดยไม่ใช้ UTC (เพิ่ม `T00:00:00` suffix หรือ split manually)
**ผู้รับผิดชอบ:** Frontend

### 🟠 DA-5: เฉลี่ยงาน/คน คำนวณผิด
**ไฟล์:** `frontend/app/dashboard/page.js:918`
- [ ] ตรวจสอบ denominator — ควรหารด้วยจำนวน active employee จริง ไม่ใช่ length ของ byEmployee object
**ผู้รับผิดชอบ:** Frontend

### 🟡 UX-6: Limit Warning → role="alert"
**ไฟล์:** `frontend/app/dashboard/page.js:823-864`
- [ ] เปลี่ยน wrapper เป็น `role="alert"` + `aria-live="assertive"`
**ผู้รับผิดชอบ:** Frontend

### 🟢 UX-7: ลบ Duplicate Error Display
**ไฟล์:** `frontend/app/dashboard/page.js:783-787, 816-819`
- [ ] ลบ block ที่ซ้ำ (รวมกับ DA-2)
**ผู้รับผิดชอบ:** Frontend

---

## หมวด 3: New Features (v2.0)

### ✨ FEAT-1: Local Pattern-Based Auto-Suggest (Comment)
**ไฟล์:** `frontend/components/CommentSuggestions.js`, `frontend/lib/commentSuggestions.js`
- [ ] ปรับ `CommentSuggestions` component รับ `userId` prop
- [ ] เรียก `getCommentSuggestionsFromHistory(userId, minorTask)` ที่มีอยู่แล้ว
- [ ] Merge กับ static `commentSuggestionMap`: แสดง history suggestions (sorted by freq) ก่อน แล้วตามด้วย static ที่ยังไม่ซ้ำ
- [ ] แสดง badge "(บ่อย)" หรือ indicator เล็กๆ บน history suggestions
- [ ] Handle loading state ขณะ fetch Firestore
**ผู้รับผิดชอบ:** Frontend
**Spark Plan:** ✅ ฟรี

### ✨ FEAT-2: In-App Monthly Summary Print (Admin/Superadmin)
**ไฟล์:** `frontend/app/dashboard/page.js`, `frontend/app/globals.css`
- [ ] เพิ่มปุ่ม "🖨️ พิมพ์รายงาน" ในหน้า Dashboard (เฉพาะ role admin/superadmin)
- [ ] เพิ่ม CSS `@media print` ใน `globals.css`: ซ่อน sidebar, nav, filter panel, ปุ่ม action
- [ ] เพิ่ม print header: ชื่อองค์กร, ช่วงวันที่, วันที่พิมพ์
- [ ] เรียก `window.print()` เมื่อกดปุ่ม
- [ ] ทดสอบ print preview บน Chrome + Safari
**ผู้รับผิดชอบ:** Frontend
**Spark Plan:** ✅ ฟรี

### ✨ FEAT-3: Review & Approval Workflow (Monthly Submit)
**ไฟล์:** `frontend/app/worklogs/page.js`, `frontend/app/admin/page.js`, `firebase/firestore.rules`
- [ ] เพิ่ม field `monthlySubmitted: boolean`, `submittedAt: Timestamp` ใน user document (ต่อเดือน)
- [ ] Staff: เพิ่มปุ่ม "ส่งรายงานประจำเดือน" — เขียน `monthlySubmitted: true` ลง Firestore
- [ ] Admin: เพิ่ม "Pending Review" tab ในหน้า admin dashboard — แสดง staff ที่ submit แล้ว
- [ ] Admin: ปุ่ม "Approve" เขียน `approvedBy`, `approvedAt` ลง Firestore
- [ ] อัปเดต Firestore rule สำหรับ monthly submission fields
**ผู้รับผิดชอบ:** Frontend + Backend (rules)
**Spark Plan:** ✅ ฟรี

---

## QA Checklist
- [ ] **Snyk Security Scan (MCP)**: สแกนหาช่องโหว่ความปลอดภัยในไฟล์ที่เพิ่งอัปเดต (เช่น `firestore.rules`, `NotificationBell.js`) ก่อนเริ่มเทส UI
- [ ] รัน Playwright E2E tests หลัง SEC-1 deploy rules ใหม่
- [ ] ทดสอบ Notification delete: Staff ลบ → superadmin ยังเห็น notification
- [ ] ทดสอบ Notification delete: Superadmin ลบ → staff ยังเห็น notification
- [ ] ทดสอบ privilege escalation: Staff ไม่สามารถสร้าง user role = admin
- [ ] ทดสอบ Print preview บน Safari (iOS PWA) และ Chrome
- [ ] ทดสอบ Auto-Suggest: เลือก minorTask ที่เคยใช้บ่อย → ปรากฏ history suggestions
**ผู้รับผิดชอบ:** QA (รันเครื่องมือ Snyk ผ่าน MCP และ Playwright)
