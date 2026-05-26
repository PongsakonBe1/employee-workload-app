'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function TemplateCleanup() {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [templates, setTemplates] = useState([]);
  const [duplicates, setDuplicates] = useState([]);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const q = query(collection(db, 'globalTemplates'), where('isActive', '==', true));
      const snapshot = await getDocs(q);
      const allTemplates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setTemplates(allTemplates);
      
      // หาซ้ำซ้อนตามชื่อ
      const nameGroups = {};
      allTemplates.forEach(template => {
        if (!nameGroups[template.name]) {
          nameGroups[template.name] = [];
        }
        nameGroups[template.name].push(template);
      });
      
      const duplicateGroups = Object.values(nameGroups).filter(group => group.length > 1);
      setDuplicates(duplicateGroups);
      
    } catch (error) {
      console.error('Error loading templates:', error);
      setMessage('เกิดข้อผิดพลาดในการโหลด templates');
    }
  };

  const cleanupTemplates = async () => {
    setStatus('loading');
    setMessage('กำลังทำความสะอาด templates...');
    
    try {
      const batch = writeBatch(db);
      let deletedCount = 0;
      
      // ลบ templates ซ้ำซ้อน (เก็บอันแรกไว้)
      duplicates.forEach(group => {
        // เก็บอันแรกไว้ ลบที่เหลือ
        const toKeep = group[0];
        const toDelete = group.slice(1);
        
        toDelete.forEach(template => {
          const docRef = doc(db, 'globalTemplates', template.id);
          batch.delete(docRef);
          deletedCount++;
        });
      });
      
      // ลบ templates ที่ไม่ควรมี (คืนอุปกรณ์, เปิด/ปิดห้องเรียนชั้น 4 ซ้ำ)
      const unwantedNames = ['คืนปลั๊กไฟ', 'คืนหูฟัง'];
      templates.forEach(template => {
        if (unwantedNames.includes(template.name)) {
          const docRef = doc(db, 'globalTemplates', template.id);
          batch.delete(docRef);
          deletedCount++;
        }
      });
      
      await batch.commit();
      
      setMessage(`ทำความสะอาดเรียบร้อย! ลบ ${deletedCount} templates`);
      setStatus('success');
      
      // โหลดใหม่
      await loadTemplates();
      
    } catch (error) {
      console.error('Error cleaning up templates:', error);
      setMessage(`เกิดข้อผิดพลาด: ${error.message}`);
      setStatus('error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">🧹 Template Cleanup</h1>
        
        {/* Status */}
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            status === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            status === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message}
          </div>
        )}
        
        {/* Templates Summary */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">สรุป Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{templates.length}</div>
              <div className="text-sm text-slate-600">ทั้งหมด</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{duplicates.length}</div>
              <div className="text-sm text-slate-600">กลุ่มที่ซ้ำซ้อน</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {duplicates.reduce((sum, group) => sum + group.length - 1, 0)}
              </div>
              <div className="text-sm text-slate-600">ที่ซ้ำซ้อน</div>
            </div>
          </div>
        </div>
        
        {/* Duplicates */}
        {duplicates.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Templates ที่ซ้ำซ้อน</h2>
            <div className="space-y-3">
              {duplicates.map((group, index) => (
                <div key={index} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                  <div className="font-medium text-orange-900 mb-2">{group[0].name}</div>
                  <div className="text-sm text-orange-700">
                    {group.map((template, i) => (
                      <div key={template.id}>
                        {i + 1}. {template.minorTask} - {template.mainDuty} 
                        {i === 0 && <span className="text-green-600 font-medium"> (เก็บไว้)</span>}
                        {i > 0 && <span className="text-red-600 font-medium"> (ลบ)</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Action Button */}
        <div className="flex gap-3">
          <button
            onClick={cleanupTemplates}
            disabled={status === 'loading' || duplicates.length === 0}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {status === 'loading' ? 'กำลังทำความสะอาด...' : '🧹 ทำความสะอาด Templates'}
          </button>
          
          <button
            onClick={loadTemplates}
            className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-medium"
          >
            🔄 โหลดใหม่
          </button>
        </div>
        
        {/* All Templates */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">ทั้งหมด ({templates.length} templates)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3">ชื่อ</th>
                  <th className="text-left py-2 px-3">หัวข้อรอง</th>
                  <th className="text-left py-2 px-3">หัวข้อหลัก</th>
                  <th className="text-left py-2 px-3">ครั้งที่ใช้</th>
                  <th className="text-left py-2 px-3">Smart</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(template => (
                  <tr key={template.id} className="border-b border-slate-100">
                    <td className="py-2 px-3 font-medium">{template.name}</td>
                    <td className="py-2 px-3">{template.minorTask}</td>
                    <td className="py-2 px-3">{template.mainDuty}</td>
                    <td className="py-2 px-3">{template.usageCount || 0}</td>
                    <td className="py-2 px-3">
                      {template.isSmart ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Smart</span>
                      ) : (
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">ธรรมดา</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
