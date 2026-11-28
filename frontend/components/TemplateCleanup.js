'use client';

import { useEffect, useRef, useState } from 'react';
import { collection, getDocsFromServer, query, runTransaction, snapshotEqual, where } from 'firebase/firestore';
import { RefreshCw, Trash2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { GlassButton } from './ui/GlassControls';
import { Dialog } from './ui/Dialog';
import { MobileDetailCell } from './ui/MobileDetailCell';
import '../app/ui-detail-layouts.css';

async function readTemplates() {
  const snapshot = await getDocsFromServer(query(collection(db, 'globalTemplates'), where('isActive', '==', true)));
  return snapshot.docs.map(row => ({ ...row.data(), id: row.id, snapshot: row }));
}

function groupDuplicates(templates) {
  const names = new Map();
  for (const template of templates) {
    if (typeof template.name !== 'string' || !template.name.trim()) continue;
    if (!names.has(template.name)) names.set(template.name, []);
    names.get(template.name).push(template);
  }
  return [...names.values()].filter(group => group.length > 1);
}

export default function TemplateCleanup() {
  const [templates, setTemplates] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fresh, setFresh] = useState(false);
  const [review, setReview] = useState(null);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const duplicates = groupDuplicates(templates);
  const duplicateCount = duplicates.reduce((sum, group) => sum + group.length - 1, 0);

  useEffect(() => {
    let current = true;
    readTemplates().then(rows => {
      if (!current) return;
      setTemplates(rows);
      setFresh(true);
    }).catch(() => {
      if (current) setFeedback({ text: 'โหลดเทมเพลตไม่สำเร็จ กรุณาโหลดใหม่', error: true });
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => { current = false; };
  }, []);

  async function reload() {
    setLoading(true);
    setFresh(false);
    setFeedback(null);
    try {
      setTemplates(await readTemplates());
      setFresh(true);
    } catch {
      setFeedback({ text: 'โหลดเทมเพลตไม่สำเร็จ กรุณาโหลดใหม่', error: true });
    } finally {
      setLoading(false);
    }
  }

  async function confirmCleanup() {
    if (!review || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setFeedback(null);
    setFresh(false);
    const success = 'ลบแล้ว ' + review.count + ' เทมเพลต';
    try {
      await runTransaction(db, async transaction => {
        const unchanged = await Promise.all(review.groups.flat().map(async ({ snapshot }) =>
          snapshotEqual(await transaction.get(snapshot.ref), snapshot)));
        if (!unchanged.every(Boolean)) throw new Error('template-review-stale');
        for (const [, ...removed] of review.groups) {
          for (const { snapshot } of removed) transaction.delete(snapshot.ref);
        }
      });
      try {
        setTemplates(await readTemplates());
        setFresh(true);
        setFeedback({ text: success });
      } catch {
        setFeedback({ text: success + ' แต่โหลดรายการล่าสุดไม่สำเร็จ กรุณาโหลดใหม่', error: true });
      }
    } catch (error) {
      setFeedback({ text: error.message === 'template-review-stale'
        ? 'รายการที่ตรวจทานเปลี่ยนไป กรุณาโหลดใหม่ก่อนยืนยันอีกครั้ง'
        : 'ยืนยันผลการลบไม่ได้ กรุณาโหลดใหม่เพื่อตรวจสถานะก่อนลองอีกครั้ง', error: true });
    } finally {
      setReview(null);
      setSaving(false);
      submitting.current = false;
    }
  }

  return (
    <section className="ui-management apple-panel p-4 sm:p-6" aria-labelledby="cleanup-summary">

      {feedback && <p role={feedback.error ? 'alert' : 'status'}
        className={feedback.error
          ? 'mb-6 rounded-xl bg-[var(--ui-red)] p-4 text-[var(--ui-red-ink)]'
          : 'mb-6 rounded-xl bg-[var(--ui-green)] p-4 text-[var(--ui-green-ink)]'}>
        {feedback.text}
      </p>}
      {loading && <p role="status" className="mb-4 text-sm text-[var(--ui-sub)]">กำลังโหลดเทมเพลต…</p>}

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
              {duplicateCount}
            </div>
            <div>รายการซ้ำ</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <GlassButton variant="prominent" disabled={!fresh || saving || duplicateCount === 0}
          onClick={() => setReview({ groups: duplicates, count: duplicateCount })}>
          ตรวจรายการที่จะลบ
        </GlassButton>
        <GlassButton onClick={reload} disabled={loading || saving}
          icon={<RefreshCw size={17} aria-hidden="true" />}>
          โหลดใหม่
        </GlassButton>
      </div>
      <p className="mt-2 text-sm text-[var(--ui-sub)]">
        {fresh && !duplicateCount ? 'ไม่พบเทมเพลตชื่อซ้ำ' : 'ตรวจชื่อและหัวข้องานของทุกเทมเพลตก่อนลบ'}
      </p>

      <Dialog open={Boolean(review)} busy={saving} onClose={() => setReview(null)} title="ตรวจรายการลบเทมเพลต"
        description={saving ? 'กำลังลบเทมเพลต…' : 'ระบบจะเก็บหนึ่งเทมเพลตต่อชื่อ และลบเฉพาะรายการที่ระบุด้านล่าง การลบนี้ย้อนกลับไม่ได้'}
        footer={<>
          <GlassButton disabled={saving} onClick={() => setReview(null)}>ยกเลิก</GlassButton>
          <GlassButton variant="destructive" disabled={saving} onClick={confirmCleanup}
            icon={<Trash2 size={17} aria-hidden="true" />}>
            ลบ {review?.count} เทมเพลต
          </GlassButton>
        </>}>
        <div className="space-y-3">
          {review?.groups.map(group => (
            <section key={group[0].id} className="rounded-xl border border-[var(--ui-line)] bg-[var(--ui-soft)] p-3">
              <h3 className="font-semibold">{group[0].name}</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {group.map((template, index) => (
                  <li key={template.id} className="break-words">
                    <span className={index === 0 ? 'font-semibold text-[var(--ui-green-ink)]' : 'font-semibold text-[var(--ui-red-ink)]'}>
                      {index === 0 ? 'เก็บไว้' : 'ลบ'}
                    </span>{' '}
                    {template.minorTask || 'ไม่ระบุหัวข้อรอง'} · {template.mainDuty || 'ไม่ระบุหัวข้อหลัก'}
                    <span className="block text-xs text-[var(--ui-sub)]">รหัส {template.id}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Dialog>

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
