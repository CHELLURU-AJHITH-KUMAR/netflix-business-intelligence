import React, { Suspense } from "react";
import PredictiveAnalyticsClient from "@/components/PredictiveAnalyticsClient";

export default function PredictiveAnalyticsPage() {
  return (
    <Suspense fallback={<div className="text-xs text-gray-500 font-mono py-12 text-center">Loading Predictive Dashboard...</div>}>
      <PredictiveAnalyticsClient />
    </Suspense>
  );
}
