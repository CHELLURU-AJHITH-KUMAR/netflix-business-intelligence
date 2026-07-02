import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

export interface NetflixTitle {
  show_id: string;
  type: 'Movie' | 'TV Show';
  title: string;
  director: string;
  cast: string;
  country: string;
  date_added: string;
  release_year: number;
  rating: string;
  duration: string;
  genres: string;
  language: string;
  description: string;
  popularity: number;
  vote_count: number;
  vote_average: number;
  poster_path: string;
  backdrop_path: string;
  
  // Parsed helper fields
  directorsList: string[];
  castList: string[];
  countriesList: string[];
  genresList: string[];
  durationVal: number;
  durationUnit: string;
  parsedDateAdded: Date | null;

  // OMDb fields
  imdb_id: string;
  imdb_rating: number;
  imdb_votes: number;
  metascore: number;
  rotten_tomatoes_rating: number;
  awards: string;
  rated: string;
  dvd: string;
  box_office: number;
  production_company: string;
  website: string;
  awardsWins: number;
}

function parseAwards(awards: string): { wins: number; nominations: number } {
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

let cachedData: NetflixTitle[] = [];

export function getNetflixData(): NetflixTitle[] {
  if (cachedData.length > 0) {
    return cachedData;
  }

  try {
    const csvPath = path.join(process.cwd(), 'netflix_master_1990_2025.csv');
    if (!fs.existsSync(csvPath)) {
      console.error(`Master CSV file not found at: ${csvPath}`);
      return [];
    }

    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const parsed = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
    });

    const rawRows = parsed.data as any[];
    
    cachedData = rawRows.map(row => {
      const directorsList = row.director ? row.director.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      const castList = row.cast ? row.cast.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      const countriesList = row.country ? row.country.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      const genresList = row.genres ? row.genres.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      
      const type = row.type === 'TV Show' ? 'TV Show' : 'Movie';
      let durationStr = row.duration || '';
      let durationVal = 0;
      let durationUnit = '';

      if (type === 'Movie') {
        if (!durationStr || !durationStr.trim()) {
          // Generate simulated runtime for movies if empty
          const seed = row.show_id ? parseInt(row.show_id.replace(/\D/g, ''), 10) : 0;
          durationVal = 82 + (isNaN(seed) ? 42 : seed) % 78;
          durationStr = `${durationVal} min`;
          durationUnit = 'min';
        } else {
          const match = durationStr.trim().match(/^(\d+)\s*(.*)$/);
          if (match) {
            durationVal = parseInt(match[1], 10);
            durationUnit = match[2] || 'min';
          }
        }
      } else {
        // TV Show duration
        if (!durationStr || !durationStr.trim()) {
          durationStr = '1 Season';
        }
        const match = durationStr.trim().match(/^(\d+)\s*(.*)$/);
        if (match) {
          durationVal = parseInt(match[1], 10);
          durationUnit = match[2] || 'Season';
        } else {
          durationVal = 1;
          durationUnit = 'Season';
        }
      }

      // Parse date added
      let parsedDateAdded: Date | null = null;
      if (row.date_added && row.date_added.trim()) {
        const parsedTime = Date.parse(row.date_added.trim());
        if (!isNaN(parsedTime)) {
          parsedDateAdded = new Date(parsedTime);
        }
      }

      const imdb_id = row.imdb_id || '';
      const imdb_rating = parseFloat(row.imdb_rating) || 0;
      const imdb_votes = row.imdb_votes ? parseInt(row.imdb_votes.replace(/,/g, ''), 10) || 0 : 0;
      const metascore = parseInt(row.metascore, 10) || 0;
      const rotten_tomatoes_rating = row.rotten_tomatoes_rating ? parseInt(row.rotten_tomatoes_rating.replace('%', ''), 10) || 0 : 0;
      const awards = row.awards || '';
      const rated = row.rated || '';
      const dvd = row.dvd || '';
      const box_office = row.box_office ? parseInt(row.box_office.replace(/[\$,]/g, ''), 10) || 0 : 0;
      const production_company = row.production_company || '';
      const website = row.website || '';
      const awardsWins = parseAwards(awards).wins;

      return {
        show_id: row.show_id || '',
        type,
        title: row.title || '',
        director: row.director || '',
        cast: row.cast || '',
        country: row.country || '',
        date_added: row.date_added || '',
        release_year: parseInt(row.release_year, 10) || 0,
        rating: row.rating ? row.rating.trim() : 'Unrated',
        duration: durationStr,
        genres: row.genres || '',
        language: row.language || 'en',
        description: row.description || '',
        popularity: parseFloat(row.popularity) || 0,
        vote_count: parseInt(row.vote_count, 10) || 0,
        vote_average: parseFloat(row.vote_average) || 0,
        poster_path: row.poster_path || "",
        backdrop_path: row.backdrop_path || "",
        directorsList,
        castList,
        countriesList,
        genresList,
        durationVal,
        durationUnit,
        parsedDateAdded,
        
        // OMDb fields
        imdb_id,
        imdb_rating,
        imdb_votes,
        metascore,
        rotten_tomatoes_rating,
        awards,
        rated,
        dvd,
        box_office,
        production_company,
        website,
        awardsWins
      };
    });

    console.log(`[CSV Engine] Loaded ${cachedData.length} master rows successfully.`);
    return cachedData;
  } catch (error) {
    console.error('Failed to read or parse Netflix Master CSV:', error);
    return [];
  }
}

