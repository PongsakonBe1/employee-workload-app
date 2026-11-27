import { describe, expect, it, vi } from "vitest";

const { sendEachForMulticast } = vi.hoisted(() => ({
  sendEachForMulticast: vi.fn(async () => ({ successCount: 1, failureCount: 0, responses: [] })),
}));

vi.mock("firebase-admin", () => ({
  default: {
    credential: { cert: vi.fn() },
    initializeApp: vi.fn(() => ({})),
    firestore: vi.fn(),
    messaging: () => ({ sendEachForMulticast }),
  },
}));
vi.mock("../config/env.js", () => ({ env: { firebaseServiceAccountJson: "{}" } }));

import { sendToTokens } from "./fcm.js";

describe("web push payload", () => {
  it("leaves the web display to the service worker and preserves native notifications", async () => {
    await sendToTokens(["synthetic-fcm-device"], "QA title", "QA body", {
      title: "ignored duplicate title",
      url: "/worklogs/new",
      taskCount: 3,
    });
    expect(sendEachForMulticast).toHaveBeenCalledTimes(1);
    const [message] = sendEachForMulticast.mock.calls[0];
    expect(message).not.toHaveProperty("notification");
    expect(message.data).toEqual({ title: "QA title", body: "QA body", url: "/worklogs/new", taskCount: "3" });
    expect(message.android.notification).toMatchObject({ title: "QA title", body: "QA body", defaultSound: true });
    expect(message.apns.payload.aps).toMatchObject({ alert: { title: "QA title", body: "QA body" }, sound: "default" });
  });
});
