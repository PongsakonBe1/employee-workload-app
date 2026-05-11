/**
 * Exact list of 25 minor tasks as specified by ICIT
 * Comment suggestions mapping for specific tasks
 */

// The exact 25 minor tasks + 3 additional tasks
export const MINOR_TASKS = [
  "ช่วยเหลือการใช้งานคอมพิวเตอร์",
  "แก้ไขปัญหาเครื่องพิมพ์,คอมพิวเตอร์",
  "ยืมหูฟัง",
  "คืนหูฟัง",
  "ดูแลความสะอาด",
  "ICIT account",
  "Microsoft Authenticator",
  "Software ลิขสิทธิ์",
  "Gmail",
  "Microsoft Email",
  "Wifi",
  "Microsoft365",
  "การเติมเงินงานพิมพ์",
  "รับแจ้งและแก้ปัญหาทางโทรศัพท์",
  "เช็คอินห้องแลกเปลี่ยนความรู้",
  "ปิดห้องแลกเปลี่ยนความรู้",
  "เปิดห้องเรียนชั้น 4",
  "ปิดห้องเรียนชั้น 4",
  "ติดตั้ง windows",
  "แก้ไขปัญหาการใช้งานคอมพิวเตอร์",
  "แก้ไขปัญหาการเชื่อมต่อ",
  "แก้ไขปัญหาการปริ้น",
  "ยืมปลั๊กไฟ",
  "คืนปลั๊กไฟ",
  "ติดตั้ง Software",
  "ปฏิบัติงานตามที่ผู้บังคับบัญชามอบหมาย",
  "สนับสนุนการทำงานของสำนักคอมพิวเตอร์(ฝ่ายอื่นๆ)",
  "คุมสอบ DL",
];

export const commentSuggestionMap = {
  // Knowledge Room (ห้องแลกเปลี่ยนความรู้)
  เช็คอินห้องแลกเปลี่ยนความรู้: [
    "303/Windows",
    "304/iOS",
    "305/Android",
    "306/Linux",
  ],
  ปิดห้องแลกเปลี่ยนความรู้: [
    "303/Windows",
    "304/iOS",
    "305/Android",
    "306/Linux",
  ],

  // Classroom 4 (ห้องเรียนชั้น 4)
  "เปิดห้องเรียนชั้น 4": ["401", "402", "406", "407"],
  "ปิดห้องเรียนชั้น 4": ["401", "402", "406", "407"],

  // Headphones (หูฟัง)
  ยืมหูฟัง: [
    "ICIT01",
    "ICIT02",
    "ICIT03",
    "ICIT04",
    "ICIT05",
    "ICIT06",
    "ICIT07",
    "ICIT08",
    "ICIT09",
    "ICIT10",
    "ICIT11",
    "ICIT12",
  ],
  คืนหูฟัง: [
    "ICIT01",
    "ICIT02",
    "ICIT03",
    "ICIT04",
    "ICIT05",
    "ICIT06",
    "ICIT07",
    "ICIT08",
    "ICIT09",
    "ICIT10",
    "ICIT11",
    "ICIT12",
  ],

  // Power Outlets (ปลั๊กไฟ)
  ยืมปลั๊กไฟ: ["ICIT21", "ICIT22", "ICIT23"],
  คืนปลั๊กไฟ: ["ICIT21", "ICIT22", "ICIT23"],

  // DL Exam Proctoring (คุมสอบ DL)
  "คุมสอบ DL": ["เช้า", "บ่าย", "เช้า/บ่าย"],
};

/**
 * Minor task to Main duty mapping for the 25 exact tasks
 * Maps each minor task to its corresponding main duty
 */
export const minorTaskToMainDuty = {
  // ดูแลห้องบริการคอมพิวเตอร์ (9 tasks)
  เช็คอินห้องแลกเปลี่ยนความรู้: "ดูแลห้องบริการคอมพิวเตอร์",
  ปิดห้องแลกเปลี่ยนความรู้: "ดูแลห้องบริการคอมพิวเตอร์",
  "เปิดห้องเรียนชั้น 4": "ดูแลห้องบริการคอมพิวเตอร์",
  "ปิดห้องเรียนชั้น 4": "ดูแลห้องบริการคอมพิวเตอร์",
  คืนหูฟัง: "ดูแลห้องบริการคอมพิวเตอร์",
  ยืมหูฟัง: "ดูแลห้องบริการคอมพิวเตอร์",
  คืนปลั๊กไฟ: "ดูแลห้องบริการคอมพิวเตอร์",
  ยืมปลั๊กไฟ: "ดูแลห้องบริการคอมพิวเตอร์",
  ดูแลความสะอาด: "ดูแลห้องบริการคอมพิวเตอร์",

  // ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ (16 tasks)
  "Microsoft Authenticator": "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ",
  รับแจ้งและแก้ปัญหาทางโทรศัพท์: "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ",
  "Software ลิขสิทธิ์": "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ",
  "ICIT account": "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ",
  "ติดตั้ง Software": "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ",
  Microsoft365: "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ",
  การเติมเงินงานพิมพ์: "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ",
  ช่วยเหลือการใช้งานคอมพิวเตอร์: "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ",
  Gmail: "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ",
  "Microsoft Email": "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ",
  Wifi: "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ",
  "แก้ไขปัญหาเครื่องพิมพ์,คอมพิวเตอร์":
    "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ",
  แก้ไขปัญหาการใช้งานคอมพิวเตอร์: "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ",
  แก้ไขปัญหาการปริ้น: "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ",
  แก้ไขปัญหาการเชื่อมต่อ: "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ",
  "ติดตั้ง windows": "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ",

  // Additional tasks mapping
  ปฏิบัติงานตามที่ผู้บังคับบัญชามอบหมาย:
    "ปฏิบัติงานตามที่ผู้บังคับบัญชามอบหมาย",
  "สนับสนุนการทำงานของสำนักคอมพิวเตอร์(ฝ่ายอื่นๆ)":
    "สนับสนุนการทำงานของสำนักคอมพิวเตอร์(ฝ่ายอื่นๆ)",
  "คุมสอบ DL": "คุมสอบ DL",
};

/**
 * Get comment suggestions for a minor task
 * @param {string} minorTask - The selected minor task
 * @returns {string[]} - Array of suggested comments or empty array
 */
export function getCommentSuggestions(minorTask) {
  return commentSuggestionMap[minorTask] || [];
}

/**
 * Get main duty for a minor task
 * @param {string} minorTask - The selected minor task
 * @returns {string} - The corresponding main duty
 */
export function getMainDutyFromMinorTask(minorTask) {
  return (
    minorTaskToMainDuty[minorTask] ||
    "ให้บริการรับแจ้งและแก้ไขปัญหาระบบสารสนเทศ"
  );
}

/**
 * Check if a minor task has comment suggestions
 * @param {string} minorTask - The selected minor task
 * @returns {boolean}
 */
export function hasCommentSuggestions(minorTask) {
  return minorTask in commentSuggestionMap;
}
