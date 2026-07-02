import React from "react";
import fs from "fs";
import path from "path";
import { getNetflixData, getKpis, NetflixTitle } from "@/lib/data";
import HomePageClient from "@/components/HomePageClient";

export default function HomePage() {
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

  const kpis = getKpis();

  // Helper to safely select top records
  const getTop = (
    list: NetflixTitle[],
    filterFn: (x: NetflixTitle) => boolean,
    sortFn: (a: NetflixTitle, b: NetflixTitle) => number,
    count = 20
  ) => {
    return [...list].filter(filterFn).sort(sortFn).slice(0, count);
  };

  // 1. Trending Now (popularity desc)
  const trending = getTop(data, () => true, (a, b) => (b.popularity || 0) - (a.popularity || 0), 20);

  // 2. Top Rated (IMDb)
  const topRatedImdb = getTop(data, (d) => (d.imdb_rating || 0) > 0, (a, b) => (b.imdb_rating || 0) - (a.imdb_rating || 0), 20);

  // 3. Top Rated (TMDb)
  const topRatedTmdb = getTop(data, (d) => (d.vote_average || 0) > 0, (a, b) => (b.vote_average || 0) - (a.vote_average || 0), 20);

  // 4. Recently Added
  const recentlyAdded = getTop(data, (d) => d.parsedDateAdded !== null, (a, b) => {
    const aTime = a.parsedDateAdded ? new Date(a.parsedDateAdded).getTime() : 0;
    const bTime = b.parsedDateAdded ? new Date(b.parsedDateAdded).getTime() : 0;
    return bTime - aTime;
  }, 20);

  // 5. Top Movies
  const topMovies = getTop(data, (d) => d.type === 'Movie', (a, b) => (b.popularity || 0) - (a.popularity || 0), 20);

  // 6. Top TV Shows
  const topTvShows = getTop(data, (d) => d.type === 'TV Show', (a, b) => (b.popularity || 0) - (a.popularity || 0), 20);

  // 7. Award Winning Titles
  const awardWinning = getTop(data, (d) => d.awardsWins > 0, (a, b) => b.awardsWins - a.awardsWins, 20);

  // Helper to match genres case-insensitively
  const hasGenre = (d: NetflixTitle, genreName: string) => 
    d.genresList.some(g => g.toLowerCase().includes(genreName.toLowerCase()));

  // 8. Family Friendly
  const familyFriendly = getTop(data, (d) => 
    hasGenre(d, 'family') || 
    hasGenre(d, 'children') || 
    ['G', 'PG', 'TV-G', 'TV-Y', 'TV-Y7'].includes(d.rating),
    (a, b) => (b.popularity || 0) - (a.popularity || 0), 20
  );

  // 9. Action Collection
  const action = getTop(data, (d) => hasGenre(d, 'action') || hasGenre(d, 'adventure'), (a, b) => (b.popularity || 0) - (a.popularity || 0), 20);

  // 10. Comedy Collection
  const comedy = getTop(data, (d) => hasGenre(d, 'comedy'), (a, b) => (b.popularity || 0) - (a.popularity || 0), 20);

  // 11. Drama Collection
  const drama = getTop(data, (d) => hasGenre(d, 'drama'), (a, b) => (b.popularity || 0) - (a.popularity || 0), 20);

  // 12. Horror Collection
  const horror = getTop(data, (d) => hasGenre(d, 'horror') || hasGenre(d, 'thriller'), (a, b) => (b.popularity || 0) - (a.popularity || 0), 20);

  // 13. Sci-Fi Collection
  const scifi = getTop(data, (d) => hasGenre(d, 'science fiction') || hasGenre(d, 'sci-fi') || hasGenre(d, 'fantasy'), (a, b) => (b.popularity || 0) - (a.popularity || 0), 20);

  // 14. Animation Collection
  const animation = getTop(data, (d) => hasGenre(d, 'animation') || hasGenre(d, 'anime'), (a, b) => (b.popularity || 0) - (a.popularity || 0), 20);

  const rows = {
    trending,
    topRatedImdb,
    topRatedTmdb,
    recentlyAdded,
    topMovies,
    topTvShows,
    awardWinning,
    familyFriendly,
    action,
    comedy,
    drama,
    horror,
    scifi,
    animation,
  };

  return <HomePageClient kpis={kpis} rows={rows} allTitles={data} />;
}