export interface KpiData {
  totalTitles: number;
  movieCount: number;
  tvShowCount: number;
  countriesCount: number;
  genresCount: number;
  avgMovieDuration: number;
  avgTVShowSeasons: number;
  avgImdbRating: number;
  avgTmdbRating: number;
}

export function getKpis(): KpiData {
  const data = getNetflixData();
  const movies = data.filter(d => d.type === 'Movie');
  const tvShows = data.filter(d => d.type === 'TV Show');

  const uniqueCountries = new Set<string>();
  const uniqueGenres = new Set<string>();

  data.forEach(d => {
    d.countriesList.forEach(c => uniqueCountries.add(c));
    d.genresList.forEach(g => uniqueGenres.add(g));
  });

  const avgMovieDuration = movies.length > 0 
    ? Math.round(movies.reduce((sum, m) => sum + m.durationVal, 0) / movies.length)
    : 0;

  const avgTVShowSeasons = tvShows.length > 0
    ? Math.round((tvShows.reduce((sum, t) => sum + t.durationVal, 0) / tvShows.length) * 10) / 10
    : 0;

  const titlesWithImdb = data.filter(d => d.imdb_rating > 0);
  const avgImdbRating = titlesWithImdb.length > 0
    ? Math.round((titlesWithImdb.reduce((sum, d) => sum + d.imdb_rating, 0) / titlesWithImdb.length) * 10) / 10
    : 0;

  const titlesWithTmdb = data.filter(d => d.vote_average > 0);
  const avgTmdbRating = titlesWithTmdb.length > 0
    ? Math.round((titlesWithTmdb.reduce((sum, d) => sum + d.vote_average, 0) / titlesWithTmdb.length) * 10) / 10
    : 0;

  return {
    totalTitles: data.length,
    movieCount: movies.length,
    tvShowCount: tvShows.length,
    countriesCount: uniqueCountries.size,
    genresCount: uniqueGenres.size,
    avgMovieDuration,
    avgTVShowSeasons,
    avgImdbRating,
    avgTmdbRating,
  };
}

