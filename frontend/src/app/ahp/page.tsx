"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AHPIndexContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlRfqId = searchParams?.get("rfqId");
    if (urlRfqId) {
      router.replace(`/ahp/configure?rfqId=${urlRfqId}`);
      return;
    }

    if (typeof window !== "undefined") {
      const lastRfq = localStorage.getItem("procurapilot_active_rfq_id");
      if (lastRfq) {
        router.replace(`/ahp/configure?rfqId=${lastRfq}`);
        return;
      }
    }

    router.replace("/ahp/configure?rfqId=101");
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex items-center gap-2 text-slate-500 font-sans text-xs">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>Loading AHP Sourcing Engine...</span>
      </div>
    </div>
  );
}

export default function AHPIndexPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AHPIndexContent />
    </Suspense>
  );
}
