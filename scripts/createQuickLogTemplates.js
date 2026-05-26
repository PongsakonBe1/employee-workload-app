// Script สร้าง Quick Log Templates สำหรับงานประจำ
// รัน: node scripts/createQuickLogTemplates.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  // ใส่ config จาก .env.local หรือ firebase.json
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Templates สำหรับงานประจำ
const quickLogTemplates = [
  {
    name: "เปิดห้องเรียนชั้น 4",
    minorTask: "เปิดห้องเรียนชั้น 4",
    mainDuty: "ตรวจสอบและดูแลห้องเรียน",
    comment: "เปิดห้องเรียนชั้น 4",
    requireRecipient: false,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    name: "ปิดห้องเรียนชั้น 4",
    minorTask: "ปิดห้องเรียนชั้น 4",
    mainDuty: "ตรวจสอบและดูแลห้องเรียน",
    comment: "ปิดห้องเรียนชั้น 4",
    requireRecipient: false,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    name: "ตรวจสอบปลั๊กไฟ",
    minorTask: "ติดตั้ง Software",
    mainDuty: "ติดตั้งและจัดการ Software",
    comment: "ตรวจสอบปลั๊กไฟ",
    requireRecipient: false,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    name: "เช็คอินห้องแลกเปลี่ยนความรู้",
    minorTask: "เช็คอินห้องแลกเปลี่ยนความรู้",
    mainDuty: "ดูแลห้องเรียน",
    comment: "เช็คอินห้องแลกเปลี่ยนความรู้",
    requireRecipient: false,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    name: "ปิดห้องแลกเปลี่ยนความรู้",
    minorTask: "ปิดห้องแลกเปลี่ยนความรู้",
    mainDuty: "ดูแลห้องเรียน",
    comment: "ปิดห้องแลกเปลี่ยนความรู้",
    requireRecipient: false,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    name: "ยืม/คืนหูฟัง",
    minorTask: "ยืมหูฟัง",
    mainDuty: "จัดการอุปกรณ์",
    comment: "ยืม/คืนหูฟัง",
    requireRecipient: true, // ต้องเลือกผู้รับบริการ
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  },
  {
    name: "ยืม/คืนปลั๊กไฟ",
    minorTask: "ยืมปลั๊กไฟ",
    mainDuty: "จัดการอุปกรณ์",
    comment: "ยืม/คืนปลั๊กไฟ",
    requireRecipient: true, // ต้องเลือกผู้รับบริการ
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
];

async function createTemplates() {
  try {
    console.log('🚀 เริ่มสร้าง Quick Log Templates...');
    
    const templatesCollection = collection(db, 'globalTemplates');
    
    for (const template of quickLogTemplates) {
      const docRef = await addDoc(templatesCollection, template);
      console.log(`✅ สร้าง template "${template.name}" สำเร็จ (ID: ${docRef.id})`);
    }
    
    console.log(`🎉 สร้าง templates ทั้งหมด ${quickLogTemplates.length} อันสำเร็จ!`);
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการสร้าง templates:', error);
  }
}

// รัน script
createTemplates();
