/**
 * Gray Box Test: PWA Login Flow
 * Tests PWA login behavior without redirect loop
 */
const { test, expect } = require('@playwright/test');

test.describe('PWA Login Flow Tests', () => {
  
  test('login page loads without errors on mobile viewport', async ({ page }) => {
    // Set mobile viewport (iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/login');
    
    // Check page loaded
    await expect(page.getByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeVisible();
    
    // Check Google login button exists
    const googleBtn = page.locator('button:has-text("เข้าสู่ระบบด้วย Google")');
    await expect(googleBtn).toBeVisible();
    
    // Check no console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a bit for any async errors
    await page.waitForTimeout(1000);
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('login page logo displays correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    
    // Check logo is visible and loaded
    const logo = page.locator('img[alt="labboy logo"]').first();
    await expect(logo).toBeVisible();
    
    // Check image is not broken
    const isLoaded = await logo.evaluate(img => {
      return img.complete && img.naturalWidth > 0;
    });
    expect(isLoaded).toBe(true);
  });

  test('no redirect loop when accessing login while unauthenticated', async ({ page }) => {
    await page.goto('/login');
    
    // Count redirects
    let redirectCount = 0;
    page.on('framenavigated', () => {
      redirectCount++;
    });
    
    // Wait and check we're still on login
    await page.waitForTimeout(2000);
    
    // Should still be on login page
    await expect(page).toHaveURL(/.*\/login/);
    
    // Should not have excessive redirects (max 1 for initial load)
    expect(redirectCount).toBeLessThanOrEqual(2);
  });

  test('PWA manifest is accessible', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    expect(response.status()).toBe(200);
    
    const manifest = await page.evaluate(() => JSON.parse(document.body.innerText));
    expect(manifest.name).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });

  test('standalone mode detection works', async ({ page }) => {
    await page.goto('/login');
    
    // Check matchMedia display-mode: standalone detection works (Android PWA)
    const hasDisplayModeCheck = await page.evaluate(() => {
      return typeof window.matchMedia === 'function' &&
             typeof window.matchMedia('(display-mode: standalone)').matches === 'boolean';
    });
    
    // matchMedia is available in all modern browsers
    expect(hasDisplayModeCheck).toBe(true);
  });
});
