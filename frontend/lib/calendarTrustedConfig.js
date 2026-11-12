export const TRUSTED_EMULATOR_CONFIG = Object.freeze({ projectId: "demo-calendar-trusted", appId: "1:000000000000:web:calendar-trusted-emulator", authDomain: "demo-calendar-trusted.firebaseapp.com", apiKey: "demo-trusted-emulator-key" });
export function validateTrustedCalendarConfig(value) {
  if (!value || Object.entries(TRUSTED_EMULATOR_CONFIG).some(([key, expected]) => value[key] !== expected)) throw new Error("Trusted calendar config requires the dedicated demo project");
  return { ...TRUSTED_EMULATOR_CONFIG };
}
export function trustedCalendarRuntimeEnabled(mode, flag, emulator, location) {
  return mode === "development" && flag === "1" && emulator === true && location?.origin === "http://127.0.0.1:4313";
}
