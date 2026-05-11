"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle, Mail } from "lucide-react";
import { useAuth } from "../../components/AuthProvider";

export default function PendingApprovalPage() {
  const router = useRouter();
  const { user, pendingApproval, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // ถ้ามี user แสดงว่าอนุมัติแล้ว ไป dashboard
        router.replace("/dashboard");
      } else if (!pendingApproval) {
        // ถ้าไม่มี user และไม่ได้ pending แสดงว่ายังไม่ได้ login
        router.replace("/login");
      }
    }
  }, [user, pendingApproval, loading, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="apple-panel px-8 py-6 text-slate-600">กำลังโหลด...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="apple-panel max-w-md w-full p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <Clock size={32} className="text-amber-600" />
        </div>
        
        <h1 className="text-2xl font-semibold text-slate-950">
          รอการอนุมัติ
        </h1>
        
        <p className="mt-3 text-slate-600">
          บัญชีของคุณกำลังรอการอนุมัติจากผู้ดูแลระบบ
        </p>
        
        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <Mail size={20} className="text-slate-400" />
            <span className="text-sm text-slate-600">
              คุณจะได้รับอีเมลแจ้งเตือนเมื่อได้รับการอนุมัติ
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CheckCircle size={16} className="text-emerald-500" />
            <span>ตรวจสอบอีเมล @icit.kmutnb.ac.th แล้ว</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CheckCircle size={16} className="text-emerald-500" />
            <span>ส่งคำขอเข้าใช้งานแล้ว</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock size={16} className="text-amber-500" />
            <span>รอการอนุมัติจากผู้ดูแลระบบ</span>
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          หากมีข้อสงสัย กรุณาติดต่อผู้ดูแลระบบ
        </p>
      </div>
    </main>
  );
}
