# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: push-notification-e2e.spec.js >> PUSH-5: Frontend UI — Broadcast Section (Superadmin) >> Broadcast UI ไม่แสดงให้ unauthenticated user
- Location: tests\push-notification-e2e.spec.js:154:3

# Error details

```
Test timeout of 25000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:3001/admin/settings", waiting until "load"

```

# Test source

```ts
  55  |   test("POST /api/notify/broadcast ไม่มี token → 401", async () => {
  56  |     const api = await getApiContext();
  57  |     const res = await api.post("/api/notify/broadcast", {
  58  |       data: { title: "test", body: "test" },
  59  |     });
  60  |     expect(res.status()).toBe(401);
  61  |     const body = await res.json();
  62  |     expect(body.success).toBe(false);
  63  |   });
  64  | 
  65  |   test("POST /api/notify/broadcast token ปลอม → 401 หรือ 403", async () => {
  66  |     const api = await getApiContext();
  67  |     const res = await api.post("/api/notify/broadcast", {
  68  |       headers: { Authorization: "Bearer fake.token.value" },
  69  |       data: { title: "test", body: "test" },
  70  |     });
  71  |     expect([401, 403]).toContain(res.status());
  72  |   });
  73  | 
  74  |   test("POST /api/notify/broadcast body ว่าง (ไม่มี title/body) → 400", async () => {
  75  |     const api = await getApiContext();
  76  |     // ทดสอบด้วย token จริงได้ด้วย env SUPERADMIN_ID_TOKEN ถ้ามี
  77  |     // ถ้าไม่มี token จะได้ 401 ซึ่งยังคือ rejection ที่ถูกต้อง
  78  |     const idToken = process.env.SUPERADMIN_ID_TOKEN;
  79  |     const headers = idToken
  80  |       ? { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" }
  81  |       : { "Content-Type": "application/json" };
  82  |     const res = await api.post("/api/notify/broadcast", {
  83  |       headers,
  84  |       data: {},
  85  |     });
  86  |     expect([400, 401, 403]).toContain(res.status());
  87  |   });
  88  | });
  89  | 
  90  | // ─── 3. Auth Guard — Daily Reminder Endpoint ─────────────────────────────────
  91  | 
  92  | test.describe("PUSH-3: Auth Guard — Daily Reminder Endpoint", () => {
  93  |   test.skip(!IS_BACKEND_AVAILABLE, "ข้าม: ตั้ง RENDER_URL หรือ BACKEND_LOCAL=1 ก่อนรัน");
  94  | 
  95  |   test("POST /api/notify/daily-reminder ไม่มี x-cron-secret → 401", async () => {
  96  |     const api = await getApiContext();
  97  |     const res = await api.post("/api/notify/daily-reminder", { data: {} });
  98  |     expect(res.status()).toBe(401);
  99  |     const body = await res.json();
  100 |     expect(body.success).toBe(false);
  101 |   });
  102 | 
  103 |   test("POST /api/notify/daily-reminder secret ผิด → 401", async () => {
  104 |     const api = await getApiContext();
  105 |     const res = await api.post("/api/notify/daily-reminder", {
  106 |       headers: { "x-cron-secret": "wrong-secret-value" },
  107 |       data: {},
  108 |     });
  109 |     expect(res.status()).toBe(401);
  110 |   });
  111 | 
  112 |   test("POST /api/notify/daily-reminder secret ถูก → 200 (ไม่ส่งถ้าไม่ใช่วันหรือเวลา)", async () => {
  113 |     const api = await getApiContext();
  114 |     const res = await api.post("/api/notify/daily-reminder", {
  115 |       headers: { "x-cron-secret": CRON_SECRET },
  116 |       data: {},
  117 |     });
  118 |     expect(res.status()).toBe(200);
  119 |     const body = await res.json();
  120 |     expect(body.success).toBe(true);
  121 |     // อาจได้ sentCount=0 ถ้าไม่ใช่เวลา/วันที่ตั้งไว้ — ถือว่าผ่าน
  122 |     expect(typeof body.sentCount).toBe("number");
  123 |   });
  124 | });
  125 | 
  126 | // ─── 4. Test Endpoint (dev only) ─────────────────────────────────────────────
  127 | 
  128 | test.describe("PUSH-4: Test Endpoint Security", () => {
  129 |   test.skip(!IS_BACKEND_AVAILABLE, "ข้าม: ตั้ง RENDER_URL หรือ BACKEND_LOCAL=1 ก่อนรัน");
  130 | 
  131 |   test("POST /api/notify/test ใน production → 403", async () => {
  132 |     // ทดสอบเฉพาะถ้า RENDER_URL ชี้ไป production
  133 |     if (!RENDER_URL.includes("onrender.com") && !RENDER_URL.includes("render.com")) {
  134 |       test.skip();
  135 |       return;
  136 |     }
  137 |     const api = await getApiContext();
  138 |     const res = await api.post("/api/notify/test", {
  139 |       data: { token: "fake-token" },
  140 |     });
  141 |     expect(res.status()).toBe(403);
  142 |   });
  143 | });
  144 | 
  145 | // ─── 5. Frontend UI — Broadcast Section ──────────────────────────────────────
  146 | 
  147 | test.describe("PUSH-5: Frontend UI — Broadcast Section (Superadmin)", () => {
  148 |   test("หน้า /admin/settings โหลดได้และ redirect unauthenticated → /login", async ({ page }) => {
  149 |     await page.goto("/admin/settings");
  150 |     await page.waitForURL(/\/login/, { timeout: 10000 });
  151 |     await expect(page).toHaveURL(/\/login/);
  152 |   });
  153 | 
  154 |   test("Broadcast UI ไม่แสดงให้ unauthenticated user", async ({ page }) => {
> 155 |     await page.goto("/admin/settings");
      |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  156 |     await page.waitForURL(/\/login/, { timeout: 10000 });
  157 |     // ต้อง redirect ไป /login ก่อน — Broadcast section ไม่ render
  158 |     await expect(page).toHaveURL(/\/login/);
  159 |     const broadcastBtn = page.locator('button:has-text("ส่ง Push Notification ทุกคน")');
  160 |     await expect(broadcastBtn).not.toBeVisible();
  161 |   });
  162 | });
  163 | 
  164 | // ─── 6. Broadcast Flow (ต้องมี SUPERADMIN_ID_TOKEN) ─────────────────────────
  165 | 
  166 | test.describe("PUSH-6: Broadcast Flow (ต้องการ SUPERADMIN_ID_TOKEN)", () => {
  167 |   test.skip(!process.env.SUPERADMIN_ID_TOKEN, "ข้าม: ไม่มี SUPERADMIN_ID_TOKEN — ต้องตั้ง env ก่อนรัน");
  168 | 
  169 |   test("POST /api/notify/broadcast ด้วย superadmin token → 200 + sentCount", async () => {
  170 |     const api = await getApiContext();
  171 |     const res = await api.post("/api/notify/broadcast", {
  172 |       headers: {
  173 |         Authorization: `Bearer ${process.env.SUPERADMIN_ID_TOKEN}`,
  174 |         "Content-Type": "application/json",
  175 |       },
  176 |       data: {
  177 |         title: "[QA Test] ทดสอบ Broadcast",
  178 |         body: "ข้อความทดสอบจาก Playwright E2E — กรุณาไม่ตอบสนอง",
  179 |       },
  180 |     });
  181 |     expect(res.status()).toBe(200);
  182 |     const body = await res.json();
  183 |     expect(body.success).toBe(true);
  184 |     expect(typeof body.sentCount).toBe("number");
  185 |     console.log(`✅ Broadcast sent to ${body.sentCount} devices (failed: ${body.failedCount})`);
  186 |   });
  187 | });
  188 | 
```