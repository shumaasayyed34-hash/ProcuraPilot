"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AHPIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ahp/configure?rfqId=101");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex items-center gap-2 text-slate-500 font-sans text-xs">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>Loading AHP Sourcing Engine...</span>
      </div>
    </div>
  );
}
