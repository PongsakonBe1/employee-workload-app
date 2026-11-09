// Seed only this demo project on hardcoded loopback ports; no service account or ADC.
import { calendarEmulator, calendarTestAccounts, calendarTestPassword } from "../frontend/lib/calendarEmulatorConfig.js";
import { calendarEmulatorFixtures } from "../firebase/calendar-emulator/fixtures.mjs";
const {
  projectId,
  host,
  authPort,
  firestorePort
} = calendarEmulator;
if (projectId !== "demo-calendar-readonly" || host !== "127.0.0.1") throw new Error("Invalid fixture target");
async function request(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer owner"
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Local fixture request failed: ${response.status} ${new URL(url).pathname}`);
  return response.status === 204 ? {} : response.json();
}
const auth = `http://${host}:${authPort}`,
  store = `http://${host}:${firestorePort}`;
await request(`${auth}/emulator/v1/projects/${projectId}/accounts`, "DELETE");
await request(`${store}/emulator/v1/projects/${projectId}/databases/(default)/documents`, "DELETE");
for (const account of calendarTestAccounts) {
  const result = await request(`${auth}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-calendar-key`, "POST", {
    localId: account.id,
    email: `${account.id}@example.test`,
    password: calendarTestPassword,
    targetProjectId: projectId,
    returnSecureToken: true
  });
  if (result.localId !== account.id) throw new Error("Emulator fixture UID mismatch");
}
function value(input) {
  if (typeof input === "boolean") return {
    booleanValue: input
  };
  if (typeof input === "number") return {
    integerValue: String(input)
  };
  if (typeof input === "string") return {
    stringValue: input
  };
  if (Array.isArray(input)) return {
    arrayValue: {
      values: input.map(value)
    }
  };
  return {
    mapValue: {
      fields: Object.fromEntries(Object.entries(input).map(([key, item]) => [key, value(item)]))
    }
  };
}
const writes = Object.entries(calendarEmulatorFixtures).flatMap(([collection, records]) => records.map(({
  id,
  ...data
}) => ({
  update: {
    name: `projects/${projectId}/databases/(default)/documents/${collection}/${id}`,
    fields: value(data).mapValue.fields
  }
})));
await request(`${store}/v1/projects/${projectId}/databases/(default)/documents:commit`, "POST", {
  writes
});
console.log(`Seeded demo emulator only: ${calendarTestAccounts.length} synthetic accounts, ${writes.length} documents; no credentials saved.`);
