"use client";

import { useEffect, useState } from 'react';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Smart templates ถูกย้ายไปให้ผู้ใช้สร้างเองผ่านหน้า admin
// ไม่มี templates ที่สร้างไว้ในโค้ดแล้ว
const smartTemplates = [];

export default function SmartTemplatesSeeder() {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const checkAndAddSmartTemplates = async () => {
    try {
      setStatus('loading');
      setMessage('🔍 ตรวจสอบ Smart Templates...');
      
      const templatesCollection = collection(db, 'globalTemplates');
      const snapshot = await getDocs(templatesCollection);
      const existingTemplates = snapshot.docs.map(doc => doc.data().name);
      
      const missingToAdd = smartTemplates.filter(template => 
        !existingTemplates.includes(template.name)
      );
      
      if (missingToAdd.length === 0) {
        setStatus('info');
        setMessage('✅ ไม่มี Smart Templates ที่สร้างไว้ในโค้ดแล้ว - กรุณาสร้างผ่านหน้า admin');
        return;
      }
      
      setMessage(`🚀 เพิ่ม Smart Templates ${missingToAdd.length} อัน...`);
      
      for (const template of missingToAdd) {
        const templateWithTimestamp = {
          ...template,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const docRef = await addDoc(templatesCollection, templateWithTimestamp);
        console.log(`✅ เพิ่ม Smart Template "${template.name}" สำเร็จ (ID: ${docRef.id})`);
      }
      
      setStatus('success');
      setMessage(`🎉 เพิ่ม Smart Templates สำเร็จ ${missingToAdd.length} อัน!`);
      
    } catch (error) {
      setStatus('error');
      setMessage(`❌ เกิดข้อผิดพลาด: ${error.message}`);
      console.error('Error adding smart templates:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      checkAndAddSmartTemplates();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return null; // ซ่อน component ไม่ให้แสดงผลเลย
}
