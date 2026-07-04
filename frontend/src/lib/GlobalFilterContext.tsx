"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { NetflixTitle } from "./data";
import ShowDetailsModal from "@/components/ShowDetailsModal";
import DrillThroughDrawer from "@/components/DrillThroughDrawer";

export interface GlobalFilters {
  type: string;          // 'All' | 'Movie' | 'TV Show'
  genre: string;         // 'All' | selected genre
  country: string;       // 'All' | selected country
  language: string;      // 'All' | selected language
  year: string;          // 'All' | selected year
  releasePeriod: string; // 'All' | '2020s' | '2010s' | '2000s' | '1990s' | 'Before 1990'
  director: string;      // 'All' | selected director
  actor: string;         // 'All' | selected actor
  runtimeBucket: string; // 'All' | 'Short (< 95 min)' | 'Medium (95 - 110 min)' | 'Standard (110 - 125 min)' | 'Long (125 - 140 min)' | 'Epic (> 140 min)'
  imdbRatingRange: [number, number]; // [min, max]
  tmdbRatingRange: [number, number]; // [min, max]
  duration: [number, number];        // [min, max] (minutes for movies, or seasons)
  seasonCount: [number, number];     // [min, max] (seasons for TV shows)
  rating: string;                    // 'All' | selected certification rating (e.g. PG, TV-MA)
}

export interface SavedView {
  id: string;
  name: string;
  timestamp: number;
  filters: GlobalFilters;
  scrollPosition: number;
  selectedDashboard: string;
  aiQuery?: string;
  aiResponse?: any;
  selectedShowId?: string;
  predictiveSettings?: {
    scenario: "Expected" | "Optimistic" | "Conservative";
    annualGrowth: number;
    movieShare: number;
    genreDramaShift: number;
    countryIndiaShift: number;
    langEnShift: number;
  } | null;
}

interface GlobalFilterContextType {
  filters: GlobalFilters;
  setFilter: (key: keyof GlobalFilters, value: any) => void;
  setMultipleFilters: (updates: Partial<GlobalFilters>) => void;
  resetFilters: () => void;
  filteredTitles: NetflixTitle[];
  allTitles: NetflixTitle[];
  
  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // Saved Views
  savedViews: SavedView[];
  saveView: (name: string, extra?: Partial<SavedView>) => void;
  deleteView: (id: string) => void;
  loadView: (view: SavedView) => void;
  
  // Global Detail Modal state (so drill-through or navbar can open it)
  globalSelectedShow: NetflixTitle | null;
  openShowDetails: (show: NetflixTitle | string) => void;
  closeShowDetails: () => void;

  // Active Drill-Through state
  drillThroughData: {
    type: "genre" | "country" | "actor" | "director" | "year" | null;
    value: string;
    level: number; // 0: overview, 1: sub-list (e.g. directors in India)
    parentValue?: string;
  };
  openDrillThrough: (type: "genre" | "country" | "actor" | "director" | "year", value: string, level?: number, parentValue?: string) => void;
  closeDrillThrough: () => void;
  setDrillThroughLevel: (level: number, parentValue?: string) => void;

  // AI Assistant states
  aiQuery: string;
  setAiQuery: (q: string) => void;
  aiResponse: any;
  setAiResponse: (r: any) => void;
  showAiPanel: boolean;
  setShowAiPanel: (s: boolean) => void;
}

const defaultFilters: GlobalFilters = {
  type: "All",
  genre: "All",
  country: "All",
  language: "All",
  year: "All",
  releasePeriod: "All",
  director: "All",
  actor: "All",
  runtimeBucket: "All",
  imdbRatingRange: [0, 10],
  tmdbRatingRange: [0, 10],
  duration: [0, 250],
  seasonCount: [1, 25],
  rating: "All",
};

const GlobalFilterContext = createContext<GlobalFilterContextType | undefined>(undefined);

