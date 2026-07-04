import React, { Suspense } from "react";
import PeopleGeographyClient from "@/components/PeopleGeographyClient";

export const dynamic = "force-dynamic";

async function fetchPeopleGeography() {
  const backendUrl = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";
  try {
    const res = await fetch(`${backendUrl}/api/analytics/people`, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch (error) {
    console.error("[SSR People] Failed to fetch people geography from backend:", error);
  }
  return null;
}

export default async function PeopleGeographyPage() {
  const data = await fetchPeopleGeography();

  return (
    <Suspense fallback={<div className="text-xs text-gray-500 font-mono">Loading geography...</div>}>
      <PeopleGeographyClient data={data} />
    </Suspense>
  );
}
