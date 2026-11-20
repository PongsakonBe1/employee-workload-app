import { STAGING_CALENDAR_API_ORIGIN } from "./calendarServerProtocol.js";
export function stagingCalendarServerEnabled(mode, flag, emulator, origin) {
  return mode === "development" && flag === "1" && emulator === false && origin === STAGING_CALENDAR_API_ORIGIN;
}
