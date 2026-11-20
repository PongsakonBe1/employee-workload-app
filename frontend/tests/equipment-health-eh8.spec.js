const { test, expect } = require("@playwright/test");
const { appOrigin, signInSynthetic, seedDocument, bangkokDate } = require("./fixtures/synthetic-auth.cjs");

test.skip(({ baseURL }) => baseURL !== appOrigin, "Run with playwright.emulator.config.js");

test("Staff cannot access Equipment Health", async ({ page, baseURL }) => {
  await signInSynthetic(page, baseURL, "staff");
  await page.goto("/admin/equipment-health");
  await expect(page).toHaveURL(appOrigin + "/dashboard");
  await expect(page.getByRole("heading", { name: "Equipment Health", exact: true })).toHaveCount(0);
});

test("Superadmin can open Equipment Health from the admin hub", async ({ page, baseURL }) => {
  await signInSynthetic(page, baseURL, "superadmin");
  await page.goto("/admin");
  await page.locator("main").getByRole("link", { name: /สุขภาพอุปกรณ์/ }).click();
  await expect(page.getByRole("heading", { name: "Equipment Health", exact: true })).toBeVisible();
});

test("Equipment Health renders, filters and exports synthetic returns", async ({ page, baseURL }) => {
  const { uid } = await signInSynthetic(page, baseURL, "superadmin");
  const base = { employeeId: uid, date: bangkokDate(), time: "09:00", createdAt: new Date() };
  await Promise.all([
    seedDocument("worklogs", uid + "-headset", {
      ...base, minorTask: "คืนหูฟัง", equipmentCondition: "damaged", comment: "QA Damaged Headset",
    }),
    seedDocument("worklogs", uid + "-power", {
      ...base, minorTask: "คืนปลั๊กไฟ", equipmentCondition: "normal", comment: "QA Good Power Strip",
    }),
  ]);

  await page.goto("/admin/equipment-health");
  await expect(page.getByRole("heading", { name: "Equipment Health", exact: true })).toBeVisible();
  await expect(page.getByText("คืนทั้งหมด", { exact: true }).first()).toBeVisible();
  const headset = page.getByText("QA Damaged Headset", { exact: true });
  const power = page.getByText("QA Good Power Strip", { exact: true });
  await expect(headset).toBeVisible();
  await expect(power).toBeVisible();
  await expect(page.locator(".recharts-surface").first()).toBeVisible();

  const csvButton = page.getByRole("button", { name: "Export CSV", exact: true });
  const [download] = await Promise.all([page.waitForEvent("download"), csvButton.click()]);
  expect(download.suggestedFilename()).toMatch(/\.csv$/i);

  await page.getByRole("button", { name: "หูฟัง", exact: true }).click();
  await expect(headset).toBeVisible();
  await expect(power).toHaveCount(0);
  await page.getByRole("button", { name: "ชำรุด", exact: true }).click();
  await expect(headset).toBeVisible();
  await page.getByRole("button", { name: "ปลั๊กไฟ", exact: true }).click();
  await expect(page.getByText("ไม่มีข้อมูล", { exact: true }).first()).toBeVisible();
  await expect(csvButton).toBeDisabled();
  await page.getByRole("button", { name: "ทุกสภาพ", exact: true }).click();
  await expect(power).toBeVisible();
  await expect(headset).toHaveCount(0);
});
