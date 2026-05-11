/**
 * Input Validation Utilities
 * Can be used in both frontend and Firebase Cloud Functions
 */

// Validation rules
export const VALIDATION_RULES = {
  // Recipient: 1-50 characters, alphanumeric, Thai, spaces, and common symbols
  recipient: {
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9\u0E00-\u0E7F\s\-_.@/#]+$/,
    message: "ผู้รับบริการต้องมีความยาว 1-50 ตัวอักษร",
  },

  // Comment: 0-500 characters
  comment: {
    minLength: 0,
    maxLength: 500,
    pattern: /^[\s\S]*$/,
    message: "รายละเอียดต้องไม่เกิน 500 ตัวอักษร",
  },

  // Time format: HH:mm
  time: {
    pattern: /^([01]\d|2[0-3]):([0-5]\d)$/,
    message: "รูปแบบเวลาต้องเป็น HH:mm (00:00 - 23:59)",
  },

  // Date format: YYYY-MM-DD
  date: {
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    message: "รูปแบบวันที่ต้องเป็น YYYY-MM-DD",
  },
};

// Valid minor tasks (25 original tasks + 3 additional tasks)
export const VALID_MINOR_TASKS = [
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

// Validate recipient
export function validateRecipient(recipient) {
  if (!recipient || recipient.trim().length === 0) {
    return { valid: true }; // Optional field
  }

  const trimmed = recipient.trim();
  const { minLength, maxLength, pattern, message } = VALIDATION_RULES.recipient;

  if (trimmed.length < minLength || trimmed.length > maxLength) {
    return { valid: false, error: message };
  }

  if (!pattern.test(trimmed)) {
    return { valid: false, error: "ผู้รับบริการมีตัวอักษรที่ไม่ allowed" };
  }

  return { valid: true };
}

// Validate comment
export function validateComment(comment) {
  if (!comment) {
    return { valid: true }; // Optional field
  }

  const { maxLength, message } = VALIDATION_RULES.comment;

  if (comment.length > maxLength) {
    return { valid: false, error: message };
  }

  return { valid: true };
}

// Validate time format
export function validateTime(time) {
  if (!time) {
    return { valid: false, error: "กรุณาระบุเวลา" };
  }

  const { pattern, message } = VALIDATION_RULES.time;

  if (!pattern.test(time)) {
    return { valid: false, error: message };
  }

  return { valid: true };
}

// Validate date format and range
export function validateDate(date) {
  if (!date) {
    return { valid: false, error: "กรุณาระบุวันที่" };
  }

  const { pattern, message } = VALIDATION_RULES.date;

  if (!pattern.test(date)) {
    return { valid: false, error: message };
  }

  // Check if valid date
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: "วันที่ไม่ถูกต้อง" };
  }

  // Check if not in the future (allow up to 1 day ahead for late night entries)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  if (dateObj > tomorrow) {
    return { valid: false, error: "ไม่สามารถบันทึกล่วงหน้าเกิน 1 วันได้" };
  }

  return { valid: true };
}

// Validate minor task
export function validateMinorTask(task) {
  if (!task || task.trim().length === 0) {
    return { valid: false, error: "กรุณาเลือกหัวข้อรอง" };
  }

  if (!VALID_MINOR_TASKS.includes(task)) {
    return { valid: false, error: "หัวข้อรองไม่ถูกต้อง" };
  }

  return { valid: true };
}

// Validate complete worklog form
export function validateWorklogForm(form) {
  const errors = {};

  // Validate required fields
  const dateValidation = validateDate(form.date);
  if (!dateValidation.valid) {
    errors.date = dateValidation.error;
  }

  const timeValidation = validateTime(form.time);
  if (!timeValidation.valid) {
    errors.time = timeValidation.error;
  }

  const minorTaskValidation = validateMinorTask(form.minorTask);
  if (!minorTaskValidation.valid) {
    errors.minorTask = minorTaskValidation.error;
  }

  // Validate optional fields
  const recipientValidation = validateRecipient(form.recipient);
  if (!recipientValidation.valid) {
    errors.recipient = recipientValidation.error;
  }

  const commentValidation = validateComment(form.comment);
  if (!commentValidation.valid) {
    errors.comment = commentValidation.error;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// Rate limiting helper (for Firebase Functions)
export function checkRateLimit(requests, windowMs = 60000, maxRequests = 100) {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Filter requests within the time window
  const recentRequests = requests.filter(
    (timestamp) => timestamp > windowStart,
  );

  return {
    allowed: recentRequests.length < maxRequests,
    remaining: Math.max(0, maxRequests - recentRequests.length),
    resetTime: now + windowMs,
    recentRequests,
  };
}

// Sanitize input (prevent XSS)
export function sanitizeInput(input) {
  if (typeof input !== "string") return input;

  return input
    .replace(/[<>]/g, "") // Remove < and >
    .trim();
}

// Validate email (for Firebase Auth)
export function validateEmail(email) {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || !pattern.test(email)) {
    return { valid: false, error: "รูปแบบอีเมลไม่ถูกต้อง" };
  }

  // Check ICIT domain
  if (!email.endsWith("@icit.kmutnb.ac.th")) {
    return { valid: false, error: "อีเมลต้องใช้ @icit.kmutnb.ac.th เท่านั้น" };
  }

  return { valid: true };
}