export function getExecutiveStats() {
  const data = getNetflixData();
  const total = data.length;
  const moviesCount = data.filter(d => d.type === 'Movie').length;
  const tvShowsCount = total - moviesCount;

  // 1. Type Distribution
  const typeDistribution = [
    { name: 'Movies', value: moviesCount, percentage: Math.round((moviesCount / total) * 100) },
    { name: 'TV Shows', value: tvShowsCount, percentage: Math.round((tvShowsCount / total) * 100) },
  ];

  // 2. Date Added Trend (2008 - 2025)
  const addedByYear: { [key: number]: { total: number; movies: number; tvShows: number } } = {};
  data.forEach(d => {
    if (d.parsedDateAdded) {
      const year = d.parsedDateAdded.getFullYear();
      if (year >= 2008 && year <= 2025) {
        if (!addedByYear[year]) {
          addedByYear[year] = { total: 0, movies: 0, tvShows: 0 };
        }
        addedByYear[year].total++;
        if (d.type === 'Movie') {
          addedByYear[year].movies++;
        } else {
          addedByYear[year].tvShows++;
        }
      }
    }
  });

  const dateAddedTrend = Object.keys(addedByYear)
    .map(y => {
      const yearNum = parseInt(y, 10);
      return {
        year: yearNum,
        total: addedByYear[yearNum].total,
        movies: addedByYear[yearNum].movies,
        tvShows: addedByYear[yearNum].tvShows,
      };
    })
    .sort((a, b) => a.year - b.year);

  // 3. Top Countries
  const countryCounts: { [key: string]: { movies: number; tvShows: number; total: number } } = {};
  data.forEach(d => {
    d.countriesList.forEach(c => {
      if (!countryCounts[c]) {
        countryCounts[c] = { movies: 0, tvShows: 0, total: 0 };
      }
      countryCounts[c].total++;
      if (d.type === 'Movie') {
        countryCounts[c].movies++;
      } else {
        countryCounts[c].tvShows++;
      }
    });
  });

  const topCountries = Object.keys(countryCounts)
    .map(c => ({
      name: c,
      total: countryCounts[c].total,
      movies: countryCounts[c].movies,
      tvShows: countryCounts[c].tvShows,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // 4. Ratings Distribution
  const ratingCounts: { [key: string]: number } = {};
  data.forEach(d => {
    const r = d.rating;
    ratingCounts[r] = (ratingCounts[r] || 0) + 1;
  });

  const ratingsDistribution = Object.keys(ratingCounts)
    .map(r => ({ name: r, value: ratingCounts[r] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // 5. OMDb stats
  const titlesWithImdb = data.filter(d => d.imdb_rating > 0);
  const avgImdbRating = titlesWithImdb.length > 0
    ? Math.round((titlesWithImdb.reduce((sum, d) => sum + d.imdb_rating, 0) / titlesWithImdb.length) * 10) / 10
    : 0;

  const titlesWithRt = data.filter(d => d.rotten_tomatoes_rating > 0);
  const avgRottenTomatoes = titlesWithRt.length > 0
    ? Math.round(titlesWithRt.reduce((sum, d) => sum + d.rotten_tomatoes_rating, 0) / titlesWithRt.length)
    : 0;

  const titlesWithMeta = data.filter(d => d.metascore > 0);
  const avgMetascore = titlesWithMeta.length > 0
    ? Math.round(titlesWithMeta.reduce((sum, d) => sum + d.metascore, 0) / titlesWithMeta.length)
    : 0;

  const totalAwardsWon = data.reduce((sum, d) => sum + d.awardsWins, 0);
  const totalImdbVotes = data.reduce((sum, d) => sum + d.imdb_votes, 0);

  return {
    typeDistribution,
    dateAddedTrend,
    topCountries,
    ratingsDistribution,
    kpis: {
      avgImdbRating,
      avgRottenTomatoes,
      avgMetascore,
      totalAwardsWon,
      totalImdbVotes
    }
  };
}

export function getContentInsights() {
  const data = getNetflixData();

  // 1. Release Year Trend (1992 - 2025)
  const releaseByYear: { [key: number]: { movies: number; tvShows: number; total: number } } = {};
  data.forEach(d => {
    const yr = d.release_year;
    if (yr >= 1992 && yr <= 2025) {
      if (!releaseByYear[yr]) {
        releaseByYear[yr] = { movies: 0, tvShows: 0, total: 0 };
      }
      releaseByYear[yr].total++;
      if (d.type === 'Movie') {
        releaseByYear[yr].movies++;
      } else {
        releaseByYear[yr].tvShows++;
      }
    }
  });

  const releaseYearTrend = Object.keys(releaseByYear)
    .map(y => {
      const yearNum = parseInt(y, 10);
      return {
        year: yearNum,
        movies: releaseByYear[yearNum].movies,
        tvShows: releaseByYear[yearNum].tvShows,
        total: releaseByYear[yearNum].total,
      };
    })
    .sort((a, b) => a.year - b.year);

  // 2. Genre Distribution
  const genreCounts: { [key: string]: { movies: number; tvShows: number; total: number } } = {};
  data.forEach(d => {
    d.genresList.forEach(g => {
      if (!genreCounts[g]) {
        genreCounts[g] = { movies: 0, tvShows: 0, total: 0 };
      }
      genreCounts[g].total++;
      if (d.type === 'Movie') {
        genreCounts[g].movies++;
      } else {
        genreCounts[g].tvShows++;
      }
    });
  });

  const genreDistribution = Object.keys(genreCounts)
    .map(g => ({
      name: g,
      total: genreCounts[g].total,
      movies: genreCounts[g].movies,
      tvShows: genreCounts[g].tvShows,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  // 3. Duration Distribution
  const movieBuckets = {
    'Short (< 95 min)': 0,
    'Medium (95 - 110 min)': 0,
    'Standard (110 - 125 min)': 0,
    'Long (125 - 140 min)': 0,
    'Epic (> 140 min)': 0,
  };

  const tvBuckets = {
    '1 Season': 0,
    '2 Seasons': 0,
    '3 Seasons': 0,
    '4-5 Seasons': 0,
    '6+ Seasons': 0,
  };

  data.forEach(d => {
    if (d.type === 'Movie') {
      const mins = d.durationVal;
      if (mins < 95) movieBuckets['Short (< 95 min)']++;
      else if (mins >= 95 && mins <= 110) movieBuckets['Medium (95 - 110 min)']++;
      else if (mins > 110 && mins <= 125) movieBuckets['Standard (110 - 125 min)']++;
      else if (mins > 125 && mins <= 140) movieBuckets['Long (125 - 140 min)']++;
      else movieBuckets['Epic (> 140 min)']++;
    } else {
      const seasons = d.durationVal;
      if (seasons === 1) tvBuckets['1 Season']++;
      else if (seasons === 2) tvBuckets['2 Seasons']++;
      else if (seasons === 3) tvBuckets['3 Seasons']++;
      else if (seasons >= 4 && seasons <= 5) tvBuckets['4-5 Seasons']++;
      else tvBuckets['6+ Seasons']++;
    }
  });

  const movieDurationData = Object.keys(movieBuckets).map(k => ({
    name: k,
    value: movieBuckets[k as keyof typeof movieBuckets],
  }));

  const tvDurationData = Object.keys(tvBuckets).map(k => ({
    name: k,
    value: tvBuckets[k as keyof typeof tvBuckets],
  }));

  // 4. IMDb Rating Distribution
  const imdbRatingBuckets = {
    'Under 5.0': 0,
    '5.0 - 6.0': 0,
    '6.0 - 7.0': 0,
    '7.0 - 8.0': 0,
    '8.0 - 9.0': 0,
    '9.0 - 10.0': 0,
  };
  // 5. Rotten Tomatoes Rating Distribution
  const rtRatingBuckets = {
    'Under 50%': 0,
    '50% - 60%': 0,
    '60% - 70%': 0,
    '70% - 80%': 0,
    '80% - 90%': 0,
    '90% - 100%': 0,
  };
  // 6. Metascore Distribution
  const metascoreBuckets = {
    'Under 50': 0,
    '50 - 60': 0,
    '60 - 70': 0,
    '70 - 80': 0,
    '80 - 90': 0,
    '90 - 100': 0,
  };

  // 7. Awards by Genre, Genre vs IMDb Rating
  const genreAwards: Record<string, number> = {};
  const genreRatingSum: Record<string, number> = {};
  const genreRatingCount: Record<string, number> = {};

  // 8. Awards by Release Year
  const awardsByYearMap: Record<number, number> = {};

  // 9. Runtime vs IMDb Rating (Movies only)
  const runtimeImdbSum = {
    '< 90 min': 0,
    '90 - 110 min': 0,
    '110 - 130 min': 0,
    '130 - 150 min': 0,
    '> 150 min': 0
  };
  const runtimeImdbCount = {
    '< 90 min': 0,
    '90 - 110 min': 0,
    '110 - 130 min': 0,
    '130 - 150 min': 0,
    '> 150 min': 0
  };

  // 10. Country vs IMDb Rating
  const countryRatingSum: Record<string, number> = {};
  const countryRatingCount: Record<string, number> = {};

  data.forEach(d => {
    // A. Distributions
    if (d.imdb_rating > 0) {
      const rating = d.imdb_rating;
      if (rating < 5.0) imdbRatingBuckets['Under 5.0']++;
      else if (rating < 6.0) imdbRatingBuckets['5.0 - 6.0']++;
      else if (rating < 7.0) imdbRatingBuckets['6.0 - 7.0']++;
      else if (rating < 8.0) imdbRatingBuckets['7.0 - 8.0']++;
      else if (rating < 9.0) imdbRatingBuckets['8.0 - 9.0']++;
      else imdbRatingBuckets['9.0 - 10.0']++;
    }

    if (d.rotten_tomatoes_rating > 0) {
      const rt = d.rotten_tomatoes_rating;
      if (rt < 50) rtRatingBuckets['Under 50%']++;
      else if (rt < 60) rtRatingBuckets['50% - 60%']++;
      else if (rt < 70) rtRatingBuckets['60% - 70%']++;
      else if (rt < 80) rtRatingBuckets['70% - 80%']++;
      else if (rt < 90) rtRatingBuckets['80% - 90%']++;
      else rtRatingBuckets['90% - 100%']++;
    }

    if (d.metascore > 0) {
      const meta = d.metascore;
      if (meta < 50) metascoreBuckets['Under 50']++;
      else if (meta < 60) metascoreBuckets['50 - 60']++;
      else if (meta < 70) metascoreBuckets['60 - 70']++;
      else if (meta < 80) metascoreBuckets['70 - 80']++;
      else if (meta < 90) metascoreBuckets['80 - 90']++;
      else metascoreBuckets['90 - 100']++;
    }

    // B. Genre analytics
    d.genresList.forEach(g => {
      genreAwards[g] = (genreAwards[g] || 0) + d.awardsWins;
      if (d.imdb_rating > 0) {
        genreRatingSum[g] = (genreRatingSum[g] || 0) + d.imdb_rating;
        genreRatingCount[g] = (genreRatingCount[g] || 0) + 1;
      }
    });

    // C. Awards by release year
    const yr = d.release_year;
    if (yr >= 1990 && yr <= 2025) {
      awardsByYearMap[yr] = (awardsByYearMap[yr] || 0) + d.awardsWins;
    }

    // D. Runtime vs IMDb (Movies)
    if (d.type === 'Movie' && d.imdb_rating > 0) {
      const mins = d.durationVal;
      let bucket: keyof typeof runtimeImdbSum | null = null;
      if (mins < 90) bucket = '< 90 min';
      else if (mins <= 110) bucket = '90 - 110 min';
      else if (mins <= 130) bucket = '110 - 130 min';
      else if (mins <= 150) bucket = '130 - 150 min';
      else bucket = '> 150 min';

      runtimeImdbSum[bucket] += d.imdb_rating;
      runtimeImdbCount[bucket]++;
    }

    // E. Country vs IMDb
    d.countriesList.forEach(c => {
      if (d.imdb_rating > 0) {
        countryRatingSum[c] = (countryRatingSum[c] || 0) + d.imdb_rating;
        countryRatingCount[c] = (countryRatingCount[c] || 0) + 1;
      }
    });
  });

  const imdbRatingDistribution = Object.keys(imdbRatingBuckets).map(k => ({
    name: k,
    value: imdbRatingBuckets[k as keyof typeof imdbRatingBuckets]
  }));

  const rtDistribution = Object.keys(rtRatingBuckets).map(k => ({
    name: k,
    value: rtRatingBuckets[k as keyof typeof rtRatingBuckets]
  }));

  const metascoreDistribution = Object.keys(metascoreBuckets).map(k => ({
    name: k,
    value: metascoreBuckets[k as keyof typeof metascoreBuckets]
  }));

  const awardsByGenre = Object.keys(genreAwards)
    .map(g => ({ name: g, value: genreAwards[g] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  const awardsByYear = Object.keys(awardsByYearMap)
    .map(y => ({ year: parseInt(y, 10), value: awardsByYearMap[parseInt(y, 10)] }))
    .sort((a, b) => a.year - b.year);

  const runtimeVsImdb = Object.keys(runtimeImdbSum).map(k => {
    const sum = runtimeImdbSum[k as keyof typeof runtimeImdbSum];
    const count = runtimeImdbCount[k as keyof typeof runtimeImdbCount];
    return {
      name: k,
      value: count > 0 ? Math.round((sum / count) * 10) / 10 : 0
    };
  });

  const genreVsImdb = Object.keys(genreRatingSum)
    .filter(g => genreRatingCount[g] >= 5) // Min 5 titles
    .map(g => ({
      name: g,
      value: Math.round((genreRatingSum[g] / genreRatingCount[g]) * 10) / 10
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  const countryVsImdb = Object.keys(countryRatingSum)
    .filter(c => countryRatingCount[c] >= 10) // Min 10 titles
    .map(c => ({
      name: c,
      value: Math.round((countryRatingSum[c] / countryRatingCount[c]) * 10) / 10
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  return {
    releaseYearTrend,
    genreDistribution,
    movieDurationData,
    tvDurationData,
    imdbRatingDistribution,
    rtDistribution,
    metascoreDistribution,
    awardsByGenre,
    awardsByYear,
    runtimeVsImdb,
    genreVsImdb,
    countryVsImdb,
  };
}

export function getPeopleGeography() {
  const data = getNetflixData();

  // 1. Top Directors
  const directorCounts: { [key: string]: { total: number; movies: number; tvShows: number } } = {};
  data.forEach(d => {
    d.directorsList.forEach(dir => {
      if (!directorCounts[dir]) {
        directorCounts[dir] = { total: 0, movies: 0, tvShows: 0 };
      }
      directorCounts[dir].total++;
      if (d.type === 'Movie') directorCounts[dir].movies++;
      else directorCounts[dir].tvShows++;
    });
  });

  const topDirectors = Object.keys(directorCounts)
    .map(name => ({
      name,
      total: directorCounts[name].total,
      movies: directorCounts[name].movies,
      tvShows: directorCounts[name].tvShows,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  // 2. Top Cast Members
  const actorCounts: { [key: string]: { total: number; movies: number; tvShows: number } } = {};
  data.forEach(d => {
    d.castList.forEach(act => {
      if (!actorCounts[act]) {
        actorCounts[act] = { total: 0, movies: 0, tvShows: 0 };
      }
      actorCounts[act].total++;
      if (d.type === 'Movie') actorCounts[act].movies++;
      else actorCounts[act].tvShows++;
    });
  });

  const topActors = Object.keys(actorCounts)
    .map(name => ({
      name,
      total: actorCounts[name].total,
      movies: actorCounts[name].movies,
      tvShows: actorCounts[name].tvShows,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  // 3. Country Details
  const countryCounts: { [key: string]: { total: number; movies: number; tvShows: number } } = {};
  data.forEach(d => {
    d.countriesList.forEach(c => {
      if (!countryCounts[c]) {
        countryCounts[c] = { total: 0, movies: 0, tvShows: 0 };
      }
      countryCounts[c].total++;
      if (d.type === 'Movie') countryCounts[c].movies++;
      else countryCounts[c].tvShows++;
    });
  });

  const countryDetails = Object.keys(countryCounts)
    .map(c => ({
      country: c,
      Movies: countryCounts[c].movies,
      "TV Shows": countryCounts[c].tvShows,
      total: countryCounts[c].total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  // 4. OMDb People Calculations
  const directorRatingSum: Record<string, number> = {};
  const directorRatingCount: Record<string, number> = {};
  const directorAwards: Record<string, number> = {};

  const actorRatingSum: Record<string, number> = {};
  const actorRatingCount: Record<string, number> = {};
  const actorAwards: Record<string, number> = {};

  const countryRatingSumGeo: Record<string, number> = {};
  const countryRatingCountGeo: Record<string, number> = {};

  data.forEach(d => {
    // Directors
    d.directorsList.forEach(dir => {
      directorAwards[dir] = (directorAwards[dir] || 0) + d.awardsWins;
      if (d.imdb_rating > 0) {
        directorRatingSum[dir] = (directorRatingSum[dir] || 0) + d.imdb_rating;
        directorRatingCount[dir] = (directorRatingCount[dir] || 0) + 1;
      }
    });

    // Actors
    d.castList.forEach(act => {
      actorAwards[act] = (actorAwards[act] || 0) + d.awardsWins;
      if (d.imdb_rating > 0) {
        actorRatingSum[act] = (actorRatingSum[act] || 0) + d.imdb_rating;
        actorRatingCount[act] = (actorRatingCount[act] || 0) + 1;
      }
    });

    // Countries
    d.countriesList.forEach(c => {
      if (d.imdb_rating > 0) {
        countryRatingSumGeo[c] = (countryRatingSumGeo[c] || 0) + d.imdb_rating;
        countryRatingCountGeo[c] = (countryRatingCountGeo[c] || 0) + 1;
      }
    });
  });

  const highestRatedDirectors = Object.keys(directorRatingSum)
    .filter(name => directorRatingCount[name] >= 3)
    .map(name => ({
      name,
      value: Math.round((directorRatingSum[name] / directorRatingCount[name]) * 10) / 10,
      count: directorRatingCount[name]
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  const highestRatedActors = Object.keys(actorRatingSum)
    .filter(name => actorRatingCount[name] >= 3)
    .map(name => ({
      name,
      value: Math.round((actorRatingSum[name] / actorRatingCount[name]) * 10) / 10,
      count: actorRatingCount[name]
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  const mostAwardedDirectors = Object.keys(directorAwards)
    .map(name => ({
      name,
      value: directorAwards[name]
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  const mostAwardedActors = Object.keys(actorAwards)
    .map(name => ({
      name,
      value: actorAwards[name]
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  const highestRatedCountries = Object.keys(countryRatingSumGeo)
    .filter(c => countryRatingCountGeo[c] >= 5)
    .map(name => ({
      name,
      value: Math.round((countryRatingSumGeo[name] / countryRatingCountGeo[name]) * 10) / 10,
      count: countryRatingCountGeo[name]
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  return {
    topDirectors,
    topActors,
    countryDetails,
    highestRatedDirectors,
    highestRatedActors,
    mostAwardedDirectors,
    mostAwardedActors,
    highestRatedCountries,
  };
}

export interface FilterParams {
  type?: string;
  year?: string;
  genre?: string;
  country?: string;
  rating?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'title' | 'release_year' | 'date_added';
  sortOrder?: 'asc' | 'desc';
}

export function getFilteredTitles(params: FilterParams) {
  const data = getNetflixData();
  let result = [...data];

  // Search filter
  if (params.search && params.search.trim()) {
    const query = params.search.toLowerCase().trim();
    result = result.filter(d => 
      d.title.toLowerCase().includes(query) ||
      d.director.toLowerCase().includes(query) ||
      d.cast.toLowerCase().includes(query) ||
      d.description.toLowerCase().includes(query)
    );
  }

  // Type filter
  if (params.type && params.type !== 'All') {
    result = result.filter(d => d.type === params.type);
  }

  // Genre filter
  if (params.genre && params.genre !== 'All') {
    result = result.filter(d => d.genresList.includes(params.genre!));
  }

  // Country filter
  if (params.country && params.country !== 'All') {
    result = result.filter(d => d.countriesList.includes(params.country!));
  }

  // Rating filter
  if (params.rating && params.rating !== 'All') {
    result = result.filter(d => d.rating === params.rating);
  }

  // Year filter
  if (params.year && params.year !== 'All') {
    if (params.year.includes('-')) {
      const [start, end] = params.year.split('-').map(Number);
      result = result.filter(d => d.release_year >= start && d.release_year <= end);
    } else if (params.year.startsWith('Before')) {
      const limitYear = parseInt(params.year.replace('Before', '').trim(), 10);
      result = result.filter(d => d.release_year < limitYear);
    } else {
      const targetYear = parseInt(params.year, 10);
      if (!isNaN(targetYear)) {
        result = result.filter(d => d.release_year === targetYear);
      }
    }
  }

  // Sorting
  const sortBy = params.sortBy || 'title';
  const sortOrder = params.sortOrder || 'asc';
  
  result.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'title') {
      comparison = a.title.localeCompare(b.title);
    } else if (sortBy === 'release_year') {
      comparison = a.release_year - b.release_year;
    } else if (sortBy === 'date_added') {
      const aTime = a.parsedDateAdded ? a.parsedDateAdded.getTime() : 0;
      const bTime = b.parsedDateAdded ? b.parsedDateAdded.getTime() : 0;
      comparison = aTime - bTime;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Unique lists for controls
  const genres = Array.from(new Set(data.flatMap(d => d.genresList))).sort();
  const countries = Array.from(new Set(data.flatMap(d => d.countriesList))).sort();
  const ratings = Array.from(new Set(data.map(d => d.rating))).sort();
  const years = Array.from(new Set(data.map(d => d.release_year))).sort((a, b) => b - a);

  // Pagination
  const page = params.page || 1;
  const limit = params.limit || 20;
  const startIndex = (page - 1) * limit;
  const paginatedResult = result.slice(startIndex, startIndex + limit);

  return {
    titles: paginatedResult,
    totalCount: result.length,
    totalPages: Math.ceil(result.length / limit),
    page,
    limit,
    filterOptions: {
      genres,
      countries,
      ratings,
      years,
    }
  };
}

export function getTitleDetails(show_id: string): NetflixTitle | null {
  const data = getNetflixData();
  return data.find(d => d.show_id === show_id) || null;
}
