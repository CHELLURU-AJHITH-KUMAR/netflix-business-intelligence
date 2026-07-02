import React, { Suspense } from "react";
import { getContentInsights } from "@/lib/data";
import ContentInsightsClient from "@/components/ContentInsightsClient";

export default function ContentInsightsPage() {
  const insights = getContentInsights();

  return (
    <Suspense fallback={<div className="text-xs text-gray-500 font-mono">Loading insights...</div>}>
      <ContentInsightsClient data={insights} />
    </Suspense>
  );
}
