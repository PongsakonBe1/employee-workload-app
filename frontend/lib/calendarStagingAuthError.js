// Display only known error codes; never expose provider messages, tokens or account details.
const messages = {
  "auth/popup-closed-by-user": "ปิดหน้าต่างเข้าสู่ระบบแล้ว กดเข้าสู่ระบบเพื่อลองใหม่ได้",
  "auth/cancelled-popup-request": "มีคำขอเข้าสู่ระบบซ้อนกัน กรุณาปิดหน้าต่างเดิมแล้วลองใหม่",
  "auth/popup-blocked": "เบราว์เซอร์บล็อก popup กรุณาอนุญาตหน้าต่างป๊อปอัปของเว็บนี้แล้วลองใหม่",
  "auth/unauthorized-domain": "domain ของหน้านี้ยังไม่ได้รับอนุญาตใน staging กรุณาแจ้งผู้ดูแล",
  "auth/argument-error": "ตัวเชื่อม Google popup ยังไม่พร้อม กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง",
  "auth/network-request-failed": "เชื่อมต่อ Google ไม่สำเร็จ กรุณาตรวจเครือข่ายแล้วลองใหม่",
  "auth/operation-not-allowed": "Google Sign-in ยังไม่เปิดใน staging กรุณาแจ้งผู้ดูแล",
  "auth/invalid-api-key": "configuration ของ staging ไม่ถูกต้อง กรุณาแจ้งผู้ดูแล",
  "auth/operation-not-supported-in-this-environment": "เบราว์เซอร์นี้ไม่รองรับการเข้าสู่ระบบแบบ popup กรุณาเปิดใน Safari หรือ Chrome โดยตรง"
};
export function calendarStagingAuthError(error) {
  const code = error?.code;
  return Object.hasOwn(messages, code) ? `${messages[code]} (${code})` : "เข้าสู่ระบบ staging ไม่สำเร็จ กรุณาลองใหม่ หากยังพบปัญหาให้แจ้งผู้ดูแล";
}
