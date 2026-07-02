import fs from 'fs';
import path from 'path';

export interface OmdData {
  imdbRating?: string;
  imdbVotes?: string;
  Metascore?: string;
  Awards?: string;
  Rated?: string;
  DVD?: string;
  BoxOffice?: string;
  Production?: string;
  Website?: string;
  RottenTomatoesRating?: string;
  MetacriticRating?: string;
  Language?: string;
  Country?: string;
  Genre?: string;
  Runtime?: string;
  imdbID?: string;
  Title?: string;
  Year?: string;
}

const CACHE_PATH = path.join(process.cwd(), 'omdb_cache.json');
const LOG_PATH = path.join(process.cwd(), 'omdb_unmatched.log');

// Local in-memory cache synchronized with the disk cache file
let cacheLoaded = false;
let omdbCache: Record<string, OmdData & { _source?: 'api' | 'simulated' }> = {};

function ensureCacheLoaded() {
  if (cacheLoaded) return;
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const data = fs.readFileSync(CACHE_PATH, 'utf8');
      omdbCache = JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load OMDb cache from disk:', error);
  } finally {
    cacheLoaded = true;
  }
}

function saveCacheToDisk() {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(omdbCache, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save OMDb cache to disk:', error);
  }
}

export function logUnmatched(title: string, year: number, type: string, errorMsg: string) {
  try {
    const logLine = `[${new Date().toISOString()}] Unmatched: "${title}" (${year}) [${type}] - Reason: ${errorMsg}\n`;
    fs.appendFileSync(LOG_PATH, logLine, 'utf8');
  } catch (err) {
    console.error('Failed to write to unmatched log:', err);
  }
}

// Fetch with retry logic (exponential backoff)
async function fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      if (response.status >= 500 && i < retries - 1) {
        // Retry only on 5xx server errors
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
        continue;
      }
      return response;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error(`Failed to fetch after ${retries} retries.`);
}

export function generateCacheKey(title: string, year: number, type: string): string {
  const normType = type.toLowerCase().includes('tv') || type.toLowerCase().includes('series') ? 'series' : 'movie';
  return `${title.toLowerCase().trim()}_${year}_${normType}`;
}

export async function fetchOmdbData(
  title: string,
  year: number,
  type: string,
  imdbId?: string | null
): Promise<OmdData | null> {
  ensureCacheLoaded();

  const cacheKey = generateCacheKey(title, year, type);

  // Check cache by IMDb ID if available
  if (imdbId && omdbCache[imdbId]) {
    return omdbCache[imdbId];
  }

  // Check cache by generated key
  if (omdbCache[cacheKey]) {
    return omdbCache[cacheKey];
  }

  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) {
    console.warn('OMDB_API_KEY is not defined in the environment variables.');
    return null;
  }

  const normType = type.toLowerCase().includes('tv') || type.toLowerCase().includes('series') ? 'series' : 'movie';

  // Build OMDb query URL
  let url = '';
  if (imdbId && /^tt\d+$/.test(imdbId.trim())) {
    url = `https://www.omdbapi.com/?apikey=${apiKey}&i=${encodeURIComponent(imdbId.trim())}`;
  } else {
    url = `https://www.omdbapi.com/?apikey=${apiKey}&t=${encodeURIComponent(title.trim())}&y=${year}&type=${normType}`;
  }

  try {
    const response = await fetchWithRetry(url);
    const data = await response.json();

    if (data.Response === 'True') {
      // Extract Rotten Tomatoes and Metacritic values from Ratings array
      let rottenTomatoesRating = '';
      let metacriticRating = '';
      if (Array.isArray(data.Ratings)) {
        const rt = data.Ratings.find((r: any) => r.Source === 'Rotten Tomatoes');
        if (rt) rottenTomatoesRating = rt.Value;
        const mc = data.Ratings.find((r: any) => r.Source === 'Metacritic');
        if (mc) metacriticRating = mc.Value;
      }

      const enriched: OmdData & { _source: 'api' } = {
        imdbRating: data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : undefined,
        imdbVotes: data.imdbVotes && data.imdbVotes !== 'N/A' ? data.imdbVotes : undefined,
        Metascore: data.Metascore && data.Metascore !== 'N/A' ? data.Metascore : undefined,
        Awards: data.Awards && data.Awards !== 'N/A' ? data.Awards : undefined,
        Rated: data.Rated && data.Rated !== 'N/A' ? data.Rated : undefined,
        DVD: data.DVD && data.DVD !== 'N/A' ? data.DVD : undefined,
        BoxOffice: data.BoxOffice && data.BoxOffice !== 'N/A' ? data.BoxOffice : undefined,
        Production: data.Production && data.Production !== 'N/A' ? data.Production : undefined,
        Website: data.Website && data.Website !== 'N/A' ? data.Website : undefined,
        RottenTomatoesRating: rottenTomatoesRating || undefined,
        MetacriticRating: metacriticRating || undefined,
        Language: data.Language && data.Language !== 'N/A' ? data.Language : undefined,
        Country: data.Country && data.Country !== 'N/A' ? data.Country : undefined,
        Genre: data.Genre && data.Genre !== 'N/A' ? data.Genre : undefined,
        Runtime: data.Runtime && data.Runtime !== 'N/A' ? data.Runtime : undefined,
        imdbID: data.imdbID && data.imdbID !== 'N/A' ? data.imdbID : undefined,
        Title: data.Title || title,
        Year: data.Year || String(year),
        _source: 'api'
      };

      // Cache using both IMDb ID and normalized key if possible
      omdbCache[cacheKey] = enriched;
      if (enriched.imdbID) {
        omdbCache[enriched.imdbID] = enriched;
      }

      saveCacheToDisk();
      return enriched;
    } else {
      const errorMsg = data.Error || 'Not Found';
      logUnmatched(title, year, type, errorMsg);
      return null;
    }
  } catch (error: any) {
    console.error(`OMDb fetch error for ${title} (${year}):`, error);
    logUnmatched(title, year, type, error.message || 'Fetch Exception');
    return null;
  }
}
