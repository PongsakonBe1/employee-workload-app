# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: equipment-health-eh8.spec.js >> EH-8: Admin Menu Link >> Equipment Health link exists in /admin
- Location: tests\equipment-health-eh8.spec.js:208:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3001/admin
Call log:
  - navigating to "http://localhost:3001/admin", waiting until "load"

```

# Test source

```ts
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
  120 |     // Look for condition filter
  121 |     const conditionFilter = page.locator("select, button").filter({ hasText: /สภาพ|ชำรุด|สูญหาย|Condition/i }).first();
  122 |     
  123 |     const hasFilter = await conditionFilter.isVisible().catch(() => false);
  124 |     
  125 |     if (hasFilter) {
  126 |       await conditionFilter.click();
  127 |       await page.waitForTimeout(500);
  128 |       
  129 |       // Select "ชำรุด"
  130 |       const damagedOption = page.locator("option, li, [role='option']").filter({ hasText: /ชำรุด|damaged/i }).first();
  131 |       if (await damagedOption.isVisible().catch(() => false)) {
  132 |         await damagedOption.click();
  133 |         await page.waitForTimeout(2000);
  134 |         
  135 |         const content = await page.content();
  136 |         expect(content.includes("ชำรุด") || content.includes("damaged") || content.includes("ไม่มีข้อมูล")).toBeTruthy();
  137 |       }
  138 |     } else {
  139 |       test.skip(true, "No condition filter found");
  140 |     }
  141 |   });
  142 | 
  143 |   test("TEST-5: Export CSV button", async ({ page }) => {
  144 |     // Look for Export/Download button
  145 |     const exportBtn = page.locator("button").filter({ hasText: /Export|ดาวน์โหลด|CSV|ส่งออก/i }).first();
  146 |     
  147 |     const hasExport = await exportBtn.isVisible().catch(() => false);
  148 |     
  149 |     if (hasExport) {
  150 |       // Click export and check for download
  151 |       const [download] = await Promise.all([
  152 |         page.waitForEvent("download", { timeout: 5000 }).catch(() => null),
  153 |         exportBtn.click()
  154 |       ]);
  155 |       
  156 |       // Download may or may not happen depending on data
  157 |       if (download) {
  158 |         expect(download.suggestedFilename()).toMatch(/equipment-health|\.csv$/i);
  159 |       }
  160 |     } else {
  161 |       test.skip(true, "No export button found");
  162 |     }
  163 |   });
  164 | 
  165 |   test("TEST-6: Charts render without crash", async ({ page }) => {
  166 |     // Wait for charts to load
  167 |     await page.waitForTimeout(3000);
  168 |     
  169 |     // Check for chart containers (SVG elements from recharts)
  170 |     const svgs = page.locator("svg");
  171 |     const svgCount = await svgs.count();
  172 |     
  173 |     // Should have SVG charts or empty state
  174 |     const hasEmptyState = await page.locator("text=ไม่มีข้อมูล").first().isVisible().catch(() => false);
  175 |     
  176 |     expect(svgCount > 0 || hasEmptyState).toBeTruthy();
  177 |     
  178 |     // Check no error messages
  179 |     const errorText = page.locator("text=Error").first();
  180 |     const hasError = await errorText.isVisible().catch(() => false);
  181 |     expect(hasError).toBeFalsy();
  182 |   });
  183 | 
  184 |   test("TEST-7: Empty state handling", async ({ page }) => {
  185 |     // Check for empty state message or data table
  186 |     const emptyState = page.locator("text=ไม่มีข้อมูล").first();
  187 |     const hasEmptyState = await emptyState.isVisible().catch(() => false);
  188 |     
  189 |     // Or check for table with data
  190 |     const table = page.locator("table").first();
  191 |     const hasTable = await table.isVisible().catch(() => false);
  192 |     
  193 |     // Should have either empty state or table
  194 |     expect(hasEmptyState || hasTable).toBeTruthy();
  195 |     
  196 |     // Page should not crash
  197 |     const errorMsg = page.locator("text=เกิดข้อผิดพลาด").first();
  198 |     const hasError = await errorMsg.isVisible().catch(() => false);
  199 |     expect(hasError).toBeFalsy();
  200 |   });
  201 | });
  202 | 
  203 | // ─────────────────────────────────────────────────────────────────────────────
  204 | // Admin Menu Link Test
  205 | // ─────────────────────────────────────────────────────────────────────────────
  206 | 
  207 | test.describe("EH-8: Admin Menu Link", () => {
  208 |   test("Equipment Health link exists in /admin", async ({ page }) => {
> 209 |     await page.goto("/admin");
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3001/admin
  210 |     await page.evaluate(() => {
  211 |       localStorage.setItem("firebaseUser", JSON.stringify({
  212 |         uid: "admin-uid-001",
  213 |         email: "pongsakon.be1@gmail.com",
  214 |         displayName: "Admin",
  215 |         role: "superadmin"
  216 |       }));
  217 |     });
  218 |     await page.reload();
  219 |     await page.waitForTimeout(3000);
  220 |     
  221 |     // Look for equipment health link
  222 |     const links = [
  223 |       /สุขภาพอุปกรณ์/,
  224 |       /equipment.health/i,
  225 |       /อุปกรณ์/,
  226 |       /หูฟัง/,
  227 |       /ปลั๊กไฟ/
  228 |     ];
  229 |     
  230 |     let foundLink = false;
  231 |     for (const pattern of links) {
  232 |       const link = page.locator("a, button").filter({ hasText: pattern }).first();
  233 |       if (await link.isVisible().catch(() => false)) {
  234 |         foundLink = true;
  235 |         break;
  236 |       }
  237 |     }
  238 |     
  239 |     expect(foundLink).toBeTruthy();
  240 |   });
  241 | });
  242 | 
```