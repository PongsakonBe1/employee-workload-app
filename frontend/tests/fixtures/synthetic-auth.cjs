const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { expect } = require("@playwright/test");

const project = "demo-worklog-workspace";
const appOrigin = "http://127.0.0.1:4318";
const authOrigin = "http://127.0.0.1:19218";
const firestoreOrigin = "http://127.0.0.1:18218";
const documents = firestoreOrigin + "/v1/projects/" + project + "/databases/(default)/documents";

async function preparePage(page, baseURL) {
  assert.equal(baseURL, appOrigin, "These tests require the loopback Emulator application");
  await page.context().route("**/*", route => {
    const url = new URL(route.request().url());
    const googlePopupScript = url.origin === "https://apis.google.com" && route.request().resourceType() === "script";
    if (googlePopupScript || [appOrigin, authOrigin, firestoreOrigin].includes(url.origin) ||
        ["about:", "blob:", "data:"].includes(url.protocol)) return route.continue();
    return route.abort();
  });
}

async function emulatorJson(url, options) {
  assert([authOrigin, firestoreOrigin].includes(new URL(url).origin));
  const response = await fetch(url, {
    ...options, redirect: "error", signal: AbortSignal.timeout(12000),
    headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
  });
  assert(response.ok, "Synthetic fixture request failed with HTTP " + response.status);
  return response.json();
}

async function seedDocument(collection, id, record) {
  const fields = Object.fromEntries(Object.entries(record).map(([key, value]) => [key,
    value instanceof Date ? { timestampValue: value.toISOString() } :
    typeof value === "boolean" ? { booleanValue: value } : { stringValue: value },
  ]));
  await emulatorJson(documents + "/" + collection + "/" + id + "?currentDocument.exists=false", {
    method: "PATCH", body: JSON.stringify({ fields }),
  });
}

async function signInSynthetic(page, baseURL, role) {
  assert(["staff", "superadmin"].includes(role));
  await preparePage(page, baseURL);
  const uid = "qa-auth-" + randomUUID();
  const email = uid + "@example.test";
  const displayName = role === "staff" ? "QA Synthetic Staff" : "QA Synthetic Superadmin";
  const account = await emulatorJson(authOrigin + "/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key", {
    method: "POST", body: JSON.stringify({
      localId: uid, email, password: randomUUID(), targetProjectId: project, returnSecureToken: false,
    }),
  });
  assert.equal(account.localId, uid);
  await seedDocument("users", uid, { uid, email, displayName, role, active: true });

  await page.goto("/login");
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "เข้าสู่ระบบด้วย Google", exact: true }).click(),
  ]);
  await popup.waitForURL(authOrigin + "/**");
  const addAccount = popup.getByRole("button", { name: "Add new account", exact: true });
  await addAccount.waitFor();
  const existing = popup.getByText(email, { exact: true });
  if (await existing.count()) {
    await existing.click();
  } else {
    await addAccount.click();
    await popup.getByRole("textbox", { name: "Email", exact: true }).fill(email);
    await popup.getByRole("textbox", { name: "Display name", exact: true }).fill(displayName);
    await popup.getByRole("button", { name: "Sign in with Google.com", exact: true }).click();
  }
  await expect(page).toHaveURL(appOrigin + (role === "staff" ? "/worklogs/new" : "/admin/record"));
  return { uid, displayName };
}

function bangkokDate() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok" }).format(new Date());
}

module.exports = { appOrigin, preparePage, signInSynthetic, seedDocument, bangkokDate };
