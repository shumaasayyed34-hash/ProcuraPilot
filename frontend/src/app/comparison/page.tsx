"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ComparisonRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlRfqId = searchParams?.get("rfqId");
    if (urlRfqId) {
      router.replace(`/comparison/${urlRfqId}`);
      return;
    }

    if (typeof window !== "undefined") {
      const lastRfq = localStorage.getItem("procurapilot_active_rfq_id");
      if (lastRfq) {
        router.replace(`/comparison/${lastRfq}`);
        return;
      }
    }

    router.replace("/comparison/101");
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex items-center gap-2 text-slate-500 font-sans text-xs">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>Loading Dynamic Supplier Comparison Matrix...</span>
      </div>
    </div>
  );
}

export default function ComparisonRootPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ComparisonRedirectContent />
    </Suspense>
  );
}
