# Development UI Foundation — ย้ายส่วนกลางเข้า Next.js

อัปเดตถัดไป: [ปฏิทินและ controls ตาม Apple HIG + MockFlow reference](../calendar-liquid-glass/README.md) เปิดที่ `/dev/calendar` และเชื่อมกับหน้าบันทึกงานแล้ว ยังใช้ข้อมูลตัวอย่างใน development

อัปเดตหน้าตรวจแบบ: [หน้าบันทึกงานตาม Review 10 + Liquid Glass](../record-liquid-glass/README.md) อยู่ที่ `/dev/record`; `/dev/ui` ยังคงเป็นห้องทดสอบส่วนกลาง ยังไม่ได้ย้ายรายละเอียดทุกหน้าของเว็บ

6 พฤศจิกายน 2569 · branch `codex/develop-ui-foundation` · ฐานแบบที่ตรวจรับ `dc80fbb` (Review 10)

ผู้ใช้อนุมัติให้เริ่มย้ายส่วนกลางเข้าสู่แอปจริง โดยแยก branch และคงโหมด development งานนี้ยังไม่ใช่การย้ายรายละเอียดทุกหน้าหรือ release ใหม่

## ขอบเขตและเหตุผล

1. ย้ายสี วัสดุ ฟอนต์ระบบ พื้นหลัง และ controls กลางจากแบบที่ตรวจรับไปใช้กับ Next.js
2. แยก `WorkspaceFrame` ที่รับข้อมูลสำหรับแสดงผลออกจาก `AppShell` ที่ใช้ Auth เดิม เพื่อทดสอบส่วนหน้าตาโดยไม่สร้าง session ปลอม
3. ใช้ development cache แยก แยกการตรวจ export compatibility และค่าบริการสังเคราะห์ออกจาก environment ที่ใช้งานจริง
4. ตรวจ role navigation, การเก็บค่าธีม, form draft, keyboard/focus, motion, จอเล็ก, contrast ของ controls และการ redirect ผู้ที่ยังไม่ login

ความเสี่ยงสำคัญคือ CSS กลางกระทบหน้าเดิมและสับสนระหว่าง UI fixture กับระบบจริง จึงมี development label, route ตรวจแบบเฉพาะ development, ข้อมูลสังเคราะห์ และคง AuthProvider/Firestore rules/ธุรกรรมเดิม การย้อนกลับใช้ commit เฉพาะ branch นี้ได้ ต้นฉบับ config เก็บใน `*.before.txt` ข้างเอกสารนี้

## สิ่งที่ย้ายแล้ว

- `frontend/app/ui-foundation.css`: semantic colors, Light/Dark, glass navigation, พื้นข้อมูลอ่านชัด, scrollbar บางที่ยังลากได้, safe area, focus, Reduce Motion และ Forced Colors
- `frontend/app/globals.css`: ฟอนต์ระบบ ไม่มีการดาวน์โหลด/แจก SF Pro, พื้นหลัง fixed ที่เห็นบนมือถือ, controls `apple-*`, input 16px บนมือถือ และคง print styles
- `AppearanceProvider`: ตามระบบ/สว่าง/มืด, ฟ้า–เขียวเดิม/ฟ้า–ม่วง/เรียบ, ลดความโปร่งใส/เคลื่อนไหว เก็บเฉพาะ preferences ใน localStorage key `labboy.appearance.v1` ไม่ใช้ Firestore
- bootstrap ใช้เฉพาะค่าที่ผ่าน whitelist ก่อน hydration, รองรับ JSON ผิดรูปแบบ และใช้ theme ของระบบได้เมื่อ storage ใช้ไม่ได้
- sidebar กลุ่มงาน, Search หน้าและเครื่องมือ, บัญชีและเครื่องมือ, ปฏิทินแบบ compact rail บน PC และเมนูมือถือสี่ปลายทาง: งาน/ตาราง/ทรัพยากร/ภาพรวม
- เมนูงานสำหรับ Staff ใช้ `/worklogs/new`; Admin/Superadmin ใช้ `/admin/record` คงชื่อที่ผู้ดูแลตั้งไว้ และยังเข้าถึงหน้ารองผ่าน disclosure/search/account ได้
- `/calendar` และ `/resources` เป็นปลายทางของ navigation ใหม่ โดยใช้ `RoomUsageCalendar` และ `RoomEquipmentStatus` เดิม ไม่เปลี่ยน query หรือเพิ่มสิทธิ์แก้ข้อมูลของ components เหล่านี้
- `AppShell` ยังใช้ AuthContext จริงและ redirect login/pending แบบเดิม ไม่รับ user จาก local display preferences หรือ development fixtures
- native `Dialog` พร้อม focus trap/Escape/focus restore และการปิดด้วย backdrop, tooltip นอกกรอบ sidebar พร้อม motion สั้นและ keyboard
- `ViewToggle` ใช้ชื่อ view/IDs เดิม เพิ่ม `aria-pressed`, accessible names และ `type=button` ป้องกัน submit form โดยไม่ตั้งใจ
- ปุ่ม Notification มีชื่อ/สถานะสำหรับ accessibility, คง logic subscription และ FCM เดิม ป้าย Version แสดง Develop/Unreleased ใน development
- ยังไม่เปลี่ยน Profile Radar ซึ่งใช้ Top 8 `minorTask` ตาม AGENTS.md

