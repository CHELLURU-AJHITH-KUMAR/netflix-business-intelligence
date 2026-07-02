"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, ArrowUpDown, ChevronLeft, ChevronRight, Film, Tv, Eye, HelpCircle, EyeOff, RotateCcw, AlertTriangle, Star, Info, Play } from "lucide-react";
import { NetflixTitle } from "@/lib/data";
import ShowDetailsModal from "@/components/ShowDetailsModal";

import { useGlobalFilter } from "@/lib/GlobalFilterContext";

export default function InteractiveAnalyticsClient() {
  const {
    filters,
    setFilter,
    resetFilters,
    filteredTitles,
    allTitles,
    openShowDetails,
  } = useGlobalFilter();

  // Local Sort, Search, and Page States
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"title" | "release_year" | "date_added">("title");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const isLoading = false;
  const [page, setPage] = useState(1);

  // Derive filter dropdown selections from the full catalog dynamically
  const filterOptions = useMemo(() => {
    const genres = new Set<string>();
    const countries = new Set<string>();
    const ratings = new Set<string>();
    
    allTitles.forEach(t => {
      t.genresList.forEach(g => genres.add(g));
      t.countriesList.forEach(c => { if (c) countries.add(c); });
      if (t.rating) ratings.add(t.rating);
    });

    return {
      genres: Array.from(genres).sort(),
      countries: Array.from(countries).sort(),
      ratings: Array.from(ratings).sort(),
    };
  }, [allTitles]);

  // Combine global filters with local search & sort
  const finalFilteredTitles = useMemo(() => {
    let result = [...filteredTitles];

    // Local search text
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) ||
        t.director.toLowerCase().includes(q) ||
        t.cast.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }

    // Client-side Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "title") {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === "release_year") {
        comparison = a.release_year - b.release_year;
      } else if (sortBy === "date_added") {
        const aTime = a.parsedDateAdded ? a.parsedDateAdded.getTime() : 0;
        const bTime = b.parsedDateAdded ? b.parsedDateAdded.getTime() : 0;
        comparison = aTime - bTime;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [filteredTitles, search, sortBy, sortOrder]);

  const itemsPerPage = 12;
  const totalCount = finalFilteredTitles.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  // Paginated chunk to show on active page
  const titles = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return finalFilteredTitles.slice(startIndex, startIndex + itemsPerPage);
  }, [finalFilteredTitles, page]);

  // Sync state with URL search params if present
  const searchParams = useSearchParams();

  useEffect(() => {
    const searchParam = searchParams.get("search");
    if (searchParam) {
      setSearch(searchParam);
    }
  }, [searchParams]);

  // Reset local search and pagination back to defaults
  const handleReset = () => {
    setSearch("");
    resetFilters();
    setSortBy("title");
    setSortOrder("asc");
    setPage(1);
  };

  // Adjust page limits
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Search input change helper (resets page back to 1)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };



  const handleSortChange = (field: "title" | "release_year" | "date_added") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // Render pagination indicator range
  const getPaginationRange = () => {
    const delta = 1;
    const range: number[] = [];
    for (
      let i = Math.max(2, page - delta);
      i <= Math.min(totalPages - 1, page + delta);
      i++
    ) {
      range.push(i);
    }

    if (page - delta > 2) {
      range.unshift(-1); // represent ellipsis
    }
    if (page + delta < totalPages - 1) {
      range.push(-2); // represent ellipsis
    }

    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  };

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-[#e50914] uppercase tracking-widest flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Interactive Query Dashboard
        </span>
        <h1 className="text-3xl font-black text-white tracking-tight uppercase">Interactive Analytics</h1>
        <p className="text-sm text-gray-400 font-light max-w-2xl">
          Apply real-time search strings, dynamic category selectors, and chronological limits to query the complete database.
        </p>
      </div>

      {/* Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Column: Filters Controls */}
        <div className="glass-card p-6 space-y-6 lg:sticky lg:top-24">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#e50914]" /> Filter Parameters
            </h3>
            <button
              onClick={handleReset}
              className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          {/* Search Box */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Search Keyword</label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Title, cast, description..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#e50914] placeholder-gray-600 transition"
              />
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
            </div>
          </div>

          {/* Category Type */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Show Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilter("type", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#e50914] transition cursor-pointer"
            >
              <option value="All" className="bg-[#141414] text-white">All Content</option>
              <option value="Movie" className="bg-[#141414] text-white">Movies Only</option>
              <option value="TV Show" className="bg-[#141414] text-white">TV Shows Only</option>
            </select>
          </div>

          {/* Release Year Ranges */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Release Period</label>
            <select
              value={filters.year}
              onChange={(e) => setFilter("year", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#e50914] transition cursor-pointer"
            >
              <option value="All" className="bg-[#141414] text-white">All Periods</option>
              <option value="2020-2025" className="bg-[#141414] text-white">Recent (2020 - 2025)</option>
              <option value="2015-2019" className="bg-[#141414] text-white">Late 2010s (2015 - 2019)</option>
              <option value="2010-2014" className="bg-[#141414] text-white">Early 2010s (2010 - 2014)</option>
              <option value="2000-2009" className="bg-[#141414] text-white">2000s (2000 - 2009)</option>
              <option value="1990-1999" className="bg-[#141414] text-white">1990s (1990 - 1999)</option>
              <option value="Before 1990" className="bg-[#141414] text-white">Classic (Before 1990)</option>
            </select>
          </div>

          {/* Genre Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Genre Category</label>
            <select
              value={filters.genre}
              onChange={(e) => setFilter("genre", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#e50914] transition cursor-pointer max-h-48"
            >
              <option value="All" className="bg-[#141414] text-white">All Genres</option>
              {filterOptions.genres.map((g) => (
                <option key={g} value={g} className="bg-[#141414] text-white">
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Country Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Country of Origin</label>
            <select
              value={filters.country}
              onChange={(e) => setFilter("country", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#e50914] transition cursor-pointer"
            >
              <option value="All" className="bg-[#141414] text-white">All Countries</option>
              {filterOptions.countries.map((c) => (
                <option key={c} value={c} className="bg-[#141414] text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Censorship Rating */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Censorship Rating</label>
            <select
              value={filters.rating}
              onChange={(e) => setFilter("rating", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#e50914] transition cursor-pointer"
            >
              <option value="All" className="bg-[#141414] text-white">All Ratings</option>
              {filterOptions.ratings.map((r) => (
                <option key={r} value={r} className="bg-[#141414] text-white">
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Column: Titles Grid & List Controls */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* List Toolbar */}
          <div className="glass-card p-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <span className="text-gray-400 font-light">
              {isLoading ? (
                "Processing catalog database..."
              ) : (
                <>
                  Found <span className="font-bold text-white">{totalCount.toLocaleString()}</span> titles matching query
                </>
              )}
            </span>

            {/* Sorting Tabs */}
            <div className="flex items-center gap-4">
              <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Sort By:</span>
              <div className="flex border border-white/10 rounded-lg overflow-hidden bg-black/40">
                {[
                  { id: "title", label: "Title" },
                  { id: "release_year", label: "Release Year" },
                  { id: "date_added", label: "Date Added" },
                ].map((item) => {
                  const isActive = sortBy === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSortChange(item.id as any)}
                      className={`px-3 py-2 border-r border-white/5 last:border-r-0 flex items-center gap-1 font-semibold uppercase text-[10px] tracking-wider transition ${
                        isActive
                          ? "bg-white/5 text-white"
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {item.label}
                      {isActive && (
                        <ArrowUpDown className={`w-3 h-3 text-[#e50914] transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="relative min-h-[400px]">
            {isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/10 backdrop-blur-xs rounded-xl z-20">
                <div className="w-8 h-8 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-400 font-light uppercase tracking-wider">Syncing database logs...</span>
              </div>
            ) : null}

            {titles.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {titles.map((show) => (
                  <InteractiveMovieCard
                    key={show.show_id}
                    show={show}
                    onClick={() => openShowDetails(show)}
                  />
                ))}
              </div>
            ) : !isLoading ? (
              <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
                <AlertTriangle className="w-12 h-12 text-gray-600 animate-bounce" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">No Records Match Filters</h4>
                <p className="text-xs text-gray-400 font-light max-w-sm">
                  We couldn't find any items matching those filters and terms in the catalog. Reset parameters and try again.
                </p>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 mt-2 bg-[#e50914] hover:bg-[#b80710] text-white rounded-lg text-xs font-bold uppercase transition"
                >
                  Clear Filters
                </button>
              </div>
            ) : null}
          </div>

          {/* Pagination */}
          {totalPages > 1 && !isLoading && (
            <div className="flex justify-center items-center gap-1.5 py-4">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="p-2 bg-white/5 border border-white/10 hover:border-[#e50914]/40 disabled:opacity-40 disabled:hover:border-white/10 text-white rounded-lg transition focus:outline-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {getPaginationRange().map((p, idx) => {
                if (p < 0) {
                  return (
                    <span key={`ell-${idx}`} className="px-3 py-1 text-gray-500 font-bold select-none">
                      ...
                    </span>
                  );
                }
                const isActive = page === p;
                return (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`px-3 py-1.5 border rounded-lg text-xs font-semibold tracking-wider transition focus:outline-none ${
                      isActive
                        ? "border-[#e50914] bg-[#e50914]/10 text-white font-bold"
                        : "border-white/10 hover:border-white/20 text-gray-400 hover:text-white"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="p-2 bg-white/5 border border-white/10 hover:border-[#e50914]/40 disabled:opacity-40 disabled:hover:border-white/10 text-white rounded-lg transition focus:outline-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

const posterCache: Record<string, string> = {};

const InteractiveMovieCard = React.memo(({ show, onClick }: { show: NetflixTitle; onClick: () => void }) => {
  const initialPoster = (show.poster_path && show.poster_path.startsWith("http"))
    ? show.poster_path
    : (posterCache[show.show_id] || null);

  const [isInView, setIsInView] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(initialPoster);
  const [isLoading, setIsLoading] = useState(!initialPoster);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialPoster) {
      setIsLoading(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "250px" }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [show.show_id, initialPoster]);

  useEffect(() => {
    if (initialPoster || !isInView || posterUrl) return;

    let active = true;
    const fetchPoster = async () => {
      try {
        const res = await fetch(`/api/titles/${show.show_id}/tmdb`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (active && data?.poster_path) {
          const url = `https://image.tmdb.org/t/p/w342${data.poster_path}`;
          posterCache[show.show_id] = url;
          setPosterUrl(url);
        }
      } catch (e) {
        // Fallback
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchPoster();
    return () => {
      active = false;
    };
  }, [isInView, show.show_id, posterUrl, initialPoster]);

  return (
    <motion.div
      ref={cardRef}
      layoutId={`show-card-${show.show_id}`}
      onClick={onClick}
      className="glass-card flex flex-col sm:flex-row h-auto sm:h-52 w-full overflow-hidden border border-white/5 hover:border-[#e50914]/40 hover:shadow-[0_12px_24px_rgba(229,9,20,0.18)] transition-all duration-300 group cursor-pointer relative hover:scale-[1.02] rounded-xl"
    >
      {/* Left Column: Poster Image */}
      <div className="relative w-full sm:w-36 h-48 sm:h-full flex-shrink-0 bg-zinc-900 overflow-hidden rounded-t-xl sm:rounded-l-xl sm:rounded-t-none">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={show.title}
            fill
            className="object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-110"
            sizes="(max-w-640px) 100vw, 144px"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex flex-col justify-between p-3.5 relative">
            {isLoading && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
            )}
            <span className="text-[8px] font-black uppercase text-[#e50914] tracking-wider">
              {show.type}
            </span>
            <span className="text-[11px] font-bold text-white line-clamp-3 leading-snug">
              {show.title}
            </span>
            <div className="text-[9px] text-zinc-500 font-mono">
              {show.release_year}
            </div>
          </div>
        )}
        {/* Hover overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
      </div>

      {/* Right Column: Content Information */}
      <div className="flex-grow p-4 sm:p-5 flex flex-col justify-between min-w-0 z-20">
        
        {/* Top Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-start gap-3">
            <h4 className="text-sm sm:text-base font-bold text-white line-clamp-1 group-hover:text-[#e50914] transition-colors duration-300 flex-grow">
              {show.title}
            </h4>
            
            {/* Play/Details Quick Indicator */}
            <span className="p-1 bg-[#e50914] text-white rounded-full scale-0 group-hover:scale-100 transition-transform duration-300 hidden sm:block">
              <Play className="w-2.5 h-2.5 fill-white" />
            </span>
          </div>

          {/* Badges and metadata */}
          <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-semibold text-gray-400">
            {/* Format Badge */}
            <span className={`px-2 py-0.5 rounded-full font-black uppercase tracking-wider text-[8px] border ${
              show.type === 'Movie' 
                ? 'bg-[#e50914]/15 border-[#e50914]/25 text-[#e50914]' 
                : 'bg-zinc-800 border-zinc-700 text-gray-300'
            }`}>
              {show.type}
            </span>

            {/* Release Year */}
            <span className="bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-full">
              {show.release_year}
            </span>

            {/* Runtime / Seasons */}
            <span className="bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-full">
              {show.duration}
            </span>

            {/* IMDb Rating */}
            {show.imdb_rating > 0 && (
              <span className="text-yellow-500 bg-black/40 border border-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-0.5 font-bold transition-all duration-300 group-hover:border-yellow-500/40">
                <Star className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" />
                {show.imdb_rating}
              </span>
            )}

            {/* TMDb Rating */}
            {show.vote_average > 0 && (
              <span className="text-emerald-400 bg-black/40 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-0.5 font-bold transition-all duration-300 group-hover:border-emerald-500/40">
                TMDb {show.vote_average.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Middle Section: Overview */}
        <p className="text-[11px] sm:text-xs text-zinc-400 font-light line-clamp-2 sm:line-clamp-3 leading-relaxed mt-2.5 flex-grow">
          {show.description}
        </p>

        {/* Bottom Section: Genres & Country */}
        <div className="border-t border-white/5 pt-3 mt-3 flex items-center justify-between text-[9px] text-gray-500 font-sans">
          <div className="flex flex-col gap-1 truncate max-w-[85%]">
            {/* Genres Row */}
            <div className="flex flex-wrap gap-1">
              {show.genresList.slice(0, 3).map((g) => (
                <span key={g} className="px-1.5 py-0.5 bg-white/5 border border-white/5 text-gray-400 rounded">
                  {g}
                </span>
              ))}
            </div>
            
            {/* Country Row */}
            <span className="truncate italic text-[8.5px] mt-0.5">
              Country: {show.countriesList.join(", ") || show.country || "Unknown"}
            </span>
          </div>
          
          <button className="px-2 py-1.5 bg-[#e50914] text-white rounded-md text-[8px] font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1 select-none whitespace-nowrap">
            View Details
            <Info className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

InteractiveMovieCard.displayName = "InteractiveMovieCard";
