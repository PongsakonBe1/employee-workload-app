// Simple script สำหรับสร้าง Quick Log Templates
// ใช้งานผ่าน browser console หรือเพิ่มใน component ชั่วคราว

const quickLogTemplates = [
  {
    name: "เปิดห้องเรียนชั้น 4",
    minorTask: "เปิดห้องเรียนชั้น 4",
    mainDuty: "ตรวจสอบและดูแลห้องเรียน",
    comment: "เปิดห้องเรียนชั้น 4",
    requireRecipient: false,
    isActive: true
  },
  {
    name: "ปิดห้องเรียนชั้น 4",
    minorTask: "ปิดห้องเรียนชั้น 4",
    mainDuty: "ตรวจสอบและดูแลห้องเรียน",
    comment: "ปิดห้องเรียนชั้น 4",
    requireRecipient: false,
    isActive: true
  },
  {
    name: "ตรวจสอบปลั๊กไฟ",
    minorTask: "ติดตั้ง Software",
    mainDuty: "ติดตั้งและจัดการ Software",
    comment: "ตรวจสอบปลั๊กไฟ",
    requireRecipient: false,
    isActive: true
  },
  {
    name: "เช็คอินห้องแลกเปลี่ยนความรู้",
    minorTask: "เช็คอินห้องแลกเปลี่ยนความรู้",
    mainDuty: "ดูแลห้องเรียน",
    comment: "เช็คอินห้องแลกเปลี่ยนความรู้",
    requireRecipient: false,
    isActive: true
  },
  {
    name: "ปิดห้องแลกเปลี่ยนความรู้",
    minorTask: "ปิดห้องแลกเปลี่ยนความรู้",
    mainDuty: "ดูแลห้องเรียน",
    comment: "ปิดห้องแลกเปลี่ยนความรู้",
    requireRecipient: false,
    isActive: true
  },
  {
    name: "ยืม/คืนหูฟัง",
    minorTask: "ยืมหูฟัง",
    mainDuty: "จัดการอุปกรณ์",
    comment: "ยืม/คืนหูฟัง",
    requireRecipient: true,
    isActive: true
  },
  {
    name: "ยืม/คืนปลั๊กไฟ",
    minorTask: "ยืมปลั๊กไฟ",
    mainDuty: "จัดการอุปกรณ์",
    comment: "ยืม/คืนปลั๊กไฟ",
    requireRecipient: true,
    isActive: true
  }
];

// ฟังก์ชันสำหรับเพิ่ม templates
async function seedTemplates() {
  try {
    console.log('🚀 เริ่มสร้าง Quick Log Templates...');
    
    // ต้อง import ฟังก์ชันจาก component จริง
    const { collection, addDoc, serverTimestamp } = require('firebase/firestore');
    const { db } = require('../lib/firebase');
    
    const templatesCollection = collection(db, 'globalTemplates');
    
    for (const template of quickLogTemplates) {
      const templateWithTimestamp = {
        ...template,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(templatesCollection, templateWithTimestamp);
      console.log(`✅ สร้าง template "${template.name}" สำเร็จ (ID: ${docRef.id})`);
    }
    
    console.log(`🎉 สร้าง templates ทั้งหมด ${quickLogTemplates.length} อันสำเร็จ!`);
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการสร้าง templates:', error);
  }
}

export { quickLogTemplates, seedTemplates };