## เปิดตรวจในเครื่อง

```powershell
node scripts/dev-ui.mjs
```

เปิด <http://127.0.0.1:4310/dev/ui> ใช้ Next development จริง, cache `frontend/.next-dev`, และ public service configuration สังเคราะห์ สคริปต์ไม่เปิดอ่านหรือคัดลอกเนื้อหา `.env` แต่ Next ยังรายงานชื่อไฟล์ environment ตามปกติ ตัวแปรที่สคริปต์ส่งให้ process จะทับค่าบริการที่ใช้ใน UI runtime นี้

หน้านี้ mount `WorkspaceFrame`, preferences และ controls เดียวกับที่ต่อเข้าแอปจริง ใช้รายชื่อ/ตัวเลข/ฟอร์มสังเคราะห์ใน local state ไม่มีการ inject AuthContext, ID token หรือ Firebase user เมนูในหน้านี้เปลี่ยนมุมมอง fixture เพื่อดู layout ไม่ใช่การทดสอบธุรกรรมจริง การเปิดหน้าที่ต้อง login โดยตรงยังต้องผ่าน AuthProvider เดิม

การเลือกบทบาทในหน้า `/dev/ui` ใช้ตรวจ navigation เท่านั้น ไม่เปลี่ยน role ในระบบ ผู้ใช้ไม่สามารถใช้หน้านี้เพื่อสร้างสิทธิ์ backend ได้ และ route นี้เรียก `notFound()` เมื่อไม่ใช่ development

คำสั่ง `npm run dev` เดิมไม่ได้ถูกเปลี่ยนให้ใช้ project ทดสอบ ต้องตรวจ configuration แยกก่อนทดสอบข้อมูลจริง อย่าใช้ UI helper เป็น environment สำหรับทดสอบ login/งานจริง

## ผลตรวจและคำสั่ง

ใช้ Playwright runtime ที่มีอยู่ โดยไม่ติดตั้งแพ็กเกจใหม่ browser ใหม่บล็อก HTTP ภายนอกทั้งหมดและ service workers ไม่ใช้ profile ที่ผู้ใช้ login อยู่

| การตรวจ | ผล |
|---|---|
| `verify-ui-foundation.cjs` | 11 กลุ่มผ่าน: role/mobile routes, Tailwind utilities, theme persistence/system changes, form draft, material/motion, tooltip/scrolling, dialog/keyboard/backdrop, segmented controls/checkbox, viewport 375/390/430/768, contrast ของ input/text/boundary, storage write failure, touch context และ anonymous redirect |
| Vitest ชุดใหม่ | 7/7 ผ่าน: whitelist preferences, accessibility overrides และ role/path navigation |
| Vitest ทั้ง repo | **224 ผ่าน / 8 ไม่ผ่าน จาก 232**; ยังไม่เป็น suite สีเขียว |
| `check-ui-baseline.mjs` | รัน source จาก commit ฐานใน fixture แยก ยืนยัน 8 failures เหมือนกันทุกชื่อ พร้อมตรวจว่าหกไฟล์ต้นทาง/เทสต์ที่เกี่ยวข้องไม่เปลี่ยน |
| targeted ESLint | ผ่าน new/shared UI scope ด้วย Hooks และ JSX accessibility rules ที่มีใน repo ไม่ใช่ผล lint ทั้งโครงการ |
| `check-ui-build.mjs` | compile/export compatibility ผ่าน ใช้ค่าบริการสังเคราะห์, output `frontend/.ui-build-check`, ไม่มี UI fixture ที่ render ใน production export และไม่เรียก `copy-env`, `xcopy`, `build:prod` หรือ deploy |
| `verify-ui-zoom.cjs` | native Edge zoom 200% ผ่าน รวม keyboard เปิด dialog, viewport ไม่ล้น และ root font ไม่ได้ถูกแทนด้วย CSS zoom |

ผลทั้งหมดและภาพ Light/Dark อยู่ใน `output/playwright/develop-ui-foundation/` สถานะ build/node environment ของการตรวจ export compatibility แยกจาก development server ที่เปิดตรวจอยู่

