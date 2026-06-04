# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: logo-display.spec.js >> Logo Display Tests >> login page displays logo correctly
- Location: tests\logo-display.spec.js:9:3

# Error details

```
Test timeout of 25000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3001/login", waiting until "load"

```

# Test source

```ts
  1  | /**
  2  |  * Gray Box Test: Logo Display Verification
  3  |  * Tests that logos display correctly in all locations
  4  |  */
  5  | const { test, expect } = require('@playwright/test');
  6  | 
  7  | test.describe('Logo Display Tests', () => {
  8  |   
  9  |   test('login page displays logo correctly', async ({ page }) => {
> 10 |     await page.goto('/login');
     |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  11 |     
  12 |     // Check logo image exists and is visible
  13 |     const logo = page.locator('img[alt="labboy logo"]').first();
  14 |     await expect(logo).toBeVisible();
  15 |     
  16 |     // Check logo has correct src
  17 |     await expect(logo).toHaveAttribute('src', '/labboy-logo.png');
  18 |     
  19 |     // Check logo is not broken (naturalWidth > 0)
  20 |     const isLogoLoaded = await logo.evaluate(img => img.naturalWidth > 0);
  21 |     expect(isLogoLoaded).toBe(true);
  22 |   });
  23 | 
  24 |   test('navbar displays logo after login', async ({ page }) => {
  25 |     // First go to login
  26 |     await page.goto('/login');
  27 |     
  28 |     // Check navbar logo exists (even without login, the header structure should be there)
  29 |     // Note: AppShell only shows after login, so we test the login page logo first
  30 |     const logo = page.locator('img[alt="labboy logo"]').first();
  31 |     await expect(logo).toBeVisible();
  32 |   });
  33 | 
  34 |   test('favicon link tag exists in page head', async ({ page }) => {
  35 |     await page.goto('/login');
  36 |     // Wait for React hydration to inject <link rel="icon">
  37 |     await page.waitForTimeout(2000);
  38 |     
  39 |     const faviconLink = await page.evaluate(() => {
  40 |       const link = document.querySelector('link[rel="icon"]');
  41 |       return link ? { href: link.href, type: link.type } : null;
  42 |     });
  43 |     
  44 |     expect(faviconLink).not.toBeNull();
  45 |     expect(faviconLink.href).toMatch(/favicon\.ico|icon\.png/);
  46 |   });
  47 | 
  48 |   test('manifest.json references correct icons', async ({ page }) => {
  49 |     await page.goto('/manifest.json');
  50 |     
  51 |     const manifest = await page.evaluate(() => JSON.parse(document.body.innerText));
  52 |     
  53 |     // Check icons use labboy-logo.png
  54 |     expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  55 |     expect(manifest.icons[0].src).toBe('/labboy-logo.png');
  56 |     expect(manifest.icons[1].src).toBe('/labboy-logo.png');
  57 |   });
  58 | });
  59 | 
```