const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

// 1. Read API Key from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let TMDB_API_KEY = '';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/TMDB_API_KEY\s*=\s*([^\r\n]+)/);
  if (match) {
    TMDB_API_KEY = match[1].trim();
  }
}

if (!TMDB_API_KEY) {
  console.error('Error: TMDB_API_KEY not found in .env.local');
  process.exit(1);
}

const csvPath = path.join(__dirname, '..', 'netflix_master_1990_2025.csv');
const cachePath = path.join(__dirname, '..', 'tmdb_cache.json');

// 2. Load TMDb cache
let tmdbCache = {};
if (fs.existsSync(cachePath)) {
  try {
    tmdbCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    console.log(`Loaded ${Object.keys(tmdbCache).length} existing cached titles.`);
  } catch (e) {
    console.error('Failed to parse cache:', e);
  }
}

// 3. Load master CSV
if (!fs.existsSync(csvPath)) {
  console.error('Error: netflix_master_1990_2025.csv not found');
  process.exit(1);
}

const csvContent = fs.readFileSync(csvPath, 'utf8');
const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
const data = parsed.data;

console.log(`Loaded ${data.length} titles from CSV.`);

// 4. Mimic homepage rows selection logic to select the titles displayed on screen
const getTop = (list, filterFn, sortFn, count = 20) => {
  return [...list].filter(filterFn).sort(sortFn).slice(0, count);
};

const hasGenre = (d, genreName) => {
  const genres = d.genres ? d.genres.split(',').map(g => g.trim().toLowerCase()) : [];
  return genres.some(g => g.includes(genreName.toLowerCase()));
};

// Parse values
const preprocessed = data.map(item => ({
  ...item,
  release_year: parseInt(item.release_year, 10) || 0,
  popularity: parseFloat(item.popularity) || 0,
  vote_average: parseFloat(item.vote_average) || 0,
  awardsWins: parseInt(item.awardsWins, 10) || 0,
  parsedDateAdded: item.date_added ? new Date(item.date_added) : null
}));

// Filter categories
const trending = getTop(preprocessed, () => true, (a, b) => b.popularity - a.popularity, 20);
const topRatedImdb = getTop(preprocessed, (d) => (parseFloat(d.imdb_rating) || 0) > 0, (a, b) => (parseFloat(b.imdb_rating) || 0) - (parseFloat(a.imdb_rating) || 0), 20);
const topRatedTmdb = getTop(preprocessed, (d) => d.vote_average > 0, (a, b) => b.vote_average - a.vote_average, 20);
const recentlyAdded = getTop(preprocessed, (d) => d.parsedDateAdded !== null, (a, b) => b.parsedDateAdded.getTime() - a.parsedDateAdded.getTime(), 20);
const topMovies = getTop(preprocessed, (d) => d.type === 'Movie', (a, b) => b.popularity - a.popularity, 20);
const topTvShows = getTop(preprocessed, (d) => d.type === 'TV Show', (a, b) => b.popularity - a.popularity, 20);
const awardWinning = getTop(preprocessed, (d) => d.awardsWins > 0, (a, b) => b.awardsWins - a.awardsWins, 20);
const familyFriendly = getTop(preprocessed, (d) => 
  hasGenre(d, 'family') || 
  hasGenre(d, 'children') || 
  ['G', 'PG', 'TV-G', 'TV-Y', 'TV-Y7'].includes(d.rating),
  (a, b) => b.popularity - a.popularity, 20
);
const action = getTop(preprocessed, (d) => hasGenre(d, 'action') || hasGenre(d, 'adventure'), (a, b) => b.popularity - a.popularity, 20);
const comedy = getTop(preprocessed, (d) => hasGenre(d, 'comedy'), (a, b) => b.popularity - a.popularity, 20);
const drama = getTop(preprocessed, (d) => hasGenre(d, 'drama'), (a, b) => b.popularity - a.popularity, 20);
const horror = getTop(preprocessed, (d) => hasGenre(d, 'horror') || hasGenre(d, 'thriller'), (a, b) => b.popularity - a.popularity, 20);
const scifi = getTop(preprocessed, (d) => hasGenre(d, 'science fiction') || hasGenre(d, 'sci-fi') || hasGenre(d, 'fantasy'), (a, b) => b.popularity - a.popularity, 20);
const animation = getTop(preprocessed, (d) => hasGenre(d, 'animation') || hasGenre(d, 'anime'), (a, b) => b.popularity - a.popularity, 20);

// Combine lists to get unique show_ids on homepage
const allHomepageRows = [
  ...trending, ...topRatedImdb, ...topRatedTmdb, ...recentlyAdded,
  ...topMovies, ...topTvShows, ...awardWinning, ...familyFriendly,
  ...action, ...comedy, ...drama, ...horror, ...scifi, ...animation
];

const uniqueShowIds = Array.from(new Set(allHomepageRows.map(item => item.show_id)));
console.log(`Identified ${uniqueShowIds.length} unique titles appearing on the homepage categories.`);

