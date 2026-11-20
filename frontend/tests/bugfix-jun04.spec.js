const { test, expect } = require("@playwright/test");
const { appOrigin, preparePage, signInSynthetic, seedDocument, bangkokDate } = require("./fixtures/synthetic-auth.cjs");

test.skip(({ baseURL }) => baseURL !== appOrigin, "Run with playwright.emulator.config.js");

test("Staff can select and manage an unlocked same-day worklog", async ({ page, baseURL }) => {
  const { uid, displayName } = await signInSynthetic(page, baseURL, "staff");
  await seedDocument("worklogs", uid + "-history", {
    employeeId: uid,
    employeeDisplayName: displayName,
    date: bangkokDate(),
    time: "09:00",
    minorTask: "ติดตั้ง Software",
    mainDuty: "QA Synthetic Duty",
    comment: "QA Same-day Entry",
    locked: false,
    createdAt: new Date(),
  });

  await page.goto("/worklogs");
  await expect(page.getByRole("heading", { name: "ประวัติงาน", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "รายการ", exact: true }).click();
  const row = page.getByRole("button", { name: /QA Same-day Entry/ });
  await expect(row).toContainText(displayName);
  await expect(page.getByRole("checkbox", { name: /เลือกบันทึก ติดตั้ง Software/ })).toBeEnabled();
  await row.click();
  await expect(page.getByRole("button", { name: "แก้ไข", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "ลบ", exact: true })).toBeEnabled();
});

test("Staff can open their dashboard and export page", async ({ page, baseURL }) => {
  await signInSynthetic(page, baseURL, "staff");
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "ภาพรวมงาน", exact: true })).toBeVisible();
  await page.goto("/export");
  await expect(page).toHaveURL(appOrigin + "/export");
  await expect(page.getByRole("heading", { name: /ส่งออกข้อมูล/ }).first()).toBeVisible();
});

test("Superadmin can load the team worklog form and dashboard", async ({ page, baseURL }) => {
  await signInSynthetic(page, baseURL, "superadmin");
  await expect(page.getByRole("heading", { name: "งานของทีม", exact: true })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "ภาพรวมงาน", exact: true })).toBeVisible();
});

test("An anonymous visitor is redirected from the admin user list", async ({ page, baseURL }) => {
  await preparePage(page, baseURL);
  await page.goto("/admin/users");
  await expect(page).toHaveURL(appOrigin + "/login");
});
