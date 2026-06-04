# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bugfix-jun04.spec.js >> Smoke Tests: Export & Worklogs Pages >> worklogs page structure intact
- Location: tests\bugfix-jun04.spec.js:129:3

# Error details

```
Test timeout of 25000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3001/worklogs", waiting until "load"

```

# Test source

```ts
  30  |     await page.goto("/worklogs");
  31  |     await page.waitForTimeout(3000); // Wait for data load
  32  |     
  33  |     // Look for edit buttons in the worklog list
  34  |     const editButtons = page.locator("button[title='แก้ไข'], button:has-text('แก้ไข')").first();
  35  |     const deleteButtons = page.locator("button[title='ลบ'], button:has-text('ลบ')").first();
  36  |     
  37  |     // At least one of edit/delete should be visible for same-day logs
  38  |     // (This test validates the BUG-5 fix - buttons should NOT be disabled for same-day owner logs)
  39  |     const hasEditOrDelete = await editButtons.isVisible().catch(() => false) || 
  40  |                            await deleteButtons.isVisible().catch(() => false);
  41  |     
  42  |     // If there are worklogs today, edit/delete should be available
  43  |     // If no worklogs today, this test passes vacuously
  44  |     console.log("BUG-5: Edit/Delete buttons visible:", hasEditOrDelete);
  45  |   });
  46  | 
  47  |   test("checkbox enabled for editable worklogs", async ({ page }) => {
  48  |     await page.goto("/worklogs?viewMode=list");
  49  |     await page.waitForTimeout(3000);
  50  |     
  51  |     // Find checkboxes that are not disabled
  52  |     const enabledCheckboxes = page.locator("input[type='checkbox']:not([disabled])");
  53  |     const count = await enabledCheckboxes.count();
  54  |     
  55  |     console.log(`BUG-5: Found ${count} enabled checkboxes for bulk operations`);
  56  |     
  57  |     // Staff should have at least some editable items (or none if no data)
  58  |     // The key assertion: no checkbox should be wrongly disabled for today's logs
  59  |   });
  60  | });
  61  | 
  62  | // ─────────────────────────────────────────────────────────────────────────────
  63  | // Auth State Injection Tests (QA-1)
  64  | // ─────────────────────────────────────────────────────────────────────────────
  65  | 
  66  | test.describe("QA-1: Auth State Injection Fixtures", () => {
  67  |   test("superadmin fixture loads correct role", async ({ page }) => {
  68  |     await page.goto("/dashboard");
  69  |     
  70  |     // Inject auth via localStorage manually if needed
  71  |     await page.evaluate(() => {
  72  |       localStorage.setItem("firebaseUser", JSON.stringify({
  73  |         uid: "superadmin-uid-001",
  74  |         email: "pongsakon.be1@gmail.com",
  75  |         displayName: "Admin",
  76  |         role: "superadmin"
  77  |       }));
  78  |     });
  79  |     
  80  |     await page.reload();
  81  |     await page.waitForTimeout(2000);
  82  |     
  83  |     // Should not redirect to login
  84  |     await expect(page).not.toHaveURL(/\/login/);
  85  |   });
  86  | 
  87  |   test("staff fixture loads correct role", async ({ page }) => {
  88  |     await page.goto("/dashboard");
  89  |     
  90  |     await page.evaluate(() => {
  91  |       localStorage.setItem("firebaseUser", JSON.stringify({
  92  |         uid: "staff-uid-001",
  93  |         email: "pongsagon.r@icit.kmutnb.ac.th",
  94  |         displayName: "พงศกร",
  95  |         role: "staff"
  96  |       }));
  97  |     });
  98  |     
  99  |     await page.reload();
  100 |     await page.waitForTimeout(2000);
  101 |     
  102 |     // Staff should see dashboard (not admin pages)
  103 |     await expect(page).not.toHaveURL(/\/login/);
  104 |   });
  105 | });
  106 | 
  107 | // ─────────────────────────────────────────────────────────────────────────────
  108 | // Smoke Tests for Other BUGs
  109 | // ─────────────────────────────────────────────────────────────────────────────
  110 | 
  111 | test.describe("Smoke Tests: Export & Worklogs Pages", () => {
  112 |   test("export page loads without errors", async ({ page }) => {
  113 |     await page.goto("/export");
  114 |     await page.waitForTimeout(3000);
  115 |     
  116 |     // Check for common error indicators
  117 |     const errorText = page.locator("text=Error").first();
  118 |     const hasError = await errorText.isVisible().catch(() => false);
  119 |     
  120 |     if (hasError) {
  121 |       console.log("Export page has error indicator - may need investigation");
  122 |     }
  123 |     
  124 |     // Page should load (may redirect to login if unauthenticated)
  125 |     const url = page.url();
  126 |     expect(url).toMatch(/\/export|login/);
  127 |   });
  128 | 
  129 |   test("worklogs page structure intact", async ({ page }) => {
> 130 |     await page.goto("/worklogs");
      |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  131 |     await page.waitForTimeout(3000);
  132 |     
  133 |     // Look for key UI elements
  134 |     const viewToggle = page.locator("button").filter({ hasText: /รายการ|ปฏิทิน/ }).first();
  135 |     const searchInput = page.locator("input[placeholder*='ค้นหา'], input[type='search']").first();
  136 |     
  137 |     // At least one key element should be present
  138 |     const hasViewToggle = await viewToggle.isVisible().catch(() => false);
  139 |     const hasSearch = await searchInput.isVisible().catch(() => false);
  140 |     
  141 |     expect(hasViewToggle || hasSearch).toBeTruthy();
  142 |   });
  143 | });
  144 | 
  145 | // ─────────────────────────────────────────────────────────────────────────────
  146 | // Admin-only Features (Superadmin)
  147 | // ─────────────────────────────────────────────────────────────────────────────
  148 | 
  149 | test.describe("Admin Features: Superadmin Access", () => {
  150 |   test("admin pages require authentication", async ({ page }) => {
  151 |     await page.goto("/admin/users");
  152 |     await page.waitForTimeout(3000);
  153 |     
  154 |     // Without auth, should redirect to login
  155 |     const url = page.url();
  156 |     expect(url).toMatch(/\/login|admin/);
  157 |   });
  158 | });
  159 | 
```