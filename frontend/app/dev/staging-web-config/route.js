import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateCalendarStagingConfig } from "../../../lib/calendarStagingConfig.js";

export const dynamic = "force-static";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404, headers });
  try {
    const filename = path.resolve(process.cwd(), "../.tools/calendar-staging/web-sdk-config.json");
    const config = validateCalendarStagingConfig(JSON.parse(await readFile(filename, "utf8")));
    return Response.json(config, { headers });
  } catch {
    return new Response(null, { status: 404, headers });
  }
}
