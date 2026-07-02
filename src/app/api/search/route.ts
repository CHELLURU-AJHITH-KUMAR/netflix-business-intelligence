import { NextRequest, NextResponse } from "next/server";
import { getNetflixData, NetflixTitle } from "@/lib/data";
import fs from "fs";
import path from "path";

let uniqueActors: { name: string; count: number }[] = [];
let uniqueDirectors: { name: string; count: number }[] = [];
let uniqueGenres: { name: string; count: number }[] = [];
let isInit = false;

function initSearchData(titles: NetflixTitle[]) {
  if (isInit) return;
  
  const actorCounts: Record<string, number> = {};
  const directorCounts: Record<string, number> = {};
  const genreCounts: Record<string, number> = {};

  titles.forEach(t => {
    t.castList.forEach(a => { if (a) actorCounts[a] = (actorCounts[a] || 0) + 1; });
    t.directorsList.forEach(d => { if (d) directorCounts[d] = (directorCounts[d] || 0) + 1; });
    t.genresList.forEach(g => { if (g) genreCounts[g] = (genreCounts[g] || 0) + 1; });
  });

  uniqueActors = Object.entries(actorCounts).map(([name, count]) => ({ name, count }));
  uniqueDirectors = Object.entries(directorCounts).map(([name, count]) => ({ name, count }));
  uniqueGenres = Object.entries(genreCounts).map(([name, count]) => ({ name, count }));

  isInit = true;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = (searchParams.get("q") || "").toLowerCase().trim();

    const titles = getNetflixData();
    
    // Load TMDb cache to enrich posters/backdrops
    let tmdbCache: Record<string, any> = {};
    const cachePath = path.join(process.cwd(), "tmdb_cache.json");
    if (fs.existsSync(cachePath)) {
      try {
        tmdbCache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
      } catch (e) {
        console.error("Failed to load tmdb_cache.json in search api:", e);
      }
    }

    const enriched = titles.map(t => {
      const cached = tmdbCache[t.show_id];
      if (cached && cached.matched) {
        return {
          ...t,
          poster_path: cached.poster_url || "",
          backdrop_path: cached.backdrop_url || "",
          vote_average: cached.vote_average || t.vote_average,
          genresList: cached.genres && cached.genres.length > 0 ? cached.genres : t.genresList,
        };
      }
      return t;
    });

    initSearchData(enriched);

    if (!query) {
      return NextResponse.json({
        movies: [],
        tvShows: [],
        actors: [],
        directors: [],
        genres: []
      });
    }

    // Fuzzy matching helper
    const matches = (str: string) => str.toLowerCase().includes(query);

    // Filter Movies & TV Shows
    const matchedTitles = enriched.filter(t => matches(t.title) || matches(t.release_year.toString()));
    const movies = matchedTitles.filter(t => t.type === "Movie").slice(0, 5);
    const tvShows = matchedTitles.filter(t => t.type === "TV Show").slice(0, 5);

    // Filter Actors, Directors, Genres
    const actors = uniqueActors.filter(a => matches(a.name)).slice(0, 5);
    const directors = uniqueDirectors.filter(d => matches(d.name)).slice(0, 5);
    const genres = uniqueGenres.filter(g => matches(g.name)).slice(0, 5);

    return NextResponse.json({
      movies,
      tvShows,
      actors,
      directors,
      genres
    });
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