```powershell
node node_modules/vitest/vitest.mjs run frontend/lib/appearance.test.js frontend/lib/navigation.test.js
node scripts/check-ui-baseline.mjs
node node_modules/eslint/bin/eslint.js --no-config-lookup --config scripts/ui-eslint.config.mjs frontend/components/ui frontend/components/AppShell.js frontend/components/ViewToggle.js frontend/app/dev/ui frontend/app/calendar/page.js frontend/app/resources/page.js frontend/lib/appearance.js frontend/lib/navigation.js
node scripts/check-ui-build.mjs
```

Browser scripts รับ argument 1 เป็น path ของ Playwright package ที่มีอยู่ และ argument 2 เป็น browser executable ดูตัวอย่างรูปแบบการรันจาก scripts ของ Review 10 ได้ ไม่ต้องดาวน์โหลด browser/แพ็กเกจเพิ่ม

### Failing tests เดิมที่คงอยู่

- `analytics.test.js` 5 รายการ: seasonal outliers, daily outliers, academic period fallback 2 รายการ และ trend indicator
- `staffMetrics.test.js` 2 รายการ: consistency และ peak handling ของ radar metrics
- `validation.test.js` 1 รายการ: tomorrow/date assertion

ตรวจยืนยันบนฐาน `dc80fbb` จริงแล้ว ไม่ได้แก้ expectation เพื่อทำให้ผลผ่าน และไม่ขยายเฟส UI ไปเปลี่ยนสูตร Analytics/validation โดยอัตโนมัติ หลักฐานอยู่ใน `unit-full.json`, `unit-baseline.json`, `baseline-comparison.json` และ `baseline-source-proof.json`

## ข้อจำกัดและตรวจรับ

- งานส่วนกลางพร้อมให้ตรวจใน development แต่ full test suite ยังมี 8 failures เดิม ต้องจัดการก่อนถือว่าทั้งระบบพร้อม release
- ยังไม่ใช่ end-to-end ที่ login สำเร็จด้วยฐานข้อมูล development/emulator และยังไม่ได้วัด Firestore reads หรือเขียนข้อมูลจริง
- CSS มี neutral-token bridge ให้หน้าเดิม แต่ charts, ตาราง, Quick Log transactions, import PDF, layout และสีเฉพาะฟีเจอร์ยังต้องทยอยย้ายจากแบบที่ตรวจรับในเฟสถัดไป
- ยังต้องตรวจบน Safari/iPhone, Android และอุปกรณ์สแกนจริง ไม่อ้างการรับรอง HIG/WCAG ทั้งระบบ
- ยังไม่ push, merge หรือ deploy ไม่เปลี่ยน Firebase project/rules/schema/backend หรือ dependency lockfile

ให้ลองสลับ Light/Dark/พื้นหลัง เปลี่ยนเมนูใน desktop/mobile เปิดเครื่องมือรองและใช้ keyboard แล้วตรวจ diff ของ `AppShell` เทียบฐาน ก่อนอนุมัติย้ายหน้าบันทึกงานและปฏิทินต่อ

## แชร์ development ผ่าน Cloudflare

ผู้ใช้ขอให้เปิดจากโทรศัพท์และคอมเครื่องอื่น ใช้ Cloudflare Quick Tunnel ชั่วคราวไปที่ development พอร์ต 4310 ซึ่งเปิดด้วย `scripts/dev-ui.mjs` อยู่แล้ว ไม่ใช่การ deploy

ใช้ `cloudflared` portable เดิม รุ่น 2026.10.7 ตรวจ SHA256 ตรงกับ asset ทางการ: `2493dbc168923bb3e59e5e7716f71deced92992eea9acd6e9d74f84ac7751343` ไม่มีการติดตั้ง package/service ใหม่ และไม่อ่าน account credentials ของ Cloudflare

```powershell
# Keep the development UI runtime running in another terminal.
$uiCloudflared = Join-Path $env:LOCALAPPDATA 'Temp\labboy-cloudflare-preview\cloudflared.exe'
& $uiCloudflared tunnel --config output/playwright/develop-ui-foundation/cloudflare-preview.yml --no-autoupdate --url http://127.0.0.1:4310 --protocol http2
```

เปิด URL ที่ Cloudflare แสดงแล้วเติม `/dev/ui` ใช้ไฟล์ config เฉพาะ preview ที่มีเพียง log level ไม่ใช้ Cloudflare account/config เดิม ตรวจลิงก์จริงด้วย Edge ทั้ง desktop และ touch/mobile: HTTP 200, hydration, สลับ Light/Dark และ viewport ไม่ล้น ผ่าน ไม่มี page error หลักฐานอยู่ใน `public-preview-report.json` และภาพ `public-*.png`

