import { NextRequest, NextResponse } from "next/server";
import { getTitleDetails, getNetflixData } from "@/lib/data";
import fs from "fs";
import path from "path";

const CACHE_PATH = path.join(process.cwd(), "tmdb_cache.json");

// Local in-memory cache synchronized with the disk cache file
let cacheLoaded = false;
let tmdbCache: Record<string, any> = {};

function ensureCacheLoaded() {
  if (cacheLoaded) return;
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const data = fs.readFileSync(CACHE_PATH, "utf8");
      tmdbCache = JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load TMDb cache from disk:", error);
  } finally {
    cacheLoaded = true;
  }
}

function saveCacheToDisk() {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(tmdbCache, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to save TMDb cache to disk:", error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: showId } = await params;
    const apiKey = process.env.TMDB_API_KEY;

    if (!apiKey) {
      console.warn("TMDB_API_KEY is not defined in environment variables.");
      return NextResponse.json({ error: "API Key Missing" }, { status: 500 });
    }

    ensureCacheLoaded();

    // Check disk cache first
    if (tmdbCache[showId]) {
      return NextResponse.json(tmdbCache[showId]);
    }

    // Get catalog title details
    const catalogItem = getTitleDetails(showId);
    if (!catalogItem) {
      return NextResponse.json({ error: "Title not found in catalog" }, { status: 404 });
    }

    const { title, type, release_year } = catalogItem;
    const cleanTitle = title.trim();

    // Determine TMDb search type
    const isMovie = type === "Movie";
    const searchEndpoint = isMovie ? "movie" : "tv";

    // 1. Search TMDb with release year filter
    let searchUrl = `https://api.themoviedb.org/3/search/${searchEndpoint}?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`;
    if (isMovie) {
      searchUrl += `&year=${release_year}`;
    } else {
      searchUrl += `&first_air_date_year=${release_year}`;
    }

    let searchResponse = await fetch(searchUrl);
    let searchData = await searchResponse.json();

    // Fallback: If no results found with year, search without year filter
    if (!searchData.results || searchData.results.length === 0) {
      const fallbackUrl = `https://api.themoviedb.org/3/search/${searchEndpoint}?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`;
      searchResponse = await fetch(fallbackUrl);
      searchData = await searchResponse.json();
    }

    // If still no results, return empty TMDb enrichment payload
    if (!searchData.results || searchData.results.length === 0) {
      const fallbackData = {
        matched: false,
        title: cleanTitle,
        poster_url: null,
        backdrop_url: null,
        vote_average: 0,
        vote_count: 0,
        tagline: "",
        overview: catalogItem.description,
        genres: catalogItem.genresList,
        imdb_id: null,
        cast: [],
        crew: [],
        similar: [],
      };
      tmdbCache.set(showId, fallbackData);
      return NextResponse.json(fallbackData);
    }

    // Take the best matching result
    const bestMatch = searchData.results[0];
    const tmdbId = bestMatch.id;

    // 2. Fetch full details, credits, and similar content in one go
    const detailsUrl = `https://api.themoviedb.org/3/${searchEndpoint}/${tmdbId}?api_key=${apiKey}&append_to_response=credits,similar`;
    const detailsResponse = await fetch(detailsUrl);
    const details = await detailsResponse.json();

    // 3. Process Cast and Crew
    const cast = (details.credits?.cast || [])
      .slice(0, 8)
      .map((c: any) => ({
        name: c.name,
        character: c.character,
        profile_url: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
      }));

    const crew = (details.credits?.crew || [])
      .filter((c: any) => c.job === "Director" || c.job === "Screenplay" || c.job === "Writer")
      .slice(0, 4)
      .map((c: any) => ({
        name: c.name,
        job: c.job,
      }));

    // 4. Process similar titles and cross-reference with our CSV catalog
    const csvData = getNetflixData();
    const similar = (details.similar?.results || [])
      .slice(0, 6)
      .map((s: any) => {
        const simTitle = s.title || s.name || "";
        const simReleaseDate = s.release_date || s.first_air_date || "";
        const simYear = simReleaseDate ? new Date(simReleaseDate).getFullYear() : 0;

        // Try to match with local CSV catalog title
        const matchedCatalogItem = csvData.find((item) => {
          const isSameTitle = item.title.toLowerCase() === simTitle.toLowerCase();
          const isSimilarTitle = item.title.toLowerCase().includes(simTitle.toLowerCase()) || 
                                 simTitle.toLowerCase().includes(item.title.toLowerCase());
          const isCloseYear = Math.abs(item.release_year - simYear) <= 1;
          
          return isSameTitle || (isSimilarTitle && isCloseYear);
        });

        return {
          tmdb_id: s.id,
          show_id: matchedCatalogItem ? matchedCatalogItem.show_id : null, // Used for frontend redirection
          title: simTitle,
          poster_url: s.poster_path ? `https://image.tmdb.org/t/p/w342${s.poster_path}` : null,
          release_year: simYear,
          vote_average: Math.round(s.vote_average * 10) / 10,
        };
      });

    // 5. Final enriched payload
    const enrichedData = {
      matched: true,
      tmdb_id: tmdbId,
      title: details.title || details.name || cleanTitle,
      poster_url: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
      backdrop_url: details.backdrop_path ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}` : null,
      vote_average: Math.round(details.vote_average * 10) / 10,
      vote_count: details.vote_count || 0,
      tagline: details.tagline || "",
      overview: details.overview || catalogItem.description,
      genres: details.genres ? details.genres.map((g: any) => g.name) : catalogItem.genresList,
      imdb_id: details.imdb_id || null,
      cast,
      crew,
      similar,
    };

    // Cache the response
    tmdbCache[showId] = enrichedData;
    saveCacheToDisk();

    return NextResponse.json(enrichedData);
  } catch (error) {
    console.error("Failed to fetch TMDb details:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
