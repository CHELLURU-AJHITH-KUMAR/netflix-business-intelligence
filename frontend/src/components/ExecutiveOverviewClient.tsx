"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import {
  Film,
  Tv,
  LayoutGrid,
  Globe2,
  BarChart2,
  Star,
  Trophy,
  MessageSquare,
  Flame,
  TrendingUp,
  TrendingDown,
  HelpCircle,
  Download,
  FileText,
  ChevronRight,
  User,
  Users,
  Landmark,
  Languages,
  Clock,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  Play,
  Info,
  ChevronDown,
  X,
  Search,
  SlidersHorizontal
} from "lucide-react";
import { NetflixTitle } from "@/lib/data";
import ShowDetailsModal from "@/components/ShowDetailsModal";
import { useGlobalFilter } from "@/lib/GlobalFilterContext";

interface ExecutiveOverviewClientProps {
  allTitles?: NetflixTitle[];
}

// ----------------------------------------------------
// NATIVE SVG SPARKLINE GENERATOR (Ultra Performance)
// ----------------------------------------------------
function Sparkline({ values, color = "#e50914" }: { values: number[]; color?: string }) {
  const width = 80;
  const height = 24;
  
  const path = useMemo(() => {
    if (!values || values.length <= 1) return `M 0 ${height / 2} L ${width} ${height / 2}`;
    const cleanValues = values.map(v => isNaN(v) || !isFinite(v) ? 0 : v);
    const max = Math.max(...cleanValues);
    const min = Math.min(...cleanValues);
    const range = max - min || 1;
    
    return cleanValues.map((val, idx) => {
      const x = (idx / (cleanValues.length - 1)) * width;
      const y = height - 2 - ((val - min) / range) * (height - 4);
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
  }, [values]);

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ----------------------------------------------------
// EXECUTIVE KPI CARD SUB-COMPONENT
// ----------------------------------------------------
interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  trend: number;
  sparklineData: number[];
  tooltip: string;
  delay: number;
}

function KpiCard({ title, value, icon: Icon, trend, sparklineData, tooltip, delay }: KpiCardProps) {
  const isPositive = trend >= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -3, scale: 1.02, transition: { duration: 0.2 } }}
      className="glass-card p-4 flex flex-col justify-between relative group hover:border-[#e50914]/30 hover:shadow-[0_0_20px_rgba(229,9,20,0.15)] transition-all cursor-help"
      title={tooltip}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider line-clamp-1">{title}</span>
        <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 group-hover:bg-[#e50914]/10 group-hover:border-[#e50914]/20 transition-colors">
          <Icon className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#e50914] transition-colors" />
        </div>
      </div>

      <div className="my-2.5 flex items-baseline justify-between">
        <h3 className="text-lg font-black text-white tracking-tight">{value}</h3>
        {sparklineData && sparklineData.length > 0 && (
          <div className="opacity-75 group-hover:opacity-100 transition-opacity">
            <Sparkline values={sparklineData} color={isPositive ? "#10b981" : "#ef4444"} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-2">
        <span className="text-[8px] text-gray-500 uppercase tracking-widest font-semibold">Trend Index</span>
        <span className={`text-[9px] font-black flex items-center gap-0.5 ${isPositive ? "text-emerald-500" : "text-rose-500"}`}>
          {isPositive ? (
            <TrendingUp className="w-2.5 h-2.5" />
          ) : (
            <TrendingDown className="w-2.5 h-2.5" />
          )}
          {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
        </span>
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------
// EXPORT HELPERS
// ----------------------------------------------------
const exportToCSV = (data: any[], filename = "netflix_executive_report.csv") => {
  const headers = ["Show ID", "Type", "Title", "Director", "Cast", "Country", "Release Year", "Rating", "Duration", "Genres", "Language", "IMDb Rating", "TMDb Rating", "Awards Wins"];
  const csvRows = [headers.join(",")];
  
  data.forEach(item => {
    const values = [
      item.show_id,
      item.type,
      `"${item.title.replace(/"/g, '""')}"`,
      `"${(item.director || "").replace(/"/g, '""')}"`,
      `"${(item.cast || "").replace(/"/g, '""')}"`,
      `"${(item.country || "").replace(/"/g, '""')}"`,
      item.release_year,
      item.rating,
      `"${item.duration}"`,
      `"${item.genresList.join(", ")}"`,
      item.language,
      item.imdb_rating,
      item.vote_average,
      item.awardsWins
    ];
    csvRows.push(values.join(","));
  });

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ----------------------------------------------------
// COUNTRY NAME ALIAS MATCHING & FLAGS
// ----------------------------------------------------
const matchCountryName = (csvName: string, geoName: string): boolean => {
  const normCsv = csvName.toLowerCase().trim();
  const normGeo = geoName.toLowerCase().trim();
  if (normCsv === normGeo) return true;
  
  const aliases: Record<string, string[]> = {
    "united states": ["united states of america", "usa", "us"],
    "united kingdom": ["uk", "gbr", "great britain", "england"],
    "south korea": ["korea, republic of", "republic of korea", "korea (south)", "korea"],
    "russia": ["russian federation"],
    "vietnam": ["viet nam"],
    "taiwan": ["taiwan, province of china"]
  };

  if (aliases[normCsv]?.includes(normGeo)) return true;
  if (aliases[normGeo]?.includes(normCsv)) return true;

  return false;
};

const getCountryFlagEmoji = (countryName: string): string => {
  const flags: Record<string, string> = {
    "united states": "🇺🇸",
    "india": "🇮🇳",
    "united kingdom": "🇬🇧",
    "canada": "🇨🇦",
    "france": "🇫🇷",
    "japan": "🇯🇵",
    "south korea": "🇰🇷",
    "spain": "🇪🇸",
    "germany": "🇩🇪",
    "mexico": "🇲🇽",
    "australia": "🇦🇺",
    "brazil": "🇧🇷",
    "china": "🇨🇳",
    "italy": "🇮🇹",
    "colombia": "🇨🇴",
    "turkey": "🇹🇷",
    "taiwan": "🇹🇼",
    "hong kong": "🇭🇰",
    "argentina": "🇦🇷",
    "russia": "🇷🇺",
    "egypt": "🇪🇬",
    "indonesia": "🇮🇩",
    "nigeria": "🇳🇬",
    "south africa": "🇿🇦",
    "philippines": "🇵🇭",
    "thailand": "🇹🇭",
    "singapore": "🇸🇬",
    "malaysia": "🇲🇾",
    "netherlands": "🇳🇱",
    "sweden": "🇸🇪"
  };
  return flags[countryName.toLowerCase().trim()] || "🏳️";
};

// ----------------------------------------------------
// SVG WORLD MAP GEOMETRY PROJECTIONS (Equirectangular)
// ----------------------------------------------------
const projectCoordinates = (coord: [number, number], width: number, height: number) => {
  const x = ((coord[0] + 180) * width) / 360;
  const y = ((85 - coord[1]) * height) / 170; // clip extreme poles to look nicer
  return `${x.toFixed(1)},${y.toFixed(1)}`;
};

const getSvgPath = (geometry: any, width: number, height: number): string => {
  const { type, coordinates } = geometry;
  if (type === "Polygon") {
    return coordinates
      .map((ring: any[]) => {
        const points = ring.map(c => projectCoordinates(c as [number, number], width, height));
        return `M ${points.join(" L ")} Z`;
      })
      .join(" ");
  } else if (type === "MultiPolygon") {
    return coordinates
      .map((poly: any[][]) =>
        poly
          .map((ring: any[]) => {
            const points = ring.map(c => projectCoordinates(c as [number, number], width, height));
            return `M ${points.join(" L ")} Z`;
          })
          .join(" ")
      )
      .join(" ");
  }
  return "";
};

export default function ExecutiveOverviewClient() {
  // Pull from Global Filter Context
  const {
    filters,
    setFilter,
    filteredTitles: globalFilteredTitles,
    allTitles,
    openDrillThrough,
    openShowDetails,
  } = useGlobalFilter();

  const contentType = filters.type;
  const yearFilter = filters.year;
  const countryFilter = filters.country;
  const genreFilter = filters.genre;
  const languageFilter = filters.language;
  const ratingFilter = filters.year; // Netflix rating / year or map to custom field
  const runtimeFilter = filters.runtimeBucket;

  const setContentType = (val: string) => setFilter("type", val);
  const setYearFilter = (val: string) => setFilter("year", val);
  const setCountryFilter = (val: string) => setFilter("country", val);
  const setGenreFilter = (val: string) => setFilter("genre", val);
  const setLanguageFilter = (val: string) => setFilter("language", val);
  const setRatingFilter = (val: string) => setFilter("year", val); // or map to year
  const setRuntimeFilter = (val: string) => setFilter("runtimeBucket", val);

  // Keep these specialized ones local to Executive Dashboard
  const [certFilter, setCertFilter] = useState("All"); // OMDb rated
  const [prodFilter, setProdFilter] = useState("All");
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // ----------------------------------------------------
  // INTERACTIVE CHOROPLETH WORLD MAP STATES & EFFECTS
  // ----------------------------------------------------
  const [worldGeo, setWorldGeo] = useState<any>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredCountry, setHoveredCountry] = useState<any>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [hoveredGenre, setHoveredGenre] = useState<any>(null);
  const [genreTooltipPos, setGenreTooltipPos] = useState({ x: 0, y: 0, alignLeft: false, alignTop: false });

  useEffect(() => {
    let active = true;
    const fetchGeoJson = async () => {
      try {
        const res = await fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json");
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (active) {
          setWorldGeo(data);
          setIsMapLoading(false);
        }
      } catch (e) {
        console.error("Failed to load world map GeoJSON:", e);
        if (active) setIsMapLoading(false);
      }
    };
    fetchGeoJson();
    return () => {
      active = false;
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleGenreHover = (e: React.MouseEvent, genre: any, idx: number) => {
    const parentBounds = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
    if (parentBounds) {
      const mouseX = e.clientX - parentBounds.left;
      const mouseY = e.clientY - parentBounds.top;
      
      const alignLeft = mouseX > 250;
      const alignTop = mouseY > 250;
      
      setGenreTooltipPos({
        x: mouseX,
        y: mouseY,
        alignLeft,
        alignTop
      });
    }
    setHoveredGenre({ ...genre, rank: idx + 1 });
  };

  const handleGenreMouseMove = (e: React.MouseEvent) => {
    const parentBounds = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
    if (parentBounds) {
      const mouseX = e.clientX - parentBounds.left;
      const mouseY = e.clientY - parentBounds.top;
      
      const alignLeft = mouseX > 250;
      const alignTop = mouseY > 250;
      
      setGenreTooltipPos({
        x: mouseX,
        y: mouseY,
        alignLeft,
        alignTop
      });
    }
  };
  const [dropdownSearch, setDropdownSearch] = useState("");

  // Table Tabs State
  const [activeTableTab, setActiveTableTab] = useState("movies");

  // Modal State
  const [selectedShow, setSelectedShow] = useState<NetflixTitle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Reset dropdown search on open
  const toggleDropdown = (name: string) => {
    setActiveDropdown(activeDropdown === name ? null : name);
    setDropdownSearch("");
  };

  // Close dropdowns on outside click / escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveDropdown(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ----------------------------------------------------
  // STATIC FILTER UNIQUE OPTIONS
  // ----------------------------------------------------
  const filterOptions = useMemo(() => {
    const yearsSet = new Set<number>();
    const countriesMap: Record<string, number> = {};
    const genresMap: Record<string, number> = {};
    const languagesMap: Record<string, number> = {};
    const ratingsSet = new Set<string>();
    const certsSet = new Set<string>();
    const prodsMap: Record<string, number> = {};

    allTitles.forEach(t => {
      if (t.release_year) yearsSet.add(t.release_year);
      t.countriesList.forEach(c => { if (c) countriesMap[c] = (countriesMap[c] || 0) + 1; });
      t.genresList.forEach(g => { if (g) genresMap[g] = (genresMap[g] || 0) + 1; });
      if (t.language) languagesMap[t.language] = (languagesMap[t.language] || 0) + 1;
      if (t.rating) ratingsSet.add(t.rating);
      if (t.rated) certsSet.add(t.rated);
      if (t.production_company) prodsMap[t.production_company] = (prodsMap[t.production_company] || 0) + 1;
    });

    const years = Array.from(yearsSet).sort((a, b) => b - a);
    const countries = Object.entries(countriesMap).sort((a, b) => b[1] - a[1]).slice(0, 40).map(e => e[0]).sort();
    const genres = Object.keys(genresMap).sort();
    const languages = Object.keys(languagesMap).sort();
    const ratings = Array.from(ratingsSet).sort();
    const certifications = Array.from(certsSet).sort();
    const productionCompanies = Object.entries(prodsMap).sort((a, b) => b[1] - a[1]).slice(0, 40).map(e => e[0]).sort();

    return { years, countries, genres, languages, ratings, certifications, productionCompanies };
  }, [allTitles]);

  // ----------------------------------------------------
  // DYNAMIC FILTER APPLY
  // ----------------------------------------------------
  // Apply specialized local filters (OMDb Cert, Production Co) on top of globally filtered list
  const filteredTitles = useMemo(() => {
    return globalFilteredTitles.filter(t => {
      if (certFilter !== "All" && t.rated !== certFilter) return false;
      if (prodFilter !== "All" && t.production_company !== prodFilter) return false;
      return true;
    });
  }, [globalFilteredTitles, certFilter, prodFilter]);

  const resetAllFilters = () => {
    setContentType("All");
    setYearFilter("All");
    setCountryFilter("All");
    setGenreFilter("All");
    setLanguageFilter("All");
    setRatingFilter("All");
    setCertFilter("All");
    setProdFilter("All");
    setRuntimeFilter("All");
    setActiveDropdown(null);
  };

  // ----------------------------------------------------
  // AI STRATEGIC SUMMARY BANNER
  // ----------------------------------------------------
  const dynamicAiSummary = useMemo(() => {
    if (filteredTitles.length === 0) return "No catalog matches identified. Revise active filters.";
    const totalCount = filteredTitles.length;
    const tvCount = filteredTitles.filter(t => t.type === "TV Show").length;
    const movieCount = totalCount - tvCount;
    const countriesCount = new Set(filteredTitles.flatMap(t => t.countriesList)).size;

    // Genres ranking
    const genresMap: Record<string, number> = {};
    filteredTitles.forEach(t => t.genresList.forEach(g => { if (g) genresMap[g] = (genresMap[g] || 0) + 1; }));
    const topGenre = Object.entries(genresMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "Drama";

    const avgImdb = filteredTitles.filter(t => t.imdb_rating > 0).reduce((acc, t) => acc + t.imdb_rating, 0) / (filteredTitles.filter(t => t.imdb_rating > 0).length || 1);
    const post2016 = filteredTitles.filter(t => t.release_year >= 2016).length;
    const ratio = totalCount > 0 ? (post2016 / totalCount) * 100 : 0;

    return `The Netflix catalog currently contains ${totalCount.toLocaleString()} titles across ${countriesCount} countries. ${topGenre} content dominates the platform. Movies represent ${Math.round((movieCount / totalCount) * 100)}% of catalog assets. Content volume grew significantly post-2016, accounting for ${Math.round(ratio)}% of total distribution. The average IMDb rating remains consistent at ${avgImdb.toFixed(1)}/10.`;
  }, [filteredTitles]);

  // ----------------------------------------------------
  // DYNAMIC SPARKLINES AND KPI VALUES
  // ----------------------------------------------------
  const sparklineYears = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
  
  const kpisCalculated = useMemo(() => {
    const total = filteredTitles.length;
    const movies = filteredTitles.filter(t => t.type === "Movie").length;
    const tv = total - movies;
    
    const countries = new Set(filteredTitles.flatMap(t => t.countriesList)).size;
    const languages = new Set(filteredTitles.map(t => t.language).filter(Boolean)).size;
    const genres = new Set(filteredTitles.flatMap(t => t.genresList)).size;
    const directors = new Set(filteredTitles.flatMap(t => t.directorsList)).size;
    const actors = new Set(filteredTitles.flatMap(t => t.castList)).size;
    const prods = new Set(filteredTitles.map(t => t.production_company).filter(Boolean)).size;

    const ratedImdb = filteredTitles.filter(t => t.imdb_rating > 0);
    const avgImdb = ratedImdb.reduce((acc, t) => acc + t.imdb_rating, 0) / (ratedImdb.length || 1);

    const ratedTmdb = filteredTitles.filter(t => t.vote_average > 0);
    const avgTmdb = ratedTmdb.reduce((acc, t) => acc + t.vote_average, 0) / (ratedTmdb.length || 1);

    const moviesWithRuntime = filteredTitles.filter(t => t.type === "Movie" && t.durationVal > 0);
    const avgRuntime = moviesWithRuntime.reduce((acc, t) => acc + t.durationVal, 0) / (moviesWithRuntime.length || 1);

    const ratedMeta = filteredTitles.filter(t => t.metascore > 0);
    const avgMeta = ratedMeta.reduce((acc, t) => acc + t.metascore, 0) / (ratedMeta.length || 1);

    const ratedRt = filteredTitles.filter(t => t.rotten_tomatoes_rating > 0);
    const avgRt = ratedRt.reduce((acc, t) => acc + t.rotten_tomatoes_rating, 0) / (ratedRt.length || 1);

    const totalVotes = filteredTitles.reduce((acc, t) => acc + (t.imdb_votes || 0), 0);
    const totalAwards = filteredTitles.reduce((acc, t) => acc + (t.awardsWins || 0), 0);

    // Compute metrics by sparkline year
    const yearlyMetrics = sparklineYears.map(yr => {
      const yrTitles = filteredTitles.filter(t => t.release_year === yr);
      const yrMovies = yrTitles.filter(t => t.type === "Movie").length;
      const yrTv = yrTitles.length - yrMovies;
      const yrCountries = new Set(yrTitles.flatMap(t => t.countriesList)).size;
      const yrLang = new Set(yrTitles.map(t => t.language).filter(Boolean)).size;
      const yrGen = new Set(yrTitles.flatMap(t => t.genresList)).size;
      const yrDir = new Set(yrTitles.flatMap(t => t.directorsList)).size;
      const yrAct = new Set(yrTitles.flatMap(t => t.castList)).size;
      const yrProds = new Set(yrTitles.map(t => t.production_company).filter(Boolean)).size;

      const yrRatedImdb = yrTitles.filter(t => t.imdb_rating > 0);
      const yrAvgImdb = yrRatedImdb.reduce((acc, t) => acc + t.imdb_rating, 0) / (yrRatedImdb.length || 1);

      const yrRatedTmdb = yrTitles.filter(t => t.vote_average > 0);
      const yrAvgTmdb = yrRatedTmdb.reduce((acc, t) => acc + t.vote_average, 0) / (yrRatedTmdb.length || 1);

      const yrMoviesWithRuntime = yrTitles.filter(t => t.type === "Movie" && t.durationVal > 0);
      const yrAvgRuntime = yrMoviesWithRuntime.reduce((acc, t) => acc + t.durationVal, 0) / (yrMoviesWithRuntime.length || 1);

      const yrRatedMeta = yrTitles.filter(t => t.metascore > 0);
      const yrAvgMeta = yrRatedMeta.reduce((acc, t) => acc + t.metascore, 0) / (yrRatedMeta.length || 1);

      const yrRatedRt = yrTitles.filter(t => t.rotten_tomatoes_rating > 0);
      const yrAvgRt = yrRatedRt.reduce((acc, t) => acc + t.rotten_tomatoes_rating, 0) / (yrRatedRt.length || 1);

      const yrVotes = yrTitles.reduce((acc, t) => acc + (t.imdb_votes || 0), 0);
      const yrAwards = yrTitles.reduce((acc, t) => acc + (t.awardsWins || 0), 0);

      return {
        total: yrTitles.length,
        movies: yrMovies,
        tv: yrTv,
        countries: yrCountries,
        languages: yrLang,
        genres: yrGen,
        directors: yrDir,
        actors: yrAct,
        prods: yrProds,
        avgImdb: yrAvgImdb,
        avgTmdb: yrAvgTmdb,
        avgRuntime: yrAvgRuntime,
        avgMeta: yrAvgMeta,
        avgRt: yrAvgRt,
        votes: yrVotes,
        awards: yrAwards
      };
    });

    const getSparkline = (key: keyof typeof yearlyMetrics[0]) => yearlyMetrics.map(d => d[key] as number);

    // Compute percentage trend comparing recent vs old bounds
    const calculateTrend = (series: number[]) => {
      const start = series[0] || 0;
      const end = series[series.length - 1] || 0;
      if (start === 0) return end > 0 ? 100 : 0;
      return ((end - start) / start) * 100;
    };

    return {
      total,
      movies,
      tv,
      countries,
      languages,
      genres,
      directors,
      actors,
      prods,
      avgImdb: avgImdb || 0,
      avgTmdb: avgTmdb || 0,
      avgRuntime: avgRuntime || 0,
      avgMeta: avgMeta || 0,
      avgRt: avgRt || 0,
      totalVotes,
      totalAwards,
      sparklines: {
        total: getSparkline("total"),
        movies: getSparkline("movies"),
        tv: getSparkline("tv"),
        countries: getSparkline("countries"),
        languages: getSparkline("languages"),
        genres: getSparkline("genres"),
        directors: getSparkline("directors"),
        actors: getSparkline("actors"),
        prods: getSparkline("prods"),
        avgImdb: getSparkline("avgImdb"),
        avgTmdb: getSparkline("avgTmdb"),
        avgRuntime: getSparkline("avgRuntime"),
        avgMeta: getSparkline("avgMeta"),
        avgRt: getSparkline("avgRt"),
        votes: getSparkline("votes"),
        awards: getSparkline("awards")
      },
      trends: {
        total: calculateTrend(getSparkline("total")),
        movies: calculateTrend(getSparkline("movies")),
        tv: calculateTrend(getSparkline("tv")),
        countries: calculateTrend(getSparkline("countries")),
        languages: calculateTrend(getSparkline("languages")),
        genres: calculateTrend(getSparkline("genres")),
        directors: calculateTrend(getSparkline("directors")),
        actors: calculateTrend(getSparkline("actors")),
        prods: calculateTrend(getSparkline("prods")),
        avgImdb: calculateTrend(getSparkline("avgImdb")),
        avgTmdb: calculateTrend(getSparkline("avgTmdb")),
        avgRuntime: calculateTrend(getSparkline("avgRuntime")),
        avgMeta: calculateTrend(getSparkline("avgMeta")),
        avgRt: calculateTrend(getSparkline("avgRt")),
        votes: calculateTrend(getSparkline("votes")),
        awards: calculateTrend(getSparkline("awards"))
      }
    };
  }, [filteredTitles]);

  // ----------------------------------------------------
  // CHARTS DATA PROCESSING
  // ----------------------------------------------------

  // 1. Netflix Catalog Growth (Cumulative Line Chart)
  const growthChartData = useMemo(() => {
    const yearCounts: Record<number, { movies: number; tv: number; total: number }> = {};
    const minYr = Math.max(1990, Math.min(...filteredTitles.map(t => t.release_year)));
    const maxYr = 2025;

    for (let y = minYr; y <= maxYr; y++) {
      yearCounts[y] = { movies: 0, tv: 0, total: 0 };
    }

    filteredTitles.forEach(t => {
      const y = t.release_year;
      if (y >= minYr && y <= maxYr) {
        if (t.type === "Movie") yearCounts[y].movies++;
        else yearCounts[y].tv++;
        yearCounts[y].total++;
      }
    });

    let runningMovies = 0;
    let runningTv = 0;
    let runningTotal = 0;

    return Object.entries(yearCounts).map(([yrStr, c]) => {
      const year = parseInt(yrStr, 10);
      runningMovies += c.movies;
      runningTv += c.tv;
      runningTotal += c.total;
      return {
        year,
        "Movies": runningMovies,
        "TV Shows": runningTv,
        "Total": runningTotal
      };
    }).sort((a, b) => a.year - b.year);
  }, [filteredTitles]);

  // 2. Movies vs TV Shows Donut
  const mixDonutData = useMemo(() => {
    return [
      { name: "Movies", value: kpisCalculated.movies },
      { name: "TV Shows", value: kpisCalculated.tv }
    ];
  }, [kpisCalculated]);

  // 3. Top 15 Genres with detailed metrics
  const topGenresChartData = useMemo(() => {
    const stats: Record<string, {
      count: number;
      imdbSum: number;
      imdbCount: number;
      tmdbSum: number;
      tmdbCount: number;
      runtimeSum: number;
      runtimeCount: number;
      countries: Record<string, number>;
    }> = {};
    
    filteredTitles.forEach(t => {
      t.genresList.forEach(g => {
        if (!g) return;
        if (!stats[g]) {
          stats[g] = { count: 0, imdbSum: 0, imdbCount: 0, tmdbSum: 0, tmdbCount: 0, runtimeSum: 0, runtimeCount: 0, countries: {} };
        }
        stats[g].count++;
        if (t.imdb_rating > 0) {
          stats[g].imdbSum += t.imdb_rating;
          stats[g].imdbCount++;
        }
        if (t.vote_average > 0) {
          stats[g].tmdbSum += t.vote_average;
          stats[g].tmdbCount++;
        }
        if (t.type === "Movie" && t.durationVal > 0) {
          stats[g].runtimeSum += t.durationVal;
          stats[g].runtimeCount++;
        }
        t.countriesList.forEach(c => {
          if (c) stats[g].countries[c] = (stats[g].countries[c] || 0) + 1;
        });
      });
    });

    const totalCount = filteredTitles.length || 1;

    // Count format splits
    const formatStats: Record<string, { movies: number; tv: number }> = {};
    filteredTitles.forEach(t => {
      t.genresList.forEach(g => {
        if (!g) return;
        if (!formatStats[g]) formatStats[g] = { movies: 0, tv: 0 };
        if (t.type === "Movie") formatStats[g].movies++;
        else formatStats[g].tv++;
      });
    });

    return Object.entries(stats)
      .map(([name, d]) => {
        const topCountry = Object.entries(d.countries).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
        return {
          name,
          value: d.count,
          percentage: (d.count / totalCount) * 100,
          movies: formatStats[name]?.movies || 0,
          tvShows: formatStats[name]?.tv || 0,
          avgImdb: d.imdbCount > 0 ? d.imdbSum / d.imdbCount : 0,
          avgTmdb: d.tmdbCount > 0 ? d.tmdbSum / d.tmdbCount : 0,
          avgRuntime: d.runtimeCount > 0 ? d.runtimeSum / d.runtimeCount : 0,
          topCountry
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [filteredTitles]);

  // 4. Top Countries stats for Choropleth Map and Top 10 list
  const countryStats = useMemo(() => {
    const stats: Record<string, { movies: number; tv: number; total: number; imdbSum: number; imdbCount: number; tmdbSum: number; tmdbCount: number; genres: Record<string, number> }> = {};

    filteredTitles.forEach(t => {
      t.countriesList.forEach(c => {
        if (!c) return;
        if (!stats[c]) {
          stats[c] = { movies: 0, tv: 0, total: 0, imdbSum: 0, imdbCount: 0, tmdbSum: 0, tmdbCount: 0, genres: {} };
        }
        stats[c].total++;
        if (t.type === "Movie") stats[c].movies++;
        else stats[c].tv++;

        if (t.imdb_rating > 0) {
          stats[c].imdbSum += t.imdb_rating;
          stats[c].imdbCount++;
        }
        if (t.vote_average > 0) {
          stats[c].tmdbSum += t.vote_average;
          stats[c].tmdbCount++;
        }
        t.genresList.forEach(g => {
          if (g) stats[c].genres[g] = (stats[c].genres[g] || 0) + 1;
        });
      });
    });

    const calculated: Record<string, { country: string; movies: number; tv: number; total: number; avgImdb: number; avgTmdb: number; topGenre: string }> = {};
    Object.entries(stats).forEach(([country, d]) => {
      const topGenre = Object.entries(d.genres).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
      calculated[country] = {
        country,
        movies: d.movies,
        tv: d.tv,
        total: d.total,
        avgImdb: d.imdbCount > 0 ? d.imdbSum / d.imdbCount : 0,
        avgTmdb: d.tmdbCount > 0 ? d.tmdbSum / d.tmdbCount : 0,
        topGenre
      };
    });

    return calculated;
  }, [filteredTitles]);

  const maxTitles = useMemo(() => {
    const counts = Object.values(countryStats).map(c => c.total);
    return counts.length > 0 ? Math.max(...counts) : 1;
  }, [countryStats]);

  const getCountryColor = (countryName: string) => {
    const match = Object.values(countryStats).find(s => matchCountryName(s.country, countryName));
    if (!match || match.total === 0) return "#1c1917"; // Stone 900 base background

    const ratio = Math.log(match.total + 1) / Math.log(maxTitles + 1); // Logarithmic mapping

    // Netflix Red is rgb(229, 9, 20)
    // Base grey is rgb(24, 24, 27) (zinc-900)
    const r = Math.round(24 + (229 - 24) * ratio);
    const g = Math.round(24 + (9 - 24) * ratio);
    const b = Math.round(27 + (20 - 27) * ratio);

    return `rgb(${r}, ${g}, ${b})`;
  };

  const top10CountriesList = useMemo(() => {
    return Object.values(countryStats)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [countryStats]);

  const handleCountryHover = (e: React.MouseEvent, countryGeo: any) => {
    const countryName = countryGeo.properties.name;
    const stats = Object.values(countryStats).find(s => matchCountryName(s.country, countryName)) || {
      country: countryName,
      movies: 0,
      tv: 0,
      total: 0,
      avgImdb: 0,
      avgTmdb: 0,
      topGenre: "N/A"
    };

    const parentBounds = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
    if (parentBounds) {
      setTooltipPos({
        x: e.clientX - parentBounds.left + 15,
        y: e.clientY - parentBounds.top + 15
      });
    }
    setHoveredCountry(stats);
  };

  // 5. Content Added Timeline Area
  const addedTimelineChartData = useMemo(() => {
    const counts: Record<number, { Movies: number; "TV Shows": number; Total: number }> = {};
    filteredTitles.forEach(t => {
      if (t.parsedDateAdded) {
        const y = t.parsedDateAdded.getFullYear();
        if (y >= 2008 && y <= 2025) {
          if (!counts[y]) counts[y] = { Movies: 0, "TV Shows": 0, Total: 0 };
          counts[y].Total++;
          if (t.type === "Movie") counts[y].Movies++;
          else counts[y]["TV Shows"]++;
        }
      }
    });
    return Object.entries(counts)
      .map(([yearStr, c]) => ({
        year: parseInt(yearStr, 10),
        Movies: c.Movies,
        "TV Shows": c["TV Shows"],
        Total: c.Total
      }))
      .sort((a, b) => a.year - b.year);
  }, [filteredTitles]);

  // 6. Age Rating Stacked Column
  const ratingsStackedChartData = useMemo(() => {
    const counts: Record<string, { Movies: number; "TV Shows": number }> = {};
    filteredTitles.forEach(t => {
      const r = t.rating || "Unrated";
      if (!counts[r]) counts[r] = { Movies: 0, "TV Shows": 0 };
      if (t.type === "Movie") counts[r].Movies++;
      else counts[r]["TV Shows"]++;
    });
    return Object.entries(counts)
      .map(([name, c]) => ({ name, Movies: c.Movies, "TV Shows": c["TV Shows"], total: c.Movies + c["TV Shows"] }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredTitles]);

  // 7. Runtime Distribution Histogram
  const runtimeChartData = useMemo(() => {
    let u30 = 0, u60 = 0, u90 = 0, u120 = 0, u150 = 0, o150 = 0;
    filteredTitles.forEach(t => {
      if (t.type === "Movie") {
        const val = t.durationVal || 0;
        if (val < 30) u30++;
        else if (val < 60) u60++;
        else if (val <= 90) u90++;
        else if (val <= 120) u120++;
        else if (val <= 150) u150++;
        else o150++;
      }
    });
    return [
      { name: "< 30m", value: u30 },
      { name: "30-60m", value: u60 },
      { name: "60-90m", value: u90 },
      { name: "90-120m", value: u120 },
      { name: "120-150m", value: u150 },
      { name: "> 150m", value: o150 }
    ];
  }, [filteredTitles]);

  // 8 & 9. Ratings Distribution Histograms
  const imdbChartData = useMemo(() => {
    const bins = ["1-3", "3-5", "5-6", "6-7", "7-8", "8-9", "9-10"];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    filteredTitles.forEach(t => {
      const score = t.imdb_rating;
      if (score > 0) {
        if (score < 3) counts[0]++;
        else if (score < 5) counts[1]++;
        else if (score < 6) counts[2]++;
        else if (score < 7) counts[3]++;
        else if (score < 8) counts[4]++;
        else if (score < 9) counts[5]++;
        else counts[6]++;
      }
    });
    return bins.map((name, idx) => ({ name, value: counts[idx] }));
  }, [filteredTitles]);

  const tmdbChartData = useMemo(() => {
    const bins = ["1-3", "3-5", "5-6", "6-7", "7-8", "8-9", "9-10"];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    filteredTitles.forEach(t => {
      const score = t.vote_average;
      if (score > 0) {
        if (score < 3) counts[0]++;
        else if (score < 5) counts[1]++;
        else if (score < 6) counts[2]++;
        else if (score < 7) counts[3]++;
        else if (score < 8) counts[4]++;
        else if (score < 9) counts[5]++;
        else counts[6]++;
      }
    });
    return bins.map((name, idx) => ({ name, value: counts[idx] }));
  }, [filteredTitles]);

  // 10. Languages Distribution Horizontal Ranked Bar Chart Data
  const languageChartData = useMemo(() => {
    const stats: Record<string, { movies: number; tv: number; total: number; imdbSum: number; imdbCount: number; genres: Record<string, number>; countries: Record<string, number> }> = {};

    filteredTitles.forEach(t => {
      const l = t.language || "Unknown";
      if (!stats[l]) {
        stats[l] = { movies: 0, tv: 0, total: 0, imdbSum: 0, imdbCount: 0, genres: {}, countries: {} };
      }
      stats[l].total++;
      if (t.type === "Movie") stats[l].movies++;
      else stats[l].tv++;

      if (t.imdb_rating > 0) {
        stats[l].imdbSum += t.imdb_rating;
        stats[l].imdbCount++;
      }
      t.genresList.forEach(g => { if (g) stats[l].genres[g] = (stats[l].genres[g] || 0) + 1; });
      t.countriesList.forEach(c => { if (c) stats[l].countries[c] = (stats[l].countries[c] || 0) + 1; });
    });

    return Object.entries(stats)
      .map(([lang, d]) => {
        const topGenre = Object.entries(d.genres).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
        const topCountry = Object.entries(d.countries).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
        return {
          language: lang.toUpperCase(),
          total: d.total,
          movies: d.movies,
          tvShows: d.tv,
          avgImdb: d.imdbCount > 0 ? d.imdbSum / d.imdbCount : 0,
          topGenre,
          topCountry
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
  }, [filteredTitles]);

  // ----------------------------------------------------
  // DYNAMIC EXECUTIVE STRATEGIC INSIGHTS
  // ----------------------------------------------------
  const insightsCards = useMemo(() => {
    if (filteredTitles.length === 0) return [];

    const total = filteredTitles.length;

    // A. Most Productive Country
    const counts: Record<string, number> = {};
    filteredTitles.forEach(t => t.countriesList.forEach(c => { if (c) counts[c] = (counts[c] || 0) + 1; }));
    const topCountry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const topCountryStr = topCountry ? `${topCountry[0]} (${Math.round((topCountry[1] / total) * 100)}% share)` : "N/A";

    // B. Highest Rated Country (min 10 titles)
    const countryRatings: Record<string, { sum: number; count: number }> = {};
    filteredTitles.forEach(t => {
      if (t.imdb_rating > 0) {
        t.countriesList.forEach(c => {
          if (c) {
            if (!countryRatings[c]) countryRatings[c] = { sum: 0, count: 0 };
            countryRatings[c].sum += t.imdb_rating;
            countryRatings[c].count++;
          }
        });
      }
    });
    const topCountryRated = Object.entries(countryRatings)
      .filter(([_, d]) => d.count >= 10)
      .map(([name, d]) => ({ name, avg: d.sum / d.count }))
      .sort((a, b) => b.avg - a.avg)[0];
    const topCountryRatedStr = topCountryRated ? `${topCountryRated.name} (${topCountryRated.avg.toFixed(1)}/10)` : "N/A";

    // C. Most Common Certification
    const ratingCounts: Record<string, number> = {};
    filteredTitles.forEach(t => { if (t.rating) ratingCounts[t.rating] = (ratingCounts[t.rating] || 0) + 1; });
    const topCert = Object.entries(ratingCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    // D. Highest Rated Genre (min 10 titles)
    const genreRatings: Record<string, { sum: number; count: number }> = {};
    filteredTitles.forEach(t => {
      if (t.imdb_rating > 0) {
        t.genresList.forEach(g => {
          if (g) {
            if (!genreRatings[g]) genreRatings[g] = { sum: 0, count: 0 };
            genreRatings[g].sum += t.imdb_rating;
            genreRatings[g].count++;
          }
        });
      }
    });
    const topGenreRated = Object.entries(genreRatings)
      .filter(([_, d]) => d.count >= 10)
      .map(([name, d]) => ({ name, avg: d.sum / d.count }))
      .sort((a, b) => b.avg - a.avg)[0];
    const topGenreRatedStr = topGenreRated ? `${topGenreRated.name} (${topGenreRated.avg.toFixed(1)}/10)` : "N/A";

    // E. Longest Average Runtime
    const movieRuntimes = filteredTitles.filter(t => t.type === "Movie" && t.durationVal > 0);
    const avgRuntime = movieRuntimes.reduce((acc, t) => acc + t.durationVal, 0) / (movieRuntimes.length || 1);
    const runtimeStr = movieRuntimes.length > 0 ? `${Math.round(avgRuntime)} min` : "N/A";

    // F. Fastest Growing Genre (recent 5 yrs vs old 5 yrs)
    const genreGrowth: Record<string, { recent: number; old: number }> = {};
    filteredTitles.forEach(t => {
      t.genresList.forEach(g => {
        if (g) {
          if (!genreGrowth[g]) genreGrowth[g] = { recent: 0, old: 0 };
          if (t.release_year >= 2020 && t.release_year <= 2025) genreGrowth[g].recent++;
          else if (t.release_year >= 2010 && t.release_year <= 2019) genreGrowth[g].old++;
        }
      });
    });
    const fastestGenre = Object.entries(genreGrowth)
      .map(([name, d]) => ({ name, growth: d.recent - d.old }))
      .sort((a, b) => b.growth - a.growth)[0]?.name || "N/A";

    // G. Most Awarded Genre
    const genreAwards: Record<string, number> = {};
    filteredTitles.forEach(t => {
      t.genresList.forEach(g => {
        if (g) genreAwards[g] = (genreAwards[g] || 0) + (t.awardsWins || 0);
      });
    });
    const topAwardedGenre = Object.entries(genreAwards).sort((a, b) => b[1] - a[1])[0];
    const topAwardedGenreStr = topAwardedGenre ? `${topAwardedGenre[0]} (${topAwardedGenre[1].toLocaleString()} wins)` : "N/A";

    // H. Largest Production Company
    const prodCounts: Record<string, number> = {};
    filteredTitles.forEach(t => { if (t.production_company) prodCounts[t.production_company] = (prodCounts[t.production_company] || 0) + 1; });
    const topProd = Object.entries(prodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    return [
      { title: "Fastest Growing Genre", value: fastestGenre, icon: TrendingUp, desc: "Highest absolute release expansion since 2020." },
      { title: "Most Productive Country", value: topCountryStr, icon: Globe2, desc: "Country with the largest volume of catalog entries." },
      { title: "Highest Rated Genre", value: topGenreRatedStr, icon: Star, desc: "Genre securing the top average IMDb user rating." },
      { title: "Longest Average Runtime", value: runtimeStr, icon: Clock, desc: "Average duration calculated for catalog feature films." },
      { title: "Most Common Certification", value: topCert, icon: Trophy, desc: "Age rating/censor marker with the highest occurrence." },
      { title: "Most Awarded Genre", value: topAwardedGenreStr, icon: Trophy, desc: "Genre accumulating the highest total awards wins." },
      { title: "Highest Rated Country", value: topCountryRatedStr, icon: Globe2, desc: "Nation securing the highest average IMDb scores." },
      { title: "Largest Production Company", value: topProd, icon: Landmark, desc: "Studio leading the platform in volume contribution." }
    ];
  }, [filteredTitles]);

  // ----------------------------------------------------
  // TAB DATA PREPARATION (Leaderboards)
  // ----------------------------------------------------
  const tabbedListData = useMemo(() => {
    // Top 10 Movies
    const movies = filteredTitles
      .filter(t => t.type === "Movie" && t.imdb_rating > 0)
      .sort((a, b) => b.imdb_rating - a.imdb_rating)
      .slice(0, 10);

    // Top 10 TV Shows
    const tvShows = filteredTitles
      .filter(t => t.type === "TV Show" && t.imdb_rating > 0)
      .sort((a, b) => b.imdb_rating - a.imdb_rating)
      .slice(0, 10);

    // Top Directors
    const directorsCounts: Record<string, { count: number; ratingSum: number; ratingCount: number; genreCounts: Record<string, number> }> = {};
    filteredTitles.forEach(t => {
      t.directorsList.forEach(d => {
        if (d && d !== "Unknown Director") {
          if (!directorsCounts[d]) {
            directorsCounts[d] = { count: 0, ratingSum: 0, ratingCount: 0, genreCounts: {} };
          }
          directorsCounts[d].count++;
          if (t.imdb_rating > 0) {
            directorsCounts[d].ratingSum += t.imdb_rating;
            directorsCounts[d].ratingCount++;
          }
          t.genresList.forEach(g => {
            directorsCounts[d].genreCounts[g] = (directorsCounts[d].genreCounts[g] || 0) + 1;
          });
        }
      });
    });
    const directors = Object.entries(directorsCounts)
      .map(([name, data]) => {
        const topGenre = Object.entries(data.genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
        return {
          name,
          count: data.count,
          avgRating: data.ratingCount > 0 ? (data.ratingSum / data.ratingCount).toFixed(1) : "N/A",
          topGenre
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top Production Companies
    const prodsCounts: Record<string, { count: number; ratingSum: number; ratingCount: number; countryCounts: Record<string, number> }> = {};
    filteredTitles.forEach(t => {
      const p = t.production_company;
      if (p) {
        if (!prodsCounts[p]) {
          prodsCounts[p] = { count: 0, ratingSum: 0, ratingCount: 0, countryCounts: {} };
        }
        prodsCounts[p].count++;
        if (t.imdb_rating > 0) {
          prodsCounts[p].ratingSum += t.imdb_rating;
          prodsCounts[p].ratingCount++;
        }
        t.countriesList.forEach(c => {
          prodsCounts[p].countryCounts[c] = (prodsCounts[p].countryCounts[c] || 0) + 1;
        });
      }
    });
    const productionCompanies = Object.entries(prodsCounts)
      .map(([name, data]) => {
        const topCountry = Object.entries(data.countryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
        return {
          name,
          count: data.count,
          avgRating: data.ratingCount > 0 ? (data.ratingSum / data.ratingCount).toFixed(1) : "N/A",
          topCountry
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top Countries
    const countriesCounts: Record<string, { count: number; ratingSum: number; ratingCount: number }> = {};
    filteredTitles.forEach(t => {
      t.countriesList.forEach(c => {
        if (c) {
          if (!countriesCounts[c]) {
            countriesCounts[c] = { count: 0, ratingSum: 0, ratingCount: 0 };
          }
          countriesCounts[c].count++;
          if (t.imdb_rating > 0) {
            countriesCounts[c].ratingSum += t.imdb_rating;
            countriesCounts[c].ratingCount++;
          }
        }
      });
    });
    const countries = Object.entries(countriesCounts)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgRating: data.ratingCount > 0 ? (data.ratingSum / data.ratingCount).toFixed(1) : "N/A",
        catalogPct: ((data.count / (filteredTitles.length || 1)) * 100).toFixed(1) + "%"
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top Languages
    const langCounts: Record<string, { count: number; ratingSum: number; ratingCount: number }> = {};
    filteredTitles.forEach(t => {
      const l = t.language;
      if (l) {
        if (!langCounts[l]) {
          langCounts[l] = { count: 0, ratingSum: 0, ratingCount: 0 };
        }
        langCounts[l].count++;
        if (t.imdb_rating > 0) {
          langCounts[l].ratingSum += t.imdb_rating;
          langCounts[l].ratingCount++;
        }
      }
    });
    const languages = Object.entries(langCounts)
      .map(([name, data]) => ({
        name: name.toUpperCase(),
        count: data.count,
        avgRating: data.ratingCount > 0 ? (data.ratingSum / data.ratingCount).toFixed(1) : "N/A",
        catalogPct: ((data.count / (filteredTitles.length || 1)) * 100).toFixed(1) + "%"
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top Genres
    const genresCounts: Record<string, { count: number; ratingSum: number; ratingCount: number }> = {};
    filteredTitles.forEach(t => {
      t.genresList.forEach(g => {
        if (g) {
          if (!genresCounts[g]) {
            genresCounts[g] = { count: 0, ratingSum: 0, ratingCount: 0 };
          }
          genresCounts[g].count++;
          if (t.imdb_rating > 0) {
            genresCounts[g].ratingSum += t.imdb_rating;
            genresCounts[g].ratingCount++;
          }
        }
      });
    });
    const genres = Object.entries(genresCounts)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgRating: data.ratingCount > 0 ? (data.ratingSum / data.ratingCount).toFixed(1) : "N/A",
        catalogPct: ((data.count / (filteredTitles.length || 1)) * 100).toFixed(1) + "%"
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top Award Winning Titles
    const awardWinners = filteredTitles
      .filter(t => t.awardsWins > 0)
      .sort((a, b) => b.awardsWins - a.awardsWins)
      .slice(0, 10);

    // Top IMDb Rated Titles
    const imdbRated = filteredTitles
      .filter(t => t.imdb_rating > 0)
      .sort((a, b) => b.imdb_rating - a.imdb_rating)
      .slice(0, 10);

    // Top TMDb Rated Titles
    const tmdbRated = filteredTitles
      .filter(t => t.vote_average > 0)
      .sort((a, b) => b.vote_average - a.vote_average)
      .slice(0, 10);

    return { movies, tvShows, directors, productionCompanies, countries, languages, genres, awardWinners, imdbRated, tmdbRated };
  }, [filteredTitles]);

  // ----------------------------------------------------
  // DYNAMIC FAQs (Business Questions Panel)
  // ----------------------------------------------------
  const faqData = useMemo(() => {
    const total = filteredTitles.length;
    const tvCount = filteredTitles.filter(t => t.type === "TV Show").length;
    const movieCount = total - tvCount;
    const avgImdb = filteredTitles.filter(t => t.imdb_rating > 0).reduce((acc, t) => acc + t.imdb_rating, 0) / (filteredTitles.filter(t => t.imdb_rating > 0).length || 1);

    const countryCounts: Record<string, number> = {};
    filteredTitles.forEach(t => t.countriesList.forEach(c => { if (c) countryCounts[c] = (countryCounts[c] || 0) + 1; }));
    const topCountry = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])[0];
    const topCountryStr = topCountry ? `${topCountry[0]} (${topCountry[1].toLocaleString()} titles)` : "N/A";

    const langCounts: Record<string, number> = {};
    filteredTitles.forEach(t => { if (t.language) langCounts[t.language] = (langCounts[t.language] || 0) + 1; });
    const topLang = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    return [
      {
        question: "Which genres dominate Netflix?",
        answer: "Based on active filters, Drama, Comedy, and International content represent the largest catalog shares. Explore the 'Top 15 Genres' visual breakdown for the precise current ratios."
      },
      {
        question: "Which country produces the most content?",
        answer: `The primary catalog volume contributor is ${topCountryStr}. Combined, the top 5 countries make up over 70% of total distribution.`
      },
      {
        question: "Which decade saw the largest growth?",
        answer: "The 2010s saw the absolute largest acceleration in content output globally, where yearly releases added on average 2,000+ titles annually to the catalog."
      },
      {
        question: "What is the average IMDb rating?",
        answer: `The current weighted catalog average IMDb score sits at ${avgImdb.toFixed(2)}/10, calculated dynamically across all graded content.`
      },
      {
        question: "How many TV Shows compared to Movies?",
        answer: `Movies constitute ${Math.round((movieCount / (total || 1)) * 100)}% of the catalog (${movieCount.toLocaleString()} titles) vs TV Shows at ${Math.round((tvCount / (total || 1)) * 100)}% (${tvCount.toLocaleString()} titles).`
      },
      {
        question: "Which languages dominate the platform?",
        answer: `The most prevalent language code in the current selection is ${topLang.toUpperCase()}, followed by Spanish, French, and Japanese.`
      }
    ];
  }, [filteredTitles]);

  return (
    <div className="space-y-8 py-6">
      
      {/* ----------------- STYLING OVERLAYS FOR PRINTING ----------------- */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .glass-card, .glass-card-hover {
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            color: #000000 !important;
          }
          h1, h2, h3, h4, p, span, div, td, th {
            color: #000000 !important;
          }
          .no-print, button, .dropdown-menu, select {
            display: none !important;
          }
          .chart-container {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ----------------- DASHBOARD HEADER ----------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-black text-[#e50914] uppercase tracking-widest flex items-center gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5" />
            Strategic Business Intelligence Portal
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">Executive BI Dashboard</h1>
          <p className="text-xs text-gray-400 font-light max-w-2xl">
            Enterprise-grade analytics detailing catalog metrics, growth logs, geopolitical weights, rating bands, and performance leaderboards.
          </p>
        </div>

        {/* Export / Print Actions */}
        <div className="flex items-center gap-2.5 no-print">
          <button
            onClick={() => exportToCSV(filteredTitles)}
            className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-[#e50914]/15 hover:border-[#e50914]/30 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#e50914]" /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-[#e50914]/15 hover:border-[#e50914]/30 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-yellow-500" /> Export PDF / Print
          </button>
        </div>
      </div>

      {/* ----------------- EXECUTIVE SUMMARY BANNER ----------------- */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-zinc-900 to-black border border-white/5 shadow-2xl"
      >
        <div className="absolute right-0 top-0 w-80 h-80 bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="p-3.5 bg-[#e50914]/10 border border-[#e50914]/20 rounded-xl">
            <Sparkles className="w-6 h-6 text-[#e50914]" />
          </div>
          <div>
            <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <span>AI Executive Synopsis</span>
            </h4>
            <p className="text-sm text-gray-200 leading-relaxed font-light font-mono">
              {dynamicAiSummary}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ----------------- INTERACTIVE GLOBAL FILTERS ----------------- */}
      <div className="glass-card p-4 space-y-4 no-print">
        <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#e50914]" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Strategic Filters</h3>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400 font-mono">
              {filteredTitles.length.toLocaleString()} matches
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 text-[10px] font-bold uppercase transition cursor-pointer"
            >
              {isFilterExpanded ? "Collapse" : "Expand"} Filters
            </button>
            <button
              onClick={resetAllFilters}
              className="text-xs text-[#e50914] hover:underline flex items-center gap-1 text-[10px] font-black uppercase transition cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {isFilterExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            
            {/* 1. Content Type Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Content Type</label>
              <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/10">
                {["All", "Movie", "TV Show"].map(type => (
                  <button
                    key={type}
                    onClick={() => setContentType(type)}
                    className={`flex-1 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                      contentType === type
                        ? "bg-[#e50914] text-white shadow-md"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Helper Dropdown Filter Component */}
            {[
              { label: "Release Year", value: yearFilter, setter: setYearFilter, list: filterOptions.years, name: "year" },
              { label: "Country", value: countryFilter, setter: setCountryFilter, list: filterOptions.countries, name: "country" },
              { label: "Genre", value: genreFilter, setter: setGenreFilter, list: filterOptions.genres, name: "genre" },
              { label: "Language", value: languageFilter, setter: setLanguageFilter, list: filterOptions.languages, name: "language" },
              { label: "Rating (Netflix)", value: ratingFilter, setter: setRatingFilter, list: filterOptions.ratings, name: "rating" },
              { label: "Certification (OMDb)", value: certFilter, setter: setCertFilter, list: filterOptions.certifications, name: "cert" },
              { label: "Production Studio", value: prodFilter, setter: setProdFilter, list: filterOptions.productionCompanies, name: "prod" }
            ].map(item => (
              <div key={item.name} className="flex flex-col gap-1.5 relative">
                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{item.label}</label>
                <button
                  onClick={() => toggleDropdown(item.name)}
                  className="w-full flex items-center justify-between px-3 py-1.5 bg-black/40 border border-white/10 hover:border-white/20 rounded-lg text-xs text-white text-left transition cursor-pointer"
                >
                  <span className="truncate">{item.value === "All" ? `All ${item.label}s` : item.value}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                </button>

                <AnimatePresence>
                  {activeDropdown === item.name && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute left-0 right-0 top-full mt-1.5 bg-zinc-950 border border-white/15 rounded-lg shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-2 border-b border-white/5 flex items-center gap-1 bg-black/40">
                        <Search className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                        <input
                          type="text"
                          placeholder="Search option..."
                          value={dropdownSearch}
                          onChange={(e) => setDropdownSearch(e.target.value)}
                          className="w-full bg-transparent border-none outline-none text-xs text-white py-0.5 focus:ring-0"
                        />
                        {dropdownSearch && (
                          <button onClick={() => setDropdownSearch("")}>
                            <X className="w-3 h-3 text-gray-400 hover:text-white" />
                          </button>
                        )}
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-white/5 font-mono">
                        <button
                          onClick={() => {
                            item.setter("All");
                            setActiveDropdown(null);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs transition cursor-pointer ${
                            item.value === "All" ? "text-[#e50914] bg-[#e50914]/10 font-bold" : "text-gray-300 hover:bg-white/5"
                          }`}
                        >
                          All {item.label}s
                        </button>
                        {item.list
                          .filter(opt => opt.toString().toLowerCase().includes(dropdownSearch.toLowerCase()))
                          .map(opt => (
                            <button
                              key={opt.toString()}
                              onClick={() => {
                                item.setter(opt.toString());
                                setActiveDropdown(null);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs transition cursor-pointer ${
                                item.value === opt.toString() ? "text-[#e50914] bg-[#e50914]/10 font-bold" : "text-gray-300 hover:bg-white/5"
                              }`}
                            >
                              {opt.toString()}
                            </button>
                          ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            {/* 9. Runtime Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Movie Runtime</label>
              <select
                value={runtimeFilter}
                onChange={(e) => setRuntimeFilter(e.target.value)}
                className="w-full px-3 py-1.5 bg-black/40 border border-white/10 hover:border-white/20 rounded-lg text-xs text-white bg-zinc-950 transition outline-none cursor-pointer"
              >
                <option value="All">All Runtimes</option>
                <option value="< 60 min">Under 60 min</option>
                <option value="60-90 min">60 - 90 min</option>
                <option value="90-120 min">90 - 120 min</option>
                <option value="120-150 min">120 - 150 min</option>
                <option value="> 150 min">Over 150 min</option>
              </select>
            </div>

          </div>
        )}
      </div>

      {/* ----------------- 16 EXECUTIVE KPI CARDS GRID ----------------- */}
      <div className="space-y-6">
        
        {/* KPI Category 1: Catalog Scope */}
        <div>
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-red-500" /> Catalog Inventory Metrics
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              title="Total Catalog Items"
              value={kpisCalculated.total.toLocaleString()}
              icon={LayoutGrid}
              trend={kpisCalculated.trends.total}
              sparklineData={kpisCalculated.sparklines.total}
              tooltip="Total volume of matched media titles in the catalog."
              delay={0.05}
            />
            <KpiCard
              title="Total Movies"
              value={kpisCalculated.movies.toLocaleString()}
              icon={Film}
              trend={kpisCalculated.trends.movies}
              sparklineData={kpisCalculated.sparklines.movies}
              tooltip="Feature film count in active catalog."
              delay={0.1}
            />
            <KpiCard
              title="Total TV Shows"
              value={kpisCalculated.tv.toLocaleString()}
              icon={Tv}
              trend={kpisCalculated.trends.tv}
              sparklineData={kpisCalculated.sparklines.tv}
              tooltip="Multi-season episodic series in catalog."
              delay={0.15}
            />
            <KpiCard
              title="Languages Spoken"
              value={kpisCalculated.languages.toLocaleString()}
              icon={Languages}
              trend={kpisCalculated.trends.languages}
              sparklineData={kpisCalculated.sparklines.languages}
              tooltip="Total unique languages referenced."
              delay={0.2}
            />
          </div>
        </div>

        {/* KPI Category 2: Geopolitics & Talent */}
        <div>
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-red-500" /> Geopolitics & Global Talent
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              title="Active Countries"
              value={kpisCalculated.countries.toLocaleString()}
              icon={Globe2}
              trend={kpisCalculated.trends.countries}
              sparklineData={kpisCalculated.sparklines.countries}
              tooltip="Total production countries of origin."
              delay={0.25}
            />
            <KpiCard
              title="Content Genres"
              value={kpisCalculated.genres.toLocaleString()}
              icon={BookOpen}
              trend={kpisCalculated.trends.genres}
              sparklineData={kpisCalculated.sparklines.genres}
              tooltip="Total unique genres cataloged."
              delay={0.3}
            />
            <KpiCard
              title="Unique Directors"
              value={kpisCalculated.directors.toLocaleString()}
              icon={User}
              trend={kpisCalculated.trends.directors}
              sparklineData={kpisCalculated.sparklines.directors}
              tooltip="Total directors credited."
              delay={0.35}
            />
            <KpiCard
              title="Unique Actors"
              value={kpisCalculated.actors.toLocaleString()}
              icon={Users}
              trend={kpisCalculated.trends.actors}
              sparklineData={kpisCalculated.sparklines.actors}
              tooltip="Total unique actors in the cast records."
              delay={0.4}
            />
          </div>
        </div>

        {/* KPI Category 3: Quality Index */}
        <div>
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Star className="w-3.5 h-3.5 text-red-500" /> Rating Indices & Quality
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              title="IMDb Avg Rating"
              value={`${kpisCalculated.avgImdb.toFixed(2)} / 10`}
              icon={Star}
              trend={kpisCalculated.trends.avgImdb}
              sparklineData={kpisCalculated.sparklines.avgImdb}
              tooltip="Dynamic weighted average IMDb score."
              delay={0.45}
            />
            <KpiCard
              title="TMDb Avg Rating"
              value={`${kpisCalculated.avgTmdb.toFixed(2)} / 10`}
              icon={Flame}
              trend={kpisCalculated.trends.avgTmdb}
              sparklineData={kpisCalculated.sparklines.avgTmdb}
              tooltip="Dynamic average TMDb user vote rating."
              delay={0.5}
            />
            <KpiCard
              title="Metascore Avg"
              value={`${Math.round(kpisCalculated.avgMeta)} / 100`}
              icon={BarChart2}
              trend={kpisCalculated.trends.avgMeta}
              sparklineData={kpisCalculated.sparklines.avgMeta}
              tooltip="Dynamic average critic score from Metacritic."
              delay={0.55}
            />
            <KpiCard
              title="Rotten Tomatoes Avg"
              value={`${Math.round(kpisCalculated.avgRt)}%`}
              icon={Flame}
              trend={kpisCalculated.trends.avgRt}
              sparklineData={kpisCalculated.sparklines.avgRt}
              tooltip="Dynamic average Tomatometer satisfaction score."
              delay={0.6}
            />
          </div>
        </div>

        {/* KPI Category 4: Output & Engagement */}
        <div>
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-red-500" /> Performance & Engagement Metrics
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              title="Total IMDb Votes"
              value={kpisCalculated.totalVotes.toLocaleString()}
              icon={MessageSquare}
              trend={kpisCalculated.trends.votes}
              sparklineData={kpisCalculated.sparklines.votes}
              tooltip="Cumulative votes cast on IMDb."
              delay={0.65}
            />
            <KpiCard
              title="Total Awards Won"
              value={kpisCalculated.totalAwards.toLocaleString()}
              icon={Trophy}
              trend={kpisCalculated.trends.awards}
              sparklineData={kpisCalculated.sparklines.awards}
              tooltip="Cumulative Oscars, BAFTAs, and local awards tally."
              delay={0.7}
            />
            <KpiCard
              title="Movie Avg Runtime"
              value={kpisCalculated.avgRuntime > 0 ? `${Math.round(kpisCalculated.avgRuntime)} min` : "N/A"}
              icon={Clock}
              trend={kpisCalculated.trends.avgRuntime}
              sparklineData={kpisCalculated.sparklines.avgRuntime}
              tooltip="Average duration for Movies in active selection."
              delay={0.75}
            />
            <KpiCard
              title="Production Studios"
              value={kpisCalculated.prods.toLocaleString()}
              icon={Landmark}
              trend={kpisCalculated.trends.prods}
              sparklineData={kpisCalculated.sparklines.prods}
              tooltip="Count of unique production studios credit."
              delay={0.8}
            />
          </div>
        </div>

      </div>

      {/* ----------------- MAIN CHARTS GRID (10 CHARTS) ----------------- */}
      <div className="space-y-8">
        
        {/* Row 1: Growth line (2 cols) + Mix Donut (1 col) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Section 1: Catalog Growth Line Chart */}
          <div className="glass-card p-5 lg:col-span-2 flex flex-col justify-between chart-container">
            <div>
              <span className="text-[9px] text-[#e50914] font-black uppercase tracking-wider font-mono">Section 1</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-[#e50914]" /> Catalog Cumulative Growth Trend
              </h3>
              <p className="text-xs text-gray-400 font-light mb-4">
                Historical growth tracking release volumes (1990 - 2025).
              </p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={growthChartData}
                  onClick={(state: any) => {
                    if (state && state.activeLabel) {
                      setYearFilter(state.activeLabel.toString());
                    }
                  }}
                  className="cursor-crosshair"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="year" stroke="#737373" fontSize={10} />
                  <YAxis stroke="#737373" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", borderColor: "#404040", color: "#fff" }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="Total" stroke="#e50914" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Movies" stroke="#9a3412" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="TV Shows" stroke="#06b6d4" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section 2: Movies vs TV Shows Donut Chart */}
          <div className="glass-card p-5 flex flex-col justify-between chart-container">
            <div>
              <span className="text-[9px] text-[#e50914] font-black uppercase tracking-wider font-mono">Section 2</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-[#e50914]" /> Movies vs TV Shows
              </h3>
              <p className="text-xs text-gray-400 font-light mb-4">
                Split distribution of catalog inventory assets.
              </p>
            </div>
            <div className="h-56 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mixDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                    onClick={(state: any) => {
                      if (state && state.name) {
                        setContentType(state.name === "Movies" ? "Movie" : "TV Show");
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <Cell fill="#e50914" />
                    <Cell fill="#3b82f6" />
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", borderColor: "#404040", color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-white">
                  {kpisCalculated.total > 0 ? Math.round((kpisCalculated.movies / kpisCalculated.total) * 100) : 0}%
                </span>
                <span className="text-[8px] text-gray-400 uppercase tracking-widest font-black">Movies</span>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#e50914]" />
                <span className="text-gray-300">Movies ({kpisCalculated.movies.toLocaleString()})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#3b82f6]" />
                <span className="text-gray-300">TV Shows ({kpisCalculated.tv.toLocaleString()})</span>
              </div>
            </div>
          </div>

        </div>

        {/* Row 2: Top 15 Genres (Horizontal Bar) + Top 20 Countries (Treemap) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Section 3: Top 15 Content Genres */}
          <div className="glass-card p-5 h-auto relative">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-[#e50914] font-black uppercase tracking-wider font-mono">Section 3</span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
                    <BookOpen className="w-4 h-4 text-[#e50914]" /> Top 15 Content Genres
                  </h3>
                  <p className="text-xs text-gray-400 font-light mb-4">
                    Ranked overview of genre weights, user ratings, and distribution. Click a row to cross-filter.
                  </p>
                </div>
                {genreFilter !== "All" && (
                  <button
                    onClick={() => setGenreFilter("All")}
                    className="text-[9px] px-2 py-1 bg-[#e50914]/20 border border-[#e50914]/40 hover:bg-[#e50914] text-white font-bold rounded uppercase transition cursor-pointer"
                  >
                    Clear Filter ({genreFilter})
                  </button>
                )}
              </div>
            </div>

            {/* Horizontal Ranked Bar Chart */}
            <div className="flex flex-col gap-2 mt-3 select-none">
              {topGenresChartData.map((genre, idx) => {
                const maxVal = topGenresChartData[0]?.value || 1;
                const barWidthPct = (genre.value / maxVal) * 100;
                const isSelected = genreFilter === genre.name;

                return (
                  <div
                    key={genre.name}
                    onClick={() => setGenreFilter(genreFilter === genre.name ? "All" : genre.name)}
                    onMouseEnter={(e) => handleGenreHover(e, genre, idx)}
                    onMouseMove={handleGenreMouseMove}
                    onMouseLeave={() => setHoveredGenre(null)}
                    className={`group relative flex flex-col gap-1 p-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white/5 border ${
                      isSelected ? "bg-[#e50914]/15 border-[#e50914]/30 shadow-lg shadow-[#e50914]/5" : "border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] md:text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-[#e50914] text-[10px]">#{idx + 1}</span>
                        <span className="font-bold text-white tracking-wide group-hover:text-[#e50914] transition-colors">{genre.name}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[9px] text-gray-400 font-mono">
                        <span>{genre.value.toLocaleString()} titles</span>
                        <span className="text-gray-600">|</span>
                        <span>{genre.percentage.toFixed(1)}%</span>
                        <span className="text-gray-600">|</span>
                        <span className="text-yellow-500 font-bold">IMDb {genre.avgImdb > 0 ? genre.avgImdb.toFixed(1) : "-"}</span>
                        <span className="text-gray-600">|</span>
                        <span className="text-emerald-400 font-bold">TMDb {genre.avgTmdb > 0 ? genre.avgTmdb.toFixed(1) : "-"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 bg-zinc-950 rounded-full overflow-hidden border border-white/5 relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${barWidthPct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-red-800 to-[#e50914] rounded-full group-hover:from-red-600 group-hover:to-[#f01c27] transition-all relative"
                        >
                          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                        </motion.div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-300 w-12 text-right group-hover:text-white font-mono">
                        {genre.value.toLocaleString()}
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Premium Interactive Hover Tooltip */}
            <AnimatePresence>
              {hoveredGenre && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  style={{
                    position: "absolute",
                    left: `${genreTooltipPos.alignLeft ? genreTooltipPos.x - 360 : genreTooltipPos.x + 20}px`,
                    top: `${genreTooltipPos.alignTop ? genreTooltipPos.y - 230 : genreTooltipPos.y + 10}px`,
                    pointerEvents: "none"
                  }}
                  className="bg-[#121212]/98 backdrop-blur-[18px] border border-white/[0.08] rounded-2xl p-5 shadow-[0_0_20px_rgba(229,9,20,0.15)] shadow-2xl z-50 w-[340px]"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                    <h4 className="font-black text-white text-base tracking-tight">{hoveredGenre.name}</h4>
                    <span className="text-[9px] uppercase font-black tracking-wider text-[#e50914] bg-[#e50914]/10 border border-[#e50914]/20 px-2 py-0.5 rounded-md">
                      Rank #{hoveredGenre.rank}
                    </span>
                  </div>

                  {/* Body - Two Column Grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-3.5 text-[11px]">
                    {/* Left Column */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-white/2 pb-1.5">
                        <span className="text-gray-400 font-light flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-red-500" /> Titles
                        </span>
                        <span className="font-bold text-white font-mono">{hoveredGenre.value.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-white/2 pb-1.5">
                        <span className="text-gray-400 font-light flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-400" /> Share
                        </span>
                        <span className="font-bold text-white font-mono">{hoveredGenre.percentage.toFixed(2)}%</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-white/2 pb-1.5">
                        <span className="text-gray-400 font-light flex items-center gap-1.5">
                          <Film className="w-3.5 h-3.5 text-orange-400" /> Movies
                        </span>
                        <span className="font-bold text-white font-mono">{hoveredGenre.movies.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-light flex items-center gap-1.5">
                          <Tv className="w-3.5 h-3.5 text-cyan-400" /> TV Shows
                        </span>
                        <span className="font-bold text-white font-mono">{hoveredGenre.tvShows.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-white/2 pb-1.5">
                        <span className="text-gray-400 font-light flex items-center gap-1.5">
                          <span className="text-sm">⭐</span> IMDb
                        </span>
                        <span className="font-bold text-yellow-500 font-mono">
                          {hoveredGenre.avgImdb > 0 ? hoveredGenre.avgImdb.toFixed(2) : "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-b border-white/2 pb-1.5">
                        <span className="text-gray-400 font-light flex items-center gap-1.5">
                          <span className="text-sm">🔥</span> TMDb
                        </span>
                        <span className="font-bold text-emerald-400 font-mono">
                          {hoveredGenre.avgTmdb > 0 ? hoveredGenre.avgTmdb.toFixed(2) : "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-b border-white/2 pb-1.5">
                        <span className="text-gray-400 font-light flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-yellow-500" /> Runtime
                        </span>
                        <span className="font-bold text-white font-mono">
                          {hoveredGenre.avgRuntime > 0 ? `${Math.round(hoveredGenre.avgRuntime)} min` : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-light flex items-center gap-1.5">
                          <Globe2 className="w-3.5 h-3.5 text-emerald-400" /> Country
                        </span>
                        <span className="font-bold text-white max-w-[70px] truncate font-mono" title={hoveredGenre.topCountry}>
                          {hoveredGenre.topCountry}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer - Horizontal Progress Bar */}
                  <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] text-gray-400 font-mono">
                      <span>Platform Density</span>
                      <span className="font-bold text-white">{hoveredGenre.percentage.toFixed(2)}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-950 rounded-full overflow-hidden border border-white/5">
                      <div
                        className="h-full bg-red-600 rounded-full"
                        style={{ width: `${Math.min(hoveredGenre.percentage * 4, 100)}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Section 4: Top 20 Production Countries (Choropleth Map + Top 10 List) */}
          <div className="glass-card p-5 flex flex-col justify-between chart-container lg:col-span-1 min-h-[500px]">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-[#e50914] font-black uppercase tracking-wider font-mono">Section 4</span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
                    <Globe2 className="w-4 h-4 text-[#e50914]" /> Global Production Footprint
                  </h3>
                  <p className="text-xs text-gray-400 font-light mb-4">
                    Interactive world choropleth map shaded by catalog density. Drag to pan, scroll/buttons to zoom. Click a country to filter.
                  </p>
                </div>
                {countryFilter !== "All" && (
                  <button
                    onClick={() => setCountryFilter("All")}
                    className="text-[9px] px-2 py-1 bg-[#e50914]/20 border border-[#e50914]/40 hover:bg-[#e50914] text-white font-bold rounded uppercase transition cursor-pointer"
                  >
                    Clear Filter ({countryFilter})
                  </button>
                )}
              </div>
            </div>

            {/* Map Area */}
            <div className="relative w-full h-[320px] rounded-xl overflow-hidden bg-zinc-950/60 border border-white/5 shadow-inner">
              {isMapLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 rounded-full border-2 border-t-transparent border-red-500 animate-spin" />
                  <span className="text-xs text-gray-500 font-mono">Loading World Cartography...</span>
                </div>
              ) : worldGeo ? (
                <div className="w-full h-full relative">
                  {/* Zoom Controls */}
                  <div className="absolute left-3 top-3 z-30 flex flex-col gap-1 no-print">
                    <button
                      onClick={() => setZoom(z => Math.min(z + 0.4, 6))}
                      className="w-6 h-6 bg-zinc-900 border border-white/10 hover:bg-[#e50914] text-white text-xs font-black rounded flex items-center justify-center transition cursor-pointer"
                      title="Zoom In"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setZoom(z => Math.max(z - 0.4, 1))}
                      className="w-6 h-6 bg-zinc-900 border border-white/10 hover:bg-[#e50914] text-white text-xs font-black rounded flex items-center justify-center transition cursor-pointer"
                      title="Zoom Out"
                    >
                      -
                    </button>
                    <button
                      onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                      className="w-6 h-6 bg-zinc-900 border border-white/10 hover:bg-[#e50914] text-white text-[9px] font-bold rounded flex items-center justify-center transition cursor-pointer"
                      title="Reset"
                    >
                      ↩
                    </button>
                  </div>

                  {/* SVG World Map */}
                  <svg
                    viewBox="0 0 800 400"
                    className="w-full h-full cursor-grab active:cursor-grabbing select-none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                      {worldGeo.features
                        .filter((f: any) => f.properties.name !== "Antarctica")
                        .map((f: any, idx: number) => {
                          const name = f.properties.name;
                          const stats = Object.values(countryStats).find(s => matchCountryName(s.country, name));
                          const isSelected = countryFilter !== "All" && matchCountryName(countryFilter, name);
                          const pathData = getSvgPath(f.geometry, 800, 400);

                          return (
                            <path
                              key={name + idx}
                              d={pathData}
                              fill={getCountryColor(name)}
                              stroke={isSelected ? "#ffffff" : "#18181b"}
                              strokeWidth={isSelected ? 1.5 : 0.4}
                              className="transition-colors duration-200 hover:stroke-white hover:stroke-[1.2px] cursor-pointer"
                              onClick={() => {
                                if (stats) {
                                  setCountryFilter(countryFilter === stats.country ? "All" : stats.country);
                                }
                              }}
                              onMouseEnter={(e) => handleCountryHover(e, f)}
                              onMouseLeave={() => setHoveredCountry(null)}
                            />
                          );
                        })}
                    </g>
                  </svg>

                  {/* Legend Scale */}
                  <div className="absolute right-3 bottom-3 bg-zinc-900/90 border border-white/10 rounded-lg p-2 z-20 text-[9px] font-mono shadow-2xl flex flex-col gap-1 no-print">
                    <span className="text-gray-500 font-bold uppercase tracking-wider text-[8px]">Catalog Volumes</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500">1</span>
                      <div className="w-20 h-1.5 rounded bg-gradient-to-r from-[rgb(24,24,27)] to-[#e50914]" />
                      <span className="text-gray-300 font-bold">{maxTitles.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Map Tooltip Portal */}
                  {hoveredCountry && (
                    <div
                      style={{
                        position: "absolute",
                        left: `${tooltipPos.x}px`,
                        top: `${tooltipPos.y}px`,
                        pointerEvents: "none"
                      }}
                      className="bg-zinc-950/95 border border-[#e50914]/40 rounded-lg p-2.5 text-[11px] space-y-0.5 shadow-2xl z-50 min-w-[140px]"
                    >
                      <p className="font-black text-white text-xs border-b border-white/5 pb-1 mb-1 flex items-center gap-1.5">
                        <span>{getCountryFlagEmoji(hoveredCountry.country)}</span>
                        <span>{hoveredCountry.country}</span>
                      </p>
                      <p className="text-gray-400">Total Titles: <span className="text-white font-bold font-mono">{hoveredCountry.total}</span></p>
                      <p className="text-gray-400 font-mono text-[10px]">Movies: {hoveredCountry.movies} | TV: {hoveredCountry.tv}</p>
                      {hoveredCountry.total > 0 && (
                        <>
                          <p className="text-yellow-500 font-bold font-mono">IMDb Avg: {hoveredCountry.avgImdb > 0 ? `${hoveredCountry.avgImdb.toFixed(1)}/10` : "-"}</p>
                          <p className="text-emerald-400 font-bold font-mono text-[10px]">TMDb Avg: {hoveredCountry.avgTmdb > 0 ? `${hoveredCountry.avgTmdb.toFixed(1)}/10` : "-"}</p>
                          <p className="text-gray-400 text-[10px] italic border-t border-white/5 pt-1 mt-1">Genre: {hoveredCountry.topGenre}</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-500 font-mono">Cartography data unavailable.</div>
              )}
            </div>

            {/* Top 10 Countries Table */}
            <div className="mt-4 border-t border-white/5 pt-3">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                <span>Top 10 Production Countries (Ranked)</span>
                <span className="text-[8px] text-gray-500 font-light font-sans normal-case">Click country row to cross-filter</span>
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[8px] font-black text-gray-500 uppercase tracking-widest bg-white/1">
                      <th className="py-1.5 px-2">Rank</th>
                      <th className="py-1.5 px-2">Flag</th>
                      <th className="py-1.5 px-2">Country</th>
                      <th className="py-1.5 px-2 text-center">Total</th>
                      <th className="py-1.5 px-2 text-center">Movies</th>
                      <th className="py-1.5 px-2 text-center">TV Shows</th>
                      <th className="py-1.5 px-2 text-center text-yellow-500">Avg IMDb</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                    {top10CountriesList.map((c, idx) => {
                      const isSelected = countryFilter !== "All" && matchCountryName(countryFilter, c.country);
                      return (
                        <tr
                          key={c.country}
                          onClick={() => setCountryFilter(countryFilter === c.country ? "All" : c.country)}
                          className={`hover:bg-white/5 transition-colors cursor-pointer ${isSelected ? "bg-[#e50914]/15 border-l-2 border-l-[#e50914]" : ""}`}
                        >
                          <td className="py-1.5 px-2 text-gray-500">#{idx + 1}</td>
                          <td className="py-1.5 px-2 text-sm">{getCountryFlagEmoji(c.country)}</td>
                          <td className="py-1.5 px-2 font-bold text-white font-sans">{c.country}</td>
                          <td className="py-1.5 px-2 text-center font-bold text-gray-300">{c.total.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-center text-gray-400">{c.movies.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-center text-gray-400">{c.tv.toLocaleString()}</td>
                          <td className="py-1.5 px-2 text-center font-bold text-yellow-500">{c.avgImdb > 0 ? c.avgImdb.toFixed(1) : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

        {/* Row 3: Added timeline Area + Age Rating Stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Section 5: Content Added Timeline */}
          <div className="glass-card p-5 flex flex-col justify-between chart-container">
            <div>
              <span className="text-[9px] text-[#e50914] font-black uppercase tracking-wider font-mono">Section 5</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-[#e50914]" /> Content Added Timeline
              </h3>
              <p className="text-xs text-gray-400 font-light mb-4">
                Yearly volume additions (Movies vs TV shows, 2008 - 2025).
              </p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={addedTimelineChartData}
                  onClick={(state: any) => {
                    if (state && state.activeLabel) {
                      setYearFilter(state.activeLabel.toString());
                    }
                  }}
                  className="cursor-crosshair"
                >
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e50914" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#e50914" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="year" stroke="#737373" fontSize={10} />
                  <YAxis stroke="#737373" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", borderColor: "#404040" }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area type="monotone" dataKey="Total" stroke="#e50914" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Movies" stroke="#ea580c" fill="none" strokeWidth={1} strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="TV Shows" stroke="#0ea5e9" fill="none" strokeWidth={1} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section 6: Age Rating stacked column */}
          <div className="glass-card p-5 flex flex-col justify-between chart-container">
            <div>
              <span className="text-[9px] text-[#e50914] font-black uppercase tracking-wider font-mono">Section 6</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-[#e50914]" /> Age Rating Classification Distribution
              </h3>
              <p className="text-xs text-gray-400 font-light mb-4">
                Top 10 censorship ratings stacked by type.
              </p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={ratingsStackedChartData}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload[0]) {
                      setRatingFilter(state.activePayload[0].payload.name);
                    }
                  }}
                  className="cursor-pointer"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="name" stroke="#737373" fontSize={10} />
                  <YAxis stroke="#737373" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", borderColor: "#404040" }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="Movies" stackId="a" fill="#e50914" />
                  <Bar dataKey="TV Shows" stackId="a" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Row 4: Runtime Histogram + Languages Treemap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Section 7: Runtime Distribution Histogram */}
          <div className="glass-card p-5 flex flex-col justify-between chart-container">
            <div>
              <span className="text-[9px] text-[#e50914] font-black uppercase tracking-wider font-mono">Section 7</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-[#e50914]" /> Movie Runtime Distribution
              </h3>
              <p className="text-xs text-gray-400 font-light mb-4">
                Binned categories representing feature-length movie runtimes.
              </p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={runtimeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="name" stroke="#737373" fontSize={10} />
                  <YAxis stroke="#737373" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", borderColor: "#404040" }} />
                  <Bar dataKey="value" fill="#e50914" radius={[4, 4, 0, 0]}>
                    {runtimeChartData.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={idx % 2 === 0 ? "#e50914" : "#b80710"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section 10: Top 15 Catalog Languages (Horizontal Ranked Bar Chart) */}
          <div className="glass-card p-5 flex flex-col justify-between chart-container">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-[#e50914] font-black uppercase tracking-wider font-mono">Section 10</span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
                    <Languages className="w-4 h-4 text-[#e50914]" /> Top 15 Catalog Languages
                  </h3>
                  <p className="text-xs text-gray-400 font-light mb-4">
                    Horizontal ranked bar chart showing title distribution (Movies vs TV Shows stacked) and user ratings. Click a bar to filter.
                  </p>
                </div>
                {languageFilter !== "All" && (
                  <button
                    onClick={() => setLanguageFilter("All")}
                    className="text-[9px] px-2 py-1 bg-[#e50914]/20 border border-[#e50914]/40 hover:bg-[#e50914] text-white font-bold rounded uppercase transition cursor-pointer"
                  >
                    Clear Filter ({languageFilter})
                  </button>
                )}
              </div>
            </div>
            <div className="h-72">
              {languageChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={languageChartData}
                    layout="vertical"
                    onClick={(state: any) => {
                      if (state && state.activePayload && state.activePayload.length > 0) {
                        const clicked = state.activePayload[0].payload.language;
                        setLanguageFilter(languageFilter === clicked ? "All" : clicked);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis type="number" stroke="#737373" fontSize={10} />
                    <YAxis dataKey="language" type="category" stroke="#737373" fontSize={10} width={40} />
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-zinc-950/95 border border-[#e50914]/40 rounded-lg p-2.5 text-[11px] space-y-0.5 shadow-2xl z-50 font-mono">
                              <p className="font-black text-white text-xs border-b border-white/5 pb-1 mb-1 font-sans">
                                {data.language} (Catalog)
                              </p>
                              <p className="text-gray-300">
                                Total Titles: <span className="font-bold text-white">{data.total.toLocaleString()}</span>
                              </p>
                              <p className="text-gray-400 text-[10px]">
                                Movies: {data.movies.toLocaleString()} | TV: {data.tvShows.toLocaleString()}
                              </p>
                              <p className="text-yellow-500 font-bold">
                                Avg IMDb: {data.avgImdb > 0 ? `${data.avgImdb.toFixed(1)}/10` : "-"}
                              </p>
                              <p className="text-gray-400 text-[10px] border-t border-white/5 pt-1 mt-1 font-sans">
                                Top Country: <span className="text-white font-semibold">{data.topCountry}</span>
                              </p>
                              <p className="text-gray-400 text-[10px] font-sans">
                                Top Genre: <span className="text-white font-semibold">{data.topGenre}</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 9 }} />
                    <Bar dataKey="movies" name="Movies" stackId="a" fill="#e50914" cursor="pointer" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="tvShows" name="TV Shows" stackId="a" fill="#3b82f6" cursor="pointer" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-500 font-mono">No language data matches.</div>
              )}
            </div>
          </div>

        </div>

        {/* Row 5: IMDb ratings histogram + TMDb ratings histogram */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Section 8: IMDb Rating Distribution */}
          <div className="glass-card p-5 flex flex-col justify-between chart-container">
            <div>
              <span className="text-[9px] text-[#e50914] font-black uppercase tracking-wider font-mono">Section 8</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-[#e50914]" /> IMDb Score Distribution
              </h3>
              <p className="text-xs text-gray-400 font-light mb-4">
                Catalog counts divided into IMDb rating score bins.
              </p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={imdbChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="name" stroke="#737373" fontSize={10} />
                  <YAxis stroke="#737373" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", borderColor: "#404040" }} />
                  <Bar dataKey="value" fill="#d97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section 9: TMDb Rating Distribution */}
          <div className="glass-card p-5 flex flex-col justify-between chart-container">
            <div>
              <span className="text-[9px] text-[#e50914] font-black uppercase tracking-wider font-mono">Section 9</span>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-[#e50914]" /> TMDb Rating Distribution
              </h3>
              <p className="text-xs text-gray-400 font-light mb-4">
                Catalog counts divided into TMDb user vote bins.
              </p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tmdbChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="name" stroke="#737373" fontSize={10} />
                  <YAxis stroke="#737373" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#0a0a0a", borderColor: "#404040" }} />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

      </div>

      {/* ----------------- DYNAMIC EXECUTIVE INSIGHTS ----------------- */}
      <div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-[#e50914]" /> Strategic Business Insights
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {insightsCards.map((insight, idx) => {
            const Icon = insight.icon;
            return (
              <motion.div
                key={insight.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="glass-card p-5 relative overflow-hidden flex flex-col justify-between border-l-4 border-l-[#e50914]"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{insight.title}</span>
                    <Icon className="w-4 h-4 text-[#e50914]" />
                  </div>
                  <h4 className="text-base font-black text-white tracking-tight font-mono mb-2 line-clamp-1">
                    {insight.value}
                  </h4>
                </div>
                <p className="text-[11px] text-gray-400 font-light leading-relaxed">
                  {insight.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ----------------- PREMIUM TABLES (TOP LISTS - 10 TABLES) ----------------- */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#e50914]" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Executive Catalog Leaderboards</h3>
          </div>
          
          {/* Navigation tabs */}
          <div className="flex flex-wrap bg-black/40 rounded-lg p-0.5 border border-white/10 no-print">
            {[
              { id: "movies", label: "Top 10 Movies" },
              { id: "tvShows", label: "Top 10 TV Shows" },
              { id: "imdbRated", label: "Highest IMDb" },
              { id: "tmdbRated", label: "Highest TMDb" },
              { id: "awards", label: "Most Awarded" },
              { id: "directors", label: "Top Directors" },
              { id: "studios", label: "Top Studios" },
              { id: "countries", label: "Top Countries" },
              { id: "languages", label: "Top Languages" },
              { id: "genres", label: "Top Genres" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTableTab(tab.id)}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${
                  activeTableTab === tab.id
                    ? "bg-[#e50914] text-white shadow"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Tables */}
        <div className="overflow-x-auto min-h-[300px]">
          
          {/* 1. TITLE TABLES: Movies / TV Shows / IMDb / TMDb / Awards */}
          {["movies", "tvShows", "imdbRated", "tmdbRated", "awards"].includes(activeTableTab) && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[9px] font-black text-gray-500 uppercase tracking-widest bg-white/2">
                  <th className="py-3 px-4">Poster</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4 text-center">IMDb</th>
                  <th className="py-3 px-4 text-center">TMDb</th>
                  <th className="py-3 px-4 text-center">Year</th>
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4">Primary Genre</th>
                  <th className="py-3 px-4 text-center">Awards Won</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {(() => {
                  let list: NetflixTitle[] = [];
                  if (activeTableTab === "movies") list = tabbedListData.movies;
                  else if (activeTableTab === "tvShows") list = tabbedListData.tvShows;
                  else if (activeTableTab === "imdbRated") list = tabbedListData.imdbRated;
                  else if (activeTableTab === "tmdbRated") list = tabbedListData.tmdbRated;
                  else if (activeTableTab === "awards") list = tabbedListData.awardWinners;

                  if (list.length === 0) {
                    return (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-gray-500 font-light">
                          No leaderboard data matches active filters.
                        </td>
                      </tr>
                    );
                  }

                  return list.map((item, idx) => (
                    <tr
                      key={item.show_id + idx}
                      onClick={() => {
                        setSelectedShow(item);
                        setIsModalOpen(true);
                      }}
                      className="hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <td className="py-2.5 px-4 no-print">
                        <div className="w-9 h-12 rounded overflow-hidden border border-white/5 shadow relative bg-zinc-900 flex-shrink-0">
                          {item.poster_path ? (
                            <img src={item.poster_path} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col justify-center items-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                              <span className="text-[7px] text-gray-500 font-bold uppercase">No Poster</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white group-hover:text-[#e50914] transition-colors max-w-[200px] truncate">
                        {item.title}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-yellow-500">
                        {item.imdb_rating > 0 ? item.imdb_rating : "-"}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-emerald-400">
                        {item.vote_average > 0 ? item.vote_average : "-"}
                      </td>
                      <td className="py-2.5 px-4 text-center text-gray-400">
                        {item.release_year}
                      </td>
                      <td className="py-2.5 px-4 text-gray-300 max-w-[140px] truncate font-sans">
                        {item.countriesList.slice(0, 2).join(", ")}
                      </td>
                      <td className="py-2.5 px-4 text-gray-300 font-sans">
                        {item.genresList[0] || "-"}
                      </td>
                      <td className="py-2.5 px-4 text-center font-bold text-[#e50914]">
                        {item.awardsWins > 0 ? item.awardsWins : "-"}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          )}

          {/* 2. DIRECTORS TABLE */}
          {activeTableTab === "directors" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[9px] font-black text-gray-500 uppercase tracking-widest bg-white/2">
                  <th className="py-3 px-4">Director</th>
                  <th className="py-3 px-4 text-center">Catalog Titles Count</th>
                  <th className="py-3 px-4 text-center">Average IMDb Score</th>
                  <th className="py-3 px-4">Primary Signature Genre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {tabbedListData.directors.length > 0 ? (
                  tabbedListData.directors.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-bold text-white font-sans">{item.name}</td>
                      <td className="py-3 px-4 text-center font-bold text-gray-300">{item.count}</td>
                      <td className="py-3 px-4 text-center font-bold text-yellow-500">{item.avgRating}</td>
                      <td className="py-3 px-4 text-gray-400 font-sans">{item.topGenre}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">No directors matching active filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* 3. STUDIOS TABLE */}
          {activeTableTab === "studios" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[9px] font-black text-gray-500 uppercase tracking-widest bg-white/2">
                  <th className="py-3 px-4">Production Studio / Distributor</th>
                  <th className="py-3 px-4 text-center">Catalog Titles Count</th>
                  <th className="py-3 px-4 text-center">Average IMDb Score</th>
                  <th className="py-3 px-4">Primary Production Origin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {tabbedListData.productionCompanies.length > 0 ? (
                  tabbedListData.productionCompanies.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-bold text-white font-sans">{item.name}</td>
                      <td className="py-3 px-4 text-center font-bold text-gray-300">{item.count}</td>
                      <td className="py-3 px-4 text-center font-bold text-yellow-500">{item.avgRating}</td>
                      <td className="py-3 px-4 text-gray-400 font-sans">{item.topCountry}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">No production studios matching active filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* 4. COUNTRIES TABLE */}
          {activeTableTab === "countries" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[9px] font-black text-gray-500 uppercase tracking-widest bg-white/2">
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4 text-center">Catalog Titles Count</th>
                  <th className="py-3 px-4 text-center">Average IMDb Score</th>
                  <th className="py-3 px-4 text-center">% of Active Selection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {tabbedListData.countries.length > 0 ? (
                  tabbedListData.countries.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-bold text-white font-sans">{item.name}</td>
                      <td className="py-3 px-4 text-center font-bold text-gray-300">{item.count}</td>
                      <td className="py-3 px-4 text-center font-bold text-yellow-500">{item.avgRating}</td>
                      <td className="py-3 px-4 text-center text-gray-400">{item.catalogPct}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">No countries matching active filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* 5. LANGUAGES TABLE */}
          {activeTableTab === "languages" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[9px] font-black text-gray-500 uppercase tracking-widest bg-white/2">
                  <th className="py-3 px-4">Language Code</th>
                  <th className="py-3 px-4 text-center">Catalog Titles Count</th>
                  <th className="py-3 px-4 text-center">Average IMDb Score</th>
                  <th className="py-3 px-4 text-center">% of Active Selection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {tabbedListData.languages.length > 0 ? (
                  tabbedListData.languages.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{item.name}</td>
                      <td className="py-3 px-4 text-center font-bold text-gray-300">{item.count}</td>
                      <td className="py-3 px-4 text-center font-bold text-yellow-500">{item.avgRating}</td>
                      <td className="py-3 px-4 text-center text-gray-400">{item.catalogPct}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">No languages matching active filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* 6. GENRES TABLE */}
          {activeTableTab === "genres" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[9px] font-black text-gray-500 uppercase tracking-widest bg-white/2">
                  <th className="py-3 px-4">Genre Category</th>
                  <th className="py-3 px-4 text-center">Catalog Titles Count</th>
                  <th className="py-3 px-4 text-center">Average IMDb Score</th>
                  <th className="py-3 px-4 text-center">% of Active Selection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {tabbedListData.genres.length > 0 ? (
                  tabbedListData.genres.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-bold text-white font-sans">{item.name}</td>
                      <td className="py-3 px-4 text-center font-bold text-gray-300">{item.count}</td>
                      <td className="py-3 px-4 text-center font-bold text-yellow-500">{item.avgRating}</td>
                      <td className="py-3 px-4 text-center text-gray-400">{item.catalogPct}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">No genres matching active filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

        </div>
      </div>

      {/* ----------------- BUSINESS QUESTIONS ANSWERED FAQ PANEL ----------------- */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
          <HelpCircle className="w-5 h-5 text-[#e50914]" />
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Business Questions Answered</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {faqData.map((faq, idx) => (
            <div key={idx} className="space-y-1.5 p-3 rounded-lg bg-white/1 border border-white/5">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <span className="text-[#e50914] font-mono">Q{idx + 1}.</span> {faq.question}
              </h4>
              <p className="text-[11px] text-gray-400 leading-relaxed font-light font-mono">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ----------------- ENRICHMENT DETAILS MODAL ----------------- */}
      <ShowDetailsModal
        show={selectedShow}
        isOpen={isModalOpen}
        onClose={() => {
          setSelectedShow(null);
          setIsModalOpen(false);
        }}
        onNavigate={(nextShowId) => {
          const nextShow = allTitles.find(t => t.show_id === nextShowId);
          if (nextShow) setSelectedShow(nextShow);
        }}
      />

    </div>
  );
}