const pendingShowIds = uniqueShowIds.filter(id => !tmdbCache[id]);
console.log(`Found ${pendingShowIds.length} titles that need TMDb preloading.`);

if (pendingShowIds.length === 0) {
  console.log('All titles are already cached! Home page will load 100% instantly.');
  process.exit(0);
}

// Fetch details
async function fetchWithRetry(url, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      if (response.status === 429 || response.status >= 500) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        continue;
      }
      return response;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error(`Failed to fetch after ${retries} retries.`);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function preloadAll() {
  let count = 0;
  for (const showId of pendingShowIds) {
    const catalogItem = preprocessed.find(item => item.show_id === showId);
    if (!catalogItem) continue;

    const { title, type, release_year, description } = catalogItem;
    const cleanTitle = title.trim();
    const isMovie = type === 'Movie';
    const searchEndpoint = isMovie ? 'movie' : 'tv';

    console.log(`[${++count}/${pendingShowIds.length}] Preloading "${cleanTitle}" (${release_year}) [${type}]...`);

    try {
      // Step A: Search TMDb with release year filter
      let searchUrl = `https://api.themoviedb.org/3/search/${searchEndpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}`;
      if (isMovie) {
        searchUrl += `&year=${release_year}`;
      } else {
        searchUrl += `&first_air_date_year=${release_year}`;
      }

      let searchResponse = await fetchWithRetry(searchUrl);
      let searchData = await searchResponse.json();

      // Fallback: search without year filter if no results
      if (!searchData.results || searchData.results.length === 0) {
        const fallbackUrl = `https://api.themoviedb.org/3/search/${searchEndpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}`;
        searchResponse = await fetchWithRetry(fallbackUrl);
        searchData = await searchResponse.json();
      }

      // No results
      if (!searchData.results || searchData.results.length === 0) {
        tmdbCache[showId] = {
          matched: false,
          title: cleanTitle,
          poster_url: null,
          backdrop_url: null,
          vote_average: 0,
          vote_count: 0,
          tagline: "",
          overview: description,
          genres: catalogItem.genres ? catalogItem.genres.split(',').map(g => g.trim()) : [],
          imdb_id: null,
          cast: [],
          crew: [],
          similar: [],
        };
        console.log(`  -> Unmatched TMDb.`);
        continue;
      }

      const bestMatch = searchData.results[0];
      const tmdbId = bestMatch.id;

      // Step B: Fetch full details, credits, and similar content
      const detailsUrl = `https://api.themoviedb.org/3/${searchEndpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,similar`;
      const detailsResponse = await fetchWithRetry(detailsUrl);
      const details = await detailsResponse.json();

      // Process Cast and Crew
      const cast = (details.credits?.cast || [])
        .slice(0, 8)
        .map((c) => ({
          name: c.name,
          character: c.character,
          profile_url: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
        }));

      const crew = (details.credits?.crew || [])
        .filter((c) => c.job === 'Director' || c.job === 'Screenplay' || c.job === 'Writer')
        .slice(0, 4)
        .map((c) => ({
          name: c.name,
          job: c.job,
        }));

      // Process similar
      const similar = (details.similar?.results || [])
        .slice(0, 6)
        .map((s) => {
          const simTitle = s.title || s.name || "";
          const simReleaseDate = s.release_date || s.first_air_date || "";
          const simYear = simReleaseDate ? new Date(simReleaseDate).getFullYear() : 0;
          return {
            tmdb_id: s.id,
            title: simTitle,
            poster_url: s.poster_path ? `https://image.tmdb.org/t/p/w342${s.poster_path}` : null,
            release_year: simYear,
            vote_average: Math.round(s.vote_average * 10) / 10,
          };
        });

      // Save to cache
      tmdbCache[showId] = {
        matched: true,
        tmdb_id: tmdbId,
        title: details.title || details.name || cleanTitle,
        poster_url: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
        backdrop_url: details.backdrop_path ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}` : null,
        vote_average: Math.round(details.vote_average * 10) / 10,
        vote_count: details.vote_count || 0,
        tagline: details.tagline || "",
        overview: details.overview || description,
        genres: details.genres ? details.genres.map((g) => g.name) : (catalogItem.genres ? catalogItem.genres.split(',').map(g => g.trim()) : []),
        imdb_id: details.imdb_id || null,
        cast,
        crew,
        similar,
      };

      console.log(`  -> Cached: ${details.title || details.name}`);
      await sleep(100);
    } catch (e) {
      console.error(`  -> Failed for "${cleanTitle}":`, e.message);
      await sleep(500);
    }

    if (count % 10 === 0) {
      fs.writeFileSync(cachePath, JSON.stringify(tmdbCache, null, 2), 'utf8');
    }
  }

  fs.writeFileSync(cachePath, JSON.stringify(tmdbCache, null, 2), 'utf8');
  console.log(`Done! Total cached titles: ${Object.keys(tmdbCache).length}`);
}

preloadAll();
