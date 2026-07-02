import React, { Suspense } from "react";
import { getPeopleGeography } from "@/lib/data";
import PeopleGeographyClient from "@/components/PeopleGeographyClient";

export default function PeopleGeographyPage() {
  const data = getPeopleGeography();

  return (
    <Suspense fallback={<div className="text-xs text-gray-500 font-mono">Loading geography...</div>}>
      <PeopleGeographyClient data={data} />
    </Suspense>
  );
}
