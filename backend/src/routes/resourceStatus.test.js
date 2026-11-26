import { once } from "node:events";
import express from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createResourceStatusRouter } from "./resourceStatus.js";

const hostingOrigins = ["https://labboy-workload-app.web.app", "https://labboy-workload-app.firebaseapp.com"];
const getFirebase = vi.fn();
let server;
let router;
let address;

beforeAll(async () => {
  router = createResourceStatusRouter(getFirebase);
  const app = express();
  app.use("/api/resource-status", router);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  address = `http://127.0.0.1:${server.address().port}/api/resource-status`;
});

afterAll(async () => {
  router?.close();
  if (server?.listening) await new Promise(resolve => server.close(resolve));
});

describe("Resource Status on production Firebase Hosting", () => {
  it.each(hostingOrigins)("passes preflight and keeps authentication mandatory for %s", async origin => {
    const options = await fetch(address, { method: "OPTIONS", headers: {
      Origin: origin, "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization",
    } });
    expect(options.status).toBe(204);
    expect(options.headers.get("access-control-allow-origin")).toBe(origin);
    expect(options.headers.get("access-control-allow-headers")).toBe("Authorization");
    expect(options.headers.get("vary")).toContain("Origin");

    const read = await fetch(address, { headers: { Origin: origin } });
    expect(read.status).toBe(401);
    expect(read.headers.get("access-control-allow-origin")).toBe(origin);
    expect(read.headers.get("cache-control")).toBe("private, no-store");
    expect(getFirebase).not.toHaveBeenCalled();
  });

  it("rejects preflight and reads from other origins before accessing Firebase", async () => {
    const headers = { Origin: "https://other-site.firebaseapp.com" };
    for (const method of ["OPTIONS", "GET"]) {
      const result = await fetch(address, { method, headers });
      expect(result.status).toBe(403);
      expect(result.headers.get("access-control-allow-origin")).toBeNull();
    }
    expect(getFirebase).not.toHaveBeenCalled();
  });

  it("leaves non-browser reads behind authentication and exposes no write method", async () => {
    expect((await fetch(address)).status).toBe(401);
    expect((await fetch(address, { method: "POST", headers: { Origin: hostingOrigins[0] } })).status).toBe(404);
    expect(getFirebase).not.toHaveBeenCalled();
  });
});
