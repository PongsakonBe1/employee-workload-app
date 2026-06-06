# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: bugfix-jun04.spec.js >> Smoke Tests: Export & Worklogs Pages >> worklogs page structure intact
- Location: tests\bugfix-jun04.spec.js:174:3

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e6] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e7]:
      - img [ref=e8]
    - generic [ref=e11]:
      - button "Open issues overlay" [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: "0"
          - generic [ref=e15]: "1"
        - generic [ref=e16]: Issue
      - button "Collapse issues badge" [ref=e17]:
        - img [ref=e18]
  - alert [ref=e20]
  - main [ref=e21]:
    - generic [ref=e22]:
      - generic [ref=e23]:
        - generic [ref=e24]:
          - img "labboy logo" [ref=e25]
          - generic [ref=e26]: Workload Recorder
        - heading "บันทึกงาน IT ได้ง่ายขึ้น" [level=1] [ref=e27]
        - paragraph [ref=e28]: ออกแบบมาสำหรับเจ้าหน้าที่เทคนิค ICIT บันทึกงานห้องคอมพิวเตอร์ แก้ไขปัญหา คุมสอบ DL และส่งออกรายงานปีงบประมาณ
        - generic [ref=e29]:
          - generic [ref=e30]: งานในหน้าที่หลัก
          - generic [ref=e31]: หัวข้อรอง
          - generic [ref=e32]: ส่งออก CSV
      - generic [ref=e33]:
        - img [ref=e35]
        - heading "เข้าสู่ระบบ" [level=2] [ref=e38]
        - paragraph [ref=e39]: ใช้ Google Account ของ ICIT เท่านั้น
        - button "เข้าสู่ระบบด้วย Google" [ref=e40] [cursor=pointer]:
          - img [ref=e41]
          - text: เข้าสู่ระบบด้วย Google
        - paragraph [ref=e46]: เฉพาะอีเมล @icit.kmutnb.ac.th เท่านั้น
```

# Test source

```ts
  86  | 
  87  |   test("checkbox enabled for editable worklogs", async ({ page }) => {
  88  |     await page.goto("/worklogs?viewMode=list");
  89  |     await injectStaffAuth(page);
  90  |     await page.reload();
  91  |     await page.waitForTimeout(4000);
  92  |     
  93  |     // Check if page loaded
  94  |     const hasWorklogsPage = await page.locator("[data-testid='worklogs-page'], h1").first().isVisible().catch(() => false);
  95  |     if (!hasWorklogsPage) {
  96  |       test.skip(true, "Worklogs page not loaded");
  97  |       return;
  98  |     }
  99  |     
  100 |     // Find checkboxes that are not disabled
  101 |     const enabledCheckboxes = page.locator("input[type='checkbox']:not([disabled])");
  102 |     const count = await enabledCheckboxes.count();
  103 |     
  104 |     console.log(`BUG-5: Found ${count} enabled checkboxes`);
  105 |     
  106 |     // Should not have negative count
  107 |     expect(count).toBeGreaterThanOrEqual(0);
  108 |   });
  109 | });
  110 | 
  111 | // ─────────────────────────────────────────────────────────────────────────────
  112 | // Auth State Injection Tests (QA-1)
  113 | // ─────────────────────────────────────────────────────────────────────────────
  114 | 
  115 | test.describe("QA-1: Auth State Injection Fixtures", () => {
  116 |   test("superadmin fixture loads correct role", async ({ page }) => {
  117 |     await page.goto("/dashboard");
  118 |     await injectSuperadminAuth(page);
  119 |     await page.reload();
  120 |     await page.waitForTimeout(3000);
  121 |     
  122 |     // Check if stayed on dashboard (not redirected to login)
  123 |     const url = page.url();
  124 |     const hasRedirectedToLogin = url.includes("/login");
  125 |     
  126 |     // If redirected, it's a soft fail (auth may need real Firebase)
  127 |     if (hasRedirectedToLogin) {
  128 |       console.log("QA-1: Superadmin redirected to login - may need real auth");
  129 |     }
  130 |     
  131 |     // Don't hard fail - auth behavior depends on Firebase setup
  132 |     expect(true).toBeTruthy();
  133 |   });
  134 | 
  135 |   test("staff fixture loads correct role", async ({ page }) => {
  136 |     await page.goto("/dashboard");
  137 |     await injectStaffAuth(page);
  138 |     await page.reload();
  139 |     await page.waitForTimeout(3000);
  140 |     
  141 |     const url = page.url();
  142 |     const hasRedirectedToLogin = url.includes("/login");
  143 |     
  144 |     if (hasRedirectedToLogin) {
  145 |       console.log("QA-1: Staff redirected to login - may need real auth");
  146 |     }
  147 |     
  148 |     expect(true).toBeTruthy();
  149 |   });
  150 | });
  151 | 
  152 | // ─────────────────────────────────────────────────────────────────────────────
  153 | // Smoke Tests for Other BUGs
  154 | // ─────────────────────────────────────────────────────────────────────────────
  155 | 
  156 | test.describe("Smoke Tests: Export & Worklogs Pages", () => {
  157 |   test("export page loads without errors", async ({ page }) => {
  158 |     await page.goto("/export");
  159 |     await page.waitForTimeout(3000);
  160 |     
  161 |     // Check for common error indicators
  162 |     const errorText = page.locator("text=Error").first();
  163 |     const hasError = await errorText.isVisible().catch(() => false);
  164 |     
  165 |     if (hasError) {
  166 |       console.log("Export page has error indicator - may need investigation");
  167 |     }
  168 |     
  169 |     // Page should load (may redirect to login if unauthenticated)
  170 |     const url = page.url();
  171 |     expect(url).toMatch(/\/export|login/);
  172 |   });
  173 | 
  174 |   test("worklogs page structure intact", async ({ page }) => {
  175 |     await page.goto("/worklogs");
  176 |     await page.waitForTimeout(3000);
  177 |     
  178 |     // Look for key UI elements
  179 |     const viewToggle = page.locator("button").filter({ hasText: /รายการ|ปฏิทิน/ }).first();
  180 |     const searchInput = page.locator("input[placeholder*='ค้นหา'], input[type='search']").first();
  181 |     
  182 |     // At least one key element should be present
  183 |     const hasViewToggle = await viewToggle.isVisible().catch(() => false);
  184 |     const hasSearch = await searchInput.isVisible().catch(() => false);
  185 |     
> 186 |     expect(hasViewToggle || hasSearch).toBeTruthy();
      |                                        ^ Error: expect(received).toBeTruthy()
  187 |   });
  188 | });
  189 | 
  190 | // ─────────────────────────────────────────────────────────────────────────────
  191 | // Admin-only Features (Superadmin)
  192 | // ─────────────────────────────────────────────────────────────────────────────
  193 | 
  194 | test.describe("Admin Features: Superadmin Access", () => {
  195 |   test("admin pages require authentication", async ({ page }) => {
  196 |     await page.goto("/admin/users");
  197 |     await page.waitForTimeout(3000);
  198 |     
  199 |     // Without auth, should redirect to login
  200 |     const url = page.url();
  201 |     expect(url).toMatch(/\/login|admin/);
  202 |   });
  203 | });
  204 | 
```