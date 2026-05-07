"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-fetch the server-rendered run page while execution is in progress. */
export function RunDetailRefresh({ status }: { status: string }) {
  const router = useRouter();

  useEffect(() => {
    if (status !== "pending" && status !== "running") return;
    const id = window.setInterval(() => {
      router.refresh();
    }, 3500);
    return () => window.clearInterval(id);
  }, [status, router]);

  return null;
}
