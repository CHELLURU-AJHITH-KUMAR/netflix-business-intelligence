import React, { Suspense } from "react";
import InteractiveAnalyticsClient from "@/components/InteractiveAnalyticsClient";

export default function InteractiveAnalyticsPage() {
  return (
    <Suspense fallback={<div className="text-xs text-gray-500 font-mono">Loading explorer...</div>}>
      <InteractiveAnalyticsClient />
    </Suspense>
  );
}
