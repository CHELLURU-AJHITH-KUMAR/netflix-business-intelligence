"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  SlidersHorizontal, RotateCcw, Save, Trash2, ArrowLeft, ArrowRight, X, ChevronDown, Check,
  Search, Sliders, Star, Film, Tv, Globe2, Languages, Calendar, Award
} from "lucide-react";
import { useGlobalFilter, SavedView } from "@/lib/GlobalFilterContext";

export default function GlobalFilterBar() {
  const {
    filters,
    setFilter,
    setMultipleFilters,
    resetFilters,
    allTitles,
    undo,
    redo,
    canUndo,
    canRedo,
    savedViews,
    saveView,
    deleteView,
    loadView,
  } = useGlobalFilter();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Dropdown states
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [newViewName, setNewViewName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Position for dynamic floating Portal dropdown
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
    openUpward: boolean;
  } | null>(null);

  // Keyboard navigation focus index
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const filterBarRef = useRef<HTMLDivElement>(null);

  // Compute options dynamically from allTitles
  const options = useMemo(() => {
    const genresSet = new Set<string>();
    const countriesSet = new Set<string>();
    const languagesSet = new Set<string>();
    const yearsSet = new Set<number>();

    allTitles.forEach(t => {
      t.genresList.forEach(g => { if (g) genresSet.add(g); });
      t.countriesList.forEach(c => { if (c) countriesSet.add(c); });
      if (t.language) languagesSet.add(t.language);
      if (t.release_year) yearsSet.add(t.release_year);
    });

    return {
      genres: Array.from(genresSet).sort(),
      countries: Array.from(countriesSet).sort(),
      languages: Array.from(languagesSet).sort(),
      years: Array.from(yearsSet).sort((a, b) => b - a), // Descending order
    };
  }, [allTitles]);

  // Map active options depending on selected dropdown
  const activeOptionsList = useMemo(() => {
    if (!activeDropdown) return [];
    if (activeDropdown === "type") return ["All", "Movie", "TV Show"];
    if (activeDropdown === "genre") {
      const filtered = options.genres.filter(g => g.toLowerCase().includes(dropdownSearch.toLowerCase()));
      return ["All", ...filtered];
    }
    if (activeDropdown === "country") {
      const filtered = options.countries.filter(c => c.toLowerCase().includes(dropdownSearch.toLowerCase()));
      return ["All", ...filtered];
    }
    if (activeDropdown === "language") {
      const filtered = options.languages.filter(l => l.toLowerCase().includes(dropdownSearch.toLowerCase()));
      return ["All", ...filtered];
    }
    if (activeDropdown === "year") {
      const decades = ["2020-2025", "2010-2019", "2000-2009", "1990-1999", "Before 1990"];
      const matchedDecades = decades.filter(d => d.includes(dropdownSearch));
      const matchedYears = options.years.map(String).filter(y => y.includes(dropdownSearch));
      return ["All", ...matchedDecades, ...matchedYears];
    }
    return [];
  }, [activeDropdown, dropdownSearch, options]);

  // Open dropdown and calculate layout positioning
  const openDropdown = (name: string, buttonElement: HTMLButtonElement) => {
    setActiveDropdown(name);
    setDropdownSearch("");
    setFocusedIndex(-1);

    const rect = buttonElement.getBoundingClientRect();
    
    // Approximate maximum height of the dropdown content for space check
    const dropdownHeight = name === "genre" || name === "country" || name === "year" ? 380 : 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    // Minimum width: 260-320px depending on content
    const width = name === "genre" || name === "country" || name === "year" || name === "savedViews"
      ? Math.max(320, rect.width)
      : Math.max(280, rect.width);

    // Dynamic horizontal placement within viewport
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = rect.right - width;
    }
    left = Math.max(12, left);

    // Top positioning: add exactly 12px margin gap as requested (10-16px)
    const top = openUpward
      ? rect.top - 12
      : rect.bottom + 12;

    setDropdownPosition({
      top,
      left,
      width,
      openUpward
    });
  };

  const toggleDropdown = (name: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (activeDropdown === name) {
      setActiveDropdown(null);
      setDropdownPosition(null);
    } else {
      openDropdown(name, e.currentTarget);
    }
  };

  const handleSelect = (key: any, val: any) => {
    setFilter(key, val);
    setActiveDropdown(null);
    setDropdownPosition(null);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        activeDropdown &&
        !target.closest(".dropdown-portal-content") &&
        !target.closest(".filter-trigger-btn")
      ) {
        setActiveDropdown(null);
        setDropdownPosition(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDropdown]);

  // Close dropdown on window resize or scroll to prevent visual detachment
  useEffect(() => {
    const handleCloseEvents = () => {
      if (activeDropdown) {
        setActiveDropdown(null);
        setDropdownPosition(null);
      }
    };
    window.addEventListener("resize", handleCloseEvents);
    window.addEventListener("scroll", handleCloseEvents, { passive: true });
    return () => {
      window.removeEventListener("resize", handleCloseEvents);
      window.removeEventListener("scroll", handleCloseEvents);
    };
  }, [activeDropdown]);

  // Keyboard navigation support within dropdown menus
  useEffect(() => {
    if (!activeDropdown || activeOptionsList.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveDropdown(null);
        setDropdownPosition(null);
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        setFocusedIndex(prev => (prev + 1) % activeOptionsList.length);
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        setFocusedIndex(prev => (prev - 1 + activeOptionsList.length) % activeOptionsList.length);
        e.preventDefault();
      } else if (e.key === "Enter") {
        if (focusedIndex >= 0 && focusedIndex < activeOptionsList.length) {
          handleSelect(activeDropdown, activeOptionsList[focusedIndex]);
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeDropdown, activeOptionsList, focusedIndex]);

  // Check if any filter is active
  const isAnyFilterActive = useMemo(() => {
    return (
      filters.type !== "All" ||
      filters.genre !== "All" ||
      filters.country !== "All" ||
      filters.language !== "All" ||
      filters.year !== "All" ||
      filters.releasePeriod !== "All" ||
      filters.director !== "All" ||
      filters.actor !== "All" ||
      filters.runtimeBucket !== "All" ||
      filters.imdbRatingRange[0] > 0 ||
      filters.imdbRatingRange[1] < 10 ||
      filters.tmdbRatingRange[0] > 0 ||
      filters.tmdbRatingRange[1] < 10 ||
      filters.duration[0] > 0 ||
      filters.duration[1] < 250 ||
      filters.seasonCount[0] > 1 ||
      filters.seasonCount[1] < 25 ||
      (filters.rating && filters.rating !== "All")
    );
  }, [filters]);

  // Generate list of active filters for chips
  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; displayValue: string }> = [];
    
    if (filters.type !== "All") chips.push({ key: "type", label: "Format", displayValue: filters.type });
    if (filters.genre !== "All") chips.push({ key: "genre", label: "Genre", displayValue: filters.genre });
    if (filters.country !== "All") chips.push({ key: "country", label: "Country", displayValue: filters.country });
    if (filters.language !== "All") chips.push({ key: "language", label: "Language", displayValue: filters.language });
    if (filters.year !== "All") chips.push({ key: "year", label: "Year", displayValue: filters.year });
    if (filters.releasePeriod !== "All") chips.push({ key: "releasePeriod", label: "Decade", displayValue: filters.releasePeriod });
    if (filters.director !== "All") chips.push({ key: "director", label: "Director", displayValue: filters.director });
    if (filters.actor !== "All") chips.push({ key: "actor", label: "Actor", displayValue: filters.actor });
    if (filters.runtimeBucket !== "All") chips.push({ key: "runtimeBucket", label: "Runtime", displayValue: filters.runtimeBucket });
    if (filters.rating && filters.rating !== "All") chips.push({ key: "rating", label: "Censorship", displayValue: filters.rating });
    
    if (filters.imdbRatingRange[0] > 0 || filters.imdbRatingRange[1] < 10) {
      chips.push({ key: "imdbRatingRange", label: "IMDb", displayValue: `${filters.imdbRatingRange[0]}-${filters.imdbRatingRange[1]} ★` });
    }
    if (filters.tmdbRatingRange[0] > 0 || filters.tmdbRatingRange[1] < 10) {
      chips.push({ key: "tmdbRatingRange", label: "TMDb", displayValue: `${filters.tmdbRatingRange[0]}-${filters.tmdbRatingRange[1]} ★` });
    }
    if (filters.duration[0] > 0 || filters.duration[1] < 250) {
      chips.push({ key: "duration", label: "Duration", displayValue: `${filters.duration[0]}-${filters.duration[1]} min` });
    }
    if (filters.seasonCount[0] > 1 || filters.seasonCount[1] < 25) {
      chips.push({ key: "seasonCount", label: "Seasons", displayValue: `${filters.seasonCount[0]}-${filters.seasonCount[1]} Seasons` });
    }

    return chips;
  }, [filters]);

  const handleRemoveChip = (key: string) => {
    if (key === "imdbRatingRange") setFilter("imdbRatingRange", [0, 10]);
    else if (key === "tmdbRatingRange") setFilter("tmdbRatingRange", [0, 10]);
    else if (key === "duration") setFilter("duration", [0, 250]);
    else if (key === "seasonCount") setFilter("seasonCount", [1, 25]);
    else setFilter(key as any, "All");
  };

  const handleSaveViewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newViewName.trim()) {
      saveView(newViewName.trim());
      setNewViewName("");
      setShowSaveModal(false);
    }
  };

  return (
    <div 
      ref={filterBarRef}
      className="sticky top-14 z-40 w-full bg-[#040404]/90 backdrop-blur-xl border-b border-white/5 shadow-2xl py-3.5 px-4 sm:px-6 lg:px-8 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-3">
        
        {/* Main Selectors Row */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          
          {/* Main Dropdown Filter Buttons (Responsive Gap-X: 16px, Gap-Y: 12px) */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            
            {/* Format Dropdown Button */}
            <button
              onClick={(e) => toggleDropdown("type", e)}
              className={`filter-trigger-btn px-4.5 py-2.5 rounded-full text-xs font-semibold flex items-center justify-between gap-2 border transition cursor-pointer select-none ${
                filters.type !== "All"
                  ? "bg-[#e50914]/20 border-[#e50914] text-white hover:bg-[#e50914]/30"
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <Film className="w-3.5 h-3.5" />
                Format: <span className="font-bold text-white">{filters.type}</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${activeDropdown === "type" ? "rotate-180" : ""}`} />
            </button>

            {/* Genre Dropdown Button */}
            <button
              onClick={(e) => toggleDropdown("genre", e)}
              className={`filter-trigger-btn px-4.5 py-2.5 rounded-full text-xs font-semibold flex items-center justify-between gap-2 border transition cursor-pointer select-none ${
                filters.genre !== "All"
                  ? "bg-[#e50914]/20 border-[#e50914] text-white hover:bg-[#e50914]/30"
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5" />
                Genre: <span className="font-bold text-white">{filters.genre}</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${activeDropdown === "genre" ? "rotate-180" : ""}`} />
            </button>

            {/* Country Dropdown Button */}
            <button
              onClick={(e) => toggleDropdown("country", e)}
              className={`filter-trigger-btn px-4.5 py-2.5 rounded-full text-xs font-semibold flex items-center justify-between gap-2 border transition cursor-pointer select-none ${
                filters.country !== "All"
                  ? "bg-[#e50914]/20 border-[#e50914] text-white hover:bg-[#e50914]/30"
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <Globe2 className="w-3.5 h-3.5" />
                Country: <span className="font-bold text-white">{filters.country}</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${activeDropdown === "country" ? "rotate-180" : ""}`} />
            </button>

            {/* Language Dropdown Button */}
            <button
              onClick={(e) => toggleDropdown("language", e)}
              className={`filter-trigger-btn px-4.5 py-2.5 rounded-full text-xs font-semibold flex items-center justify-between gap-2 border transition cursor-pointer select-none ${
                filters.language !== "All"
                  ? "bg-[#e50914]/20 border-[#e50914] text-white hover:bg-[#e50914]/30"
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <Languages className="w-3.5 h-3.5" />
                Language: <span className="font-bold text-white capitalize">{filters.language}</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${activeDropdown === "language" ? "rotate-180" : ""}`} />
            </button>

            {/* Year Dropdown Button */}
            <button
              onClick={(e) => toggleDropdown("year", e)}
              className={`filter-trigger-btn px-4.5 py-2.5 rounded-full text-xs font-semibold flex items-center justify-between gap-2 border transition cursor-pointer select-none ${
                filters.year !== "All"
                  ? "bg-[#e50914]/20 border-[#e50914] text-white hover:bg-[#e50914]/30"
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Year: <span className="font-bold text-white">{filters.year}</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${activeDropdown === "year" ? "rotate-180" : ""}`} />
            </button>

            {/* IMDb Slider Button */}
            <button
              onClick={(e) => toggleDropdown("imdb", e)}
              className={`filter-trigger-btn px-4.5 py-2.5 rounded-full text-xs font-semibold flex items-center justify-between gap-2 border transition cursor-pointer select-none ${
                filters.imdbRatingRange[0] > 0 || filters.imdbRatingRange[1] < 10
                  ? "bg-[#e50914]/20 border-[#e50914] text-white hover:bg-[#e50914]/30"
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                IMDb: <span className="font-bold text-white">{filters.imdbRatingRange[0]}-{filters.imdbRatingRange[1]}</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${activeDropdown === "imdb" ? "rotate-180" : ""}`} />
            </button>

            {/* TMDb Slider Button */}
            <button
              onClick={(e) => toggleDropdown("tmdb", e)}
              className={`filter-trigger-btn px-4.5 py-2.5 rounded-full text-xs font-semibold flex items-center justify-between gap-2 border transition cursor-pointer select-none ${
                filters.tmdbRatingRange[0] > 0 || filters.tmdbRatingRange[1] < 10
                  ? "bg-[#e50914]/20 border-[#e50914] text-white hover:bg-[#e50914]/30"
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-red-500" />
                TMDb: <span className="font-bold text-white">{filters.tmdbRatingRange[0]}-{filters.tmdbRatingRange[1]}</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${activeDropdown === "tmdb" ? "rotate-180" : ""}`} />
            </button>

          </div>

          {/* Action and Navigation Toolbar (Undo, Redo, Reset, Save View) */}
          <div className="flex items-center gap-2">
            
            {/* Undo */}
            <button
              onClick={undo}
              disabled={!canUndo}
              className={`p-2.5 rounded-full border transition cursor-pointer flex items-center justify-center ${
                canUndo
                  ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  : "bg-transparent border-white/5 text-gray-600 cursor-not-allowed"
              }`}
              title="Undo Filter change"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>

            {/* Redo */}
            <button
              onClick={redo}
              disabled={!canRedo}
              className={`p-2.5 rounded-full border transition cursor-pointer flex items-center justify-center ${
                canRedo
                  ? "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  : "bg-transparent border-white/5 text-gray-600 cursor-not-allowed"
              }`}
              title="Redo Filter change"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Reset */}
            {isAnyFilterActive && (
              <button
                onClick={resetFilters}
                className="px-4.5 py-2.5 rounded-full text-xs font-bold bg-[#e50914]/10 hover:bg-[#e50914] text-[#e50914] hover:text-white border border-[#e50914]/20 hover:border-transparent transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}

            {/* Save View Button */}
            <button
              onClick={() => setShowSaveModal(true)}
              className="px-4.5 py-2.5 rounded-full text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save View
            </button>

            {/* Saved Views Dropdown Toggle */}
            {savedViews.length > 0 && (
              <button
                onClick={(e) => toggleDropdown("savedViews", e)}
                className={`filter-trigger-btn px-4.5 py-2.5 rounded-full text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                  activeDropdown === "savedViews"
                    ? "bg-white/15 border-white/20 text-white"
                    : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300 hover:text-white"
                }`}
              >
                Saved Views ({savedViews.length})
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${activeDropdown === "savedViews" ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips row */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-2.5 mt-1">
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider mr-1.5 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-[#e50914]" />
              Active Filters:
            </span>
            {activeChips.map((chip) => (
              <div
                key={chip.key}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#e50914]/10 hover:bg-[#e50914]/20 border border-[#e50914]/20 hover:border-[#e50914]/40 rounded-full text-[10px] text-white font-medium transition cursor-default"
              >
                <span>
                  <span className="text-gray-400 font-light">{chip.label}:</span> {chip.displayValue}
                </span>
                <button
                  onClick={() => handleRemoveChip(chip.key)}
                  className="p-0.5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save View Modal dialog */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
          <div 
            onClick={() => setShowSaveModal(false)}
            className="absolute inset-0 bg-black/75 backdrop-blur-xs"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-zinc-950 border border-white/10 p-6 rounded-2xl w-[360px] max-w-full shadow-2xl flex flex-col gap-4 text-gray-200 z-10"
          >
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Save Analytics View</h3>
              <p className="text-[10px] text-gray-500">Saves active page, filters, scroll position, and details modal.</p>
            </div>
            <form onSubmit={handleSaveViewSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="View Name (e.g. India Drama 2020)"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                className="bg-black border border-white/10 text-xs rounded-xl px-3 py-2 w-full focus:outline-none focus:border-[#e50914] text-white"
                autoFocus
              />
              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#e50914] hover:bg-red-700 rounded-xl text-xs font-bold text-white transition cursor-pointer"
                >
                  Save View
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* PORTAL-RENDERED FLOATING DROPDOWNS (Z-Index: 9999) */}
      {mounted && activeDropdown && dropdownPosition && createPortal(
        <div 
          className="dropdown-portal-content fixed z-[9999]"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            transform: dropdownPosition.openUpward ? "translateY(-100%)" : "none",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, y: dropdownPosition.openUpward ? 12 : -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: dropdownPosition.openUpward ? 12 : -12 }}
              transition={{ duration: 0.18 }}
              className="w-full bg-zinc-950 border border-white/10 rounded-2xl shadow-[0_10px_50px_rgba(0,0,0,0.85)] p-2 overflow-hidden flex flex-col gap-1 max-h-[380px]"
            >
              
              {/* Search Header inside Searchable Dropdowns */}
              {(activeDropdown === "genre" || activeDropdown === "country" || activeDropdown === "year") && (
                <div className="relative flex items-center p-1 border-b border-white/5 mb-1.5">
                  <input
                    type="text"
                    placeholder={`Search ${activeDropdown}...`}
                    value={dropdownSearch}
                    onChange={(e) => {
                      setDropdownSearch(e.target.value);
                      setFocusedIndex(-1);
                    }}
                    className="bg-black border border-white/10 text-xs rounded-xl pl-8 pr-3 py-2 w-full focus:outline-none focus:border-[#e50914] text-white h-9"
                    autoFocus
                  />
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3.5" />
                </div>
              )}

              <div className="overflow-y-auto space-y-1.5 scrollbar-thin max-h-[300px] pr-1">
                
                {/* 1. Format (Type) options */}
                {activeDropdown === "type" && (
                  ["All", "Movie", "TV Show"].map((typeVal, idx) => (
                    <button
                      key={typeVal}
                      onClick={() => handleSelect("type", typeVal)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs flex justify-between items-center transition cursor-pointer select-none h-11 border border-transparent ${
                        filters.type === typeVal
                          ? "bg-[#e50914] text-white"
                          : focusedIndex === idx
                          ? "bg-[#e50914]/80 text-white border-white/10"
                          : "hover:bg-[#e50914] hover:text-white bg-transparent text-gray-300"
                      }`}
                    >
                      <span className="font-medium">{typeVal}</span>
                      {filters.type === typeVal && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))
                )}

                {/* 2. Genre options */}
                {activeDropdown === "genre" && (
                  activeOptionsList.map((g, idx) => (
                    <button
                      key={g}
                      onClick={() => handleSelect("genre", g)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs flex justify-between items-center transition cursor-pointer select-none h-11 border border-transparent ${
                        filters.genre === g
                          ? "bg-[#e50914] text-white"
                          : focusedIndex === idx
                          ? "bg-[#e50914]/80 text-white border-white/10"
                          : "hover:bg-[#e50914] hover:text-white bg-transparent text-gray-300"
                      }`}
                    >
                      <span className={g === "All" ? "font-bold text-gray-400" : "font-medium"}>
                        {g === "All" ? "All Genres" : g}
                      </span>
                      {filters.genre === g && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))
                )}

                {/* 3. Country options */}
                {activeDropdown === "country" && (
                  activeOptionsList.map((c, idx) => (
                    <button
                      key={c}
                      onClick={() => handleSelect("country", c)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs flex justify-between items-center transition cursor-pointer select-none h-11 border border-transparent ${
                        filters.country === c
                          ? "bg-[#e50914] text-white"
                          : focusedIndex === idx
                          ? "bg-[#e50914]/80 text-white border-white/10"
                          : "hover:bg-[#e50914] hover:text-white bg-transparent text-gray-300"
                      }`}
                    >
                      <span className={c === "All" ? "font-bold text-gray-400" : "font-medium"}>
                        {c === "All" ? "All Countries" : c}
                      </span>
                      {filters.country === c && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))
                )}

                {/* 4. Language options */}
                {activeDropdown === "language" && (
                  activeOptionsList.map((l, idx) => (
                    <button
                      key={l}
                      onClick={() => handleSelect("language", l)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs flex justify-between items-center transition cursor-pointer select-none h-11 border border-transparent capitalize ${
                        filters.language === l
                          ? "bg-[#e50914] text-white"
                          : focusedIndex === idx
                          ? "bg-[#e50914]/80 text-white border-white/10"
                          : "hover:bg-[#e50914] hover:text-white bg-transparent text-gray-300"
                      }`}
                    >
                      <span className={l === "All" ? "font-bold text-gray-400" : "font-medium"}>
                        {l === "All" ? "All Languages" : l}
                      </span>
                      {filters.language === l && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))
                )}

                {/* 5. Year options */}
                {activeDropdown === "year" && (
                  activeOptionsList.map((y, idx) => (
                    <button
                      key={y}
                      onClick={() => handleSelect("year", y)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-xs flex justify-between items-center transition cursor-pointer select-none h-11 border border-transparent ${
                        filters.year === y
                          ? "bg-[#e50914] text-white"
                          : focusedIndex === idx
                          ? "bg-[#e50914]/80 text-white border-white/10"
                          : "hover:bg-[#e50914] hover:text-white bg-transparent text-gray-300"
                      }`}
                    >
                      <span className={y === "All" ? "font-bold text-gray-400" : "font-medium"}>
                        {y === "All" ? "All Years" : y.includes("-") || y.startsWith("Before") ? `Decade: ${y}` : y}
                      </span>
                      {filters.year === y && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))
                )}

                {/* 6. IMDb Slider Layout */}
                {activeDropdown === "imdb" && (
                  <div className="p-3.5 flex flex-col gap-4 text-gray-200">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">IMDb Rating Range</span>
                    <div className="flex items-center gap-4">
                      <div className="w-1/2">
                        <label className="text-[9px] text-gray-400 block mb-1">Min Rating</label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={filters.imdbRatingRange[0]}
                          onChange={(e) => setFilter("imdbRatingRange", [parseFloat(e.target.value), filters.imdbRatingRange[1]])}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#e50914]"
                        />
                        <span className="text-[11px] font-mono text-white mt-1.5 block font-bold">{filters.imdbRatingRange[0].toFixed(1)} ★</span>
                      </div>
                      <div className="w-1/2">
                        <label className="text-[9px] text-gray-400 block mb-1">Max Rating</label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={filters.imdbRatingRange[1]}
                          onChange={(e) => setFilter("imdbRatingRange", [filters.imdbRatingRange[0], parseFloat(e.target.value)])}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#e50914]"
                        />
                        <span className="text-[11px] font-mono text-white mt-1.5 block font-bold">{filters.imdbRatingRange[1].toFixed(1)} ★</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelect("imdbRatingRange", [0, 10])}
                      className="w-full text-center py-2.5 bg-white/5 hover:bg-[#e50914]/15 hover:text-white rounded-xl text-[10px] font-bold text-gray-400 transition cursor-pointer"
                    >
                      Clear IMDb Range
                    </button>
                  </div>
                )}

                {/* 7. TMDb Slider Layout */}
                {activeDropdown === "tmdb" && (
                  <div className="p-3.5 flex flex-col gap-4 text-gray-200">
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">TMDb Rating Range</span>
                    <div className="flex items-center gap-4">
                      <div className="w-1/2">
                        <label className="text-[9px] text-gray-400 block mb-1">Min Rating</label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={filters.tmdbRatingRange[0]}
                          onChange={(e) => setFilter("tmdbRatingRange", [parseFloat(e.target.value), filters.tmdbRatingRange[1]])}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#e50914]"
                        />
                        <span className="text-[11px] font-mono text-white mt-1.5 block font-bold">{filters.tmdbRatingRange[0].toFixed(1)} ★</span>
                      </div>
                      <div className="w-1/2">
                        <label className="text-[9px] text-gray-400 block mb-1">Max Rating</label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={filters.tmdbRatingRange[1]}
                          onChange={(e) => setFilter("tmdbRatingRange", [filters.tmdbRatingRange[0], parseFloat(e.target.value)])}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#e50914]"
                        />
                        <span className="text-[11px] font-mono text-white mt-1.5 block font-bold">{filters.tmdbRatingRange[1].toFixed(1)} ★</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelect("tmdbRatingRange", [0, 10])}
                      className="w-full text-center py-2.5 bg-white/5 hover:bg-[#e50914]/15 hover:text-white rounded-xl text-[10px] font-bold text-gray-400 transition cursor-pointer"
                    >
                      Clear TMDb Range
                    </button>
                  </div>
                )}

                {/* 8. Saved Views options */}
                {activeDropdown === "savedViews" && (
                  savedViews.map(view => (
                    <div 
                      key={view.id}
                      className="flex justify-between items-center p-2 rounded-xl bg-white/2 hover:bg-white/5 transition"
                    >
                      <button
                        onClick={() => {
                          loadView(view);
                          setActiveDropdown(null);
                          setDropdownPosition(null);
                        }}
                        className="text-left font-semibold text-xs text-gray-200 hover:text-[#e50914] truncate flex-grow mr-2 cursor-pointer"
                      >
                        {view.name}
                        <span className="block text-[9px] text-gray-500 font-light mt-0.5">
                          {new Date(view.timestamp).toLocaleDateString()} at {new Date(view.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          deleteView(view.id);
                          if (savedViews.length <= 1) {
                            setActiveDropdown(null);
                            setDropdownPosition(null);
                          }
                        }}
                        className="p-2 hover:bg-red-500/20 text-gray-500 hover:text-red-500 rounded-lg transition cursor-pointer"
                        title="Delete saved view"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}

              </div>
            </motion.div>
          </AnimatePresence>
        </div>,
        document.body
      )}
    </div>
  );
}
