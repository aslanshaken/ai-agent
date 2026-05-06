"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bot,
  ClipboardCheck,
  Database,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Plug,
  ScrollText,
  Settings,
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/runs", label: "Runs", icon: ScrollText },
  { href: "/approvals", label: "Approvals", icon: ClipboardCheck },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/memory", label: "Memory", icon: Database },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/dashboard";
  const [sidebarHovered, setSidebarHovered] = useState(false);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      void (async () => {
        try {
          const supabase = createBrowserSupabaseClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            window.location.replace("/login");
          }
        } catch {
          window.location.replace("/login");
        }
      })();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const signOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    }
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut({ scope: "global" });
    } catch {
      // ignore
    }
    window.location.replace("/");
  };

  return (
    <div className="flex min-h-screen min-w-0 flex-1">
      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/95 backdrop-blur transition-[width] duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-950/95",
          sidebarHovered ? "w-56" : "w-14",
        )}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        aria-label="Application"
      >
        <div className="shrink-0 border-b border-zinc-200 p-2 dark:border-zinc-800">
          <Link
            href="/dashboard"
            title="AI Agent Lab"
            className={cn(
              "flex items-center gap-3 rounded-md py-2 text-sm font-semibold tracking-tight text-zinc-900 transition-colors hover:bg-violet-50 hover:text-violet-900 dark:text-zinc-50 dark:hover:bg-violet-950/40 dark:hover:text-violet-100",
              sidebarHovered ? "px-2.5" : "justify-center px-0",
            )}
          >
            <FlaskConical
              className="size-5 shrink-0 text-violet-600 dark:text-violet-400"
              aria-hidden
            />
            <span
              className={cn(
                "min-w-0 text-left transition-[max-width,opacity] duration-200 ease-out",
                sidebarHovered ? "max-w-[11rem] truncate opacity-100" : "sr-only",
              )}
            >
              AI Agent Lab
            </span>
          </Link>
        </div>
        <nav
          className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden p-2 pb-2"
          aria-label="Main"
        >
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/dashboard"
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors",
                  sidebarHovered ? "px-2.5" : "justify-center px-0",
                  active
                    ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500 dark:text-white"
                    : "text-zinc-600 hover:bg-blue-50 hover:text-blue-900 dark:text-zinc-400 dark:hover:bg-blue-950/50 dark:hover:text-blue-100",
                )}
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0",
                    active ? "text-white opacity-100" : "opacity-80",
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "min-w-0 text-left transition-[max-width,opacity] duration-200 ease-out",
                    sidebarHovered ? "max-w-[11rem] truncate opacity-100" : "sr-only",
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-zinc-200 p-2 dark:border-zinc-800">
          <button
            type="button"
            title="Sign out"
            aria-label="Sign out"
            className={cn(
              "flex w-full items-center gap-3 rounded-md border border-red-300 bg-red-50 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-950/80",
              sidebarHovered ? "px-2.5" : "justify-center px-0",
            )}
            onClick={() => void signOut()}
          >
            <LogOut className="size-5 shrink-0" aria-hidden />
            <span
              className={cn(
                "min-w-0 text-left transition-[max-width,opacity] duration-200 ease-out",
                sidebarHovered ? "max-w-[11rem] truncate opacity-100" : "sr-only",
              )}
            >
              Sign out
            </span>
          </button>
        </div>
      </aside>
      <main className="min-h-0 min-w-0 flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
