"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BarChart3, Download, ListChecks, LogOut, PlusCircle } from "lucide-react";
import { useAuth } from "./AuthProvider";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/worklogs/new", label: "Record Work", icon: PlusCircle },
  { href: "/worklogs", label: "History", icon: ListChecks },
  { href: "/export", label: "Export CSV", icon: Download }
];

export function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, booting, logout } = useAuth();

  useEffect(() => {
    if (!booting && !user) {
      router.replace("/login");
    }
  }, [booting, user, router]);

  if (booting) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="apple-panel px-8 py-6 text-sm font-medium text-slate-600">
          Loading ICIT workload system…
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen px-5 py-5 sm:px-8">
      <header className="mx-auto mb-8 flex max-w-7xl items-center justify-between rounded-[2rem] border border-white/70 bg-white/70 px-5 py-4 shadow-sm backdrop-blur-2xl">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="relative h-10 w-20 overflow-hidden rounded-2xl bg-slate-950 p-1">
            <Image src="/icit-logo.png" alt="ICIT logo" fill className="object-contain p-1" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">ICIT Workload</p>
            <p className="text-xs text-slate-500">KMUTNB Computer Center</p>
          </div>
        </Link>

        <div className="hidden items-center gap-2 lg:flex">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-white hover:text-slate-950"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-slate-950">{user.nickname}</p>
            <p className="text-xs text-slate-500">{user.role}</p>
          </div>
          <button onClick={logout} className="rounded-full border border-slate-200 bg-white/80 p-3 text-slate-600 transition hover:text-slate-950">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <nav className="mx-auto mb-6 grid max-w-7xl grid-cols-2 gap-2 lg:hidden">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium ${
                active ? "bg-slate-950 text-white" : "bg-white/70 text-slate-600"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="mx-auto max-w-7xl">{children}</main>
    </div>
  );
}
