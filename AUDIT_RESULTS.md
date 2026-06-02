# Audit Results
## SA
Action Items ฟรีทั้งหมด (ไม่มีค่าใช้จ่ายเพิ่ม)
###	Action	ไฟล์ที่ต้องแก้	ผลลัพธ์
1	ย่อย Components ขนาดใหญ่	RoomEquipmentStatus.js, QuickLogButtons.js, AuthProvider.js, NotificationBell.js	Maintainability ↑
2	แยก Server/Client Components	สร้าง *_client.jsx สำหรับส่วนที่ใช้ browser	Bundle size ↓
3	เพิ่ม loading.js + error.js	สร้างในแต่ละ route folder	UX ↑
4	ใช้ SWR สำหรับ Data Fetching	ติดตั้ง swr + แก้ทุกหน้าที่มี useEffect ดึงข้อมูล	Caching, ลด Firestore quota
5	สร้าง Route Group (admin)	สร้าง app/(admin)/layout.js	โครงสร้างเป็นระเบียบ
6	ย้าย business logic ออกจาก UI	สร้าง hooks/useWorklogs.js, hooks/useDashboard.js	Testability ↑
7	ลบ i18n ออกจากโปรเจ็กต์	ลบ next-intl, i18n/, messages/, LanguageSwitcher.js	ลด complexity

## SE
SE (Security) — Action Items ฟรีทั้งหมด
###	Action	ไฟล์ที่ต้องแก้	ผลลัพธ์
1	🔴 Critical	ปิด TEMPORARY rules — pendingUsers read/delete กลับเป็น isAdmin()	firestore.rules บรรทัด 153, 162	ป้องกัน Staff อ่าน/ลบคำขอเข้าระบบของคนอื่น
2	🔴 Critical	ปิด TEMPORARY rule — notifications create กลับเป็น isAdmin() || userId == auth.uid	firestore.rules บรรทัด 183	ป้องกัน Staff สร้าง notification ปลอม broadcast ทั้งระบบ
3	🔴 Critical	ลบ 'admin' ออกจาก self-creation rule ให้เหลือแค่ 'staff'	firestore.rules บรรทัด 85	ป้องกัน Privilege Escalation — Staff ตั้ง role ตัวเองเป็น admin
4	🟠 High	เพิ่ม resource.data.locked != true ใน worklog delete rule สำหรับ non-admin	firestore.rules บรรทัด 122-123	ป้องกัน Staff ลบ worklog ที่ admin lock ไว้
5	🟠 High	เพิ่ม request.resource.data.employeeId == request.auth.uid || isAdmin() ใน worklog create	firestore.rules บรรทัด 112	ป้องกัน Staff สร้าง worklog ปลอมในชื่อคนอื่น
6	🟠 High	เพิ่ม isSameDay(resource.data) ใน worklog update/delete สำหรับ non-admin	firestore.rules บรรทัด 115-123	ปิดช่อง bypass — ใช้ isSameDay() ที่เขียนไว้แล้วแต่ไม่ได้ใช้
7	🟡 Medium	เพิ่ม request.resource.data.staffId == request.auth.uid ใน exportRequests create	firestore.rules บรรทัด 238	ป้องกัน Staff สร้าง export request ในชื่อคนอื่น
8	🟡 Medium	เพิ่ม isValidWorkLogUpdate() สำหรับ admin worklog update ด้วย	firestore.rules บรรทัด 115	ป้องกัน admin inject field แปลกเข้า worklog
9	🟢 Low	ย้าย import { increment } from "firebase/firestore" ขึ้นบนสุดของไฟล์	frontend/lib/quickLogTemplates.js บรรทัด 214-216	Code quality — imports ควรอยู่ด้านบน

