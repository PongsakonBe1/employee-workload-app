// Isolated main-route UI QA. Only loopback synthetic Auth/Firestore; never a cloud writer.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { uiDevelopmentEnvironment } from "./dev-ui.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const child = spawn(process.execPath, [path.join(root,"node_modules/next/dist/bin/next"),"dev","-H","127.0.0.1","-p","4312"], { cwd: path.join(root,"frontend"), env: { ...process.env, ...uiDevelopmentEnvironment, NEXT_PUBLIC_CALENDAR_STAGING_ENTRY:"1", NEXT_PUBLIC_CALENDAR_STAGING_WRITE:"1", NEXT_PUBLIC_CALENDAR_STAGING_MUTATIONS:"1", NEXT_PUBLIC_CALENDAR_MUTATION_EMULATOR:"1", CALENDAR_MUTATION_EMULATOR_RUNTIME:"1", NEXT_PUBLIC_API_URL:"http://127.0.0.1:4312/__disabled-api" }, stdio:"inherit", windowsHide:true });
console.log("Mutation Emulator QA: http://127.0.0.1:4312/calendar; prepare owned UI fixtures first");
child.on("exit", code => { process.exitCode = code ?? 1; });process.on("SIGINT", () => child.kill("SIGINT"));process.on("SIGTERM", () => child.kill("SIGTERM"));
