import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const worker = readFileSync(new URL("../public/firebase-messaging-sw.js", import.meta.url), "utf8");

function setup() {
  let handleBackground;
  const listeners = new Map();
  const showNotification = vi.fn(() => Promise.resolve());
  const openWindow = vi.fn();
  runInNewContext(worker, {
    importScripts() {},
    firebase: {
      initializeApp() {},
      messaging: () => ({ onBackgroundMessage(handler) { handleBackground = handler; } }),
    },
    self: {
      location: { origin: "https://example.test" },
      addEventListener(type, callback) { listeners.set(type, callback); },
      registration: { showNotification },
    },
    clients: { matchAll: async () => [], openWindow },
  }, { timeout: 1000 });
  return { handleBackground, listeners, showNotification, openWindow };
}

describe("Firebase Messaging service worker", () => {
  it("does not display an additional notification when FCM shows the notification payload", async () => {
    const { handleBackground, showNotification } = setup();
    await handleBackground({ notification: { title: "Legacy message" }, data: { title: "Legacy message" } });
    expect(showNotification).not.toHaveBeenCalled();
  });

  it("shows one data-only notification and opens its destination when tapped", async () => {
    const { handleBackground, listeners, showNotification, openWindow } = setup();
    const data = { title: "QA title", body: "QA body", tag: "qa-tag", url: "/worklogs/new" };
    await handleBackground({ data });
    expect(showNotification).toHaveBeenCalledTimes(1);
    expect(showNotification).toHaveBeenCalledWith("QA title", { body: "QA body", icon: "/labboy-logo.png", badge: "/labboy-logo.png", data, tag: "qa-tag" });

    const notification = { data, close: vi.fn() };
    const waitUntil = vi.fn();
    listeners.get("notificationclick")({ notification, waitUntil });
    await waitUntil.mock.calls[0][0];
    expect(notification.close).toHaveBeenCalledOnce();
    expect(openWindow).toHaveBeenCalledWith("/worklogs/new");
  });
});