## UX/UI
### UX/UI Action Items (ฟรี ไม่มีค่าใช้จ่ายเพิ่ม)
Priority	Action	ไฟล์ที่ต้องแก้	ผลลัพธ์
🔴 Critical	เพิ่ม aria-live region สำหรับ dynamic content	dashboard/page.js (ใต้ <AppShell>)	Screen readers ประกาศข้อมูลอัปเดต
🔴 Critical	Fix Toast Notifications — เพิ่ม role="status" + ปุ่มปิด	worklogs/new/page.js Line 269-287	ไม่ violate WCAG 2.1 (auto-dismiss ไม่มีให้ user control)
🔴 Critical	Fix Form Labels — เพิ่ม htmlFor + id	worklogs/new/page.js Line 328, 355	Screen readers อ่าน label ถูกต้อง
🔴 Critical	Fix Custom Date Modal — เพิ่ม role="dialog", aria-modal, aria-labelledby	dashboard/page.js Line 724-780	Modal ใช้ keyboard + screen reader ได้
🟠 High	Fix DateTimeRow Disclosure — เพิ่ม aria-expanded, aria-controls	worklogs/new/page.js Line 454-497	Screen reader รู้ว่าเปิด/ปิด section
🟠 High	Fix Filter Buttons — เพิ่ม aria-pressed + focus ring	dashboard/page.js Line 606-617	รู้ว่าปุ่มไหนถูกเลือก
🟠 High	Fix Icon-Only Button — เพิ่ม aria-label	worklogs/new/page.js Line 304-311	รู้ว่าปุ่มทำอะไร
🟠 High	Fix Sticky Save Bar — เพิ่ม aria-disabled + aria-describedby	worklogs/new/page.js Line 431-445	Screen reader รู้สถานะ disabled + เหตุผล
🟠 High	Fix Lock Notice — เพิ่ม role="note", aria-label	worklogs/new/page.js Line 420-426	ข้อมูลสำคัญถูกประกาศ
🟠 High	เพิ่ม Chart Accessibility — role="img", aria-label, sr-only table	dashboard/page.js Line 866-884	Screen reader เข้าถึงกราฟได้
🟡 Medium	Fix Draft Clear Button — เพิ่ม aria-label	worklogs/new/page.js Line 377-381	รู้ว่าปุ่มทำอะไร
🟡 Medium	Fix Limit Warning — เปลี่ยนเป็น role="alert" + aria-live	dashboard/page.js Line 823-864	Screen reader ประกาศ warning ทันที
🟡 Medium	Fix Employee Dropdown — ย่อยซับซ้อน (combobox หรือ optgroup)	dashboard/page.js Line 679-694	ใช้งานง่ายขึ้น ไม่ scroll ยาว
🟢 Low	ลบ Duplicate Error Display	dashboard/page.js Line 783-787, 816-819	ไม่สับสน
🟢 Low	เพิ่ม prefers-reduced-motion ให้ Toast	worklogs/new/page.js Line 269-287	Respect ผู้ใช้ที่ไม่ชอบ animation
🟢 Low	จัดกลุ่ม Filters แบบ Progressive Disclosure	dashboard/page.js Line 589-721	ลด cognitive load

## DA
### สรุป Priority Table
ลำดับ	ปัญหา	ไฟล์:บรรทัด	Impact
🔴 1	Aggregate จาก truncated data → กราฟผิด	dashboard/page.js:436	ข้อมูลเชื่อถือไม่ได้
🔴 2	Duplicate error block	dashboard/page.js:783, 816	UX สับสน
🔴 3	Leaderboard query ซ้ำซ้อน	dashboard/page.js:528	เปลือง Firestore quota
🟠 4	DOW Heatmap ผิด timezone	dashboard/page.js:463	Insight ผิด 1 วัน
🟠 5	ไม่มี loading state charts	dashboard/page.js:866	UX layout shift
🟠 6	เฉลี่ยงาน/คน คำนวณผิด	dashboard/page.js:918	ตัวเลขเข้าใจผิด
🟡 7	ไม่มี Moving Average	DashboardCharts.js:280	Trend ดูยาก
🟡 8	Bar chart ไม่มี "อื่นๆ"	DashboardCharts.js:332	represent ไม่ครบ
🟡 9	Peak Hour ไม่ Highlight	DashboardCharts.js:148	อ่านค่าช้า
🟢 10	ไม่มี Export CSV	dashboard/page.js	ผู้บริหารต้อง screenshot
