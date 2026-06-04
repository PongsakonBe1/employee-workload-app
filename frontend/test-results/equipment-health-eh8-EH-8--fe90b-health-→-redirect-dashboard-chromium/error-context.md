# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: equipment-health-eh8.spec.js >> EH-8 TEST-1: Admin Guard >> Staff accessing /admin/equipment-health → redirect /dashboard
- Location: tests\equipment-health-eh8.spec.js:17:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3001/admin/equipment-health
Call log:
  - navigating to "http://localhost:3001/admin/equipment-health", waiting until "load"

```

# Test source

```ts
  1   | /**
  2   |  * EH-8: Equipment Health Dashboard — Functional Tests
  3   |  * 7 test cases from SE_HANDOVER_EH7_EH6.md
  4   |  */
  5   | 
  6   | const { test, expect } = require("@playwright/test");
  7   | const path = require("path");
  8   | 
  9   | const STAFF_AUTH = path.join(__dirname, "fixtures", "auth-states", "staff.json");
  10  | const SUPERADMIN_AUTH = path.join(__dirname, "fixtures", "auth-states", "superadmin.json");
  11  | 
  12  | // ─────────────────────────────────────────────────────────────────────────────
  13  | // TEST-1: Guard — Staff redirect to /dashboard
  14  | // ─────────────────────────────────────────────────────────────────────────────
  15  | 
  16  | test.describe("EH-8 TEST-1: Admin Guard", () => {
  17  |   test("Staff accessing /admin/equipment-health → redirect /dashboard", async ({ page }) => {
  18  |     // Mock staff auth via localStorage
> 19  |     await page.goto("/admin/equipment-health");
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3001/admin/equipment-health
  20  |     await page.evaluate(() => {
  21  |       localStorage.setItem("firebaseUser", JSON.stringify({
  22  |         uid: "staff-uid-001",
  23  |         email: "pongsagon.r@icit.kmutnb.ac.th",
  24  |         displayName: "พงศกร",
  25  |         role: "staff"
  26  |       }));
  27  |     });
  28  |     await page.reload();
  29  |     await page.waitForTimeout(3000);
  30  |     
  31  |     // Staff should be redirected away from admin page
  32  |     const url = page.url();
  33  |     expect(url).toMatch(/\/dashboard|login/);
  34  |   });
  35  | 
  36  |   test("Admin can access /admin/equipment-health", async ({ page }) => {
  37  |     await page.goto("/admin/equipment-health");
  38  |     await page.evaluate(() => {
  39  |       localStorage.setItem("firebaseUser", JSON.stringify({
  40  |         uid: "admin-uid-001",
  41  |         email: "pongsakon.be1@gmail.com",
  42  |         displayName: "Admin",
  43  |         role: "superadmin"
  44  |       }));
  45  |     });
  46  |     await page.reload();
  47  |     await page.waitForTimeout(3000);
  48  |     
  49  |     // Should stay on admin page (or loading state)
  50  |     const url = page.url();
  51  |     expect(url).toContain("/admin/equipment-health");
  52  |   });
  53  | });
  54  | 
  55  | // ─────────────────────────────────────────────────────────────────────────────
  56  | // TEST-2~7: Equipment Health Dashboard Features
  57  | // ─────────────────────────────────────────────────────────────────────────────
  58  | 
  59  | test.describe("EH-8 TEST-2~7: Dashboard Features (Admin)", () => {
  60  |   test.beforeEach(async ({ page }) => {
  61  |     // Set admin auth before each test
  62  |     await page.goto("/admin/equipment-health");
  63  |     await page.evaluate(() => {
  64  |       localStorage.setItem("firebaseUser", JSON.stringify({
  65  |         uid: "admin-uid-001",
  66  |         email: "pongsakon.be1@gmail.com",
  67  |         displayName: "Admin",
  68  |         role: "superadmin"
  69  |       }));
  70  |     });
  71  |     await page.reload();
  72  |     await page.waitForTimeout(3000);
  73  |   });
  74  | 
  75  |   test("TEST-2: Stat Cards display (สมบูรณ์/ชำรุด/สูญหาย/คืนทั้งหมด)", async ({ page }) => {
  76  |     // Look for stat cards with expected labels
  77  |     const statLabels = ["สมบูรณ์", "ชำรุด", "สูญหาย", "คืนทั้งหมด", "ปกติ", "เสียหาย"];
  78  |     let foundAny = false;
  79  |     
  80  |     for (const label of statLabels) {
  81  |       const locator = page.locator(`text=${label}`).first();
  82  |       if (await locator.isVisible().catch(() => false)) {
  83  |         foundAny = true;
  84  |         break;
  85  |       }
  86  |     }
  87  |     
  88  |     // Should find at least one stat card label
  89  |     expect(foundAny).toBeTruthy();
  90  |   });
  91  | 
  92  |   test("TEST-3: Filter by Equipment Type (หูฟัง/ปลั๊กไฟ)", async ({ page }) => {
  93  |     // Look for filter dropdown/button for equipment type
  94  |     const typeFilter = page.locator("select, button").filter({ hasText: /หูฟัง|ปลั๊กไฟ|ประเภท|Type/i }).first();
  95  |     
  96  |     // If filter exists, test it
  97  |     const hasFilter = await typeFilter.isVisible().catch(() => false);
  98  |     
  99  |     if (hasFilter) {
  100 |       await typeFilter.click();
  101 |       await page.waitForTimeout(500);
  102 |       
  103 |       // Select "หูฟัง" option
  104 |       const headphonesOption = page.locator("option, li, [role='option']").filter({ hasText: /หูฟัง|headphones/i }).first();
  105 |       if (await headphonesOption.isVisible().catch(() => false)) {
  106 |         await headphonesOption.click();
  107 |         await page.waitForTimeout(2000);
  108 |         
  109 |         // Table should update (check for "ไม่มีข้อมูล" or data)
  110 |         const content = await page.content();
  111 |         expect(content.includes("หูฟัง") || content.includes("ไม่มีข้อมูล")).toBeTruthy();
  112 |       }
  113 |     } else {
  114 |       // Skip if no filter UI
  115 |       test.skip(true, "No equipment type filter found");
  116 |     }
  117 |   });
  118 | 
  119 |   test("TEST-4: Filter by Condition (สมบูรณ์/ชำรุด/สูญหาย)", async ({ page }) => {
```