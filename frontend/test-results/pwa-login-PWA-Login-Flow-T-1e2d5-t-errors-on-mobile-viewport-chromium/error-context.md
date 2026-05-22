# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pwa-login.spec.js >> PWA Login Flow Tests >> login page loads without errors on mobile viewport
- Location: tests\pwa-login.spec.js:9:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=เข้าสู่ระบบ')
Expected: visible
Error: strict mode violation: locator('text=เข้าสู่ระบบ') resolved to 2 elements:
    1) <h2 class="text-3xl font-semibold tracking-tight text-slate-950">เข้าสู่ระบบ</h2> aka getByRole('heading', { name: 'เข้าสู่ระบบ' })
    2) <button class="apple-button mt-8 w-full inline-flex items-center justify-center gap-3">…</button> aka getByRole('button', { name: 'เข้าสู่ระบบด้วย Google' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=เข้าสู่ระบบ')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - img "labboy logo" [ref=e6]
          - generic [ref=e7]: Workload Recorder
        - heading "บันทึกงาน IT ได้ง่ายขึ้น" [level=1] [ref=e8]
        - paragraph [ref=e9]: ออกแบบมาสำหรับเจ้าหน้าที่เทคนิค ICIT บันทึกงานห้องคอมพิวเตอร์ แก้ไขปัญหา คุมสอบ DL และส่งออกรายงานปีงบประมาณ
        - generic [ref=e10]:
          - generic [ref=e11]: งานในหน้าที่หลัก
          - generic [ref=e12]: หัวข้อรอง
          - generic [ref=e13]: ส่งออก CSV
      - generic [ref=e14]:
        - img [ref=e16]
        - heading "เข้าสู่ระบบ" [level=2] [ref=e19]
        - paragraph [ref=e20]: ใช้ Google Account ของ ICIT เท่านั้น
        - button "เข้าสู่ระบบด้วย Google" [ref=e21] [cursor=pointer]:
          - img [ref=e22]
          - text: เข้าสู่ระบบด้วย Google
        - paragraph [ref=e27]: เฉพาะอีเมล @icit.kmutnb.ac.th เท่านั้น
  - alert [ref=e28]
```

# Test source

```ts
  1  | /**
  2  |  * Gray Box Test: PWA Login Flow
  3  |  * Tests PWA login behavior without redirect loop
  4  |  */
  5  | const { test, expect } = require('@playwright/test');
  6  | 
  7  | test.describe('PWA Login Flow Tests', () => {
  8  |   
  9  |   test('login page loads without errors on mobile viewport', async ({ page }) => {
  10 |     // Set mobile viewport (iPhone SE)
  11 |     await page.setViewportSize({ width: 375, height: 667 });
  12 |     
  13 |     await page.goto('/login');
  14 |     
  15 |     // Check page loaded
> 16 |     await expect(page.locator('text=เข้าสู่ระบบ')).toBeVisible();
     |                                                    ^ Error: expect(locator).toBeVisible() failed
  17 |     
  18 |     // Check Google login button exists
  19 |     const googleBtn = page.locator('button:has-text("เข้าสู่ระบบด้วย Google")');
  20 |     await expect(googleBtn).toBeVisible();
  21 |     
  22 |     // Check no console errors
  23 |     const consoleErrors = [];
  24 |     page.on('console', msg => {
  25 |       if (msg.type() === 'error') {
  26 |         consoleErrors.push(msg.text());
  27 |       }
  28 |     });
  29 |     
  30 |     // Wait a bit for any async errors
  31 |     await page.waitForTimeout(1000);
  32 |     
  33 |     expect(consoleErrors).toHaveLength(0);
  34 |   });
  35 | 
  36 |   test('login page logo displays correctly on mobile', async ({ page }) => {
  37 |     await page.setViewportSize({ width: 375, height: 667 });
  38 |     await page.goto('/login');
  39 |     
  40 |     // Check logo is visible and loaded
  41 |     const logo = page.locator('img[alt="labboy logo"]').first();
  42 |     await expect(logo).toBeVisible();
  43 |     
  44 |     // Check image is not broken
  45 |     const isLoaded = await logo.evaluate(img => {
  46 |       return img.complete && img.naturalWidth > 0;
  47 |     });
  48 |     expect(isLoaded).toBe(true);
  49 |   });
  50 | 
  51 |   test('no redirect loop when accessing login while unauthenticated', async ({ page }) => {
  52 |     await page.goto('/login');
  53 |     
  54 |     // Count redirects
  55 |     let redirectCount = 0;
  56 |     page.on('framenavigated', () => {
  57 |       redirectCount++;
  58 |     });
  59 |     
  60 |     // Wait and check we're still on login
  61 |     await page.waitForTimeout(2000);
  62 |     
  63 |     // Should still be on login page
  64 |     await expect(page).toHaveURL(/.*\/login/);
  65 |     
  66 |     // Should not have excessive redirects (max 1 for initial load)
  67 |     expect(redirectCount).toBeLessThanOrEqual(2);
  68 |   });
  69 | 
  70 |   test('PWA manifest is accessible', async ({ page }) => {
  71 |     const response = await page.goto('/manifest.json');
  72 |     expect(response.status()).toBe(200);
  73 |     
  74 |     const manifest = await page.evaluate(() => JSON.parse(document.body.innerText));
  75 |     expect(manifest.name).toBeTruthy();
  76 |     expect(manifest.icons).toHaveLength(2);
  77 |   });
  78 | 
  79 |   test('standalone mode detection works', async ({ page }) => {
  80 |     await page.goto('/login');
  81 |     
  82 |     // Check if navigator.standalone check exists in page
  83 |     const hasStandaloneCheck = await page.evaluate(() => {
  84 |       return typeof window.navigator !== 'undefined' && 
  85 |              'standalone' in window.navigator;
  86 |     });
  87 |     
  88 |     // This test verifies the code exists, not the actual value
  89 |     expect(hasStandaloneCheck).toBe(true);
  90 |   });
  91 | });
  92 | 
```