export function GlobalFilterProvider({
  children,
}: {
  children: React.ReactNode;
  allTitles?: NetflixTitle[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Active thinned dataset fetched on client mount
  const [allTitles, setAllTitles] = useState<NetflixTitle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/data/titles.json")
      .then(res => {
        if (!res.ok) throw new Error("Failed to load static titles database");
        return res.json();
      })
      .then(data => {
        const parsed = data.map((item: any) => ({
          ...item,
          parsedDateAdded: item.parsedDateAdded ? new Date(item.parsedDateAdded) : null
        }));
        setAllTitles(parsed);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Static dataset initialization failed:", err);
        setIsLoading(false);
      });
  }, []);

  // Active filters
  const [filters, setFilters] = useState<GlobalFilters>(defaultFilters);

  // History stack
  const [history, setHistory] = useState<GlobalFilters[]>([defaultFilters]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Saved views
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);

  // Show Details modal
  const [globalSelectedShow, setGlobalSelectedShow] = useState<NetflixTitle | null>(null);

  // Drill through drawer state
  const [drillThroughData, setDrillThroughData] = useState<{
    type: "genre" | "country" | "actor" | "director" | "year" | null;
    value: string;
    level: number;
    parentValue?: string;
  }>({
    type: null,
    value: "",
    level: 0,
  });

  // AI Panel State
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);

  // Load initial filters from URL on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const params = new URLSearchParams(window.location.search);
    const loadedFilters: GlobalFilters = { ...defaultFilters };
    
    let hasLoadedAny = false;
    
    if (params.has("type")) { loadedFilters.type = params.get("type")!; hasLoadedAny = true; }
    if (params.has("genre")) { loadedFilters.genre = params.get("genre")!; hasLoadedAny = true; }
    if (params.has("country")) { loadedFilters.country = params.get("country")!; hasLoadedAny = true; }
    if (params.has("language")) { loadedFilters.language = params.get("language")!; hasLoadedAny = true; }
    if (params.has("year")) { loadedFilters.year = params.get("year")!; hasLoadedAny = true; }
    if (params.has("releasePeriod")) { loadedFilters.releasePeriod = params.get("releasePeriod")!; hasLoadedAny = true; }
    if (params.has("director")) { loadedFilters.director = params.get("director")!; hasLoadedAny = true; }
    if (params.has("actor")) { loadedFilters.actor = params.get("actor")!; hasLoadedAny = true; }
    if (params.has("runtimeBucket")) { loadedFilters.runtimeBucket = params.get("runtimeBucket")!; hasLoadedAny = true; }
    if (params.has("rating")) { loadedFilters.rating = params.get("rating")!; hasLoadedAny = true; }
    
    if (params.has("imdbMin") && params.has("imdbMax")) {
      loadedFilters.imdbRatingRange = [parseFloat(params.get("imdbMin")!), parseFloat(params.get("imdbMax")!)];
      hasLoadedAny = true;
    }
    if (params.has("tmdbMin") && params.has("tmdbMax")) {
      loadedFilters.tmdbRatingRange = [parseFloat(params.get("tmdbMin")!), parseFloat(params.get("tmdbMax")!)];
      hasLoadedAny = true;
    }
    if (params.has("durMin") && params.has("durMax")) {
      loadedFilters.duration = [parseInt(params.get("durMin")!, 10), parseInt(params.get("durMax")!, 10)];
      hasLoadedAny = true;
    }
    if (params.has("seasMin") && params.has("seasMax")) {
      loadedFilters.seasonCount = [parseInt(params.get("seasMin")!, 10), parseInt(params.get("seasMax")!, 10)];
      hasLoadedAny = true;
    }

    if (hasLoadedAny) {
      setFilters(loadedFilters);
      setHistory([loadedFilters]);
      setHistoryIndex(0);
    }

    // Load saved views from localStorage
    const saved = localStorage.getItem("netflix_analytics_saved_views");
    if (saved) {
      try {
        setSavedViews(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved views:", e);
      }
    }
  }, []);

  // Update URL search parameters when filters change
  const updateURL = (newFilters: GlobalFilters) => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams();
    
    if (newFilters.type !== "All") params.set("type", newFilters.type);
    if (newFilters.genre !== "All") params.set("genre", newFilters.genre);
    if (newFilters.country !== "All") params.set("country", newFilters.country);
    if (newFilters.language !== "All") params.set("language", newFilters.language);
    if (newFilters.year !== "All") params.set("year", newFilters.year);
    if (newFilters.releasePeriod !== "All") params.set("releasePeriod", newFilters.releasePeriod);
    if (newFilters.director !== "All") params.set("director", newFilters.director);
    if (newFilters.actor !== "All") params.set("actor", newFilters.actor);
    if (newFilters.runtimeBucket !== "All") params.set("runtimeBucket", newFilters.runtimeBucket);
    if (newFilters.rating && newFilters.rating !== "All") params.set("rating", newFilters.rating);
    
    if (newFilters.imdbRatingRange[0] > 0 || newFilters.imdbRatingRange[1] < 10) {
      params.set("imdbMin", newFilters.imdbRatingRange[0].toString());
      params.set("imdbMax", newFilters.imdbRatingRange[1].toString());
    }
    if (newFilters.tmdbRatingRange[0] > 0 || newFilters.tmdbRatingRange[1] < 10) {
      params.set("tmdbMin", newFilters.tmdbRatingRange[0].toString());
      params.set("tmdbMax", newFilters.tmdbRatingRange[1].toString());
    }
    if (newFilters.duration[0] > 0 || newFilters.duration[1] < 250) {
      params.set("durMin", newFilters.duration[0].toString());
      params.set("durMax", newFilters.duration[1].toString());
    }
    if (newFilters.seasonCount[0] > 1 || newFilters.seasonCount[1] < 25) {
      params.set("seasMin", newFilters.seasonCount[0].toString());
      params.set("seasMax", newFilters.seasonCount[1].toString());
    }

    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    
    window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
  };

  // Push new state onto the history stack
  const pushHistory = (newFilters: GlobalFilters) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newFilters);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    updateURL(newFilters);
  };

  const setFilter = (key: keyof GlobalFilters, value: any) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    pushHistory(updated);
  };

  const setMultipleFilters = (updates: Partial<GlobalFilters>) => {
    const updated = { ...filters, ...updates };
    setFilters(updated);
    pushHistory(updated);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    pushHistory(defaultFilters);
    closeDrillThrough();
    // Dispatch reset event for AI Panel reset
    window.dispatchEvent(new CustomEvent("resetGlobalFilters"));
  };

  // Undo/Redo operations
  const undo = () => {
    if (historyIndex > 0) {
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      setFilters(history[idx]);
      updateURL(history[idx]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const idx = historyIndex + 1;
      setHistoryIndex(idx);
      setFilters(history[idx]);
      updateURL(history[idx]);
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Saved Views operations
  const saveView = (name: string, extra?: Partial<SavedView>) => {
    const newView: SavedView = {
      id: Math.random().toString(36).substring(2, 9),
      name: name || `View ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now(),
      filters: { ...filters },
      scrollPosition: typeof window !== "undefined" ? window.scrollY : 0,
      selectedDashboard: pathname,
      selectedShowId: globalSelectedShow?.show_id,
      aiQuery,
      aiResponse,
      ...extra,
    };

    const updated = [newView, ...savedViews];
    setSavedViews(updated);
    localStorage.setItem("netflix_analytics_saved_views", JSON.stringify(updated));
  };

  const deleteView = (id: string) => {
    const updated = savedViews.filter(v => v.id !== id);
    setSavedViews(updated);
    localStorage.setItem("netflix_analytics_saved_views", JSON.stringify(updated));
  };

  const loadView = (view: SavedView) => {
    setFilters(view.filters);
    pushHistory(view.filters);

    if (view.aiQuery) setAiQuery(view.aiQuery);
    if (view.aiResponse) {
      setAiResponse(view.aiResponse);
      setShowAiPanel(true);
    } else {
      setAiResponse(null);
      setShowAiPanel(false);
    }

    if (view.selectedShowId) {
      const matchedShow = allTitles.find(t => t.show_id === view.selectedShowId);
      if (matchedShow) {
        setGlobalSelectedShow(matchedShow);
      }
    } else {
      setGlobalSelectedShow(null);
    }

    // Restore path
    if (view.selectedDashboard && pathname !== view.selectedDashboard) {
      router.push(view.selectedDashboard);
    }

    // Restore scroll position after a slight delay to allow rendering
    setTimeout(() => {
      window.scrollTo({
        top: view.scrollPosition || 0,
        behavior: "smooth"
      });
    }, 450);

    // If predictive analytics page, propagate custom settings
    if (view.predictiveSettings) {
      const event = new CustomEvent("loadPredictiveSettings", { detail: view.predictiveSettings });
      window.dispatchEvent(event);
    }

    // Restore AI Context if provided
    if (view.aiQuery && view.aiResponse) {
      const event = new CustomEvent("loadAiContext", { 
        detail: { query: view.aiQuery, response: view.aiResponse } 
      });
      window.dispatchEvent(event);
    }
  };

  // Open details modal globally
  const openShowDetails = async (show: NetflixTitle | string) => {
    if (typeof show === "string") {
      const found = allTitles.find(t => t.show_id === show);
      if (found) {
        setGlobalSelectedShow(found);
      } else {
        try {
          const res = await fetch(`/api/titles/${show}`);
          if (res.ok) {
            const data = await res.json();
            setGlobalSelectedShow(data);
          }
        } catch (e) {
          console.error("Failed to load show details globally:", e);
        }
      }
    } else {
      setGlobalSelectedShow(show);
    }
  };

  const closeShowDetails = () => {
    setGlobalSelectedShow(null);
  };

  // Drill-Through API
  const openDrillThrough = (
    type: "genre" | "country" | "actor" | "director" | "year", 
    value: string, 
    level: number = 0, 
    parentValue?: string
  ) => {
    setDrillThroughData({ type, value, level, parentValue });
    
    // Apply filters based on drill-through click
    if (type === "genre") setFilter("genre", value);
    else if (type === "country") setFilter("country", value);
    else if (type === "actor") setFilter("actor", value);
    else if (type === "director") setFilter("director", value);
    else if (type === "year") setFilter("year", value);
  };

  const closeDrillThrough = () => {
    setDrillThroughData({ type: null, value: "", level: 0 });
  };

  const setDrillThroughLevel = (level: number, parentValue?: string) => {
    setDrillThroughData(prev => ({ ...prev, level, parentValue }));
  };

  // ----------------------------------------------------
  // FILTERING COMPUTATION ENGINE (Ultra-Fast Memoization)
  // ----------------------------------------------------
  const filteredTitles = useMemo(() => {
    return allTitles.filter(t => {
      // 1. Movie / TV Show
      if (filters.type !== "All" && t.type !== filters.type) return false;

      // 2. Genre
      if (filters.genre !== "All" && !t.genresList.includes(filters.genre)) return false;

      // 3. Country
      if (filters.country !== "All" && !t.countriesList.includes(filters.country)) return false;

      // 4. Language
      if (filters.language !== "All" && t.language !== filters.language) return false;

      // 4.5. Censorship Rating
      if (filters.rating !== "All" && t.rating !== filters.rating) return false;

      // 5. Release Year
      if (filters.year !== "All") {
        if (filters.year.includes("-")) {
          const [start, end] = filters.year.split("-").map(Number);
          if (t.release_year < start || t.release_year > end) return false;
        } else if (filters.year.startsWith("Before")) {
          const limitYear = parseInt(filters.year.replace("Before", "").trim(), 10);
          if (t.release_year >= limitYear) return false;
        } else {
          const targetYear = parseInt(filters.year, 10);
          if (!isNaN(targetYear) && t.release_year !== targetYear) return false;
        }
      }

      // 6. Release Period
      if (filters.releasePeriod !== "All") {
        const yr = t.release_year;
        if (filters.releasePeriod === "2020s") {
          if (yr < 2020 || yr > 2029) return false;
        } else if (filters.releasePeriod === "2010s") {
          if (yr < 2010 || yr > 2019) return false;
        } else if (filters.releasePeriod === "2000s") {
          if (yr < 2000 || yr > 2009) return false;
        } else if (filters.releasePeriod === "1990s") {
          if (yr < 1990 || yr > 1999) return false;
        } else if (filters.releasePeriod === "Before 1990") {
          if (yr >= 1990) return false;
        }
      }

      // 7. Director
      if (filters.director !== "All" && !t.directorsList.includes(filters.director)) return false;

      // 8. Actor
      if (filters.actor !== "All" && !t.castList.includes(filters.actor)) return false;

      // 9. Runtime Bucket (Movies Only)
      if (filters.runtimeBucket !== "All") {
        if (t.type !== "Movie") return false;
        const mins = t.durationVal;
        if (filters.runtimeBucket === "Short (< 95 min)" && mins >= 95) return false;
        else if (filters.runtimeBucket === "Medium (95 - 110 min)" && (mins < 95 || mins > 110)) return false;
        else if (filters.runtimeBucket === "Standard (110 - 125 min)" && (mins <= 110 || mins > 125)) return false;
        else if (filters.runtimeBucket === "Long (125 - 140 min)" && (mins <= 125 || mins > 140)) return false;
        else if (filters.runtimeBucket === "Epic (> 140 min)" && mins <= 140) return false;
      }

      // 10. IMDb Rating Range
      if (t.imdb_rating < filters.imdbRatingRange[0] || t.imdb_rating > filters.imdbRatingRange[1]) {
        // Exclude unrated ONLY if we adjusted the filter slider above 0
        if (t.imdb_rating > 0 || filters.imdbRatingRange[0] > 0) return false;
      }

      // 11. TMDb Rating Range
      if (t.vote_average < filters.tmdbRatingRange[0] || t.vote_average > filters.tmdbRatingRange[1]) {
        if (t.vote_average > 0 || filters.tmdbRatingRange[0] > 0) return false;
      }

      // 12. Duration (Movie runtime / TV Show Seasons)
      if (t.type === "Movie") {
        if (t.durationVal < filters.duration[0] || t.durationVal > filters.duration[1]) return false;
      } else {
        if (t.durationVal < filters.seasonCount[0] || t.durationVal > filters.seasonCount[1]) return false;
      }

      return true;
    });
  }, [allTitles, filters]);

  return (
    <GlobalFilterContext.Provider
      value={{
        filters,
        setFilter,
        setMultipleFilters,
        resetFilters,
        filteredTitles,
        allTitles,
        undo,
        redo,
        canUndo,
        canRedo,
        savedViews,
        saveView,
        deleteView,
        loadView,
        globalSelectedShow,
        openShowDetails,
        closeShowDetails,
        drillThroughData,
        openDrillThrough,
        closeDrillThrough,
        setDrillThroughLevel,
        aiQuery,
        setAiQuery,
        aiResponse,
        setAiResponse,
        showAiPanel,
        setShowAiPanel,
      }}
    >
      {isLoading ? (
        <div className="fixed inset-0 z-[9999] bg-[#040404] flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin" />
          <h2 className="text-sm font-bold text-white uppercase tracking-widest mt-2 animate-pulse">Initializing Analytics Engine...</h2>
          <p className="text-[10px] text-zinc-500 font-mono">Loading dynamic catalog index (37k+ titles)</p>
        </div>
      ) : (
        <>
          {children}
          {globalSelectedShow && (
            <ShowDetailsModal
              show={globalSelectedShow}
              isOpen={!!globalSelectedShow}
              onClose={closeShowDetails}
              onNavigate={openShowDetails}
            />
          )}
          {drillThroughData.type && <DrillThroughDrawer />}
        </>
      )}
    </GlobalFilterContext.Provider>
  );
}

export function useGlobalFilter() {
  const context = useContext(GlobalFilterContext);
  if (context === undefined) {
    throw new Error("useGlobalFilter must be used within a GlobalFilterProvider");
  }
  return context;
}
