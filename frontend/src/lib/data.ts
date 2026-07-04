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
