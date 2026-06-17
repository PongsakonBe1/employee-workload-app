// วันหยุดราชการไทย ปี 2569 (2026)
export const THAI_HOLIDAYS_2026 = [
  // วันขึ้นปีใหม่
  { date: "2026-01-01", name: "วันขึ้นปีใหม่", type: "national" },
  
  // วันเด็กแห่งชาติ
  { date: "2026-01-10", name: "วันเด็กแห่งชาติ", type: "observance" },
  
  // วันวาเลนไทน์
  { date: "2026-02-14", name: "วันวาเลนไทน์", type: "observance" },
  
  // วันมาฆบูชา
  { date: "2026-02-25", name: "วันมาฆบูชา", type: "buddhist" },
  
  // วันวันสตรีสากล
  { date: "2026-03-08", name: "วันวันสตรีสากล", type: "observance" },
  
  // วันจักรี
  { date: "2026-04-06", name: "วันพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช และวันที่ระลึกมหาจักรีบรมราชวงศ์", type: "national" },
  
  // วันสงกรานต์
  { date: "2026-04-13", name: "วันสงกรานต์", type: "national" },
  { date: "2026-04-14", name: "วันสงกรานต์", type: "national" },
  { date: "2026-04-15", name: "วันสงกรานต์", type: "national" },
  
  // วันพืชมงคล
  { date: "2026-05-11", name: "วันพืชมงคล", type: "royal" },
  
  // วันแรงงาน
  { date: "2026-05-01", name: "วันแรงงานแห่งชาติ", type: "national" },
  
  // วันวิสาขบูชา
  { date: "2026-05-31", name: "วันวิสาขบูชา", type: "buddhist" },
  
  // วันเฉลิมพระชนมพรรษาพระราชินี (แม่)
  { date: "2026-06-03", name: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดา", type: "royal" },
  
  // วันอาสาฬหบูชา
  { date: "2026-07-29", name: "วันอาสาฬหบูชา", type: "buddhist" },
  
  // วันเฉลิมพระชนมพรรษาพระราชาธิบดี (พ่อ)
  { date: "2026-07-28", name: "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว", type: "national" },
  
  // วันแม่แห่งชาติ
  { date: "2026-08-12", name: "วันแม่แห่งชาติ", type: "national" },
  
  // วันรัฐธรรมนูญ
  { date: "2026-12-10", name: "วันรัฐธรรมนูญ", type: "national" },
  
  // วันพ่อแห่งชาติ
  { date: "2026-12-05", name: "วันพ่อแห่งชาติ", type: "national" },
  
  // วันขึ้นปีใหม่
  { date: "2026-12-31", name: "วันสิ้นปี", type: "observance" },
];

// ฟังก์ชันตรวจสอบวันหยุด
export function getHoliday(dateString) {
  return THAI_HOLIDAYS_2026.find(h => h.date === dateString);
}

export function isHoliday(dateString) {
  return THAI_HOLIDAYS_2026.some(h => h.date === dateString);
}

// สีสำหรับแต่ละประเภทวันหยุด
export const HOLIDAY_COLORS = {
  national: "#FF6B6B",    // แดง - วันหยุดราชการ
  buddhist: "#9B59B6",    // ม่วง - วันพระ
  royal: "#F39C12",       // ส้ม - วันหลวง
  observance: "#3498DB",  // ฟ้า - วันสำคัญอื่นๆ
};
