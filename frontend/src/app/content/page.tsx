import React, { Suspense } from "react";
import ContentInsightsClient from "@/components/ContentInsightsClient";

export const dynamic = "force-dynamic";

async function fetchContentInsights() {
  const backendUrl = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";
  try {
    const res = await fetch(`${backendUrl}/api/analytics/content`, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    console.error("[SSR Content] Failed to fetch content insights from backend:", error);
  }
  return null;
}

export default async function ContentInsightsPage() {
  const insights = await fetchContentInsights();

  return (
    <Suspense fallback={<div className="text-xs text-gray-500 font-mono">Loading insights...</div>}>
      <ContentInsightsClient data={insights} />
    </Suspense>
  );
}
