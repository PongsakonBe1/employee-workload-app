'use client';

import { useAuth } from '../../../components/AuthProvider';
import TemplateCleanup from '../../../components/TemplateCleanup';
import { useRouter } from 'next/navigation';

export default function CleanupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Admin Tools</h1>
          <p className="text-slate-600 mt-2">เครื่องมือสำหรับผู้ดูแลระบบ</p>
        </div>
        
        <TemplateCleanup />
      </div>
    </div>
  );
}
