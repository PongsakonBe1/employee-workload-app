# TASKS.md Plan — labboy Workload Recorder

# Combo Template — กดครั้งเดียว บันทึกหลายงานพร้อมกัน

เพิ่มฟีเจอร์ "Combo Template" ให้ Admin สร้าง template ที่ประกอบด้วยหลาย minorTask แล้ว Staff กดครั้งเดียว กรอก recipient ครั้งเดียว → บันทึก worklogs หลายรายการพร้อมกัน

---

## Use Case จริงที่ต้องการแก้

ปัจจุบัน: นักศึกษา 1 คน มาขอ Authen + Google + SSO → Staff ต้องกด **3 รอบ** + กรอกรหัสนักศึกษา **3 ครั้ง**

หลังแก้: กด Combo "ผูก Account ครบชุด" ครั้งเดียว → กรอกรหัสนักศึกษา **1 ครั้ง** → บันทึก **3 worklogs** พร้อมกัน

**ตัวอย่าง Combo Template "ผูก Account ครบชุด":**
| # | minorTask | mainDuty | comment |
|---|---|---|---|
| 1 | Microsoft Authenticator | บริการข้อมูลสารสนเทศ | เปิดใช้งาน Microsoft Authenticator |
| 2 | ICIT account | บริการข้อมูลสารสนเทศ | เปิดใช้งาน Google Account |
| 3 | ICIT account | บริการข้อมูลสารสนเทศ | เปิดใช้งาน KMUTNB SSO |

*(ชื่องานที่แสดงบนปุ่ม: "ผูก Authen", "Google Account", "KMUTNB SSO" — กำหนดได้ใน `name` ของแต่ละ comboItem)*

---

## Schema Changes — [SA]

**ไฟล์:** `firebase/firestore.rules` — **ไม่ต้องแก้** (worklog create rule รองรับอยู่แล้ว)

เพิ่ม fields ใน `globalTemplates` document:
```javascript
isCombo: boolean,           // true = Combo Template
comboItems: [               // array ของ sub-tasks
  {
    name: string,           // ชื่อแสดงผลของ sub-task นี้
    minorTask: string,
    mainDuty: string,
    dutyGroup: string,
    comment: string         // pre-filled comment สำหรับ sub-task นี้
  }
]
// fields เดิม (minorTask, mainDuty) ยังคงอยู่ — ใช้แสดง summary บนปุ่ม
```

ไม่ต้องสร้าง collection ใหม่ ไม่ต้องแก้ Firestore Rules

---

## Backend / Data Layer — [SA → SE handover]

**ไฟล์:** `frontend/lib/quickLogTemplates.js`

- [ ] เพิ่มฟังก์ชัน `logFromComboTemplate(templateId, userId, extraData)`:
  - อ่าน `template.comboItems` array
  - รัน `Promise.all()` สร้าง worklog หลาย doc พร้อมกัน (แต่ละ item = 1 worklog)
  - ทุก worklog ใช้ `recipient` เดียวกัน (จาก extraData)
  - เพิ่ม `usageCount` ครั้งเดียว (นับ 1 ครั้งต่อการกด ไม่ใช่ต่อ sub-task)

---

## Frontend — [SE]

### 1. `frontend/lib/quickLogTemplates.js`
- [ ] เพิ่ม `logFromComboTemplate()` ฟังก์ชัน

### 2. `frontend/components/QuickLogButtons.js`
- [ ] เพิ่ม detect `template.isCombo === true` ใน `handleQuickLog()`
- [ ] Combo template → เปิด `showComboModal` (modal ใหม่)
- [ ] เพิ่ม state: `showComboModal`, handler: `handleLogCombo(recipient)`
- [ ] แสดง badge "combo" บนปุ่ม (เช่น `สีม่วง` + ข้อความ `${comboItems.length} งาน`)
- [ ] หลัง log สำเร็จ: success message บอกจำนวนงานที่บันทึก เช่น "บันทึก 3 งานเรียบร้อย"

### 3. Combo Modal (ใน `QuickLogButtons.js` — ใช้ createPortal เหมือน modal อื่น)
- [ ] แสดงชื่อ Combo Template
- [ ] แสดงรายการ sub-tasks ทั้งหมด (checklist อ่านอย่างเดียว)
- [ ] Input เดียว: ผู้รับบริการ (recipient) *required*
- [ ] ปุ่ม "บันทึก X งาน" → call `handleLogCombo()`

### 4. `frontend/components/TemplateManager.js`
- [ ] เพิ่ม toggle `isCombo` ในฟอร์มสร้าง/แก้ไข template
- [ ] เมื่อ `isCombo = true`: ซ่อน minorTask selector เดี่ยว → แสดง UI เพิ่ม sub-tasks (dynamic list)
  - ปุ่ม "+ เพิ่ม Task" → เพิ่ม row ใหม่ใน `comboItems`
  - แต่ละ row: `MinorTaskSelector` (auto-fill mainDuty) + optional comment field + ปุ่มลบ
  - Validation: ต้องมีอย่างน้อย 2 sub-tasks
- [ ] แสดง badge "Combo (N งาน)" ในรายการ templates

---

## UX Design — [UX/UI]

**Combo Template Button appearance:**
- Badge สีม่วง `bg-violet-100 text-violet-700` ข้อความ "3 งาน"
- Title ปุ่ม: ชื่อ Combo Template
- Subtitle: รายชื่อ minorTask แบบ truncate เช่น "Authen · Google · KMUTNB"
- ไม่มี hold-to-confirm (เพราะต้องกรอก recipient อยู่แล้ว ไม่เสี่ยง misclick)

**Combo Modal:**
- Header: ชื่อ combo + badge "X งานพร้อมกัน"
- รายการ sub-tasks: แสดงเป็น pill list (อ่านอย่างเดียว) เพื่อให้ staff รู้ว่าจะบันทึกอะไร
- Input: "ผู้รับบริการ" (รหัสนักศึกษา) — single field, required
- CTA: `"บันทึก ${comboItems.length} งาน"` สีม่วง (ต่างจาก normal modal สีดำ)

---

## งานแยกตามตำแหน่ง

| ตำแหน่ง | งาน | ไฟล์ |
|---|---|---|
| **[SA]** | ออกแบบ Schema + ยืนยัน Rule ไม่ต้องแก้ | `firestore.rules` (read-only verify) |
| **[SE]** | `logFromComboTemplate()`, `QuickLogButtons` combo logic + modal, `TemplateManager` form | `lib/quickLogTemplates.js`, `components/QuickLogButtons.js`, `components/TemplateManager.js` |
| **[UX/UI]** | Combo badge style, Modal layout | ภายใน SE files (Tailwind classes) |
| **[QA]** | ทดสอบ: บันทึก combo → ตรวจ Firestore 3 docs, recipient ถูกต้องทุก doc, usageCount +1 ครั้ง | Playwright / manual |

---

## ลำดับการทำงาน

1. **[SE]** เพิ่ม `logFromComboTemplate()` ใน `quickLogTemplates.js`
2. **[SE]** แก้ `TemplateManager.js` — ฟอร์ม isCombo + comboItems
3. **[SE]** แก้ `QuickLogButtons.js` — detect combo + modal
4. **[QA]** ทดสอบ end-to-end
5. **[Doc]** อัปเดต README (optional)
