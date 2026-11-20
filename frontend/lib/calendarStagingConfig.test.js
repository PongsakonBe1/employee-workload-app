import { describe, expect, it } from "vitest";
import { STAGING_APP, STAGING_PROJECT, validateCalendarStagingConfig } from "./calendarStagingConfig";
const valid = {
  projectId: STAGING_PROJECT,
  appId: STAGING_APP,
  authDomain: STAGING_PROJECT + ".firebaseapp.com",
  apiKey: "public-test-placeholder"
};
describe("staging target isolation", () => {
  it("accepts only the approved staging app and retains only SDK fields", () => {
    expect(validateCalendarStagingConfig({
      ...valid,
      unrelated: "ignored"
    })).toEqual(valid);
  });
  it.each(["labboy-workload-app", "demo-calendar-readonly", "other-project", ""])("rejects a different project: %s", projectId => {
    expect(() => validateCalendarStagingConfig({
      ...valid,
      projectId
    })).toThrow();
  });
  it("rejects a mismatched Auth domain/app or missing key before initializing SDK", () => {
    for (const patch of [{
      authDomain: "labboy-workload-app.firebaseapp.com"
    }, {
      appId: "other-app"
    }, {
      apiKey: ""
    }, {
      apiKey: "x".repeat(201)
    }]) expect(() => validateCalendarStagingConfig({
      ...valid,
      ...patch
    })).toThrow();
    expect(() => validateCalendarStagingConfig(null)).toThrow();
  });
});
