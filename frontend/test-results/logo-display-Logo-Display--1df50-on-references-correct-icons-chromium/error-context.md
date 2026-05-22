# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: logo-display.spec.js >> Logo Display Tests >> manifest.json references correct icons
- Location: tests\logo-display.spec.js:40:3

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
  2  |  * Gray Box Test: Logo Display Verification
  3  |  * Tests that logos display correctly in all locations
  4  |  */
  5  | const { test, expect } = require('@playwright/test');
  6  | 
  7  | test.describe('Logo Display Tests', () => {
  8  |   
  9  |   test('login page displays logo correctly', async ({ page }) => {
  10 |     await page.goto('/login');
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
  34 |   test('favicon exists and is accessible', async ({ page }) => {
  35 |     // Check favicon is accessible
  36 |     const response = await page.goto('/favicon.ico');
  37 |     expect(response.status()).toBe(200);
  38 |   });
  39 | 
  40 |   test('manifest.json references correct icons', async ({ page }) => {
  41 |     await page.goto('/manifest.json');
  42 |     
  43 |     const manifest = await page.evaluate(() => JSON.parse(document.body.innerText));
  44 |     
  45 |     // Check icons use labboy-logo.png
> 46 |     expect(manifest.icons).toHaveLength(2);
     |                            ^ Error: expect(received).toHaveLength(expected)
  47 |     expect(manifest.icons[0].src).toBe('/labboy-logo.png');
  48 |     expect(manifest.icons[1].src).toBe('/labboy-logo.png');
  49 |   });
  50 | });
  51 | 
```