// Public reviewed targets only. Changing the proposed staging hostname requires review before rollout.
export const CALENDAR_SERVER_PROTOCOL = 1;
export const PRODUCTION_CALENDAR_PROJECT = "labboy-workload-app";
export const PRODUCTION_CALENDAR_API_ORIGIN = "https://employee-workload-app.onrender.com";
export const STAGING_CALENDAR_PROJECT = "labboy-workload-app-staging";
// Proposed service only: verify workspace ownership and deployment before enabling the staging flag.
export const STAGING_CALENDAR_API_ORIGIN = "https://labboy-calendar-staging.onrender.com";
export const EMULATOR_CALENDAR_PROJECT = "demo-calendar-trusted";
export const EMULATOR_CALENDAR_API_ORIGIN = "http://127.0.0.1:4321";