ลิงก์เป็นแบบชั่วคราว ใช้ได้ขณะที่เครื่อง, Next development และ tunnel ยังทำงาน เมื่อเริ่ม tunnel ใหม่ hostname จะเปลี่ยน หยุดด้วย Ctrl+C ใน terminal ที่รัน `cloudflared` รายละเอียดตาม [Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)

## ประเมิน quickLiquid ก่อนพัฒนารอบถัดไป

อัปเดตหลังผู้ใช้ให้ Continue: เริ่ม [QuickLiquid Pilot](../quick-liquid/README.md) ใน development แล้ว พร้อมสวิตช์เทียบของเดิม ผลวิเคราะห์ด้านล่างเป็นข้อมูลจากขั้นประเมินก่อนเริ่มทดลอง

ผู้ใช้ส่ง [quickLiquid](https://github.com/amarnath3003/quickLiquid) ให้ศึกษา อ่าน README, package metadata, React wrapper และ engine พร้อมเปิด live demo จริงแล้ว npm ณ วันที่ตรวจระบุ `quick-liquid@0.1.2`, MIT, peer React/React DOM >=18 ซึ่งตรงกับ React 19 ที่ใช้ในโครงการ ขณะประเมินยังไม่ได้ติดตั้ง จากนั้นจึงเริ่มรอบทดลองตามที่ผู้ใช้ให้ Continue

สิ่งที่มีประโยชน์คือ SVG backdrop refraction, rim lighting, dispersion และ spring motion เพิ่มจาก CSS blur ปัจจุบัน อย่างไรก็ตาม package documentation ระบุว่า full rendered refraction ตรวจใน Chromium เป็นหลัก computed-style probe ไม่สามารถยืนยันการหักเหของภาพจริงได้ จึงต้องทดสอบ Safari/iPhone และเตรียม `refractionMode: 'css'` ไว้ตามผลตรวจ

ประเด็นที่ตรวจพบจาก source สำหรับโครงการเรา:

- React wrapper เริ่ม engine ใน `useEffect` และ cleanup ด้วย `destroy()` แต่ยังต้องตรวจ import/build ของ package ที่เผยแพร่จริงเมื่อทำ PoC
- engine ใช้ `.ql-content` และ `overflow: hidden` การครอบ sidebar/toolbar เดิมตรง ๆ อาจเปลี่ยน flex layout และตัด notification popover ต้องออกแบบ optical layer แยกจาก semantic controls หรือใช้ portal
- refraction มีข้อจำกัดเกี่ยวกับ `isolation`, filters และ stacking ในโค้ดเรามีชั้นเหล่านี้เพื่อจัดกระจก/พื้นหลังอยู่แล้ว ต้องตรวจการวาดภาพจริง ไม่ลบออกทุกจุดโดยไม่ทดสอบ
- `appearance: 'auto'` อิง OS จึงต้องส่ง resolved theme ของ `AppearanceProvider` เข้า library เอง และผูกตัวเลือกลดความโปร่งใส/เคลื่อนไหวในแอปด้วย ไม่อาศัยเฉพาะ media query ของ OS
- metrics ของ engine ไม่ใช่ FPS ของทั้งหน้า ต้องวัดการเลื่อน/กดจริงบนอุปกรณ์ตัวแทนก่อนสรุป performance หรือ battery impact

แผนทดลองที่เสนอเพื่อขออนุมัติเฟสแยก:

1. เพิ่ม dependency แบบตรึงเวอร์ชัน แล้วทดลองเฉพาะ toolbar, mobile tab bar และ selected indicator พร้อมสวิตช์เทียบของเดิมใน development
2. ใช้ optical effects กับชั้นควบคุม รักษาหน้าตาและ semantic colors ที่ตรวจรับ รวมถึงพื้นอ่านข้อมูลที่นิ่ง
3. เก็บ CSS fallback/ทางย้อนกลับ ไม่ทำกระจกซ้อนทุก input/แถวตาราง ตรวจ clipping, draft และ focus เมื่อเปลี่ยน theme/material
4. ตรวจ Chrome/Edge และ Safari จริง, Light/Dark, Reduce Motion/Transparency, keyboard, touch, SSR/export และ performance ก่อนขยายส่วนอื่น

อ้างอิง: [package README](https://github.com/amarnath3003/quickLiquid/blob/master/packages/quick-liquid/README.md), [React wrapper](https://github.com/amarnath3003/quickLiquid/blob/master/packages/quick-liquid/src/react/LiquidGlass.tsx), [engine](https://github.com/amarnath3003/quickLiquid/blob/master/packages/quick-liquid/src/core/engine.ts), [package metadata](https://github.com/amarnath3003/quickLiquid/blob/master/packages/quick-liquid/package.json), [live demo](https://quickliquid.vercel.app)
