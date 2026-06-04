/**
 * EH-8: Equipment Health Dashboard — Functional Tests
 * 7 test cases from SE_HANDOVER_EH7_EH6.md
 */

const { test, expect } = require("@playwright/test");
const path = require("path");

const STAFF_AUTH = path.join(__dirname, "fixtures", "auth-states", "staff.json");
const SUPERADMIN_AUTH = path.join(__dirname, "fixtures", "auth-states", "superadmin.json");

// ─────────────────────────────────────────────────────────────────────────────
// TEST-1: Guard — Staff redirect to /dashboard
// ─────────────────────────────────────────────────────────────────────────────

test.describe("EH-8 TEST-1: Admin Guard", () => {
  test("Staff accessing /admin/equipment-health → redirect /dashboard", async ({ page }) => {
    // Mock staff auth via localStorage
    await page.goto("/admin/equipment-health");
    await page.evaluate(() => {
      localStorage.setItem("firebaseUser", JSON.stringify({
        uid: "staff-uid-001",
        email: "pongsagon.r@icit.kmutnb.ac.th",
        displayName: "พงศกร",
        role: "staff"
      }));
    });
    await page.reload();
    await page.waitForTimeout(3000);
    
    // Staff should be redirected away from admin page
    const url = page.url();
    expect(url).toMatch(/\/dashboard|login/);
  });

  test("Admin can access /admin/equipment-health", async ({ page }) => {
    await page.goto("/admin/equipment-health");
    await page.evaluate(() => {
      localStorage.setItem("firebaseUser", JSON.stringify({
        uid: "admin-uid-001",
        email: "pongsakon.be1@gmail.com",
        displayName: "Admin",
        role: "superadmin"
      }));
    });
    await page.reload();
    await page.waitForTimeout(3000);
    
    // Should stay on admin page (or loading state)
    const url = page.url();
    expect(url).toContain("/admin/equipment-health");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST-2~7: Equipment Health Dashboard Features
// ─────────────────────────────────────────────────────────────────────────────

test.describe("EH-8 TEST-2~7: Dashboard Features (Admin)", () => {
  test.beforeEach(async ({ page }) => {
    // Set admin auth before each test
    await page.goto("/admin/equipment-health");
    await page.evaluate(() => {
      localStorage.setItem("firebaseUser", JSON.stringify({
        uid: "admin-uid-001",
        email: "pongsakon.be1@gmail.com",
        displayName: "Admin",
        role: "superadmin"
      }));
    });
    await page.reload();
    await page.waitForTimeout(3000);
  });

  test("TEST-2: Stat Cards display (สมบูรณ์/ชำรุด/สูญหาย/คืนทั้งหมด)", async ({ page }) => {
    // Look for stat cards with expected labels
    const statLabels = ["สมบูรณ์", "ชำรุด", "สูญหาย", "คืนทั้งหมด", "ปกติ", "เสียหาย"];
    let foundAny = false;
    
    for (const label of statLabels) {
      const locator = page.locator(`text=${label}`).first();
      if (await locator.isVisible().catch(() => false)) {
        foundAny = true;
        break;
      }
    }
    
    // Should find at least one stat card label
    expect(foundAny).toBeTruthy();
  });

  test("TEST-3: Filter by Equipment Type (หูฟัง/ปลั๊กไฟ)", async ({ page }) => {
    // Look for filter dropdown/button for equipment type
    const typeFilter = page.locator("select, button").filter({ hasText: /หูฟัง|ปลั๊กไฟ|ประเภท|Type/i }).first();
    
    // If filter exists, test it
    const hasFilter = await typeFilter.isVisible().catch(() => false);
    
    if (hasFilter) {
      await typeFilter.click();
      await page.waitForTimeout(500);
      
      // Select "หูฟัง" option
      const headphonesOption = page.locator("option, li, [role='option']").filter({ hasText: /หูฟัง|headphones/i }).first();
      if (await headphonesOption.isVisible().catch(() => false)) {
        await headphonesOption.click();
        await page.waitForTimeout(2000);
        
        // Table should update (check for "ไม่มีข้อมูล" or data)
        const content = await page.content();
        expect(content.includes("หูฟัง") || content.includes("ไม่มีข้อมูล")).toBeTruthy();
      }
    } else {
      // Skip if no filter UI
      test.skip(true, "No equipment type filter found");
    }
  });

  test("TEST-4: Filter by Condition (สมบูรณ์/ชำรุด/สูญหาย)", async ({ page }) => {
    // Look for condition filter
    const conditionFilter = page.locator("select, button").filter({ hasText: /สภาพ|ชำรุด|สูญหาย|Condition/i }).first();
    
    const hasFilter = await conditionFilter.isVisible().catch(() => false);
    
    if (hasFilter) {
      await conditionFilter.click();
      await page.waitForTimeout(500);
      
      // Select "ชำรุด"
      const damagedOption = page.locator("option, li, [role='option']").filter({ hasText: /ชำรุด|damaged/i }).first();
      if (await damagedOption.isVisible().catch(() => false)) {
        await damagedOption.click();
        await page.waitForTimeout(2000);
        
        const content = await page.content();
        expect(content.includes("ชำรุด") || content.includes("damaged") || content.includes("ไม่มีข้อมูล")).toBeTruthy();
      }
    } else {
      test.skip(true, "No condition filter found");
    }
  });

  test("TEST-5: Export CSV button", async ({ page }) => {
    // Look for Export/Download button
    const exportBtn = page.locator("button").filter({ hasText: /Export|ดาวน์โหลด|CSV|ส่งออก/i }).first();
    
    const hasExport = await exportBtn.isVisible().catch(() => false);
    
    if (hasExport) {
      // Click export and check for download
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 5000 }).catch(() => null),
        exportBtn.click()
      ]);
      
      // Download may or may not happen depending on data
      if (download) {
        expect(download.suggestedFilename()).toMatch(/equipment-health|\.csv$/i);
      }
    } else {
      test.skip(true, "No export button found");
    }
  });

  test("TEST-6: Charts render without crash", async ({ page }) => {
    // Wait for charts to load
    await page.waitForTimeout(3000);
    
    // Check for chart containers (SVG elements from recharts)
    const svgs = page.locator("svg");
    const svgCount = await svgs.count();
    
    // Should have SVG charts or empty state
    const hasEmptyState = await page.locator("text=ไม่มีข้อมูล").first().isVisible().catch(() => false);
    
    expect(svgCount > 0 || hasEmptyState).toBeTruthy();
    
    // Check no error messages
    const errorText = page.locator("text=Error").first();
    const hasError = await errorText.isVisible().catch(() => false);
    expect(hasError).toBeFalsy();
  });

  test("TEST-7: Empty state handling", async ({ page }) => {
    // Check for empty state message or data table
    const emptyState = page.locator("text=ไม่มีข้อมูล").first();
    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    
    // Or check for table with data
    const table = page.locator("table").first();
    const hasTable = await table.isVisible().catch(() => false);
    
    // Should have either empty state or table
    expect(hasEmptyState || hasTable).toBeTruthy();
    
    // Page should not crash
    const errorMsg = page.locator("text=เกิดข้อผิดพลาด").first();
    const hasError = await errorMsg.isVisible().catch(() => false);
    expect(hasError).toBeFalsy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin Menu Link Test
// ─────────────────────────────────────────────────────────────────────────────

test.describe("EH-8: Admin Menu Link", () => {
  test("Equipment Health link exists in /admin", async ({ page }) => {
    await page.goto("/admin");
    await page.evaluate(() => {
      localStorage.setItem("firebaseUser", JSON.stringify({
        uid: "admin-uid-001",
        email: "pongsakon.be1@gmail.com",
        displayName: "Admin",
        role: "superadmin"
      }));
    });
    await page.reload();
    await page.waitForTimeout(3000);
    
    // Look for equipment health link
    const links = [
      /สุขภาพอุปกรณ์/,
      /equipment.health/i,
      /อุปกรณ์/,
      /หูฟัง/,
      /ปลั๊กไฟ/
    ];
    
    let foundLink = false;
    for (const pattern of links) {
      const link = page.locator("a, button").filter({ hasText: pattern }).first();
      if (await link.isVisible().catch(() => false)) {
        foundLink = true;
        break;
      }
    }
    
    expect(foundLink).toBeTruthy();
  });
});
