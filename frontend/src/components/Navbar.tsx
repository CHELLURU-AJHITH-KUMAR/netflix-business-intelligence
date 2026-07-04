"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Menu, X, BarChart3, TrendingUp, Users2, Search, Film, Bell, Moon, Sun, 
  User, Activity, BookOpen, Layers, Tv, Clock, Globe2, Sparkles, ArrowUpDown 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip as ChartTooltip 
} from "recharts";
import ShowDetailsModal from "@/components/ShowDetailsModal";
import DirectorDetailsModal from "@/components/DirectorDetailsModal";
import { NetflixTitle } from "@/lib/data";
import { useGlobalFilter } from "@/lib/GlobalFilterContext";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>({
    movies: [],
    tvShows: [],
    actors: [],
    directors: [],
    genres: []
  });
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Director details modal state
  const [selectedDirector, setSelectedDirector] = useState("");
  const [directorTitles, setDirectorTitles] = useState<NetflixTitle[]>([]);
  const [isDirectorModalOpen, setIsDirectorModalOpen] = useState(false);

  // AI Analytics Assistant states from global context
  const {
    filters,
    aiQuery,
    setAiQuery,
    aiResponse,
    setAiResponse,
    showAiPanel,
    setShowAiPanel,
    setFilter,
    openShowDetails,
  } = useGlobalFilter();

  const [aiLoading, setAiLoading] = useState(false);
  const [loadingLog, setLoadingLog] = useState("");

  const searchRef = useRef<HTMLDivElement>(null);

  // Auto-update AI recommendations when filters change and the panel is open
  useEffect(() => {
    const syncAi = async () => {
      setAiLoading(true);
      setAiResponse(null);
      setLoadingLog("Accessing Netflix dataset index...");
      try {
        const params = new URLSearchParams({ q: "explain_filters" });
        if (filters.type !== "All") params.append("type", filters.type);
        if (filters.genre !== "All") params.append("genre", filters.genre);
        if (filters.country !== "All") params.append("country", filters.country);
        if (filters.language !== "All") params.append("language", filters.language);
        if (filters.year !== "All") params.append("year", filters.year);
        if (filters.director !== "All") params.append("director", filters.director);
        if (filters.actor !== "All") params.append("actor", filters.actor);

        const res = await fetch(`/api/assistant?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setAiResponse(data);
        }
      } catch (e) {
        console.error("AI Assistant auto-sync failed:", e);
      } finally {
        setAiLoading(false);
      }
    };

    if (showAiPanel) {
      syncAi();
    }
  }, [filters, showAiPanel, setAiResponse]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Sync route query parameters for root page
  useEffect(() => {
    if (typeof window !== "undefined") {
      const query = new URLSearchParams(window.location.search).get("search") || "";
      setSearchValue(query);
    }
  }, [pathname]);

  // Debouncing Search Input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // Load Recent Searches
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("recent_analytics_searches");
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Fetch results via debounced search API
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults({ movies: [], tvShows: [], actors: [], directors: [], genres: [] });
      return;
    }

    let active = true;
    const fetchResults = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        if (res.ok) {
          const data = await res.json();
          if (active) setSearchResults(data);
        }
      } catch (e) {
        console.error("Global Search failed:", e);
      } finally {
        if (active) setIsSearching(false);
      }
    };

    fetchResults();
    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addRecentSearch = (term: string) => {
    const cleaned = term.trim();
    if (!cleaned) return;
    const updated = [cleaned, ...recentSearches.filter(t => t !== cleaned)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recent_analytics_searches", JSON.stringify(updated));
  };

  const getFlattenedItems = () => {
    const items: any[] = [];
    if (!searchResults) return items;
    (searchResults.movies || []).forEach((m: any) => items.push({ type: "Movie", ...m }));
    (searchResults.tvShows || []).forEach((t: any) => items.push({ type: "TV Show", ...t }));
    (searchResults.actors || []).forEach((a: any) => items.push({ type: "Actor", ...a }));
    (searchResults.directors || []).forEach((d: any) => items.push({ type: "Director", ...d }));
    (searchResults.genres || []).forEach((g: any) => items.push({ type: "Genre", ...g }));
    return items;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      addRecentSearch(searchValue);
      setShowDropdown(false);
      router.push(`/?search=${encodeURIComponent(searchValue.trim())}`);
    } else {
      router.push("/");
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchValue(val);
    setShowDropdown(true);
    setActiveIndex(-1);
    
    // Maintain old home page search instant updates
    if (pathname === "/") {
      if (val.trim()) {
        router.replace(`/?search=${encodeURIComponent(val.trim())}`);
      } else {
        router.replace("/");
      }
      const event = new CustomEvent("navbarSearch", { detail: val });
      window.dispatchEvent(event);
    }
  };

  const handleMovieSelect = (show: NetflixTitle) => {
    addRecentSearch(show.title);
    openShowDetails(show);
    setShowDropdown(false);
  };

  const handleActorSelect = (actorName: string) => {
    addRecentSearch(actorName);
    setShowDropdown(false);
    router.push(`/people?search=${encodeURIComponent(actorName)}`);
  };

  const handleDirectorSelect = async (directorName: string) => {
    addRecentSearch(directorName);
    setShowDropdown(false);
    try {
      const res = await fetch(`/api/titles?search=${encodeURIComponent(directorName)}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setDirectorTitles(data.titles || []);
        setSelectedDirector(directorName);
        setIsDirectorModalOpen(true);
      }
    } catch (e) {
      console.error("Failed to load director filmography:", e);
    }
  };

  const handleGenreSelect = (genreName: string) => {
    addRecentSearch(genreName);
    setShowDropdown(false);
    router.push(`/interactive?genre=${encodeURIComponent(genreName)}`);
  };

  const handleCountrySelect = (countryName: string) => {
    addRecentSearch(countryName);
    setShowDropdown(false);
    router.push(`/people?search=${encodeURIComponent(countryName)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const flattened = getFlattenedItems();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => (prev < flattened.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : flattened.length - 1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < flattened.length) {
        e.preventDefault();
        const activeItem = flattened[activeIndex];
        if (activeItem.type === "Movie" || activeItem.type === "TV Show") {
          handleMovieSelect(activeItem);
        } else if (activeItem.type === "Actor") {
          handleActorSelect(activeItem.name);
        } else if (activeItem.type === "Director") {
          handleDirectorSelect(activeItem.name);
        } else if (activeItem.type === "Genre") {
          handleGenreSelect(activeItem.name);
        }
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  };

  const simulateLoadingLogs = (query: string) => {
    const logs = [
      "Accessing Netflix dataset index...",
      "Analyzing 37,819 catalog items...",
      "Calculating format ratio distributions...",
      "Compiling ratings metadata aggregates...",
      "Formatting business intelligence metrics..."
    ];
    let i = 0;
    setLoadingLog(logs[0]);
    const interval = setInterval(() => {
      i++;
      if (i < logs.length) {
        setLoadingLog(logs[i]);
      } else {
        clearInterval(interval);
      }
    }, 450);
    return interval;
  };

  const askAi = async (questionText: string) => {
    if (!questionText.trim()) return;
    setAiLoading(true);
    setAiResponse(null);
    const intervalId = simulateLoadingLogs(questionText);
    try {
      const res = await fetch(`/api/assistant?q=${encodeURIComponent(questionText)}`);
      if (res.ok) {
        const data = await res.json();
        setAiResponse(data);
      }
    } catch (e) {
      console.error("AI Assistant query failed:", e);
    } finally {
      clearInterval(intervalId);
      setAiLoading(false);
    }
  };

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (aiQuery.trim()) {
      askAi(aiQuery);
    }
  };

  const handleRecommendationClick = (r: any) => {
    setShowAiPanel(false);
    if (r.actionType === "genre") {
      setFilter("genre", r.actionValue);
    } else if (r.actionType === "country") {
      setFilter("country", r.actionValue);
    } else if (r.actionType === "actor") {
      setFilter("actor", r.actionValue);
    } else if (r.actionType === "director") {
      setFilter("director", r.actionValue);
    }
  };

  const navItems = [
    { name: "Home", href: "/", icon: Film },
    { name: "Executive Overview", href: "/executive", icon: BarChart3 },
    { name: "Content Insights", href: "/content", icon: TrendingUp },
    { name: "People & Geography", href: "/people", icon: Users2 },
    { name: "Interactive Analytics", href: "/interactive", icon: Search },
    { name: "Predictive Analytics", href: "/predictive", icon: Sparkles },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-black/90 backdrop-blur-md border-b border-white/5 py-3 shadow-lg shadow-black/80"
          : "bg-gradient-to-b from-black via-black/50 to-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-xl sm:text-2xl font-black tracking-tighter text-[#e50914] group-hover:scale-102 transition-transform duration-300">
                NETFLIX<span className="text-white font-light text-xs sm:text-sm ml-1 tracking-wider uppercase">Analytics</span>
              </span>
            </Link>
          </div>

          {/* Center: Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-md text-xs lg:text-sm font-medium tracking-wide transition-all duration-300 ${
                    isActive
                      ? "text-white bg-white/5 border border-white/10"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#e50914]" : "text-gray-400"}`} />
                  {item.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#e50914] rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right: Search, Notifications, Profile, Theme Indicator */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Search Input Box */}
            <div ref={searchRef} className="relative">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Titles, people, genres..."
                  value={searchValue}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  onKeyDown={handleKeyDown}
                  className="bg-black/50 border border-white/10 hover:border-white/20 focus:border-[#e50914] text-xs text-white placeholder-gray-500 rounded-full pl-8 pr-4 py-1.5 w-48 sm:w-56 focus:outline-none transition-all duration-300"
                />
                <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 pointer-events-none" />
                {isSearching && (
                  <div className="w-3 h-3 border border-t-transparent border-[#e50914] rounded-full animate-spin absolute right-3 pointer-events-none" />
                )}
              </form>

              {/* Dropdown Menu */}
              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute top-11 right-0 w-[320px] sm:w-[400px] bg-black/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(229,9,20,0.1)] p-4 overflow-y-auto max-h-[480px] z-50 text-xs text-gray-300 scrollbar-thin"
                  >
                    {!searchValue.trim() ? (
                      /* Empty search state */
                      <div className="space-y-4 text-left">
                        {/* Recent Searches */}
                        {recentSearches.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Recent Searches</span>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {recentSearches.map(term => (
                                <button
                                  key={term}
                                  onClick={() => handleSearchChange(term)}
                                  className="px-2.5 py-1 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 rounded-full text-[10px] text-gray-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
                                >
                                  <span>{term}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Trending Searches */}
                        <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Trending Titles</span>
                            <div className="space-y-1 pt-1">
                              {["Squid Game", "Stranger Things", "Extraction", "Wednesday", "Black Mirror"].map((term) => (
                                <button
                                  key={term}
                                  onClick={() => handleSearchChange(term)}
                                  className="w-full text-left py-1 hover:text-[#e50914] text-[11px] text-gray-400 font-medium transition cursor-pointer flex items-center gap-1.5"
                                >
                                  <span className="text-red-500 text-[10px]">📈</span> {term}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3">
                            {/* Popular Genres */}
                            <div className="space-y-1">
                              <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Popular Genres</span>
                              <div className="flex flex-wrap gap-1 pt-1">
                                {["Drama", "Comedy", "Action", "Horror", "Documentary"].map(g => (
                                  <button
                                    key={g}
                                    onClick={() => handleGenreSelect(g)}
                                    className="px-1.5 py-0.5 bg-[#e50914]/10 hover:bg-[#e50914] hover:text-white border border-[#e50914]/20 rounded text-[9px] text-[#e50914] font-semibold transition cursor-pointer"
                                  >
                                    {g}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Popular Actors */}
                            <div className="space-y-1">
                              <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Top Actors</span>
                              <div className="flex flex-wrap gap-1 pt-1">
                                {["Shah Rukh Khan", "Nicolas Cage", "Robert De Niro", "Al Pacino"].map(actor => (
                                  <button
                                    key={actor}
                                    onClick={() => handleActorSelect(actor)}
                                    className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 rounded text-[9px] text-gray-300 transition cursor-pointer"
                                  >
                                    👤 {actor}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Active Query Results */
                      <div className="space-y-4 text-left">
                        {getFlattenedItems().length > 0 ? (
                          <div className="space-y-3.5">
                            {/* Movies Group */}
                            {(searchResults.movies || []).length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Movies</span>
                                <div className="space-y-0.5 pt-1">
                                  {searchResults.movies.map((m: any) => {
                                    const fIndex = getFlattenedItems().findIndex(x => x.show_id === m.show_id);
                                    const isActive = activeIndex === fIndex;
                                    return (
                                      <div
                                        key={m.show_id}
                                        onClick={() => handleMovieSelect(m)}
                                        className={`flex items-center gap-3 p-1.5 rounded-lg transition duration-200 cursor-pointer ${
                                          isActive ? "bg-[#e50914]/15 border-l-2 border-l-[#e50914]" : "hover:bg-white/5"
                                        }`}
                                      >
                                        <div className="w-8 h-11 bg-zinc-900 border border-white/5 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                                          {m.poster_path ? (
                                            <img src={m.poster_path} alt={m.title} className="w-full h-full object-cover" />
                                          ) : (
                                            <Film className="w-3.5 h-3.5 text-zinc-700" />
                                          )}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                          <p className="font-bold text-white text-[11px] truncate">{m.title}</p>
                                          <p className="text-[9px] text-gray-400 font-mono">Released: {m.release_year} | {m.duration}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[9px] font-mono flex-shrink-0">
                                          {m.imdb_rating > 0 && <span className="text-yellow-500 font-bold">⭐{m.imdb_rating.toFixed(1)}</span>}
                                          {m.vote_average > 0 && <span className="text-emerald-400 font-bold">🔥{m.vote_average.toFixed(1)}</span>}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* TV Shows Group */}
                            {(searchResults.tvShows || []).length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">TV Shows</span>
                                <div className="space-y-0.5 pt-1">
                                  {searchResults.tvShows.map((t: any) => {
                                    const fIndex = getFlattenedItems().findIndex(x => x.show_id === t.show_id);
                                    const isActive = activeIndex === fIndex;
                                    return (
                                      <div
                                        key={t.show_id}
                                        onClick={() => handleMovieSelect(t)}
                                        className={`flex items-center gap-3 p-1.5 rounded-lg transition duration-200 cursor-pointer ${
                                          isActive ? "bg-[#e50914]/15 border-l-2 border-l-[#e50914]" : "hover:bg-white/5"
                                        }`}
                                      >
                                        <div className="w-8 h-11 bg-zinc-900 border border-white/5 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                                          {t.poster_path ? (
                                            <img src={t.poster_path} alt={t.title} className="w-full h-full object-cover" />
                                          ) : (
                                            <Film className="w-3.5 h-3.5 text-zinc-700" />
                                          )}
                                        </div>
                                        <div className="flex-grow min-w-0">
                                          <p className="font-bold text-white text-[11px] truncate">{t.title}</p>
                                          <p className="text-[9px] text-gray-400 font-mono">Released: {t.release_year} | {t.duration}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[9px] font-mono flex-shrink-0">
                                          {t.imdb_rating > 0 && <span className="text-yellow-500 font-bold">⭐{t.imdb_rating.toFixed(1)}</span>}
                                          {t.vote_average > 0 && <span className="text-emerald-400 font-bold">🔥{t.vote_average.toFixed(1)}</span>}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Actors Group */}
                            {(searchResults.actors || []).length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Actors</span>
                                <div className="space-y-0.5 pt-1">
                                  {searchResults.actors.map((a: any) => {
                                    const fIndex = getFlattenedItems().findIndex(x => x.name === a.name && x.type === "Actor");
                                    const isActive = activeIndex === fIndex;
                                    return (
                                      <div
                                        key={a.name}
                                        onClick={() => handleActorSelect(a.name)}
                                        className={`flex items-center justify-between p-1.5 rounded-lg transition duration-200 cursor-pointer ${
                                          isActive ? "bg-[#e50914]/15 border-l-2 border-l-[#e50914]" : "hover:bg-white/5"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs">👤</span>
                                          <span className="font-bold text-white text-[11px]">{a.name}</span>
                                        </div>
                                        <span className="text-[9px] text-gray-500 font-mono">{a.count} matching titles</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Directors Group */}
                            {(searchResults.directors || []).length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Directors</span>
                                <div className="space-y-0.5 pt-1">
                                  {searchResults.directors.map((d: any) => {
                                    const fIndex = getFlattenedItems().findIndex(x => x.name === d.name && x.type === "Director");
                                    const isActive = activeIndex === fIndex;
                                    return (
                                      <div
                                        key={d.name}
                                        onClick={() => handleDirectorSelect(d.name)}
                                        className={`flex items-center justify-between p-1.5 rounded-lg transition duration-200 cursor-pointer ${
                                          isActive ? "bg-[#e50914]/15 border-l-2 border-l-[#e50914]" : "hover:bg-white/5"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs">🎬</span>
                                          <span className="font-bold text-white text-[11px]">{d.name}</span>
                                        </div>
                                        <span className="text-[9px] text-gray-500 font-mono">{d.count} titles directed</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Genres Group */}
                            {(searchResults.genres || []).length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Genres</span>
                                <div className="space-y-0.5 pt-1">
                                  {searchResults.genres.map((g: any) => {
                                    const fIndex = getFlattenedItems().findIndex(x => x.name === g.name && x.type === "Genre");
                                    const isActive = activeIndex === fIndex;
                                    return (
                                      <div
                                        key={g.name}
                                        onClick={() => handleGenreSelect(g.name)}
                                        className={`flex items-center justify-between p-1.5 rounded-lg transition duration-200 cursor-pointer ${
                                          isActive ? "bg-[#e50914]/15 border-l-2 border-l-[#e50914]" : "hover:bg-white/5"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs">🏷️</span>
                                          <span className="font-bold text-white text-[11px]">{g.name}</span>
                                        </div>
                                        <span className="text-[9px] text-gray-500 font-mono">{g.count} titles</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="py-6 text-center text-gray-500">
                            <p>No results found for <span className="text-white font-bold">"{searchValue}"</span></p>
                            <p className="text-[10px] mt-1">Try searching another title, cast, or country name.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* AI Insights Toggle Button */}
            <button
              onClick={() => setShowAiPanel(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#e50914]/15 hover:bg-[#e50914] text-white text-xs font-bold rounded-full border border-[#e50914]/30 hover:border-[#e50914]/50 transition duration-300 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#e50914]" />
              <span className="hidden sm:inline">AI Insights</span>
            </button>

            {/* Dark Mode Locked Indicator */}
            <div className="text-gray-400 hover:text-white transition duration-300 flex items-center gap-1 cursor-pointer" title="Dark Mode Active">
              <Moon className="w-4 h-4 fill-yellow-500 text-yellow-500" />
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfile(false);
                }}
                className="text-gray-400 hover:text-white transition duration-300 focus:outline-none relative p-1.5"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#e50914] rounded-full ring-2 ring-black" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-2xl p-4 space-y-3 z-50 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="font-bold text-white uppercase tracking-wider text-[10px]">Updates & Alerts</span>
                    <span className="text-[9px] bg-red-600/20 text-[#e50914] px-1.5 py-0.5 rounded font-black uppercase">Live Status</span>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2 hover:bg-white/5 rounded border border-white/5 transition flex items-start gap-2">
                      <Activity className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-white">Database Loaded Successfully</p>
                        <p className="text-[10px] text-gray-400">37,819 Netflix titles compiled.</p>
                      </div>
                    </div>
                    <div className="p-2 hover:bg-white/5 rounded border border-white/5 transition flex items-start gap-2">
                      <Activity className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-white">TMDb Connection Stable</p>
                        <p className="text-[10px] text-gray-400">Backdrop art & cast databases online.</p>
                      </div>
                    </div>
                    <div className="p-2 hover:bg-white/5 rounded border border-white/5 transition flex items-start gap-2">
                      <Activity className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-white">OMDb Integration Connected</p>
                        <p className="text-[10px] text-gray-400">Rotten Tomatoes & Metascore ratings active.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowProfile(!showProfile);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-1.5 focus:outline-none p-0.5 rounded-sm hover:ring-2 hover:ring-white transition"
              >
                {/* Netflix-style avatar */}
                <div className="w-7 h-7 bg-[#e50914] rounded-sm flex items-center justify-center font-black text-xs text-white">
                  A
                </div>
              </button>

              {showProfile && (
                <div className="absolute right-0 mt-3 w-56 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50 text-xs">
                  <div className="p-3 border-b border-white/5 bg-white/5">
                    <p className="font-semibold text-white">Admin Account</p>
                    <p className="text-[10px] text-gray-400">Netflix Analytics Administrator</p>
                  </div>
                  <div className="p-1 space-y-0.5">
                    <div className="w-full text-left px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 transition rounded cursor-default">
                      Catalog: <span className="font-bold text-white">37,819 Titles</span>
                    </div>
                    <div className="w-full text-left px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 transition rounded cursor-default">
                      Active Key: <span className="font-bold text-emerald-400">OMDb Enriched</span>
                    </div>
                    <div className="w-full text-left px-3 py-2 text-gray-400 hover:text-white hover:bg-white/5 transition rounded cursor-default border-t border-white/5 mt-1">
                      Mode: <span className="font-black text-[#e50914] tracking-widest text-[9px]">Enterprise Portal</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-4">
            {/* Search Input Box */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <input
                type="text"
                placeholder="Search..."
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="bg-black/50 border border-white/10 focus:border-[#e50914] text-xs text-white placeholder-gray-500 rounded-full pl-8 pr-3 py-1 w-28 sm:w-36 focus:outline-none transition-all duration-300"
              />
              <Search className="w-3 h-3 text-gray-500 absolute left-2.5 pointer-events-none" />
            </form>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-white/5 focus:outline-none transition duration-300"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden absolute top-14 left-0 right-0 bg-black/95 backdrop-blur-xl border-b border-white/10 transition-all duration-300 origin-top ${
          isOpen ? "opacity-100 scale-y-100 py-4" : "opacity-0 scale-y-0 h-0 pointer-events-none overflow-hidden"
        }`}
      >
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-md text-base font-medium transition duration-300 ${
                  isActive
                    ? "bg-[#e50914]/10 text-white border-l-4 border-[#e50914]"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-[#e50914]" : "text-gray-400"}`} />
                {item.name}
              </Link>
            );
          })}
          {/* AI Insights Link in mobile menu */}
          <button
            onClick={() => {
              setIsOpen(false);
              setShowAiPanel(true);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-base font-medium text-[#e50914] hover:bg-white/5 hover:text-white transition duration-300 cursor-pointer"
          >
            <Sparkles className="w-5 h-5 text-[#e50914] animate-pulse" />
            AI Insights Assistant
          </button>
        </div>
      </div>
      {/* Director Modal */}
      {selectedDirector && (
        <DirectorDetailsModal
          directorName={selectedDirector}
          isOpen={isDirectorModalOpen}
          onClose={() => {
            setSelectedDirector("");
            setIsDirectorModalOpen(false);
          }}
          allTitles={directorTitles}
          onShowSelect={(show) => {
            setIsDirectorModalOpen(false);
            openShowDetails(show);
          }}
        />
      )}

      {/* AI Insights Sliding Panel */}
      <AnimatePresence>
        {showAiPanel && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAiPanel(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full max-w-[450px] bg-[#0a0a0a]/98 backdrop-blur-2xl border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.9),-10px_0_30px_rgba(229,9,20,0.05)] p-6 overflow-y-auto flex flex-col z-50 text-gray-300 font-sans"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-4">
                <div>
                  <span className="text-[9px] font-black uppercase text-[#e50914] tracking-widest font-mono flex items-center gap-1">
                    <Sparkles className="w-3 h-3 animate-pulse text-[#e50914]" /> Netflix AI Analytics
                  </span>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider mt-1">
                    AI Insights Assistant
                  </h3>
                  <p className="text-[10px] text-gray-500 font-light mt-0.5">
                    Query catalog trends and production indicators in real-time.
                  </p>
                </div>
                <button
                  onClick={() => setShowAiPanel(false)}
                  className="p-1.5 bg-white/5 hover:bg-[#e50914] text-gray-400 hover:text-white rounded-full border border-white/10 hover:border-[#e50914]/40 transition duration-300 focus:outline-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat / Query Body */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                {aiLoading && (
                  /* Loading State */
                  <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="w-8 h-8 border-3 border-[#e50914] border-t-transparent rounded-full animate-spin" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white animate-pulse">Running Catalog Calculations...</p>
                      <p className="text-[10px] text-gray-500 font-mono">{loadingLog}</p>
                    </div>
                  </div>
                )}

                {!aiLoading && !aiResponse && (
                  /* Suggested Questions list */
                  <div className="space-y-4 text-left">
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-[11px] leading-relaxed text-gray-400">
                      Welcome to the **AI Analytics Assistant**. Ask natural language questions to compute aggregates, growth trends, language shares, and cast listings directly over the loaded database.
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Suggested Analytics Queries</span>
                      <div className="flex flex-col gap-1.5">
                        {[
                          "Which genres are growing the fastest?",
                          "Which countries produce the most Netflix content?",
                          "Compare Movies vs TV Shows.",
                          "Which language dominates the catalog?",
                          "Show the highest-rated genres.",
                          "Which release years added the most content?",
                          "What is the average IMDb rating by genre?",
                          "Which countries have the highest-rated titles?",
                          "Which actors appear most frequently?",
                          "Which directors have the largest catalog?"
                        ].map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setAiQuery(q);
                              askAi(q);
                            }}
                            className="w-full text-left p-2.5 bg-white/5 border border-white/5 hover:border-[#e50914]/30 hover:bg-[#e50914]/10 rounded-lg text-[10px] text-gray-300 hover:text-white transition duration-200 cursor-pointer"
                          >
                            📊 {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {!aiLoading && aiResponse && (
                  /* Active Analysis Response */
                  <div className="space-y-5 text-left">
                    {/* Executive Summary */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase text-[#e50914] tracking-wider">Executive Summary</span>
                      <div className="bg-[#e50914]/5 border border-[#e50914]/20 rounded-xl p-4 text-[11px] text-white font-medium leading-relaxed shadow-lg">
                        {aiResponse.summary}
                      </div>
                    </div>

                    {/* KPI Cards */}
                    {aiResponse.kpis && (
                      <div className="grid grid-cols-3 gap-2">
                        {aiResponse.kpis.map((k: any) => (
                          <div key={k.label} className="bg-white/5 border border-white/5 p-2 rounded text-center">
                            <span className="text-[8px] text-gray-500 font-bold uppercase block tracking-wider truncate">{k.label}</span>
                            <span className="text-[11px] font-black text-white mt-0.5 block truncate" title={k.value}>{k.value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Supporting Visual Charts */}
                    {aiResponse.chartData && aiResponse.chartData.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Supporting Statistics</span>
                        
                        {aiResponse.chartType === "bar" && (
                          <div className="h-44 bg-zinc-950/40 p-2.5 rounded-xl border border-white/5">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={aiResponse.chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                <XAxis dataKey="name" stroke="#525252" fontSize={8} tickLine={false} />
                                <YAxis stroke="#525252" fontSize={9} tickLine={false} />
                                <ChartTooltip content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="bg-black border border-[#e50914]/40 p-2 rounded text-[10px] text-white font-mono">
                                        {payload[0].name}: <span className="font-bold text-[#e50914]">{payload[0].value}</span>
                                      </div>
                                    );
                                  }
                                  return null;
                                }} />
                                <Bar dataKey="value" fill="#e50914" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {aiResponse.chartType === "line" && (
                          <div className="h-44 bg-zinc-950/40 p-2.5 rounded-xl border border-white/5">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={aiResponse.chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                                <XAxis dataKey="name" stroke="#525252" fontSize={8} tickLine={false} />
                                <YAxis stroke="#525252" fontSize={9} tickLine={false} />
                                <ChartTooltip content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="bg-black border border-[#e50914]/40 p-2 rounded text-[10px] text-white font-mono">
                                        Year {payload[0].name}: <span className="font-bold text-[#e50914]">{payload[0].value}</span>
                                      </div>
                                    );
                                  }
                                  return null;
                                }} />
                                <Line type="monotone" dataKey="value" stroke="#e50914" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}

                        {aiResponse.chartType === "pie" && (
                          <div className="h-44 bg-zinc-950/40 p-2.5 rounded-xl border border-white/5">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={aiResponse.chartData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={30}
                                  outerRadius={55}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {aiResponse.chartData.map((entry: any, index: number) => {
                                    const colors = ["#e50914", "#b3070f", "#80050a", "#4d0306", "#260103"];
                                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                  })}
                                </Pie>
                                <ChartTooltip content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="bg-black border border-white/10 p-2 rounded text-[10px] text-white font-mono">
                                        {payload[0].name}: <span className="font-bold">{payload[0].value}</span>
                                      </div>
                                    );
                                  }
                                  return null;
                                }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Key Findings List */}
                    {aiResponse.findings && (
                      <div className="space-y-2">
                        <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Key Findings & Details</span>
                        <div className="bg-white/2 rounded-xl p-3 border border-white/5 space-y-2">
                          {aiResponse.findings.map((f: any) => (
                            <div key={f.label} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0 text-[10px] sm:text-[11px]">
                              <span className="font-semibold text-white">{f.label}</span>
                              <div className="text-right">
                                <span className="text-[#e50914] font-bold font-mono">{f.value}</span>
                                {f.extra && <span className="text-gray-500 block text-[9px] font-mono mt-0.5">{f.extra}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {aiResponse.recommendations && aiResponse.recommendations.length > 0 && (
                      <div className="space-y-2.5">
                        <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Interactive Recommendations</span>
                        <div className="space-y-2">
                          {aiResponse.recommendations.map((r: any, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => handleRecommendationClick(r)}
                              className="w-full text-left p-3 bg-white/5 border border-white/5 hover:border-[#e50914]/30 hover:bg-[#e50914]/10 rounded-lg text-[10px] text-gray-300 hover:text-white transition duration-200 flex items-center justify-between gap-3 cursor-pointer"
                            >
                              <span>💡 {r.text}</span>
                              <span className="text-[#e50914] font-bold">Filter Dashboard →</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chat Input form at the bottom */}
              <div className="border-t border-white/5 pt-4 mt-4">
                <form onSubmit={handleAiSubmit} className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Ask assistant something else..."
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    disabled={aiLoading}
                    className="bg-black border border-white/10 hover:border-white/20 focus:border-[#e50914] text-xs text-white placeholder-gray-500 rounded-full pl-4 pr-10 py-2.5 w-full focus:outline-none transition-all duration-300"
                  />
                  <button
                    type="submit"
                    disabled={aiLoading}
                    className="p-1 bg-[#e50914] hover:bg-red-700 text-white rounded-full absolute right-2 transition cursor-pointer"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 rotate-90" />
                  </button>
                </form>

                {aiResponse && (
                  <button
                    onClick={() => {
                      setAiResponse(null);
                      setAiQuery("");
                    }}
                    className="w-full text-center mt-3 text-[10px] text-gray-500 hover:text-[#e50914] transition cursor-pointer"
                  >
                    Clear Analysis & View Suggested Questions
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
