"use client";

import { useEffect, useState } from 'react';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Templates ที่เพิ่มเข้ามาใหม่ (แยกยืม/คืน)
const missingTemplates = [
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

export default function AddMissingTemplates() {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const checkAndAddMissingTemplates = async () => {
    try {
      setStatus('loading');
      setMessage('🔍 ตรวจสอบ templates ที่ขาดหาย...');
      
      const templatesCollection = collection(db, 'globalTemplates');
      const snapshot = await getDocs(templatesCollection);
      const existingTemplates = snapshot.docs.map(doc => doc.data().name);
      
      const missingToAdd = missingTemplates.filter(template => 
        !existingTemplates.includes(template.name)
      );
      
      if (missingToAdd.length === 0) {
        setStatus('info');
        setMessage('✅ มี templates ครบถ้วนแล้ว');
        return;
      }
      
      setMessage(`🚀 เพิ่ม templates ที่ขาดหาย ${missingToAdd.length} อัน...`);
      
      for (const template of missingToAdd) {
        const templateWithTimestamp = {
          ...template,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const docRef = await addDoc(templatesCollection, templateWithTimestamp);
        console.log(`✅ เพิ่ม template "${template.name}" สำเร็จ (ID: ${docRef.id})`);
      }
      
      setStatus('success');
      setMessage(`🎉 เพิ่ม templates สำเร็จ ${missingToAdd.length} อัน!`);
      
    } catch (error) {
      setStatus('error');
      setMessage(`❌ เกิดข้อผิดพลาด: ${error.message}`);
      console.error('Error adding missing templates:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      checkAndAddMissingTemplates();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return null; // ซ่อน component ไม่ให้แสดงผลเลย
}
