'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import { RefreshCw, Trash2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { GlassButton } from './ui/GlassControls';
import { MobileDetailCell } from './ui/MobileDetailCell';
import '../app/ui-detail-layouts.css';

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
    <section className="ui-management apple-panel p-4 sm:p-6" aria-labelledby="cleanup-summary">

      {/* Status */}
      {message && (
        <div role={status === 'error' ? 'alert' : 'status'} className={`p-4 rounded-lg mb-6 ${
          status === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          status === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {message}
        </div>
      )}

      {/* Templates Summary */}
      <div className="mb-6">
        <h2 id="cleanup-summary" className="text-lg font-semibold mb-3">สรุปเทมเพลต</h2>
        <div className="management-summary text-xs sm:text-sm">
          <div className="rounded-xl bg-[var(--ui-soft)] p-2 sm:p-4">
            <div className="text-2xl font-bold text-slate-900">{templates.length}</div>
            <div className="text-slate-600">ทั้งหมด</div>
          </div>
          <div className="rounded-xl bg-[var(--ui-amber)] p-2 text-[var(--ui-amber-ink)] sm:p-4">
            <div className="text-2xl font-bold">{duplicates.length}</div>
            <div>กลุ่มที่ซ้ำ</div>
          </div>
          <div className="rounded-xl bg-[var(--ui-red)] p-2 text-[var(--ui-red-ink)] sm:p-4">
            <div className="text-2xl font-bold">
              {duplicates.reduce((sum, group) => sum + group.length - 1, 0)}
            </div>
            <div>รายการซ้ำ</div>
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
      <div className="flex flex-wrap gap-3">
        <GlassButton
          variant="destructive"
          icon={<Trash2 size={17} aria-hidden="true" />}
          onClick={cleanupTemplates}
          disabled={status === 'loading' || duplicates.length === 0}
        >
          {status === 'loading' ? 'กำลังลบเทมเพลต…' : 'ลบเทมเพลตตามเกณฑ์'}
        </GlassButton>

        <GlassButton
          onClick={loadTemplates}
          icon={<RefreshCw size={17} aria-hidden="true" />}
          disabled={status === 'loading'}
        >
          โหลดใหม่
        </GlassButton>
      </div>
      <p className="mt-2 text-xs text-[var(--ui-sub)]">
        เก็บเทมเพลตแรกของแต่ละชื่อ และลบรายการชื่อ “คืนปลั๊กไฟ” กับ “คืนหูฟัง” ด้วย
      </p>

      {/* All Templates */}
      <div className="mt-8">
        <h2 id="cleanup-templates" className="mb-3 text-lg font-semibold">เทมเพลตทั้งหมด ({templates.length})</h2>
        <div className="mobile-table-wrap overflow-x-auto">
          <table role="table" aria-labelledby="cleanup-templates" className="mobile-detail-table w-full text-sm">
            <thead>
              <tr role="row" className="border-b border-slate-200">
                <th className="text-left py-2 px-3">ชื่อ</th>
                <th className="text-left py-2 px-3">หัวข้อรอง</th>
                <th className="text-left py-2 px-3">หัวข้อหลัก</th>
                <th className="text-left py-2 px-3">ครั้งที่ใช้</th>
                <th className="text-left py-2 px-3">Smart</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(template => (
                <tr role="row" key={template.id} className="border-b border-slate-100">
                  <MobileDetailCell label="ชื่อ" primary className="py-2 px-3 font-medium">{template.name}</MobileDetailCell>
                  <MobileDetailCell label="หัวข้อรอง" className="py-2 px-3">{template.minorTask}</MobileDetailCell>
                  <MobileDetailCell label="หัวข้อหลัก" className="py-2 px-3">{template.mainDuty}</MobileDetailCell>
                  <MobileDetailCell label="ครั้งที่ใช้" className="py-2 px-3">{template.usageCount || 0}</MobileDetailCell>
                  <MobileDetailCell label="ประเภท" className="py-2 px-3">
                    {template.isSmart ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Smart</span>
                    ) : (
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">ธรรมดา</span>
                    )}
                  </MobileDetailCell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
