// Isolated demo namespace on existing loopback emulators. Never touches read-only or cloud data.
import fs from "node:fs";
import { calendarTestAccounts, calendarTestPassword } from "../frontend/lib/calendarEmulatorConfig.js";
import { calendarEmulatorFixtures } from "../firebase/calendar-emulator/fixtures.mjs";
const project = "demo-calendar-writer",
  auth = "http://127.0.0.1:19099",
  store = "http://127.0.0.1:18080";
async function request(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer owner"
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`Writer demo setup failed: ${response.status}`);
  return response.status === 204 ? {} : response.json();
}
await request(`${store}/emulator/v1/projects/${project}:securityRules`, "PUT", {
  rules: {
    files: [{
      name: "firestore.rules",
      content: fs.readFileSync("firebase/calendar-writer/firestore.rules", "utf8")
    }]
  }
});
await request(`${auth}/emulator/v1/projects/${project}/accounts`, "DELETE");
await request(`${store}/emulator/v1/projects/${project}/databases/(default)/documents`, "DELETE");
for (const account of calendarTestAccounts) {
  const result = await request(`${auth}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-calendar-key`, "POST", {
    localId: account.id,
    email: account.id + "@example.test",
    password: calendarTestPassword,
    targetProjectId: project,
    returnSecureToken: true
  });
  if (result.localId !== account.id) throw new Error("Synthetic UID mismatch");
}
const field = value => typeof value === "string" ? {
  stringValue: value
} : typeof value === "boolean" ? {
  booleanValue: value
} : typeof value === "number" ? {
  integerValue: String(value)
} : Array.isArray(value) ? {
  arrayValue: {
    values: value.map(field)
  }
} : {
  mapValue: {
    fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, field(item)]))
  }
};
const records = Object.entries(calendarEmulatorFixtures).flatMap(([collection, rows]) => rows.map(({
  id,
  ...data
}) => ({
  collection,
  id,
  data: collection === "users" && ["directory-a", "directory-c"].includes(id) ? {
    ...data,
    calendarWriter: true
  } : data
})));
records.push({
  collection: "calendarWriteState",
  id: "main",
  data: {
    revision: 0
  }
});
await request(`${store}/v1/projects/${project}/databases/(default)/documents:commit`, "POST", {
  writes: records.map(row => ({
    update: {
      name: `projects/${project}/databases/(default)/documents/${row.collection}/${row.id}`,
      fields: field(row.data).mapValue.fields
    }
  }))
});
console.log("Writer emulator rules compiled; seeded isolated demo-calendar-writer with synthetic accounts and revision gate");
