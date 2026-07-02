import React from "react";
import fs from "fs";
import path from "path";
import { getNetflixData } from "@/lib/data";
import ExecutiveOverviewClient from "@/components/ExecutiveOverviewClient";

export default function ExecutiveOverviewPage() {
  // Load TMDb cache from disk
  let tmdbCache: Record<string, any> = {};
  const cachePath = path.join(process.cwd(), "tmdb_cache.json");
  if (fs.existsSync(cachePath)) {
    try {
      tmdbCache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    } catch (e) {
      console.error("Failed to load tmdb_cache.json:", e);
    }
  }

  // Enrich data elements with TMDb cached posters, backdrops, and ratings
  const rawData = getNetflixData();
  const data = rawData.map((title) => {
    const cached = tmdbCache[title.show_id];
    if (cached && cached.matched) {
      return {
        ...title,
        poster_path: cached.poster_url || "",
        backdrop_path: cached.backdrop_url || "",
        vote_average: cached.vote_average || title.vote_average,
        genresList: cached.genres && cached.genres.length > 0 ? cached.genres : title.genresList,
      };
    }
    return title;
  });

  return <ExecutiveOverviewClient allTitles={data} />;
}
