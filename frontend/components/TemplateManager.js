'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from './AuthProvider';
import { MinorTaskSelector } from './MinorTaskSelector';
import { 
  getAllTemplates, 
  createTemplate, 
  updateTemplate, 
  deleteTemplate 
} from '../lib/quickLogTemplates';
import { logSystemAction, SystemActions } from '../lib/systemLog';
import { getMainDutyFromMinorTask } from '../lib/commentSuggestions';

export default function TemplateManager() {
  const t = useTranslations('admin');
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    minorTask: '',
    mainDuty: '',
    dutyGroup: 'main',
    comment: '',
    requireRecipient: false,
    requireComment: false,
    isSmart: false
  });

  // Auto-fill mainDuty และ dutyGroup เมื่อเลือก minorTask
  const handleMinorTaskChange = (minorTask) => {
    setFormData(prev => ({
      ...prev,
      minorTask,
      mainDuty: getMainDutyFromMinorTask(minorTask),
      dutyGroup: 'main' // ค่าเริ่มต้นเป็น main
    }));
  };

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const templatesData = await getAllTemplates();
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingTemplate) {
        // Update existing template
        await updateTemplate(editingTemplate.id, {
          ...formData,
          department: null
        });
        await logSystemAction(
          SystemActions.TEMPLATE_UPDATE,
          `Updated template: ${formData.name}`,
          { templateId: editingTemplate.id }
        );
      } else {
        // Create new template
        await createTemplate({
          ...formData,
          department: null,
          createdBy: user.uid
        });
        await logSystemAction(
          SystemActions.TEMPLATE_CREATE,
          `Created template: ${formData.name}`,
          { templateName: formData.name }
        );
      }

      // Reset form and reload
      resetForm();
      setShowForm(false);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      minorTask: template.minorTask,
      mainDuty: template.mainDuty,
      dutyGroup: template.dutyGroup,
      comment: template.comment,
      requireRecipient: template.requireRecipient || false,
      requireComment: template.requireComment || false,
      isSmart: template.isSmart || false
    });
    setShowForm(true);
  };

  const handleDelete = async (template) => {
    if (!confirm(`ต้องการลบ template "${template.name}" ใช่หรือไม่?`)) {
      return;
    }

    try {
      await deleteTemplate(template.id);
      await logSystemAction(
        SystemActions.TEMPLATE_DELETE,
        `Deleted template: ${template.name}`,
        { templateId: template.id }
      );
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('เกิดข้อผิดพลาด: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      minorTask: '',
      mainDuty: '',
      dutyGroup: 'main',
      comment: '',
      requireRecipient: false,
      requireComment: false,
      isSmart: false
    });
    setEditingTemplate(null);
  };

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">จัดการ Quick Log Templates</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          เพิ่ม Template
        </button>
      </div>

      {/* Template Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              {editingTemplate ? 'แก้ไข Template' : 'สร้าง Template ใหม่'}
            </h2>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Quick Log Template
            </div>
          </div>

          {/* Quick Guide */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-blue-900 mb-2">📋 คู่มือสร้าง Template ง่ายๆ</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">1.</span>
                <div>
                  <strong>ชื่อ Template:</strong> ชื่อที่ staff เห็นในปุ่ม
                  <div className="text-blue-600">เช่น: "ยืม/คืนหูฟัง"</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">2.</span>
                <div>
                  <strong>เลือกหัวข้อรอง:</strong> งานที่ต้องทำ
                  <div className="text-blue-600">เช่น: "ยืมหูฟัง"</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">3.</span>
                <div>
                  <strong>เลือกตัวเลือก:</strong> Smart/ธรรมดา
                  <div className="text-blue-600">ติ๊ก Smart สำหรับอุปกรณ์</div>
                </div>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center">1</span>
                ข้อมูลพื้นฐาน
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ชื่อ Template *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="เช่น: ยืม/คืนหูฟัง"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    💡 ชื่อที่ staff จะเห็นในปุ่ม Quick Log
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    หัวข้อรอง *
                  </label>
                  <MinorTaskSelector
                    value={formData.minorTask}
                    onChange={handleMinorTaskChange}
                    placeholder="เลือกหัวข้อรอง"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    💡 เลือกงานที่ต้องทำ - ระบบจะ auto-fill หัวข้อหลักให้
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    หัวข้อหลัก (auto-fill)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.mainDuty}
                    onChange={(e) => setFormData({...formData, mainDuty: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50"
                    placeholder="เลือกหัวข้อรองเพื่อ auto-fill"
                    readOnly
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    หมวดหมู่
                  </label>
                  <select
                    value={formData.dutyGroup}
                    onChange={(e) => setFormData({...formData, dutyGroup: e.target.value})}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="main">งานหลัก</option>
                    <option value="additional">งานเพิ่มเติม</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  ความคิดเห็น (ถ้ามี)
                </label>
                <textarea
                  value={formData.comment}
                  onChange={(e) => setFormData({...formData, comment: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  rows={3}
                  placeholder="ข้อความเริ่มต้นที่จะแสดงในช่องกรอกข้อมูล"
                />
              </div>
            </div>
            
            {/* Step 2: Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center">2</span>
                ตัวเลือกพิเศษ
              </h3>
              
              <div className="space-y-3">
                {/* Require Recipient */}
                <label className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.requireRecipient}
                    onChange={(e) => setFormData({...formData, requireRecipient: e.target.checked})}
                    className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">ต้องการกรอกผู้รับบริการ</span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">แนะนำ</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      👥 ใช้สำหรับงานที่ต้องระบุชื่อผู้รับบริการ (เช่น: ยืม/คืนอุปกรณ์)
                    </p>
                  </div>
                </label>
                
                {/* Require Comment */}
                <label className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.requireComment}
                    onChange={(e) => setFormData({...formData, requireComment: e.target.checked})}
                    className="w-5 h-5 text-violet-600 border-slate-300 rounded focus:ring-violet-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">ต้องกรอกความคิดเห็น</span>
                      <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full">ปฏิบัติตามคำสั่ง</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      📝 เมื่อกดปุ่มจะแสดง modal ให้กรอกรายละเอียด เหมาะสำหรับงานตามผู้บังคับบัญชา
                    </p>
                  </div>
                </label>

                {/* Smart Template */}
                <label className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.isSmart}
                    onChange={(e) => setFormData({...formData, isSmart: e.target.checked})}
                    className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900">Smart Template</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">ใหม่</span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">อัจฉริยะ</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      🧠 ตรวจสอบสถานะจริงและแสดงเฉพาะ action ที่เหมาะสม (เช่น: หูฟังว่าง = ยืม, ใช้งาน = คืน)
                    </p>
                    <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700">
                      <strong>เหมาะสำหรับ:</strong> ยืม/คืนหูฟัง, ยืม/คืนปลั๊กไฟ, เปิด/ปิดห้องเรียน
                    </div>
                  </div>
                </label>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? 'กำลังบันทึก...' : (editingTemplate ? 'อัปเดต Template' : 'สร้าง Template')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates List */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-medium">รายการ Templates</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="text-slate-500">กำลังโหลด...</div>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-slate-500">ยังไม่มี templates</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    ชื่อ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    หัวข้อรอง
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    หัวข้อหลัก
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    ใช้แล้ว
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {template.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {template.minorTask}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {template.mainDuty}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {template.usageCount || 0}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleEdit(template)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(template)}
                        className="text-red-600 hover:text-red-900"
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
