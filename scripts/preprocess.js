const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

function formatDate(dateStr) {
  if (!dateStr || !dateStr.trim()) return '';
  const trimmed = dateStr.trim();
  
  // If it's already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) {
    return '';
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function runPreprocessing() {
  console.log('[Pipeline] Starting database merge and preprocessing pipeline...');

  const moviesPath = path.join(process.cwd(), 'netflix_movies_detailed_up_to_2025.csv');
  const tvPath = path.join(process.cwd(), 'netflix_tv_shows_detailed_up_to_2025.csv');
  const titlesPath = path.join(process.cwd(), 'netflix_titles.csv');
  const outputPath = path.join(process.cwd(), 'netflix_master_1990_2025.csv');

  if (!fs.existsSync(moviesPath) || !fs.existsSync(tvPath) || !fs.existsSync(titlesPath)) {
    console.error('[Error] One or more source CSV datasets are missing in the workspace.');
    process.exit(1);
  }

  // Load and parse
  console.log('[Pipeline] Reading source CSV files...');
  const moviesContent = fs.readFileSync(moviesPath, 'utf8');
  const tvContent = fs.readFileSync(tvPath, 'utf8');
  const titlesContent = fs.readFileSync(titlesPath, 'utf8');

  console.log('[Pipeline] Parsing CSV rows...');
  const moviesParsed = Papa.parse(moviesContent, { header: true, skipEmptyLines: true });
  const tvParsed = Papa.parse(tvContent, { header: true, skipEmptyLines: true });
  const titlesParsed = Papa.parse(titlesContent, { header: true, skipEmptyLines: true });

  const rawMovies = moviesParsed.data;
  const rawTv = tvParsed.data;
  const rawTitles = titlesParsed.data;

  console.log(`[Pipeline] Source records loaded:`);
  console.log(`  - 2025 Movies: ${rawMovies.length}`);
  console.log(`  - 2025 TV Shows: ${rawTv.length}`);
  console.log(`  - Original Titles: ${rawTitles.length}`);

  const mergedRecords = [];
  const duplicateCheckSet = new Set();
  let duplicatesRemoved = 0;

  // Process 2025 Movies
  rawMovies.forEach(row => {
    if (!row.title || !row.title.trim()) return;
    
    const key = `${row.title.toLowerCase().trim()}_movie`;
    duplicateCheckSet.add(key);

    mergedRecords.push({
      show_id: row.show_id || '',
      type: 'Movie',
      title: row.title.trim(),
      director: row.director || '',
      cast: row.cast || '',
      country: row.country || '',
      date_added: formatDate(row.date_added),
      release_year: parseInt(row.release_year, 10) || 0,
      rating: row.rating || 'Unrated',
      duration: row.duration || '',
      genres: row.genres || '',
      language: row.language || 'en',
      description: row.description || '',
      
      // TMDb/IMDb integrations and placeholder columns
      tmdb_id: '',
      imdb_id: '',
      poster_path: '',
      backdrop_path: '',
      vote_average: parseFloat(row.vote_average) || 0,
      vote_count: parseInt(row.vote_count, 10) || 0,
      popularity: parseFloat(row.popularity) || 0,
      runtime: '',
      production_company: '',
      awards: '',
      revenue: parseFloat(row.revenue) || 0,
      budget: parseFloat(row.budget) || 0,
      collection: ''
    });
  });

  // Process 2025 TV Shows
  rawTv.forEach(row => {
    if (!row.title || !row.title.trim()) return;
    
    const key = `${row.title.toLowerCase().trim()}_tv show`;
    duplicateCheckSet.add(key);

    mergedRecords.push({
      show_id: row.show_id || '',
      type: 'TV Show',
      title: row.title.trim(),
      director: row.director || '',
      cast: row.cast || '',
      country: row.country || '',
      date_added: formatDate(row.date_added),
      release_year: parseInt(row.release_year, 10) || 0,
      rating: row.rating || 'Unrated',
      duration: row.duration || '',
      genres: row.genres || '',
      language: row.language || 'en',
      description: row.description || '',
      
      // TMDb/IMDb integrations and placeholder columns
      tmdb_id: '',
      imdb_id: '',
      poster_path: '',
      backdrop_path: '',
      vote_average: parseFloat(row.vote_average) || 0,
      vote_count: parseInt(row.vote_count, 10) || 0,
      popularity: parseFloat(row.popularity) || 0,
      runtime: '',
      production_company: '',
      awards: '',
      revenue: 0,
      budget: 0,
      collection: ''
    });
  });

  // Process Original Titles (De-duplicate against 2025 sets)
  rawTitles.forEach(row => {
    if (!row.title || !row.title.trim()) return;
    
    const normType = (row.type || '').toLowerCase().trim();
    const key = `${row.title.toLowerCase().trim()}_${normType}`;

    if (duplicateCheckSet.has(key)) {
      duplicatesRemoved++;
      return;
    }

    duplicateCheckSet.add(key);

    mergedRecords.push({
      show_id: row.show_id || '',
      type: row.type || '',
      title: row.title.trim(),
      director: row.director || '',
      cast: row.cast || '',
      country: row.country || '',
      date_added: formatDate(row.date_added),
      release_year: parseInt(row.release_year, 10) || 0,
      rating: row.rating || 'Unrated',
      duration: row.duration || '',
      genres: row.listed_in || '',
      language: 'en', // default fallback
      description: row.description || '',
      
      // TMDb/IMDb integrations and placeholder columns
      tmdb_id: '',
      imdb_id: '',
      poster_path: '',
      backdrop_path: '',
      vote_average: 0,
      vote_count: 0,
      popularity: 0,
      runtime: '',
      production_company: '',
      awards: '',
      revenue: 0,
      budget: 0,
      collection: ''
    });
  });

  // Filter out anomalies (e.g. keep years up to 2025)
  const finalRecords = mergedRecords.filter(r => r.release_year <= 2025);

  // Statistics
  const totalMovies = finalRecords.filter(r => r.type === 'Movie').length;
  const totalTVShows = finalRecords.filter(r => r.type === 'TV Show').length;
  
  let earliestReleaseYear = 9999;
  let latestReleaseYear = 0;
  
  finalRecords.forEach(r => {
    if (r.release_year > 0) {
      if (r.release_year < earliestReleaseYear) earliestReleaseYear = r.release_year;
      if (r.release_year > latestReleaseYear) latestReleaseYear = r.release_year;
    }
  });

  console.log('[Pipeline] Writing master dataset output file...');
  const csvString = Papa.unparse(finalRecords);
  fs.writeFileSync(outputPath, csvString, 'utf8');

  console.log('\n=========================================');
  console.log('MIGRATION PIPELINE SUCCESSFUL');
  console.log('=========================================');
  console.log(`Total Movies:           ${totalMovies.toLocaleString()}`);
  console.log(`Total TV Shows:         ${totalTVShows.toLocaleString()}`);
  console.log(`Earliest Release Year:  ${earliestReleaseYear}`);
  console.log(`Latest Release Year:    ${latestReleaseYear}`);
  console.log(`Total Records:          ${finalRecords.length.toLocaleString()}`);
  console.log(`Duplicate Records Removed: ${duplicatesRemoved.toLocaleString()}`);
  console.log('=========================================\n');
}

runPreprocessing();
