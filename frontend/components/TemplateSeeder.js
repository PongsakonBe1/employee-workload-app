"use client";

import { useEffect, useState } from 'react';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
    name: "ยืมหูฟัง",
    minorTask: "ยืมหูฟัง",
    mainDuty: "ดูแลห้องบริการคอมพิวเตอร์",
    comment: "ยืมหูฟัง",
    requireRecipient: true,
    isActive: true
  },
  {
    name: "คืนหูฟัง",
    minorTask: "คืนหูฟัง",
    mainDuty: "ดูแลห้องบริการคอมพิวเตอร์",
    comment: "คืนหูฟัง",
    requireRecipient: true,
    isActive: true
  },
  {
    name: "ยืมปลั๊กไฟ",
    minorTask: "ยืมปลั๊กไฟ",
    mainDuty: "ดูแลห้องบริการคอมพิวเตอร์",
    comment: "ยืมปลั๊กไฟ",
    requireRecipient: true,
    isActive: true
  },
  {
    name: "คืนปลั๊กไฟ",
    minorTask: "คืนปลั๊กไฟ",
    mainDuty: "ดูแลห้องบริการคอมพิวเตอร์",
    comment: "คืนปลั๊กไฟ",
    requireRecipient: true,
    isActive: true
  }
];

export default function TemplateSeeder() {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const checkExistingTemplates = async () => {
    try {
      const templatesCollection = collection(db, 'globalTemplates');
      const snapshot = await getDocs(templatesCollection);
      return snapshot.docs.length;
    } catch (error) {
      console.error('Error checking existing templates:', error);
      return 0;
    }
  };

  const seedTemplates = async () => {
    try {
      setStatus('loading');
      setMessage('🚀 เริ่มสร้าง Quick Log Templates...');
      
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
      
      setStatus('success');
      setMessage(`🎉 สร้าง templates ทั้งหมด ${quickLogTemplates.length} อันสำเร็จ!`);
      
    } catch (error) {
      setStatus('error');
      setMessage(`❌ เกิดข้อผิดพลาด: ${error.message}`);
      console.error('Error seeding templates:', error);
    }
  };

  useEffect(() => {
    const checkAndSeed = async () => {
      const existingCount = await checkExistingTemplates();
      if (existingCount === 0) {
        await seedTemplates();
      } else {
        setStatus('info');
        setMessage(`📋 มี templates อยู่แล้ว ${existingCount} อัน`);
      }
    };

    checkAndSeed();
  }, []);

  if (status === 'idle') return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-sm p-4 bg-white rounded-lg shadow-lg border border-slate-200">
      <div className="flex items-center gap-2">
        {status === 'loading' && (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        )}
        {status === 'success' && (
          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
        )}
        {status === 'error' && (
          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
        )}
        {status === 'info' && (
          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
        )}
        <span className="text-sm text-slate-700">{message}</span>
      </div>
    </div>
  );
}
