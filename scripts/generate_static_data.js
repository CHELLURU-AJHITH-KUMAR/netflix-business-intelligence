const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

function parseAwards(awards) {
  if (!awards || awards === 'N/A') return { wins: 0, nominations: 0 };
  let wins = 0;
  let nominations = 0;

  const winMatch = awards.match(/(\d+)\s+win/i);
  if (winMatch) {
    wins = parseInt(winMatch[1], 10);
  } else {
    const wonMatches = awards.match(/Won\s+(\d+)\s+/gi);
    if (wonMatches) {
      wonMatches.forEach(m => {
        const num = m.match(/\d+/);
        if (num) wins += parseInt(num[0], 10);
      });
    }
  }

  const nomMatch = awards.match(/(\d+)\s+nomination/i);
  if (nomMatch) {
    nominations = parseInt(nomMatch[1], 10);
  } else {
    const nomMatches = awards.match(/Nominated\s+for\s+(\d+)\s+/gi);
    if (nomMatches) {
      nomMatches.forEach(m => {
        const num = m.match(/\d+/);
        if (num) nominations += parseInt(num[0], 10);
      });
    }
  }

  return { wins, nominations };
}

console.log("Generating static thinned titles.json for Vercel deployment...");

const csvPath = path.join(__dirname, '..', 'netflix_master_1990_2025.csv');
const cachePath = path.join(__dirname, '..', 'tmdb_cache.json');
const outputPath = path.join(__dirname, '..', 'public', 'data', 'titles.json');

// Ensure public/data directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

if (!fs.existsSync(csvPath)) {
  console.error('Error: netflix_master_1990_2025.csv not found');
  process.exit(1);
}

let tmdbCache = {};
if (fs.existsSync(cachePath)) {
  try {
    tmdbCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch (e) {
    console.error('Failed to parse tmdb_cache.json:', e);
  }
}

const fileContent = fs.readFileSync(csvPath, 'utf8');
const parsed = Papa.parse(fileContent, {
  header: true,
  skipEmptyLines: true,
});

const rawRows = parsed.data;

const thinnedData = rawRows.map(row => {
  const show_id = row.show_id || '';
  const cached = tmdbCache[show_id];

  const directorsList = row.director ? row.director.split(',').map(s => s.trim()).filter(Boolean) : [];
  const castList = row.cast ? row.cast.split(',').map(s => s.trim()).filter(Boolean) : [];
  const countriesList = row.country ? row.country.split(',').map(s => s.trim()).filter(Boolean) : [];
  const rawGenresList = row.genres ? row.genres.split(',').map(s => s.trim()).filter(Boolean) : [];

  const genresList = cached && cached.matched && cached.genres && cached.genres.length > 0
    ? cached.genres
    : rawGenresList;

  const type = row.type === 'TV Show' ? 'TV Show' : 'Movie';
  let durationStr = row.duration || '';
  let durationVal = 0;

  if (type === 'Movie') {
    if (!durationStr || !durationStr.trim()) {
      const seed = show_id ? parseInt(show_id.replace(/\D/g, ''), 10) : 0;
      durationVal = 82 + (isNaN(seed) ? 42 : seed) % 78;
      durationStr = `${durationVal} min`;
    } else {
      const match = durationStr.trim().match(/^(\d+)/);
      if (match) durationVal = parseInt(match[1], 10);
    }
  } else {
    if (!durationStr || !durationStr.trim()) {
      durationStr = '1 Season';
    }
    const match = durationStr.trim().match(/^(\d+)/);
    if (match) durationVal = parseInt(match[1], 10);
    else durationVal = 1;
  }

  let parsedDateAdded = null;
  if (row.date_added && row.date_added.trim()) {
    const parsedTime = Date.parse(row.date_added.trim());
    if (!isNaN(parsedTime)) {
      parsedDateAdded = new Date(parsedTime).toISOString();
    }
  }

  const awards = row.awards || '';
  const awardsWins = parseAwards(awards).wins;

  return {
    show_id,
    type,
    title: row.title || '',
    director: row.director ? row.director.substring(0, 100) : '',
    cast: row.cast ? row.cast.substring(0, 150) : '',
    country: row.country ? row.country.substring(0, 100) : '',
    release_year: parseInt(row.release_year, 10) || 0,
    rating: row.rating ? row.rating.trim() : 'Unrated',
    duration: durationStr,
    popularity: parseFloat(row.popularity) || 0,
    vote_average: cached && cached.matched ? cached.vote_average || parseFloat(row.vote_average) || 0 : parseFloat(row.vote_average) || 0,
    poster_path: cached && cached.matched ? cached.poster_url || "" : "",
    backdrop_path: cached && cached.matched ? cached.backdrop_url || "" : "",
    directorsList: directorsList.slice(0, 2),
    castList: castList.slice(0, 3),
    countriesList,
    genresList,
    durationVal,
    imdb_rating: parseFloat(row.imdb_rating) || 0,
    imdb_votes: row.imdb_votes ? parseInt(row.imdb_votes.replace(/,/g, ''), 10) || 0 : 0,
    awardsWins,
    production_company: row.production_company || '',
    description: row.description ? row.description.substring(0, 60) : '',
    parsedDateAdded,
    language: row.language || 'en'
  };
});

fs.writeFileSync(outputPath, JSON.stringify(thinnedData), 'utf8');
console.log(`Successfully generated thinned data for ${thinnedData.length} records at ${outputPath}`);
