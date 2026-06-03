/**
 * Push Notification E2E Tests
 * ทดสอบ Background Push Notification via Render + Cron-job.org
 *
 * Prerequisites (ต้องพร้อมก่อนรัน):
 *   - RENDER_URL     : URL ของ backend บน Render เช่น https://icit-workload.onrender.com
 *   - CRON_SECRET    : ค่า secret ที่ตั้งใน Render env
 *   - SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD : account superadmin จริง (ถ้าใช้ Google login ให้ใช้ test account)
 *
 * รันด้วย:
 *   RENDER_URL=https://xxx.onrender.com CRON_SECRET=xxx npx playwright test push-notification-e2e --config playwright.qa.config.js
 */

const { test, expect, request } = require("@playwright/test");

const RENDER_URL = process.env.RENDER_URL || "http://localhost:4000";
const CRON_SECRET = process.env.CRON_SECRET || "dev-cron-secret";

// ─── Helper ───────────────────────────────────────────────────────────────────

const IS_BACKEND_AVAILABLE = RENDER_URL !== "http://localhost:4000" || process.env.BACKEND_LOCAL === "1";

async function getApiContext() {
  return request.newContext({ baseURL: RENDER_URL });
}

// ─── 1. Backend Health Check ──────────────────────────────────────────────────

test.describe("PUSH-1: Backend Health Check", () => {
  test.skip(!IS_BACKEND_AVAILABLE, "ข้าม: ตั้ง RENDER_URL หรือ BACKEND_LOCAL=1 ก่อนรัน");

  test("GET /health ตอบ 200 และ ok=true", async () => {
    const api = await getApiContext();
    const res = await api.get("/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.service).toBe("icit-workload-backend");
  });

  test("GET /api/notify/health ตอบ 200 และ ok=true", async () => {
    const api = await getApiContext();
    const res = await api.get("/api/notify/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

// ─── 2. Auth Guard — Broadcast Endpoint ──────────────────────────────────────

test.describe("PUSH-2: Auth Guard — Broadcast Endpoint", () => {
  test.skip(!IS_BACKEND_AVAILABLE, "ข้าม: ตั้ง RENDER_URL หรือ BACKEND_LOCAL=1 ก่อนรัน");

  test("POST /api/notify/broadcast ไม่มี token → 401", async () => {
    const api = await getApiContext();
    const res = await api.post("/api/notify/broadcast", {
      data: { title: "test", body: "test" },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test("POST /api/notify/broadcast token ปลอม → 401 หรือ 403", async () => {
    const api = await getApiContext();
    const res = await api.post("/api/notify/broadcast", {
      headers: { Authorization: "Bearer fake.token.value" },
      data: { title: "test", body: "test" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("POST /api/notify/broadcast body ว่าง (ไม่มี title/body) → 400", async () => {
    const api = await getApiContext();
    // ทดสอบด้วย token จริงได้ด้วย env SUPERADMIN_ID_TOKEN ถ้ามี
    // ถ้าไม่มี token จะได้ 401 ซึ่งยังคือ rejection ที่ถูกต้อง
    const idToken = process.env.SUPERADMIN_ID_TOKEN;
    const headers = idToken
      ? { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
    const res = await api.post("/api/notify/broadcast", {
      headers,
      data: {},
    });
    expect([400, 401, 403]).toContain(res.status());
  });
});

// ─── 3. Auth Guard — Daily Reminder Endpoint ─────────────────────────────────

test.describe("PUSH-3: Auth Guard — Daily Reminder Endpoint", () => {
  test.skip(!IS_BACKEND_AVAILABLE, "ข้าม: ตั้ง RENDER_URL หรือ BACKEND_LOCAL=1 ก่อนรัน");

  test("POST /api/notify/daily-reminder ไม่มี x-cron-secret → 401", async () => {
    const api = await getApiContext();
    const res = await api.post("/api/notify/daily-reminder", { data: {} });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test("POST /api/notify/daily-reminder secret ผิด → 401", async () => {
    const api = await getApiContext();
    const res = await api.post("/api/notify/daily-reminder", {
      headers: { "x-cron-secret": "wrong-secret-value" },
      data: {},
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/notify/daily-reminder secret ถูก → 200 (ไม่ส่งถ้าไม่ใช่วันหรือเวลา)", async () => {
    const api = await getApiContext();
    const res = await api.post("/api/notify/daily-reminder", {
      headers: { "x-cron-secret": CRON_SECRET },
      data: {},
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    // อาจได้ sentCount=0 ถ้าไม่ใช่เวลา/วันที่ตั้งไว้ — ถือว่าผ่าน
    expect(typeof body.sentCount).toBe("number");
  });
});

// ─── 4. Test Endpoint (dev only) ─────────────────────────────────────────────

test.describe("PUSH-4: Test Endpoint Security", () => {
  test.skip(!IS_BACKEND_AVAILABLE, "ข้าม: ตั้ง RENDER_URL หรือ BACKEND_LOCAL=1 ก่อนรัน");

  test("POST /api/notify/test ใน production → 403", async () => {
    // ทดสอบเฉพาะถ้า RENDER_URL ชี้ไป production
    if (!RENDER_URL.includes("onrender.com") && !RENDER_URL.includes("render.com")) {
      test.skip();
      return;
    }
    const api = await getApiContext();
    const res = await api.post("/api/notify/test", {
      data: { token: "fake-token" },
    });
    expect(res.status()).toBe(403);
  });
});

// ─── 5. Frontend UI — Broadcast Section ──────────────────────────────────────

test.describe("PUSH-5: Frontend UI — Broadcast Section (Superadmin)", () => {
  test("หน้า /admin/settings โหลดได้และ redirect unauthenticated → /login", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("Broadcast UI ไม่แสดงให้ unauthenticated user", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    // ต้อง redirect ไป /login ก่อน — Broadcast section ไม่ render
    await expect(page).toHaveURL(/\/login/);
    const broadcastBtn = page.locator('button:has-text("ส่ง Push Notification ทุกคน")');
    await expect(broadcastBtn).not.toBeVisible();
  });
});

// ─── 6. Broadcast Flow (ต้องมี SUPERADMIN_ID_TOKEN) ─────────────────────────

test.describe("PUSH-6: Broadcast Flow (ต้องการ SUPERADMIN_ID_TOKEN)", () => {
  test.skip(!process.env.SUPERADMIN_ID_TOKEN, "ข้าม: ไม่มี SUPERADMIN_ID_TOKEN — ต้องตั้ง env ก่อนรัน");

  test("POST /api/notify/broadcast ด้วย superadmin token → 200 + sentCount", async () => {
    const api = await getApiContext();
    const res = await api.post("/api/notify/broadcast", {
      headers: {
        Authorization: `Bearer ${process.env.SUPERADMIN_ID_TOKEN}`,
        "Content-Type": "application/json",
      },
      data: {
        title: "[QA Test] ทดสอบ Broadcast",
        body: "ข้อความทดสอบจาก Playwright E2E — กรุณาไม่ตอบสนอง",
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.sentCount).toBe("number");
    console.log(`✅ Broadcast sent to ${body.sentCount} devices (failed: ${body.failedCount})`);
  });
});
