"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Film, BarChart3, TrendingUp, Users2, Search, Clapperboard, MonitorPlay, 
  Globe2, Sparkles, Clock, Star, Plus, Check, Play, Info, Trophy, Heart, 
  ArrowRight, ShieldCheck, User, RotateCcw
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";

import { KpiData, NetflixTitle } from "@/lib/data";
import MovieCard from "@/components/MovieCard";
import ShowDetailsModal from "@/components/ShowDetailsModal";
import ActorDetailsModal from "@/components/ActorDetailsModal";
import DirectorDetailsModal from "@/components/DirectorDetailsModal";
import { useGlobalFilter } from "@/lib/GlobalFilterContext";

interface HomePageClientProps {
  kpis: KpiData;
  rows: {
    trending: NetflixTitle[];
    topRatedImdb: NetflixTitle[];
    topRatedTmdb: NetflixTitle[];
    recentlyAdded: NetflixTitle[];
    topMovies: NetflixTitle[];
    topTvShows: NetflixTitle[];
    awardWinning: NetflixTitle[];
    familyFriendly: NetflixTitle[];
    action: NetflixTitle[];
    comedy: NetflixTitle[];
    drama: NetflixTitle[];
    horror: NetflixTitle[];
    scifi: NetflixTitle[];
    animation: NetflixTitle[];
  };
  allTitles: NetflixTitle[];
}

const BAR_COLORS = ["#e50914", "#c60710", "#a8060c", "#890509", "#6b0407", "#4d0205"];

// Animated number counter helper
function AnimatedCounter({ value, duration = 1.0 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;

    const totalMiliseconds = duration * 1000;
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 15);
    
    const timer = setInterval(() => {
      start += Math.ceil(end / (totalMiliseconds / incrementTime));
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count.toLocaleString()}</span>;
}

// Decimal counter
function AnimatedDecimalCounter({ value, duration = 1.0 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const totalSteps = 50;
    const stepTime = (duration * 1000) / totalSteps;
    const increment = end / totalSteps;

    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(current);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count.toFixed(1)}</span>;
}

// Content Row carousel component
interface ContentRowProps {
  title: string;
  items: NetflixTitle[];
  onSelect: (show: NetflixTitle) => void;
}

function ContentRow({ title, items, onSelect }: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const offset = direction === "left" ? -clientWidth * 0.8 : clientWidth * 0.8;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      setShowLeftArrow(scrollRef.current.scrollLeft > 10);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-2 relative group/row">
      <h3 className="text-sm sm:text-base font-bold text-white tracking-wide pl-2 border-l-2 border-[#e50914] select-none">
        {title}
      </h3>
      
      <div className="relative">
        {showLeftArrow && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-0 bottom-0 w-10 bg-black/75 hover:bg-black/90 text-white flex items-center justify-center z-30 transition opacity-0 group-hover/row:opacity-100 cursor-pointer text-2xl font-black rounded-r"
          >
            &lsaquo;
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto scrollbar-hide py-2 px-1 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((show) => (
            <MovieCard key={show.show_id} show={show} onClick={() => onSelect(show)} />
          ))}
        </div>

        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 w-10 bg-black/75 hover:bg-black/90 text-white flex items-center justify-center z-30 transition opacity-0 group-hover/row:opacity-100 cursor-pointer text-2xl font-black rounded-l"
        >
          &rsaquo;
        </button>
      </div>
    </div>
  );
}

// Person Card for Actors/Directors
function PersonCard({ name, subtitle, onClick }: { name: string; subtitle: string; onClick: () => void }) {
  const [profileUrl, setProfileUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchImage = async () => {
      try {
        const res = await fetch(`/api/person?name=${encodeURIComponent(name)}`);
        if (res.ok) {
          const data = await res.json();
          if (active && data.profile_url) {
            setProfileUrl(data.profile_url);
          }
        }
      } catch (e) {
        // ignore
      }
    };
    fetchImage();
    return () => { active = false; };
  }, [name]);

  return (
    <div 
      onClick={onClick}
      className="flex-shrink-0 w-24 sm:w-28 bg-white/5 border border-white/5 hover:border-[#e50914]/40 rounded-lg p-2 text-center cursor-pointer transition duration-300 group"
    >
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden mx-auto bg-zinc-900 border border-white/10 mb-2 relative">
        {profileUrl ? (
          <img src={profileUrl} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-6 h-6 text-zinc-600" />
          </div>
        )}
      </div>
      <p className="text-[10px] sm:text-xs font-bold text-white truncate group-hover:text-[#e50914] transition">{name}</p>
      <p className="text-[8px] text-gray-500 truncate mt-0.5">{subtitle}</p>
    </div>
  );
}

