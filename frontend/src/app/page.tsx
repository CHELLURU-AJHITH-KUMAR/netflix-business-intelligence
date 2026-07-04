import React from "react";
import HomePageClient from "@/components/HomePageClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const backendUrl = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";
  
  let kpis = {
    totalTitles: 0,
    movieCount: 0,
    tvShowCount: 0,
    countriesCount: 0,
    genresCount: 0,
    avgMovieDuration: 0,
    avgTVShowSeasons: 0,
    avgImdbRating: 0,
    avgTmdbRating: 0,
  };
  
  let rows = {
    trending: [],
    topRatedImdb: [],
    topRatedTmdb: [],
    recentlyAdded: [],
    topMovies: [],
    topTvShows: [],
    awardWinning: [],
    familyFriendly: [],
    action: [],
    comedy: [],
    drama: [],
    horror: [],
    scifi: [],
    animation: [],
  };

  try {
    const res = await fetch(`${backendUrl}/api/analytics/home`, { cache: "no-store" });
    if (res.ok) {
      const result = await res.json();
      kpis = result.kpis || kpis;
      rows = result.rows || rows;
    } else {
      console.error("[SSR Home] API response not ok:", res.status);
    }
  } catch (error) {
    console.error("[SSR Home] Failed to fetch home analytics from backend:", error);
  }

  return <HomePageClient kpis={kpis} rows={rows} />;
}
