"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ShieldCheck, Chrome } from "lucide-react";
import { useAuth } from "../../components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, pendingApproval, loginWithGoogle } = useAuth();
  const [error, setError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // ถ้า login แล้ว ให้ redirect ตาม role
  // PWA Fix: รอให้ auth state นิ่งก่อน redirect (ป้องกัน redirect loop)
  useEffect(() => {
    if (!loading) {
      if (user) {
        if (user.role === "admin" || user.role === "superadmin") {
          router.replace("/dashboard");
        } else {
          router.replace("/worklogs/new");
        }
      } else if (pendingApproval) {
        router.replace("/pending");
      }
    }
  }, [user, pendingApproval, loading, router]);

  // ตรวจสอบ PWA Standalone mode
  const isAndroidStandalone =
    typeof window !== "undefined" &&
    window.matchMedia("(display-mode: standalone)").matches &&
    !(typeof window !== "undefined" && window.navigator.standalone === true);

  async function handleGoogleLogin() {
    setError("");
    setLoginLoading(true);

    try {
      await loginWithGoogle();
      // Android PWA: หน้าจะ redirect ไป Google ทันที (ไม่ถึง finally)
      // iOS PWA + Browser: รอ popup แล้ว AuthProvider อัพเดต state
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        setError("ยกเลิกการเข้าสู่ระบบ");
      } else if (err.code === "auth/popup-blocked") {
        setError("Popup ถูกบล็อก กรุณาอนุญาต Popup ใน Safari แล้วลองใหม่");
      } else if (err.code === "auth/unauthorized-domain") {
        setError("โดเมนนี้ไม่ได้รับอนุญาต กรุณาติดต่อผู้ดูแลระบบ");
      } else {
        setError("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      }
      setLoginLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="apple-panel overflow-hidden p-8 sm:p-12">
          <div className="mb-10 inline-flex items-center gap-3 rounded-full bg-slate-950 px-4 py-2 text-white">
            <Image src="/labboy-logo.png" alt="labboy logo" width={24} height={24} className="object-contain" />
            <span className="text-sm font-semibold">Workload Recorder</span>
          </div>

          <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-7xl">
            บันทึกงาน IT ได้ง่ายขึ้น
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            ออกแบบมาสำหรับเจ้าหน้าที่เทคนิค ICIT บันทึกงานห้องคอมพิวเตอร์
            แก้ไขปัญหา คุมสอบ DL และส่งออกรายงานปีงบประมาณ
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {["งานในหน้าที่หลัก", "หัวข้อรอง", "ส่งออก CSV"].map((item) => (
              <div
                key={item}
                className="rounded-3xl bg-white/70 p-4 text-sm font-semibold text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="apple-panel p-8">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-950 text-white">
            <ShieldCheck size={26} />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
            เข้าสู่ระบบ
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            ใช้ Google Account ของ ICIT เท่านั้น
          </p>

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            onClick={handleGoogleLogin}
            disabled={loginLoading}
            className="apple-button mt-8 w-full inline-flex items-center justify-center gap-3"
          >
            <Chrome size={20} />
            {loginLoading
              ? isAndroidStandalone
                ? "กำลังเปิด Google…"
                : "กำลังเข้าสู่ระบบ…"
              : "เข้าสู่ระบบด้วย Google"}
          </button>

          <p className="mt-4 text-xs text-center text-slate-400">
            เฉพาะอีเมล @icit.kmutnb.ac.th เท่านั้น
          </p>
        </div>
      </section>
    </main>
  );
}
