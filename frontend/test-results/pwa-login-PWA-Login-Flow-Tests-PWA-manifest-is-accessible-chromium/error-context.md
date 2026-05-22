# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pwa-login.spec.js >> PWA Login Flow Tests >> PWA manifest is accessible
- Location: tests\pwa-login.spec.js:70:3

# Error details

```
Error: expect(received).toHaveLength(expected)

Expected length: 2
Received length: 3
Received array:  [{"purpose": "any", "sizes": "192x192", "src": "/labboy-logo.png", "type": "image/png"}, {"purpose": "any", "sizes": "512x512", "src": "/labboy-logo.png", "type": "image/png"}, {"purpose": "maskable", "sizes": "192x192", "src": "/labboy-logo.png", "type": "image/png"}]
```

# Page snapshot

```yaml
- generic [ref=e2]: "{ \"name\": \"labboy Workload Recorder\", \"short_name\": \"Workload\", \"description\": \"Employee workload recording system for ICIT staff\", \"start_url\": \"/\", \"scope\": \"/\", \"display\": \"standalone\", \"background_color\": \"#f8fafc\", \"theme_color\": \"#0f172a\", \"orientation\": \"portrait\", \"icons\": [ { \"src\": \"/labboy-logo.png\", \"sizes\": \"192x192\", \"type\": \"image/png\", \"purpose\": \"any\" }, { \"src\": \"/labboy-logo.png\", \"sizes\": \"512x512\", \"type\": \"image/png\", \"purpose\": \"any\" }, { \"src\": \"/labboy-logo.png\", \"sizes\": \"192x192\", \"type\": \"image/png\", \"purpose\": \"maskable\" } ] }"
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
  16 |     await expect(page.locator('text=เข้าสู่ระบบ')).toBeVisible();
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
> 76 |     expect(manifest.icons).toHaveLength(2);
     |                            ^ Error: expect(received).toHaveLength(expected)
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