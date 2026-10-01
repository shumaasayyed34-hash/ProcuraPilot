"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DynamicRFQRankingPage() {
  const params = useParams();
  const router = useRouter();
  const rfqId = params?.id || 101;

  useEffect(() => {
    router.replace(`/ahp/results?rfqId=${rfqId}`);
  }, [router, rfqId]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex items-center gap-2 text-slate-500 font-sans text-xs">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>Loading RFQ #{rfqId} AHP Ranking Dashboard...</span>
      </div>
    </div>
  );
}