export default function HomePageClient({ kpis: initialKpis, rows: initialRows, allTitles }: HomePageClientProps) {
  const router = useRouter();

  // Consume global filter context
  const {
    filters,
    setFilter,
    setMultipleFilters,
    resetFilters,
    filteredTitles,
    openShowDetails,
    openDrillThrough,
  } = useGlobalFilter();

  // Search state is local to support search submission
  const [searchQuery, setSearchQuery] = useState("");

  // Watchlist state
  const [watchlist, setWatchlist] = useState<NetflixTitle[]>([]);

  // Featured Hero state
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroShow, setHeroShow] = useState<NetflixTitle | null>(null);
  const [heroDetails, setHeroDetails] = useState<any | null>(null);

  // Modals selected actor/director state
  const [selectedActor, setSelectedActor] = useState<string>("");
  const [selectedDirector, setSelectedDirector] = useState<string>("");

  // Helper to safely select top records
  const getTop = (
    list: NetflixTitle[],
    filterFn: (x: NetflixTitle) => boolean,
    sortFn: (a: NetflixTitle, b: NetflixTitle) => number,
    count = 20
  ) => {
    return [...list].filter(filterFn).sort(sortFn).slice(0, count);
  };

  // Re-compute rows dynamically based on globally filtered titles
  const dynamicRows = useMemo(() => {
    const list = filteredTitles;
    
    const hasGenre = (d: NetflixTitle, genreName: string) => 
      d.genresList.some(g => g.toLowerCase().includes(genreName.toLowerCase()));

    return {
      trending: getTop(list, () => true, (a, b) => (b.popularity || 0) - (a.popularity || 0), 20),
      topRatedImdb: getTop(list, (d) => (d.imdb_rating || 0) > 0, (a, b) => (b.imdb_rating || 0) - (a.imdb_rating || 0), 20),
      topRatedTmdb: getTop(list, (d) => (d.vote_average || 0) > 0, (a, b) => (b.vote_average || 0) - (a.vote_average || 0), 20),
      recentlyAdded: getTop(list, (d) => d.parsedDateAdded !== null, (a, b) => {
        const aTime = a.parsedDateAdded ? new Date(a.parsedDateAdded).getTime() : 0;
        const bTime = b.parsedDateAdded ? new Date(b.parsedDateAdded).getTime() : 0;
        return bTime - aTime;
      }, 20),
      topMovies: getTop(list, (d) => d.type === 'Movie', (a, b) => (b.popularity || 0) - (a.popularity || 0), 20),
      topTvShows: getTop(list, (d) => d.type === 'TV Show', (a, b) => (b.popularity || 0) - (a.popularity || 0), 20),
      awardWinning: getTop(list, (d) => d.awardsWins > 0, (a, b) => b.awardsWins - a.awardsWins, 20),
      familyFriendly: getTop(list, (d) => 
        hasGenre(d, 'family') || 
        hasGenre(d, 'children') || 
        ['G', 'PG', 'TV-G', 'TV-Y', 'TV-Y7'].includes(d.rating),
        (a, b) => (b.popularity || 0) - (a.popularity || 0), 20
      ),
      action: getTop(list, (d) => hasGenre(d, 'action') || hasGenre(d, 'adventure'), (a, b) => (b.popularity || 0) - (a.popularity || 0), 20),
      comedy: getTop(list, (d) => hasGenre(d, 'comedy'), (a, b) => (b.popularity || 0) - (a.popularity || 0), 20),
      drama: getTop(list, (d) => hasGenre(d, 'drama'), (a, b) => (b.popularity || 0) - (a.popularity || 0), 20),
      horror: getTop(list, (d) => hasGenre(d, 'horror') || hasGenre(d, 'thriller'), (a, b) => (b.popularity || 0) - (a.popularity || 0), 20),
      scifi: getTop(list, (d) => hasGenre(d, 'science fiction') || hasGenre(d, 'sci-fi') || hasGenre(d, 'fantasy'), (a, b) => (b.popularity || 0) - (a.popularity || 0), 20),
      animation: getTop(list, (d) => hasGenre(d, 'animation') || hasGenre(d, 'anime'), (a, b) => (b.popularity || 0) - (a.popularity || 0), 20),
    };
  }, [filteredTitles]);

  const rows = dynamicRows;

  // Recalculate KPIs dynamically for the active global selection
  const kpis = useMemo(() => {
    const list = filteredTitles;
    const movies = list.filter(d => d.type === 'Movie');
    const tvShows = list.filter(d => d.type === 'TV Show');

    const uniqueCountries = new Set<string>();
    const uniqueGenres = new Set<string>();

    list.forEach(d => {
      d.countriesList.forEach(c => uniqueCountries.add(c));
      d.genresList.forEach(g => uniqueGenres.add(g));
    });

    const avgMovieDuration = movies.length > 0 
      ? Math.round(movies.reduce((sum, m) => sum + m.durationVal, 0) / movies.length)
      : 0;

    const avgTVShowSeasons = tvShows.length > 0
      ? Math.round((tvShows.reduce((sum, t) => sum + t.durationVal, 0) / tvShows.length) * 10) / 10
      : 0;

    const titlesWithImdb = list.filter(d => d.imdb_rating > 0);
    const avgImdbRating = titlesWithImdb.length > 0
      ? Math.round((titlesWithImdb.reduce((sum, d) => sum + d.imdb_rating, 0) / titlesWithImdb.length) * 10) / 10
      : 0;

    const titlesWithTmdb = list.filter(d => d.vote_average > 0);
    const avgTmdbRating = titlesWithTmdb.length > 0
      ? Math.round((titlesWithTmdb.reduce((sum, d) => sum + d.vote_average, 0) / titlesWithTmdb.length) * 10) / 10
      : 0;

    return {
      totalTitles: list.length,
      movieCount: movies.length,
      tvShowCount: tvShows.length,
      countriesCount: uniqueCountries.size,
      genresCount: uniqueGenres.size,
      avgMovieDuration,
      avgTVShowSeasons,
      avgImdbRating,
      avgTmdbRating,
    };
  }, [filteredTitles]);

  // Sync watchlist from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("netflix_watchlist");
      if (stored) {
        try {
          const ids = JSON.parse(stored) as string[];
          const items = allTitles.filter(t => ids.includes(t.show_id));
          setWatchlist(items);
        } catch (e) {
          // ignore
        }
      }
    }
  }, [allTitles]);

  const toggleWatchlist = (show: NetflixTitle) => {
    if (typeof window === "undefined") return;

    let updatedIds: string[] = [];
    const stored = localStorage.getItem("netflix_watchlist");
    if (stored) {
      try {
        updatedIds = JSON.parse(stored) as string[];
      } catch (e) {}
    }

    if (updatedIds.includes(show.show_id)) {
      updatedIds = updatedIds.filter(id => id !== show.show_id);
    } else {
      updatedIds.push(show.show_id);
    }

    localStorage.setItem("netflix_watchlist", JSON.stringify(updatedIds));
    setWatchlist(allTitles.filter(t => updatedIds.includes(t.show_id)));
  };

  // Sync Search state with Navbar search input events
  useEffect(() => {
    const handleNavbarSearch = (e: Event) => {
      const val = (e as CustomEvent).detail;
      setSearchQuery(val);
    };
    window.addEventListener("navbarSearch", handleNavbarSearch);

    // Initial check for URL query
    const query = new URLSearchParams(window.location.search).get("search") || "";
    if (query) {
      setSearchQuery(query);
    }

    return () => window.removeEventListener("navbarSearch", handleNavbarSearch);
  }, []);

  // Auto-rotate Hero banner every 20 seconds
  useEffect(() => {
    if (rows.trending.length === 0) return;
    setHeroShow(rows.trending[heroIndex]);

    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % rows.trending.length);
    }, 20000);

    return () => clearInterval(interval);
  }, [heroIndex, rows.trending]);

  // Fetch TMDb details for hero background
  useEffect(() => {
    if (!heroShow) return;
    const fetchHeroDetails = async () => {
      try {
        const res = await fetch(`/api/titles/${heroShow.show_id}/tmdb`);
        if (res.ok) {
          const data = await res.json();
          setHeroDetails(data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchHeroDetails();
  }, [heroShow]);

  // Combine global filtered titles with local search query
  const finalFilteredTitles = useMemo(() => {
    if (!searchQuery.trim()) return filteredTitles;
    const q = searchQuery.toLowerCase().trim();
    return filteredTitles.filter((item) => {
      const matchesTitle = item.title.toLowerCase().includes(q);
      const matchesCast = item.cast.toLowerCase().includes(q);
      const matchesDirector = item.director.toLowerCase().includes(q);
      const matchesCountry = item.country.toLowerCase().includes(q);
      const matchesGenre = item.genres.toLowerCase().includes(q);
      const matchesDesc = item.description.toLowerCase().includes(q);
      const matchesYear = item.release_year.toString() === q;
      return matchesTitle || matchesCast || matchesDirector || matchesCountry || matchesGenre || matchesDesc || matchesYear;
    });
  }, [filteredTitles, searchQuery]);

  const isFilteringOrSearching = useMemo(() => {
    return (
      searchQuery.trim() !== "" ||
      filters.type !== "All" ||
      filters.genre !== "All" ||
      filters.country !== "All" ||
      filters.year !== "All" ||
      filters.releasePeriod !== "All" ||
      filters.imdbRatingRange[0] > 0 ||
      filters.imdbRatingRange[1] < 10 ||
      filters.tmdbRatingRange[0] > 0 ||
      filters.tmdbRatingRange[1] < 10 ||
      filters.runtimeBucket !== "All"
    );
  }, [searchQuery, filters]);

  // Extract filter dropdown options from the catalog dynamically
  const filterOptions = useMemo(() => {
    const genres = new Set<string>();
    const countries = new Set<string>();
    allTitles.forEach(t => {
      t.genresList.forEach(g => genres.add(g));
      t.countriesList.forEach(c => { if (c) countries.add(c); });
    });
    return {
      genres: Array.from(genres).sort(),
      countries: Array.from(countries).sort(),
    };
  }, [allTitles]);

  const handleResetFilters = () => {
    setSearchQuery("");
    resetFilters();
    if (typeof window !== "undefined") {
      router.replace("/");
    }
  };

  // ----------------------------------------------------
  // ANALYTICS SUMMARY CALCULATIONS
  // ----------------------------------------------------
  const chartData = useMemo(() => {
    // 1. Releases by year trend (1990 - 2025)
    const yearsMap: Record<number, { year: number; movies: number; tvShows: number; total: number }> = {};
    for (let y = 1990; y <= 2025; y++) {
      yearsMap[y] = { year: y, movies: 0, tvShows: 0, total: 0 };
    }
    allTitles.forEach(t => {
      if (t.release_year >= 1990 && t.release_year <= 2025) {
        if (t.type === "Movie") yearsMap[t.release_year].movies++;
        else yearsMap[t.release_year].tvShows++;
        yearsMap[t.release_year].total++;
      }
    });

    // 2. Top Countries
    const countriesMap: Record<string, number> = {};
    allTitles.forEach(t => {
      t.countriesList.forEach(c => {
        if (c) countriesMap[c] = (countriesMap[c] || 0) + 1;
      });
    });
    const countryChart = Object.entries(countriesMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // 3. Top Genres
    const genresMap: Record<string, number> = {};
    allTitles.forEach(t => {
      t.genresList.forEach(g => {
        if (g) genresMap[g] = (genresMap[g] || 0) + 1;
      });
    });
    const genreChart = Object.entries(genresMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // 4. Age Ratings (Censorship classifications)
    const ratingsMap: Record<string, number> = {};
    allTitles.forEach(t => {
      if (t.rating) ratingsMap[t.rating] = (ratingsMap[t.rating] || 0) + 1;
    });
    const ratingChart = Object.entries(ratingsMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return {
      releases: Object.values(yearsMap),
      countries: countryChart,
      genres: genreChart,
      ratings: ratingChart,
    };
  }, [allTitles]);

  // People lists
  const topActorsList = useMemo(() => {
    // Collect top actors based on volume in data
    const counts: Record<string, number> = {};
    allTitles.forEach(t => {
      t.castList.forEach(a => {
        if (a && a !== "Unknown Cast") counts[a] = (counts[a] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [allTitles]);

  const topDirectorsList = useMemo(() => {
    const counts: Record<string, number> = {};
    allTitles.forEach(t => {
      t.directorsList.forEach(d => {
        if (d && d !== "Unknown Director") counts[d] = (counts[d] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [allTitles]);

  // Custom tooltips
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip p-3 border border-[#e50914]/30 bg-zinc-950/95 text-xs text-white rounded shadow-2xl">
          <p className="font-bold text-[#e50914]">{payload[0].name || payload[0].payload.name || payload[0].payload.year}</p>
          <p className="text-gray-400 mt-1 font-light">Count: <span className="text-white font-bold">{payload[0].value.toLocaleString()}</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-12 pb-12">
      {/* ----------------- cinematiC HERO BANNER ----------------- */}
      <AnimatePresence mode="wait">
        {heroShow && (
          <motion.div
            key={heroShow.show_id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="relative rounded-2xl overflow-hidden min-h-[460px] sm:min-h-[560px] flex items-end p-6 sm:p-12 border border-white/5 bg-zinc-950 shadow-2xl group"
          >
            {/* Backdrop Zooming Image */}
            <div 
              className="absolute inset-0 bg-cover bg-center transition-transform duration-10000 scale-100 animate-[zoom_20s_infinite_linear]"
              style={{ 
                backgroundImage: `url(${heroShow.backdrop_path || (heroDetails?.backdrop_url || 'https://images.unsplash.com/photo-1574375927938-d5a98e8edd85?q=80&w=1400')})` 
              }}
            />

            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/45 to-transparent z-10" />

            {/* Content Details Grid */}
            <div className="relative w-full grid grid-cols-1 md:grid-cols-4 gap-8 z-20">
              {/* Left Column: Info & Action Buttons */}
              <div className="md:col-span-3 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#e50914] text-white text-[9px] font-black rounded-sm uppercase tracking-wider">
                    Featured {heroShow.type}
                  </span>
                  <span className="text-xs text-gray-300 font-semibold">
                    {heroShow.release_year}
                  </span>
                  <span className="text-xs text-gray-300 font-semibold bg-black/40 px-2 py-0.5 rounded border border-white/5">
                    {heroShow.duration}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 border border-white/10 bg-black/40 text-gray-300 rounded text-[9px] font-black uppercase">
                    {heroShow.rating}
                  </span>
                  {heroShow.imdb_rating > 0 && (
                    <span className="text-xs text-yellow-500 font-black flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-yellow-500/20">
                      IMDb {heroShow.imdb_rating}
                    </span>
                  )}
                  {heroShow.vote_average > 0 && (
                    <span className="text-xs text-emerald-400 font-black flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-emerald-500/20">
                      TMDb {heroShow.vote_average}
                    </span>
                  )}
                </div>

                <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none uppercase drop-shadow glow-text-red">
                  {heroShow.title}
                </h1>

                <p className="text-xs sm:text-sm text-gray-300 font-light leading-relaxed line-clamp-4 max-w-xl">
                  {heroShow.description}
                </p>

                {/* Genre Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {heroShow.genresList.map(g => (
                    <span key={g} className="px-2.5 py-0.5 bg-white/5 border border-white/10 text-gray-400 rounded-full text-[9px] font-medium tracking-wide">
                      {g}
                    </span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-3">
                  <button
                    onClick={() => openShowDetails(heroShow)}
                    className="px-6 py-2 sm:py-2.5 bg-white hover:bg-zinc-200 text-black rounded-md font-bold text-xs sm:text-sm flex items-center gap-2 shadow transition cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-black text-black" /> View Details
                  </button>
                  <button
                    onClick={() => toggleWatchlist(heroShow)}
                    className="px-6 py-2 sm:py-2.5 bg-zinc-800/80 hover:bg-zinc-800 text-white border border-white/10 rounded-md font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer"
                  >
                    {watchlist.some(w => w.show_id === heroShow.show_id) ? (
                      <>
                        <Check className="w-4 h-4 text-green-500" /> Watchlist
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" /> Add Watchlist
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: Poster Image */}
              <div className="hidden md:flex justify-center items-center">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={heroShow.show_id + "-poster"}
                  transition={{ duration: 0.5 }}
                  className="w-40 h-56 rounded-lg overflow-hidden border border-white/10 shadow-2xl relative bg-zinc-900 flex-shrink-0"
                >
                  <img
                    src={heroShow.poster_path || (heroDetails?.poster_path ? `https://image.tmdb.org/t/p/w342${heroDetails.poster_path}` : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=342')}
                    alt={heroShow.title}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------- FILTER BAR & CHIPS ----------------- */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Filter System</span>
            {isFilteringOrSearching && (
              <button 
                onClick={handleResetFilters}
                className="text-[10px] bg-red-600/25 border border-red-600/35 hover:bg-[#e50914] text-white px-2 py-0.5 rounded flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset Filters
              </button>
            )}
          </div>
          
          <span className="text-[10px] text-gray-400 font-light">
            Found <span className="font-bold text-white">{finalFilteredTitles.length.toLocaleString()}</span> matched titles
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Type Select */}
          <div>
            <label className="text-[9px] text-zinc-500 uppercase tracking-wider block mb-1 font-bold">Content Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilter("type", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-gray-300 focus:outline-none focus:border-[#e50914] cursor-pointer"
            >
              <option value="All" className="bg-zinc-950">All Content</option>
              <option value="Movie" className="bg-zinc-950">Movies</option>
              <option value="TV Show" className="bg-zinc-950">TV Shows</option>
            </select>
          </div>

          {/* Genre Select */}
          <div>
            <label className="text-[9px] text-zinc-500 uppercase tracking-wider block mb-1 font-bold">Genre</label>
            <select
              value={filters.genre}
              onChange={(e) => setFilter("genre", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-gray-300 focus:outline-none focus:border-[#e50914] cursor-pointer"
            >
              <option value="All" className="bg-zinc-950">All Genres</option>
              {filterOptions.genres.map(g => (
                <option key={g} value={g} className="bg-zinc-950">{g}</option>
              ))}
            </select>
          </div>

          {/* Country Select */}
          <div>
            <label className="text-[9px] text-zinc-500 uppercase tracking-wider block mb-1 font-bold">Country</label>
            <select
              value={filters.country}
              onChange={(e) => setFilter("country", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-gray-300 focus:outline-none focus:border-[#e50914] cursor-pointer"
            >
              <option value="All" className="bg-zinc-950">All Countries</option>
              {filterOptions.countries.map(c => (
                <option key={c} value={c} className="bg-zinc-950">{c}</option>
              ))}
            </select>
          </div>

          {/* Release period Select */}
          <div>
            <label className="text-[9px] text-zinc-500 uppercase tracking-wider block mb-1 font-bold">Release Period</label>
            <select
              value={filters.year}
              onChange={(e) => setFilter("year", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-gray-300 focus:outline-none focus:border-[#e50914] cursor-pointer"
            >
              <option value="All" className="bg-zinc-950">All Years</option>
              <option value="2020-2025" className="bg-zinc-950">Recent (2020-2025)</option>
              <option value="2010-2019" className="bg-zinc-950">2010s (2010-2019)</option>
              <option value="2000-2009" className="bg-zinc-950">2000s (2000-2009)</option>
              <option value="Before 2000" className="bg-zinc-950">Classic (Before 2000)</option>
            </select>
          </div>

          {/* IMDb Select */}
          <div>
            <label className="text-[9px] text-zinc-500 uppercase tracking-wider block mb-1 font-bold">IMDb Score</label>
            <select
              value={
                filters.imdbRatingRange[0] === 8.0 ? "8.0+" :
                filters.imdbRatingRange[0] === 7.0 ? "7.0+" :
                filters.imdbRatingRange[0] === 6.0 ? "6.0+" : "All"
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === "8.0+") setFilter("imdbRatingRange", [8.0, 10.0]);
                else if (val === "7.0+") setFilter("imdbRatingRange", [7.0, 10.0]);
                else if (val === "6.0+") setFilter("imdbRatingRange", [6.0, 10.0]);
                else setFilter("imdbRatingRange", [0.0, 10.0]);
              }}
              className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-gray-300 focus:outline-none focus:border-[#e50914] cursor-pointer"
            >
              <option value="All" className="bg-zinc-950">All Ratings</option>
              <option value="8.0+" className="bg-zinc-950">Excellent (8.0+)</option>
              <option value="7.0+" className="bg-zinc-950">Good (7.0+)</option>
              <option value="6.0+" className="bg-zinc-950">Above Average (6.0+)</option>
            </select>
          </div>

          {/* Runtime Select */}
          <div>
            <label className="text-[9px] text-zinc-500 uppercase tracking-wider block mb-1 font-bold">Runtime / Length</label>
            <select
              value={
                filters.runtimeBucket === "Short (< 95 min)" ? "Short (<90m)" :
                filters.duration[0] === 90 && filters.duration[1] === 130 ? "Standard (90-130m)" :
                filters.duration[0] === 130 ? "Long (>130m)" :
                filters.seasonCount[0] === 2 ? "Multi-Season" : "All"
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === "Short (<90m)") setFilter("runtimeBucket", "Short (< 95 min)");
                else if (val === "Standard (90-130m)") setMultipleFilters({ duration: [90, 130], type: "Movie", runtimeBucket: "All" });
                else if (val === "Long (>130m)") setMultipleFilters({ duration: [130, 250], type: "Movie", runtimeBucket: "All" });
                else if (val === "Multi-Season") setMultipleFilters({ seasonCount: [2, 25], type: "TV Show", runtimeBucket: "All" });
                else setMultipleFilters({ runtimeBucket: "All", duration: [0, 250], seasonCount: [1, 25] });
              }}
              className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-gray-300 focus:outline-none focus:border-[#e50914] cursor-pointer"
            >
              <option value="All" className="bg-zinc-950">All Lengths</option>
              <option value="Short (<90m)" className="bg-zinc-950">Short Movies (&lt;90m)</option>
              <option value="Standard (90-130m)" className="bg-zinc-950">Standard Movies (90-130m)</option>
              <option value="Long (>130m)" className="bg-zinc-950">Long Movies (&gt;130m)</option>
              <option value="Multi-Season" className="bg-zinc-950">Multi-Season Series</option>
            </select>
          </div>
        </div>
      </div>

      {/* ----------------- SEARCH OR FILTER DISPLAY GRID ----------------- */}
      {isFilteringOrSearching ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center pl-2 border-l-2 border-[#e50914]">
            <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
              Filtered Catalog Search ({finalFilteredTitles.length.toLocaleString()} Results)
            </h2>
            <button
              onClick={handleResetFilters}
              className="text-xs text-red-500 hover:text-red-400 font-bold hover:underline cursor-pointer"
            >
              Clear Search & Filter
            </button>
          </div>

          {finalFilteredTitles.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {finalFilteredTitles.slice(0, 48).map((show) => (
                <MovieCard key={show.show_id} show={show} onClick={() => openShowDetails(show)} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white/5 rounded-xl border border-white/5 space-y-3">
              <Search className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-sm text-gray-400 font-light">No titles matched your specific query parameters.</p>
              <button 
                onClick={resetFilters}
                className="px-4 py-2 bg-[#e50914] text-white text-xs font-bold uppercase rounded-lg hover:bg-[#b80710] transition"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ----------------- DEFAULT PORTAL CATEGORY VIEW ----------------- */
        <div className="space-y-8">
          
          {/* KPI METRIC CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 pt-2">
            {[
              { label: "Total Titles", value: kpis.totalTitles, icon: Film, isDec: false },
              { label: "Movies", value: kpis.movieCount, icon: Clapperboard, isDec: false },
              { label: "TV Shows", value: kpis.tvShowCount, icon: MonitorPlay, isDec: false },
              { label: "Countries", value: kpis.countriesCount, icon: Globe2, isDec: false },
              { label: "Genres", value: kpis.genresCount, icon: Sparkles, isDec: false },
              { label: "Avg IMDb", value: kpis.avgImdbRating, icon: Star, isDec: true },
              { label: "Avg TMDb", value: kpis.avgTmdbRating, icon: Star, isDec: true },
              { label: "Avg Length", value: kpis.avgMovieDuration, icon: Clock, isDec: false, unit: "m" },
            ].map((kpi, idx) => {
              const Icon = kpi.icon;
              return (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white/5 border border-white/5 rounded-xl p-3 text-center space-y-1 hover:border-[#e50914]/30 hover:shadow-lg transition duration-300"
                >
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mx-auto text-[#e50914]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">{kpi.label}</span>
                  <p className="text-sm sm:text-base font-black text-white">
                    {kpi.isDec ? (
                      <AnimatedDecimalCounter value={kpi.value} />
                    ) : (
                      <AnimatedCounter value={kpi.value} />
                    )}
                    {kpi.unit}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* CONTINUE WATCHING SECTION */}
          <div className="space-y-2">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide pl-2 border-l-2 border-[#e50914] select-none">
              {watchlist.length > 0 ? "Continue Watching / Watchlist" : "Recommended for You (Top Critic Picks)"}
            </h3>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide py-2 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {(watchlist.length > 0 ? watchlist : dynamicRows.topRatedImdb).map((show) => (
                <MovieCard key={show.show_id} show={show} onClick={() => openShowDetails(show)} />
              ))}
            </div>
          </div>

          {/* Content Rows */}
          <ContentRow title="Trending Now" items={dynamicRows.trending} onSelect={(s) => openShowDetails(s)} />
          <ContentRow title="Top Rated (IMDb)" items={dynamicRows.topRatedImdb} onSelect={(s) => openShowDetails(s)} />
          <ContentRow title="Top Rated (TMDb)" items={dynamicRows.topRatedTmdb} onSelect={(s) => openShowDetails(s)} />
          <ContentRow title="Recently Added" items={dynamicRows.recentlyAdded} onSelect={(s) => openShowDetails(s)} />
          <ContentRow title="Top Movies" items={dynamicRows.topMovies} onSelect={(s) => openShowDetails(s)} />
          <ContentRow title="Top TV Shows" items={dynamicRows.topTvShows} onSelect={(s) => openShowDetails(s)} />
          <ContentRow title="Award Winning Titles" items={dynamicRows.awardWinning} onSelect={(s) => openShowDetails(s)} />
          <ContentRow title="Family Friendly" items={dynamicRows.familyFriendly} onSelect={(s) => openShowDetails(s)} />
          <ContentRow title="Action Collection" items={dynamicRows.action} onSelect={(s) => openShowDetails(s)} />
          <ContentRow title="Comedy Collection" items={dynamicRows.comedy} onSelect={(s) => openShowDetails(s)} />
          <ContentRow title="Drama Collection" items={dynamicRows.drama} onSelect={(s) => openShowDetails(s)} />
          <ContentRow title="Horror Collection" items={dynamicRows.horror} onSelect={(s) => openShowDetails(s)} />
          <ContentRow title="Sci-Fi Collection" items={dynamicRows.scifi} onSelect={(s) => openShowDetails(s)} />
          <ContentRow title="Animation Collection" items={dynamicRows.animation} onSelect={(s) => openShowDetails(s)} />

          {/* TALENT ROW SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
            {/* Top Actors */}
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide pl-2 border-l-2 border-[#e50914] select-none flex items-center gap-1.5">
                <Users2 className="w-4 h-4 text-[#e50914]" /> Highest Billed Cast
              </h3>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide py-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {topActorsList.map(actor => (
                  <PersonCard 
                    key={actor.name} 
                    name={actor.name} 
                    subtitle={`${actor.count} Catalog Titles`} 
                    onClick={() => openDrillThrough("actor", actor.name)} 
                  />
                ))}
              </div>
            </div>

            {/* Top Directors */}
            <div className="space-y-4">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide pl-2 border-l-2 border-[#e50914] select-none flex items-center gap-1.5">
                <Clapperboard className="w-4 h-4 text-[#e50914]" /> Prominent Directors
              </h3>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide py-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {topDirectorsList.map(dir => (
                  <PersonCard 
                    key={dir.name} 
                    name={dir.name} 
                    subtitle={`${dir.count} Catalog Titles`} 
                    onClick={() => openDrillThrough("director", dir.name)} 
                  />
                ))}
              </div>
            </div>
          </div>

          {/* COMPACT ANALYTICS SUMMARY */}
          <div className="space-y-4 pt-6">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide pl-2 border-l-2 border-[#e50914] select-none flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-[#e50914]" /> Catalog Analytics Summary
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Releases over the years */}
              <div className="glass-card p-4 space-y-3 group">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Releases Trend (1990 - 2025)</span>
                  <button 
                    onClick={() => router.push("/content")}
                    className="p-1 bg-white/5 hover:bg-[#e50914] text-gray-400 hover:text-white rounded-lg transition text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    View Insights <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="h-48 text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      data={chartData.releases}
                      onClick={(state: any) => {
                        if (state && state.activeLabel) {
                          openDrillThrough("year", state.activeLabel.toString());
                        }
                      }}
                      className="cursor-crosshair"
                    >
                      <defs>
                        <linearGradient id="colorReleases" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e50914" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#e50914" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                      <XAxis dataKey="year" stroke="#404040" fontSize={10} tickLine={false} />
                      <YAxis stroke="#404040" fontSize={10} tickLine={false} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="total" name="Total Releases" stroke="#e50914" strokeWidth={1.5} fillOpacity={1} fill="url(#colorReleases)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Genres volume */}
              <div className="glass-card p-4 space-y-3 group">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Top Genres Distribution</span>
                  <button 
                    onClick={() => router.push("/content")}
                    className="p-1 bg-white/5 hover:bg-[#e50914] text-gray-400 hover:text-white rounded-lg transition text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    View Insights <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="h-48 text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={chartData.genres} 
                      layout="vertical" 
                      margin={{ left: 10, right: 10 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload[0]) {
                          openDrillThrough("genre", state.activePayload[0].payload.name);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" horizontal={false} />
                      <XAxis type="number" stroke="#404040" fontSize={9} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#404040" fontSize={9} tickLine={false} width={80} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Titles Count" fill="#e50914" radius={[0, 3, 3, 0]}>
                        {chartData.genres.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Production Countries */}
              <div className="glass-card p-4 space-y-3 group">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Top Production Geography</span>
                  <button 
                    onClick={() => router.push("/people")}
                    className="p-1 bg-white/5 hover:bg-[#e50914] text-gray-400 hover:text-white rounded-lg transition text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    View Geography <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="h-48 text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={chartData.countries} 
                      margin={{ bottom: 5 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload[0]) {
                          openDrillThrough("country", state.activePayload[0].payload.name);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                      <XAxis dataKey="name" stroke="#404040" fontSize={9} tickLine={false} />
                      <YAxis stroke="#404040" fontSize={9} tickLine={false} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Titles Count" fill="#404040" radius={[3, 3, 0, 0]}>
                        {chartData.countries.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Age Classifications */}
              <div className="glass-card p-4 space-y-3 group">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Censorship & Age Ratings</span>
                  <button 
                    onClick={() => router.push("/executive")}
                    className="p-1 bg-white/5 hover:bg-[#e50914] text-gray-400 hover:text-white rounded-lg transition text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    View Executive <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="h-48 text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.ratings}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                        onClick={(state: any) => {
                          if (state && state.name) {
                            setFilter("rating", state.name);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        {chartData.ratings.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- NETFLIX FOOTER METADATA ----------------- */}
      <footer className="pt-10 border-t border-white/5 space-y-4 text-center text-xs text-gray-600">
        <div className="flex flex-wrap items-center justify-center gap-6 text-gray-400">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            Database Updated: <span className="font-bold text-white">1990 - 2025 Complete</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-950 animate-pulse" />
            TMDb Status: <span className="font-bold text-white">Connected</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-950 animate-pulse" />
            OMDb Status: <span className="font-bold text-white">Connected</span>
          </div>
        </div>
        <p className="font-light text-[10px]">
          System Engine Version: 2.1.0-Turbopack. Netflix portal designs compiled successfully.
        </p>
      </footer>

      {/* ----------------- ACTOR DETAILS MODAL ----------------- */}
      <ActorDetailsModal
        actorName={selectedActor}
        isOpen={selectedActor !== ""}
        onClose={() => setSelectedActor("")}
        allTitles={allTitles}
        onShowSelect={(show) => {
          setSelectedActor("");
          openShowDetails(show);
        }}
      />

      {/* ----------------- DIRECTOR DETAILS MODAL ----------------- */}
      <DirectorDetailsModal
        directorName={selectedDirector}
        isOpen={selectedDirector !== ""}
        onClose={() => setSelectedDirector("")}
        allTitles={allTitles}
        onShowSelect={(show) => {
          setSelectedDirector("");
          openShowDetails(show);
        }}
      />
    </div>
  );
}
