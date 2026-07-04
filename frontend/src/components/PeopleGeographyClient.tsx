"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useGlobalFilter } from "@/lib/GlobalFilterContext";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, LineChart, Line, AreaChart, Area
} from "recharts";
import { 
  Users2, Search, User, Globe2, Film, Tv, Play, AlertCircle, Eye, Trophy, 
  Star, Award, Sparkles, X, ChevronDown, Check, Info, Landmark, Calendar, 
  Clock, DollarSign, Download, Image as ImageIcon, Briefcase, UserCheck, Heart 
} from "lucide-react";
import { NetflixTitle } from "@/lib/data";
import ShowDetailsModal from "@/components/ShowDetailsModal";
import * as XLSX from "xlsx";

interface PeopleGeographyClientProps {
  data: {
    topDirectors: Array<{ name: string; total: number; movies: number; tvShows: number }>;
    topActors: Array<{ name: string; total: number; movies: number; tvShows: number }>;
    countryDetails: Array<{ country: string; Movies: number; "TV Shows": number; total: number }>;
    highestRatedDirectors: Array<{ name: string; value: number; count: number }>;
    highestRatedActors: Array<{ name: string; value: number; count: number }>;
    mostAwardedDirectors: Array<{ name: string; value: number }>;
    mostAwardedActors: Array<{ name: string; value: number }>;
    highestRatedCountries: Array<{ name: string; value: number; count: number }>;
  };
}

const BAR_COLORS_RED = ["#e50914", "#c60710", "#a8060c", "#890509", "#6b0407"];
const BAR_COLORS_GRAY = ["#525252", "#404040", "#262626", "#171717", "#0a0a0a"];

export default function PeopleGeographyClient({ data: initialData }: PeopleGeographyClientProps) {
  const {
    filters,
    setFilter,
    resetFilters,
    filteredTitles,
    openShowDetails,
    openDrillThrough,
    allTitles,
  } = useGlobalFilter();

  // Primary Explorer Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionFocus, setSuggestionFocus] = useState(-1);
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [activeProfile, setActiveProfile] = useState<{
    type: "person" | "title";
    nameOrId: string;
    details: any;
    netflixTitles: NetflixTitle[];
  } | null>(null);

  // Lightbox State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Bottom search local states (retained for layout compatibility)
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NetflixTitle[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Details Modal show details
  const [selectedShow, setSelectedShow] = useState<NetflixTitle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Recent/Trending searches
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const trendingSearches = ["Mike Flanagan", "Wednesday", "Stranger Things", "Denzel Washington", "Cillian Murphy"];

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("netflix_explorer_recent");
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch (e) {}
      }
    }
  }, []);

  const addRecentSearch = (term: string) => {
    const updated = [term, ...recentSearches.filter(t => t !== term)].slice(0, 5);
    setRecentSearches(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("netflix_explorer_recent", JSON.stringify(updated));
    }
  };

  // ----------------------------------------------------
  // ORIGINAL CLIENT STATS COMPILATION (Cross-filtering)
  // ----------------------------------------------------
  const computedData = useMemo(() => {
    const list = filteredTitles;

    // 1. Director Counts
    const directorCounts: Record<string, { total: number; movies: number; tvShows: number }> = {};
    list.forEach(d => {
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

    // 2. Actor Counts
    const actorCounts: Record<string, { total: number; movies: number; tvShows: number }> = {};
    list.forEach(d => {
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
    const countryCounts: Record<string, { total: number; movies: number; tvShows: number }> = {};
    list.forEach(d => {
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
      .map(country => ({
        country,
        Movies: countryCounts[country].movies,
        "TV Shows": countryCounts[country].tvShows,
        total: countryCounts[country].total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);

    // 4. Rating Aggregates
    const directorRatings: Record<string, { sum: number; count: number }> = {};
    const actorRatings: Record<string, { sum: number; count: number }> = {};
    const countryRatings: Record<string, { sum: number; count: number }> = {};

    list.forEach(d => {
      if (d.imdb_rating > 0) {
        d.directorsList.forEach(dir => {
          if (!directorRatings[dir]) directorRatings[dir] = { sum: 0, count: 0 };
          directorRatings[dir].sum += d.imdb_rating;
          directorRatings[dir].count++;
        });
        d.castList.forEach(act => {
          if (!actorRatings[act]) actorRatings[act] = { sum: 0, count: 0 };
          actorRatings[act].sum += d.imdb_rating;
          actorRatings[act].count++;
        });
        d.countriesList.forEach(c => {
          if (!countryRatings[c]) countryRatings[c] = { sum: 0, count: 0 };
          countryRatings[c].sum += d.imdb_rating;
          countryRatings[c].count++;
        });
      }
    });

    const highestRatedDirectors = Object.keys(directorRatings)
      .filter(dir => directorRatings[dir].count >= 3)
      .map(name => ({
        name,
        value: Math.round((directorRatings[name].sum / directorRatings[name].count) * 10) / 10,
        count: directorRatings[name].count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const highestRatedActors = Object.keys(actorRatings)
      .filter(act => actorRatings[act].count >= 3)
      .map(name => ({
        name,
        value: Math.round((actorRatings[name].sum / actorRatings[name].count) * 10) / 10,
        count: actorRatings[name].count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const highestRatedCountries = Object.keys(countryRatings)
      .filter(c => countryRatings[c].count >= 5)
      .map(name => ({
        name,
        value: Math.round((countryRatings[name].sum / countryRatings[name].count) * 10) / 10,
        count: countryRatings[name].count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // 5. Award Aggregates
    const directorAwards: Record<string, number> = {};
    const actorAwards: Record<string, number> = {};

    list.forEach(d => {
      if (d.awardsWins > 0) {
        d.directorsList.forEach(dir => {
          directorAwards[dir] = (directorAwards[dir] || 0) + d.awardsWins;
        });
        d.castList.forEach(act => {
          actorAwards[act] = (actorAwards[act] || 0) + d.awardsWins;
        });
      }
    });

    const mostAwardedDirectors = Object.keys(directorAwards)
      .map(name => ({ name, value: directorAwards[name] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const mostAwardedActors = Object.keys(actorAwards)
      .map(name => ({ name, value: actorAwards[name] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

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
  }, [filteredTitles]);

  const {
    topDirectors,
    topActors,
    countryDetails,
    highestRatedDirectors,
    highestRatedActors,
    mostAwardedDirectors,
    mostAwardedActors,
    highestRatedCountries,
  } = computedData;

  // ----------------------------------------------------
  // SEARCH SUGGESTIONS SCANNER (Client-side debounced)
  // ----------------------------------------------------
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      const query = searchQuery.toLowerCase().trim();

      // Look up matching titles in Netflix catalog
      const matchedTitles = allTitles
        .filter(t => t.title.toLowerCase().includes(query))
        .slice(0, 4)
        .map(t => ({
          type: "title",
          id: t.show_id,
          title: t.title,
          subtitle: `${t.type} • ${t.release_year} • IMDb: ${t.imdb_rating > 0 ? t.imdb_rating : "N/A"}`,
          show: t
        }));

      // Look up matching cast / directors
      const castSet = new Set<string>();
      const dirSet = new Set<string>();

      allTitles.forEach(t => {
        t.castList.forEach(c => { if (c.toLowerCase().includes(query)) castSet.add(c); });
        t.directorsList.forEach(d => { if (d.toLowerCase().includes(query)) dirSet.add(d); });
      });

      const matchedActors = Array.from(castSet).slice(0, 4).map(name => ({
        type: "person",
        id: name,
        title: name,
        subtitle: "Talent: Actor / Actress"
      }));

      const matchedDirs = Array.from(dirSet).slice(0, 4).map(name => ({
        type: "person",
        id: name,
        title: name,
        subtitle: "Talent: Director"
      }));

      setSuggestions([...matchedTitles, ...matchedActors, ...matchedDirs]);
      setShowSuggestions(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, allTitles]);

  // Handle suggestion selection
  const handleSelectSuggestion = (item: any) => {
    setSearchQuery("");
    setShowSuggestions(false);
    setSuggestionFocus(-1);
    addRecentSearch(item.title);

    if (item.type === "title") {
      handleLoadTitleProfile(item.show);
    } else {
      handleLoadPersonProfile(item.title);
    }
  };

  // Keyboard navigation inside Suggestions Dropdown
  const handleSuggestionsKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      setSuggestionFocus(prev => (prev + 1) % suggestions.length);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setSuggestionFocus(prev => (prev - 1 + suggestions.length) % suggestions.length);
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (suggestionFocus >= 0 && suggestionFocus < suggestions.length) {
        handleSelectSuggestion(suggestions[suggestionFocus]);
        e.preventDefault();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSuggestionFocus(-1);
      e.preventDefault();
    }
  };

  // ----------------------------------------------------
  // PROFILE LOAD ENGINES (TMDb / OMDb Enriched API calls)
  // ----------------------------------------------------
  const handleLoadTitleProfile = async (show: NetflixTitle) => {
    setExplorerLoading(true);
    try {
      const tmdbRes = await fetch(`/api/titles/${show.show_id}/tmdb`);
      const tmdbData = tmdbRes.ok ? await tmdbRes.json() : null;

      const omdbRes = await fetch(`/api/titles/${show.show_id}/omdb`);
      const omdbData = omdbRes.ok ? await omdbRes.json() : null;

      const details = {
        title: show.title,
        type: show.type,
        release_year: show.release_year,
        duration: show.duration,
        genres: show.genresList,
        country: show.country,
        countriesList: show.countriesList,
        description: show.description,
        rating: show.rating,
        imdb_rating: show.imdb_rating,
        vote_average: show.vote_average,
        poster_url: tmdbData?.poster_url || null,
        backdrop_url: tmdbData?.backdrop_url || null,
        tagline: tmdbData?.tagline || "",
        vote_count: tmdbData?.vote_count || 0,
        cast: tmdbData?.cast || [],
        crew: tmdbData?.crew || [],
        similar: tmdbData?.similar || [],
        director: omdbData?.Director || show.director,
        writer: omdbData?.Writer || "N/A",
        awards: omdbData?.Awards || "N/A",
        box_office: omdbData?.BoxOffice || "N/A",
        budget: tmdbData?.budget || "N/A",
        revenue: tmdbData?.revenue || "N/A",
        production_companies: tmdbData?.production_companies || [],
        release_date: omdbData?.Released || tmdbData?.release_date || "N/A",
        certification: omdbData?.Rated || show.rating,
        imdb_votes: omdbData?.imdbVotes || "N/A",
        streaming_status: "Available in Netflix Catalog"
      };

      setActiveProfile({
        type: "title",
        nameOrId: show.show_id,
        details,
        netflixTitles: [show]
      });
    } catch (e) {
      alert("Failed to load Title Intelligence profile.");
    } finally {
      setExplorerLoading(false);
    }
  };

  const handleLoadPersonProfile = async (name: string) => {
    setExplorerLoading(true);
    try {
      const personRes = await fetch(`/api/person?name=${encodeURIComponent(name)}&details=true`);
      const personData = personRes.ok ? await personRes.json() : null;

      // Scan Netflix database for titles involving this person
      const personTitles = allTitles.filter(t => 
        t.castList.some(c => c.toLowerCase().trim() === name.toLowerCase().trim()) ||
        t.directorsList.some(d => d.toLowerCase().trim() === name.toLowerCase().trim())
      );

      const years = personTitles.map(t => t.release_year);
      const minYear = years.length > 0 ? Math.min(...years) : null;
      const maxYear = years.length > 0 ? Math.max(...years) : null;
      const careerDuration = (minYear !== null && maxYear !== null) 
        ? `${maxYear - minYear + 1} years active (${minYear} - ${maxYear})` 
        : "N/A";

      const movieCount = personTitles.filter(t => t.type === "Movie").length;
      const tvCount = personTitles.filter(t => t.type === "TV Show").length;

      // Top Genres
      const genresMap: Record<string, number> = {};
      personTitles.forEach(t => t.genresList.forEach(g => { genresMap[g] = (genresMap[g] || 0) + 1; }));
      const topGenres = Object.entries(genresMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);

      // Top Countries
      const countryMap: Record<string, number> = {};
      personTitles.forEach(t => t.countriesList.forEach(c => { countryMap[c] = (countryMap[c] || 0) + 1; }));
      const topCountries = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);

      // Averages
      const imdbRatings = personTitles.filter(t => t.imdb_rating > 0).map(t => t.imdb_rating);
      const avgImdb = imdbRatings.length > 0 ? imdbRatings.reduce((a, b) => a + b, 0) / imdbRatings.length : 0;

      const tmdbRatings = personTitles.filter(t => t.vote_average > 0).map(t => t.vote_average);
      const avgTmdb = tmdbRatings.length > 0 ? tmdbRatings.reduce((a, b) => a + b, 0) / tmdbRatings.length : 0;

      // Highest rated / most popular
      const highestRatedTitle = personTitles.length > 0
        ? [...personTitles].sort((a, b) => (b.imdb_rating || 0) - (a.imdb_rating || 0))[0]
        : null;

      const mostPopularTitle = personTitles.length > 0
        ? [...personTitles].sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0]
        : null;

      // Cast Collaboration Frequencies
      const collaboratorsMap: Record<string, number> = {};
      personTitles.forEach(t => {
        t.castList.forEach(act => {
          if (act.toLowerCase().trim() !== name.toLowerCase().trim()) {
            collaboratorsMap[act] = (collaboratorsMap[act] || 0) + 1;
          }
        });
      });
      const topCollaborators = Object.entries(collaboratorsMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([cName, freq]) => ({ name: cName, count: freq }));

      const details = {
        name,
        profile_url: personData?.profile_url || null,
        profile_images: personData?.profile_images || [],
        popularity: personData?.popularity || 0,
        known_for_department: personData?.known_for_department || "Acting",
        birthday: personData?.birthday || "N/A",
        place_of_birth: personData?.place_of_birth || "N/A",
        biography: personData?.biography || "No biography details available on TMDb.",
        gender: personData?.gender || "Not specified",
        careerDuration,
        movieCount,
        tvCount,
        topGenres,
        topCountries,
        avgImdb: Math.round(avgImdb * 10) / 10,
        avgTmdb: Math.round(avgTmdb * 10) / 10,
        highestRatedTitle: highestRatedTitle ? highestRatedTitle.title : "N/A",
        mostPopularTitle: mostPopularTitle ? mostPopularTitle.title : "N/A",
        topCollaborators,
        timeline: personTitles.sort((a, b) => a.release_year - b.release_year)
      };

      setActiveProfile({
        type: "person",
        nameOrId: name,
        details,
        netflixTitles: personTitles
      });
    } catch (e) {
      alert("Failed to load Person Intelligence profile.");
    } finally {
      setExplorerLoading(false);
    }
  };

  // ----------------------------------------------------
  // ORIGINAL FILMOGRAPHY LOOKUPS (Geography Dashboard search)
  // ----------------------------------------------------
  const handleSearch = (name: string) => {
    if (!name.trim()) return;
    setIsSearching(true);
    setQuery(name);
    
    setTimeout(() => {
      const match = allTitles.filter(t => 
        t.castList.some(c => c.toLowerCase().includes(name.toLowerCase())) ||
        t.directorsList.some(d => d.toLowerCase().includes(name.toLowerCase()))
      );
      setSearchResults(match);
      setHasSearched(true);
      setIsSearching(false);
    }, 500);
  };

  const handleQuickSearch = (name: string) => {
    handleSearch(name);
  };

  const openDetails = (show: NetflixTitle) => {
    setSelectedShow(show);
    setIsModalOpen(true);
  };

  const handleNavigateToShow = async (nextShowId: string) => {
    try {
      const res = await fetch(`/api/titles/${nextShowId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedShow(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ----------------------------------------------------
  // PROFILE EXPORT UTILITIES (Excel, PDF, PNG)
  // ----------------------------------------------------
  const exportToExcel = () => {
    if (!activeProfile) return;
    try {
      const rows = activeProfile.netflixTitles.map((t) => ({
        "Show ID": t.show_id,
        "Title": t.title,
        "Type": t.type,
        "Release Year": t.release_year,
        "IMDb Rating": t.imdb_rating > 0 ? t.imdb_rating : "N/A",
        "TMDb Rating": t.vote_average > 0 ? t.vote_average : "N/A",
        "Runtime / Seasons": t.duration,
        "Genres": t.genresList.join(", "),
        "Country": t.country,
        "Language": t.language,
        "Description": t.description
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Netflix Titles");
      XLSX.writeFile(wb, `netflix_profile_${activeProfile.nameOrId.replace(/\s+/g, "_")}.xlsx`);
    } catch (e: any) {
      alert("Excel export failed: " + e.message);
    }
  };

  const exportToPDF = () => {
    if (!activeProfile) return;
    try {
      const p = activeProfile.details;
      const isPerson = activeProfile.type === "person";
      
      const docLines = [
        "%PDF-1.5",
        "1 0 obj",
        "<< /Type /Catalog /Pages 2 0 R >>",
        "endobj",
        "2 0 obj",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "endobj",
        "3 0 obj",
        "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 595 842] /Contents 4 0 R >>",
        "endobj",
        "4 0 obj",
        "<< /Length 1200 >>",
        "stream",
        "BT",
        "/F1 16 Tf",
        "50 780 Td",
        `(${isPerson ? "TALENT ANALYSIS SUMMARY: " + p.name : "TITLE INTELLIGENCE PROFILE: " + p.title}) Tj`,
        "ET",
        "BT",
        "/F2 10 Tf",
        "50 755 Td",
        `(${isPerson ? "Known For: " + p.known_for_department + " | TMDB Popularity: " + p.popularity : "Format: " + p.type + " | Released: " + p.release_date}) Tj`,
        "ET"
      ];

      let y = 720;
      if (isPerson) {
        docLines.push("BT", "/F1 11 Tf", `50 ${y} Td`, "(Talent Metadata Details:) Tj", "ET");
        y -= 20;
        docLines.push("BT", "/F2 9.5 Tf", `50 ${y} Td`, `(- Birthday: ${p.birthday} | Gender: ${p.gender}) Tj`, "ET");
        y -= 20;
        docLines.push("BT", "/F2 9.5 Tf", `50 ${y} Td`, `(- Birthplace / Nationality: ${p.place_of_birth}) Tj`, "ET");
        y -= 20;
        docLines.push("BT", "/F2 9.5 Tf", `50 ${y} Td`, `(- Career Duration on Netflix: ${p.careerDuration}) Tj`, "ET");
        y -= 20;
        docLines.push("BT", "/F2 9.5 Tf", `50 ${y} Td`, `(- Netflix Titles Count: ${p.movieCount + p.tvCount} | Movies: ${p.movieCount} | TV: ${p.tvCount}) Tj`, "ET");
        y -= 20;
        docLines.push("BT", "/F2 9.5 Tf", `50 ${y} Td`, `(- Average Ratings IMDb: ${p.avgImdb} ★ | TMDb: ${p.avgTmdb} ★) Tj`, "ET");
        y -= 20;
        docLines.push("BT", "/F2 9.5 Tf", `50 ${y} Td`, `(- Highest Rated: ${p.highestRatedTitle}) Tj`, "ET");
        y -= 25;
      } else {
        docLines.push("BT", "/F1 11 Tf", `50 ${y} Td`, "(Title Metadata Details:) Tj", "ET");
        y -= 20;
        docLines.push("BT", "/F2 9.5 Tf", `50 ${y} Td`, `(- Runtime: ${p.duration} | Certification: ${p.certification} | Language: ${p.language}) Tj`, "ET");
        y -= 20;
        docLines.push("BT", "/F2 9.5 Tf", `50 ${y} Td`, `(- IMDb: ${p.imdb_rating} ★ (${p.imdb_votes} votes) | TMDb: ${p.vote_average} ★ (${p.vote_count} votes)) Tj`, "ET");
        y -= 20;
        docLines.push("BT", "/F2 9.5 Tf", `50 ${y} Td`, `(- Director: ${p.director}) Tj`, "ET");
        y -= 20;
        docLines.push("BT", "/F2 9.5 Tf", `50 ${y} Td`, `(- Writers: ${p.writer}) Tj`, "ET");
        y -= 20;
        docLines.push("BT", "/F2 9.5 Tf", `50 ${y} Td`, `(- Production Companies: ${p.production_companies.map((x: any) => x.name).slice(0, 3).join(", ") || "N/A"}) Tj`, "ET");
        y -= 25;
      }

      docLines.push("BT", "/F1 11 Tf", `50 ${y} Td`, "(Associated Netflix Titles:) Tj", "ET");
      y -= 20;
      activeProfile.netflixTitles.slice(0, 15).forEach((t) => {
        docLines.push("BT", "/F2 8.5 Tf", `50 ${y} Td`, `(* [${t.release_year}] ${t.title.substring(0, 35)} | Format: ${t.type} | IMDb: ${t.imdb_rating > 0 ? t.imdb_rating : "N/A"}) Tj`, "ET");
        y -= 18;
      });

      docLines.push("endstream", "endobj");
      const body = docLines.join("\n");
      const pdfContent = body + "\n" + 
        "xref\n" +
        "0 5\n" +
        "0000000000 65535 f \n" +
        "trailer\n" +
        "<< /Size 5 /Root 1 0 R >>\n" +
        "startxref\n" +
        "%%EOF";

      const blob = new Blob([pdfContent], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `netflix_profile_${activeProfile.nameOrId.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 150);
    } catch (e: any) {
      alert("PDF export failed: " + e.message);
    }
  };

  const exportToPNG = () => {
    if (!activeProfile) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not construct 2D context");

      ctx.fillStyle = "#0c0c0c";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#e50914";
      ctx.fillRect(0, 0, canvas.width, 8);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px Helvetica";
      const name = activeProfile.type === "person" ? activeProfile.details.name : activeProfile.details.title;
      ctx.fillText(name.toUpperCase(), 50, 50);

      ctx.fillStyle = "#e50914";
      ctx.font = "bold 11px Helvetica";
      ctx.fillText(activeProfile.type === "person" ? "TALENT PROFILE EXPORTER" : "TITLE INTELLIGENCE EXPORTER", 50, 75);

      ctx.fillStyle = "#aaaaaa";
      ctx.font = "14px Helvetica";
      let y = 125;
      if (activeProfile.type === "person") {
        ctx.fillText(`Known For: ${activeProfile.details.known_for_department}`, 50, y); y += 30;
        ctx.fillText(`Nationality: ${activeProfile.details.place_of_birth}`, 50, y); y += 30;
        ctx.fillText(`Career Span: ${activeProfile.details.careerDuration}`, 50, y); y += 30;
        ctx.fillText(`Netflix Titles count: ${activeProfile.netflixTitles.length}`, 50, y); y += 30;
        ctx.fillText(`Average IMDb rating: ${activeProfile.details.avgImdb} ★`, 50, y); y += 30;
      } else {
        ctx.fillText(`Released: ${activeProfile.details.release_date}`, 50, y); y += 30;
        ctx.fillText(`Runtime: ${activeProfile.details.duration}`, 50, y); y += 30;
        ctx.fillText(`IMDb Rating: ${activeProfile.details.imdb_rating} ★`, 50, y); y += 30;
        ctx.fillText(`TMDb Rating: ${activeProfile.details.vote_average} ★`, 50, y); y += 30;
        ctx.fillText(`Director: ${activeProfile.details.director}`, 50, y); y += 30;
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px Helvetica";
      ctx.fillText("Netflix Catalog Titles (Recent 8):", 50, y + 20);
      y += 50;

      ctx.fillStyle = "#999999";
      ctx.font = "12px Helvetica";
      activeProfile.netflixTitles.slice(0, 8).forEach((t) => {
        ctx.fillText(`- [${t.release_year}] ${t.title} (${t.type}) | IMDb: ${t.imdb_rating > 0 ? t.imdb_rating : "N/A"}`, 50, y);
        y += 25;
      });

      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `netflix_profile_${activeProfile.nameOrId.replace(/\s+/g, "_")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e: any) {
      alert("PNG export failed: " + e.message);
    }
  };

  // Motion layout animation definitions
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } },
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f0f0f] border border-white/10 p-2.5 rounded-lg shadow-xl text-[11px] text-gray-300">
          <p className="font-bold text-white mb-0.5">{payload[0].payload.name || payload[0].payload.country}</p>
          <p className="text-gray-400">
            {payload[0].name}: <span className="font-bold text-white">{payload[0].value.toLocaleString()}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 py-6"
    >
      {/* ----------------- CORE HEADER & EXPLORER SEARCH ----------------- */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-[#e50914] uppercase tracking-widest flex items-center gap-1.5 select-none">
          <Users2 className="w-3.5 h-3.5" />
          Geography & Talent Dashboard
        </span>
        <h1 className="text-3xl font-black text-white tracking-tight uppercase select-none">People & Geography</h1>
        <p className="text-sm text-gray-400 font-light max-w-2xl select-none">
          Track production distributions globally and explore directories of top actors and filmmakers.
        </p>
      </div>

      {/* ----------------- EXPLORER PREMIUM SEARCH BAR ----------------- */}
      <motion.div variants={itemVariants} className="glass-card p-6 border border-white/5 relative z-30">
        <h3 className="text-xs font-bold text-[#e50914] uppercase tracking-wider mb-2.5 flex items-center gap-1.5 select-none">
          <Sparkles className="w-4 h-4 animate-pulse" /> People & Title Intelligence Explorer
        </h3>
        
        <div className="relative">
          <div className="flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSuggestionFocus(-1);
              }}
              onKeyDown={handleSuggestionsKeyDown}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search actors, directors, movies or TV shows..."
              className="bg-black border border-white/10 hover:border-white/20 focus:border-[#e50914] text-xs text-white placeholder-gray-500 rounded-xl pl-10 pr-10 py-3.5 w-full focus:outline-none transition-all duration-300"
            />
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5" />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(""); setSuggestions([]); }} 
                className="absolute right-3.5 text-gray-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestions && (suggestions.length > 0 || searchQuery.length >= 2) && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute left-0 right-0 mt-2 bg-zinc-950 border border-white/10 rounded-2xl p-2.5 shadow-2xl z-50 flex flex-col gap-2 max-h-[350px] overflow-y-auto dropdown-portal-content"
              >
                {suggestions.length > 0 ? (
                  suggestions.map((item, idx) => (
                    <button
                      key={item.id + "-" + idx}
                      onClick={() => handleSelectSuggestion(item)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                        suggestionFocus === idx
                          ? "bg-[#e50914] text-white"
                          : "hover:bg-[#e50914] hover:text-white bg-transparent text-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.type === "title" ? (
                          <div className="p-1.5 bg-black/40 rounded border border-white/5">
                            {item.contentType === "Movie" ? <Film className="w-3.5 h-3.5" /> : <Tv className="w-3.5 h-3.5" />}
                          </div>
                        ) : (
                          <div className="p-1.5 bg-black/40 rounded border border-white/5">
                            <User className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-white">{item.title}</p>
                          <p className="text-[10px] text-gray-500 font-light mt-0.5">{item.subtitle}</p>
                        </div>
                      </div>
                      <Play className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-gray-500 italic select-none">
                    No instant catalog suggestions. Press Enter to search on TMDb.
                  </div>
                )}

                {/* Trending & Recent suggestions helper block */}
                <div className="border-t border-white/5 pt-2 mt-2 flex flex-col gap-2 text-[10px] text-gray-500 px-1.5">
                  {recentSearches.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="font-bold uppercase tracking-wider">Recent:</span>
                      {recentSearches.map(term => (
                        <button
                          key={term}
                          onClick={() => {
                            setSearchQuery(term);
                            handleSearch(term);
                          }}
                          className="hover:text-white underline cursor-pointer bg-white/5 px-2 py-0.5 rounded"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="font-bold uppercase tracking-wider">Trending:</span>
                    {trendingSearches.map(term => (
                      <button
                        key={term}
                        onClick={() => {
                          setSearchQuery(term);
                          handleSearch(term);
                        }}
                        className="hover:text-white underline cursor-pointer bg-white/5 px-2 py-0.5 rounded"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Explorer Loading Indicator */}
      {explorerLoading && (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Enriching Intelligence Profiles...</h4>
          <p className="text-[11px] text-gray-400 font-light">Contacting OMDb cache index and TMDb image catalogs.</p>
        </div>
      )}

      {/* ----------------- EXPLORER PROFILE VIEWER PANEL ----------------- */}
      <AnimatePresence mode="wait">
        {!explorerLoading && activeProfile && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="space-y-6"
          >
            {/* Control Bar */}
            <div className="flex justify-between items-center bg-white/2 border border-white/5 rounded-2xl p-3 px-4">
              <button 
                onClick={() => setActiveProfile(null)}
                className="text-xs font-semibold text-gray-400 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
              >
                ← Return to Geography Dashboard
              </button>
              
              {/* Exports */}
              <div className="flex items-center gap-2">
                <button
                  onClick={exportToPDF}
                  className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer border border-white/5"
                >
                  <Download className="w-3 h-3" />
                  PDF Report
                </button>
                <button
                  onClick={exportToExcel}
                  className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer border border-white/5"
                >
                  <Download className="w-3 h-3" />
                  Excel Data
                </button>
                <button
                  onClick={exportToPNG}
                  className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-bold uppercase transition flex items-center gap-1 cursor-pointer border border-white/5"
                >
                  <Download className="w-3 h-3" />
                  PNG Card
                </button>
              </div>
            </div>

            {/* A. TITLE INTELLIGENCE PROFILE TYPE */}
            {activeProfile.type === "title" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Large Header Title Card */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="glass-card overflow-hidden border border-white/5 relative rounded-2xl flex flex-col justify-end min-h-[300px]">
                    {/* Backdrop */}
                    {activeProfile.details.backdrop_url && (
                      <div className="absolute inset-0 z-0">
                        <Image 
                          src={activeProfile.details.backdrop_url} 
                          alt="backdrop" 
                          fill 
                          className="object-cover opacity-30" 
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/65 to-transparent" />
                      </div>
                    )}
                    
                    <div className="p-6 relative z-10 space-y-3">
                      <span className="px-2 py-0.5 bg-[#e50914] text-white rounded font-bold uppercase text-[9px] tracking-wider">
                        {activeProfile.details.type}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-white">{activeProfile.details.title}</h2>
                      {activeProfile.details.tagline && (
                        <p className="text-xs text-[#e50914] font-medium italic">"{activeProfile.details.tagline}"</p>
                      )}
                      <p className="text-xs sm:text-sm text-gray-300 font-light leading-relaxed max-w-2xl">
                        {activeProfile.details.description}
                      </p>
                    </div>
                  </div>

                  {/* Visual charts for Title */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Ratings Radar Comparison */}
                    <div className="glass-card p-5 space-y-4">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ratings Benchmark</h4>
                      <div className="space-y-4 pt-2">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold text-gray-300">IMDb Content Rating</span>
                            <span className="text-yellow-500 font-black">{activeProfile.details.imdb_rating || "N/A"} / 10</span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-2">
                            <div 
                              className="bg-yellow-500 h-2 rounded-full" 
                              style={{ width: `${(activeProfile.details.imdb_rating || 0) * 10}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-gray-500 font-mono mt-1 block">Based on {activeProfile.details.imdb_votes || "0"} IMDb votes</span>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-bold text-gray-300">TMDb Auditor Rating</span>
                            <span className="text-emerald-400 font-black">{activeProfile.details.vote_average || "N/A"} / 10</span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-2">
                            <div 
                              className="bg-emerald-400 h-2 rounded-full" 
                              style={{ width: `${(activeProfile.details.vote_average || 0) * 10}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-gray-500 font-mono mt-1 block">Based on {activeProfile.details.vote_count || "0"} TMDb votes</span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata summary */}
                    <div className="glass-card p-5 space-y-3 flex flex-col justify-between">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-bold">Production Logistics</h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[9px] text-gray-500 block">Released Date</span>
                          <span className="font-bold text-white">{activeProfile.details.release_date}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-500 block">Runtime Length</span>
                          <span className="font-bold text-white">{activeProfile.details.duration}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-500 block">Language</span>
                          <span className="font-bold text-white capitalize">{activeProfile.details.language || "English"}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-500 block">Certification</span>
                          <span className="font-bold text-white">{activeProfile.details.certification}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Side Panel Poster and KPIs */}
                <div className="space-y-6">
                  {activeProfile.details.poster_url ? (
                    <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-950 group">
                      <Image 
                        src={activeProfile.details.poster_url} 
                        alt="poster" 
                        fill 
                        className="object-cover" 
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="aspect-[2/3] w-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 rounded-2xl flex items-center justify-center text-center p-6 text-gray-500 text-xs">
                      No Poster available on TMDb
                    </div>
                  )}

                  {/* Financial Metrics */}
                  <div className="glass-card p-5 space-y-3">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Financials (TMDb)</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 flex items-center gap-1"><Landmark className="w-3 h-3 text-[#e50914]" /> Budget:</span>
                        <span className="font-bold text-white">
                          {activeProfile.details.budget !== "N/A" && typeof activeProfile.details.budget === "number"
                            ? `$${activeProfile.details.budget.toLocaleString()}`
                            : activeProfile.details.budget}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 flex items-center gap-1"><DollarSign className="w-3 h-3 text-[#e50914]" /> Revenue:</span>
                        <span className="font-bold text-white">
                          {activeProfile.details.revenue !== "N/A" && typeof activeProfile.details.revenue === "number"
                            ? `$${activeProfile.details.revenue.toLocaleString()}`
                            : activeProfile.details.revenue}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* B. PERSON PROFILE TYPE */}
            {activeProfile.type === "person" && (
              <div className="space-y-6">
                
                {/* 1. Header and Bio */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  
                  {/* Image Profile */}
                  <div className="lg:col-span-1">
                    {activeProfile.details.profile_url ? (
                      <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-950">
                        <Image 
                          src={activeProfile.details.profile_url} 
                          alt="profile" 
                          fill 
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="aspect-[3/4] w-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 rounded-2xl flex items-center justify-center text-center p-6 text-gray-500 text-xs">
                        <User className="w-12 h-12 text-zinc-600 mb-2" />
                        No Profile photo on TMDb
                      </div>
                    )}
                  </div>

                  {/* Bio and Key Talent Facts */}
                  <div className="lg:col-span-3 glass-card p-6 flex flex-col justify-between border border-white/5">
                    <div className="space-y-4">
                      <div className="flex flex-wrap justify-between items-start gap-4">
                        <div>
                          <span className="px-2 py-0.5 bg-[#e50914]/20 border border-[#e50914]/30 text-[#e50914] rounded-full text-[9px] font-black uppercase tracking-wider">
                            {activeProfile.details.known_for_department}
                          </span>
                          <h2 className="text-3xl font-black text-white mt-1.5">{activeProfile.details.name}</h2>
                          <p className="text-[10px] text-gray-500 font-mono mt-0.5">TMDb Popularity Score: {activeProfile.details.popularity}</p>
                        </div>
                      </div>

                      <p className="text-xs text-gray-300 leading-relaxed font-light line-clamp-6">
                        {activeProfile.details.biography}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/5 pt-4 mt-4 text-xs">
                      <div>
                        <span className="text-[9px] text-gray-500 block uppercase">Birthday</span>
                        <span className="font-bold text-white">{activeProfile.details.birthday || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 block uppercase">Gender</span>
                        <span className="font-bold text-white">{activeProfile.details.gender}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 block uppercase">Place of Birth</span>
                        <span className="font-bold text-white truncate block">{activeProfile.details.place_of_birth || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 block uppercase">Career duration</span>
                        <span className="font-bold text-[#e50914]">{activeProfile.details.careerDuration}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Key Analytics KPI widgets */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="glass-card p-4.5 text-center flex flex-col justify-center">
                    <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider block mb-1">Catalog Titles</span>
                    <span className="text-2xl font-black text-white">{activeProfile.netflixTitles.length}</span>
                    <span className="text-[9px] text-gray-500 font-mono mt-1">{activeProfile.details.movieCount} Movies | {activeProfile.details.tvCount} TV Shows</span>
                  </div>

                  <div className="glass-card p-4.5 text-center flex flex-col justify-center">
                    <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider block mb-1">Average IMDb Score</span>
                    <span className="text-2xl font-black text-yellow-500">{activeProfile.details.avgImdb || "N/A"} ★</span>
                    <span className="text-[9px] text-gray-500 font-mono mt-1">From rated titles</span>
                  </div>

                  <div className="glass-card p-4.5 text-center flex flex-col justify-center">
                    <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider block mb-1">Highest Rated Title</span>
                    <span className="text-xs font-bold text-white truncate max-w-full block" title={activeProfile.details.highestRatedTitle}>
                      {activeProfile.details.highestRatedTitle}
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono mt-1">Best catalog rating</span>
                  </div>

                  <div className="glass-card p-4.5 text-center flex flex-col justify-center">
                    <span className="text-[9px] text-gray-500 uppercase font-black tracking-wider block mb-1">Most Popular Title</span>
                    <span className="text-xs font-bold text-white truncate max-w-full block" title={activeProfile.details.mostPopularTitle}>
                      {activeProfile.details.mostPopularTitle}
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono mt-1">Popularity metric</span>
                  </div>
                </div>

                {/* 3. Visual charts section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Genres Mix */}
                  <div className="glass-card p-5 space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-bold">Genre Allocation</h4>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Object.entries(
                            activeProfile.netflixTitles.reduce((acc: Record<string, number>, t) => {
                              t.genresList.forEach(g => { if (g) acc[g] = (acc[g] || 0) + 1; });
                              return acc;
                            }, {})
                          ).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5)}
                          layout="vertical"
                          margin={{ top: 5, right: 10, left: 15, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                          <XAxis type="number" stroke="#525252" fontSize={9} tickLine={false} />
                          <YAxis dataKey="name" type="category" stroke="#525252" fontSize={9} tickLine={false} width={70} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="count" name="Releases" fill="#e50914" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Collaborators frequency chart */}
                  <div className="glass-card p-5 space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-bold">Collaboration Frequencies</h4>
                    <div className="h-60">
                      {activeProfile.details.topCollaborators.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={activeProfile.details.topCollaborators}
                            layout="vertical"
                            margin={{ top: 5, right: 10, left: 15, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                            <XAxis type="number" stroke="#525252" fontSize={9} tickLine={false} />
                            <YAxis dataKey="name" type="category" stroke="#525252" fontSize={9} tickLine={false} width={75} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" name="Titles" fill="#404040" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-center text-xs text-gray-500">
                          Solo catalog listings / No major collaborators
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scatter Plot: IMDb Rating vs TMDb Rating */}
                  <div className="glass-card p-5 space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-bold">Ratings scatter (IMDb vs TMDb)</h4>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -25 }}>
                          <CartesianGrid stroke="#262626" />
                          <XAxis type="number" dataKey="x" name="IMDb" domain={[3, 10]} stroke="#525252" fontSize={9} />
                          <YAxis type="number" dataKey="y" name="TMDb" domain={[3, 10]} stroke="#525252" fontSize={9} />
                          <ZAxis type="number" range={[50, 50]} />
                          <Tooltip 
                            cursor={{ strokeDasharray: "3 3" }} 
                            content={({ active, payload }: any) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-[#0f0f0f] border border-white/10 p-2.5 rounded-lg shadow-xl text-[11px] text-gray-300">
                                    <p className="font-bold text-white mb-0.5">{payload[0].payload.name}</p>
                                    <p>IMDb: <span className="text-yellow-500 font-bold">{payload[0].value} ★</span></p>
                                    <p>TMDb: <span className="text-emerald-400 font-bold">{payload[1].value} ★</span></p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Scatter
                            name="Titles"
                            data={activeProfile.netflixTitles
                              .filter(t => t.imdb_rating > 0 && t.vote_average > 0)
                              .map(t => ({ x: t.imdb_rating, y: t.vote_average, name: t.title }))}
                            fill="#e50914"
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* 4. Filmography releases timeline */}
                <div className="glass-card p-5 space-y-4">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-bold">Career Release Timeline (Netflix Catalog)</h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                    {activeProfile.details.timeline.map((show: NetflixTitle) => (
                      <div
                        key={show.show_id}
                        onClick={() => openDetails(show)}
                        className="flex items-center justify-between p-3 rounded-xl border border-white/5 hover:border-white/15 bg-white/2 hover:bg-white/5 cursor-pointer transition group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-[#e50914] bg-white/5 border border-white/5 px-2 py-0.5 rounded-full font-mono">
                            {show.release_year}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-white group-hover:text-[#e50914] transition">{show.title}</span>
                            <span className="block text-[9px] text-gray-500 font-light mt-0.5">{show.genresList.slice(0, 2).join(" • ")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-gray-400">
                          {show.imdb_rating > 0 && (
                            <span className="text-yellow-500 font-bold flex items-center gap-0.5">
                              ★ {show.imdb_rating}
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 bg-zinc-800 rounded font-black text-[8px] uppercase tracking-wider">
                            {show.type}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. TMDb profile image gallery */}
                {activeProfile.details.profile_images.length > 0 && (
                  <div className="glass-card p-5 space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-bold flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" /> TMDb Image Gallery
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
                      {activeProfile.details.profile_images.map((img: string, idx: number) => (
                        <div 
                          key={idx}
                          onClick={() => setLightboxImage(img)}
                          className="relative aspect-[3/4] rounded-lg overflow-hidden border border-white/5 hover:border-[#e50914]/40 cursor-pointer shadow-md transition transform hover:scale-[1.03] group"
                        >
                          <Image 
                            src={img} 
                            alt={`gallery-${idx}`} 
                            fill 
                            className="object-cover" 
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------- STANDALONE LANDING DASHBOARD VIEW ----------------- */}
      <AnimatePresence>
        {!activeProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Row 1: Top Directors and Actors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Directors */}
              <motion.div variants={itemVariants} className="glass-card p-6">
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-[#e50914]" /> Top Directors
                  </h3>
                  <p className="text-xs text-gray-400 font-light">
                    Most active directors by total show releases in the catalog.
                  </p>
                </div>

                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={topDirectors} 
                      layout="vertical" 
                      margin={{ top: 5, right: 10, left: 30, bottom: 5 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload[0]) {
                          handleLoadPersonProfile(state.activePayload[0].payload.name);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                      <XAxis type="number" stroke="#525252" fontSize={11} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#525252" fontSize={10} tickLine={false} width={100} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="total" name="Titles Directed" radius={[0, 4, 4, 0]}>
                        {topDirectors.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={BAR_COLORS_RED[index % BAR_COLORS_RED.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Top Actors */}
              <motion.div variants={itemVariants} className="glass-card p-6">
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                    <Users2 className="w-4 h-4 text-[#e50914]" /> Top Cast Members
                  </h3>
                  <p className="text-xs text-gray-400 font-light">
                    Most frequent actors appearing across movies and series.
                  </p>
                </div>

                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={topActors} 
                      layout="vertical" 
                      margin={{ top: 5, right: 10, left: 30, bottom: 5 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload[0]) {
                          handleLoadPersonProfile(state.activePayload[0].payload.name);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                      <XAxis type="number" stroke="#525252" fontSize={11} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#525252" fontSize={10} tickLine={false} width={100} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="total" name="Titles Appeared" radius={[0, 4, 4, 0]}>
                        {topActors.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={BAR_COLORS_RED[index % BAR_COLORS_RED.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* Row 2: Production Centers Stacked */}
            <motion.div variants={itemVariants} className="glass-card p-6">
              <div className="mb-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                  <Globe2 className="w-4 h-4 text-[#e50914]" /> Geographical Film Centers
                </h3>
                <p className="text-xs text-gray-400 font-light">
                  Top 12 countries by volume. Broken down by Movies vs TV Series.
                </p>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={countryDetails} 
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    onClick={(state: any) => {
                      if (state && state.activePayload && state.activePayload[0]) {
                        openDrillThrough("country", state.activePayload[0].payload.country);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="country" stroke="#525252" fontSize={10} tickLine={false} />
                    <YAxis stroke="#525252" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Movies" name="Movies" stackId="a" fill="#e50914" />
                    <Bar dataKey="TV Shows" name="TV Shows" stackId="a" fill="#404040" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* OMDb Section: Highest Rated Talent */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Highest Rated Directors */}
              <motion.div variants={itemVariants} className="glass-card p-6">
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-[#e50914]" /> Highest Rated Directors
                  </h3>
                  <p className="text-xs text-gray-400 font-light">
                    Filmmakers with the highest average IMDb rating (minimum 3 catalog titles).
                  </p>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={highestRatedDirectors} 
                      layout="vertical" 
                      margin={{ top: 5, right: 10, left: 30, bottom: 5 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload[0]) {
                          handleLoadPersonProfile(state.activePayload[0].payload.name);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                      <XAxis type="number" stroke="#525252" fontSize={11} domain={[0, 10]} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#525252" fontSize={10} tickLine={false} width={100} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Avg Rating" fill="#e50914" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Highest Rated Actors */}
              <motion.div variants={itemVariants} className="glass-card p-6">
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-[#e50914]" /> Highest Rated Actors
                  </h3>
                  <p className="text-xs text-gray-400 font-light">
                    Cast members with the highest average IMDb rating (minimum 3 catalog titles).
                  </p>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={highestRatedActors} 
                      layout="vertical" 
                      margin={{ top: 5, right: 10, left: 30, bottom: 5 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload[0]) {
                          handleLoadPersonProfile(state.activePayload[0].payload.name);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                      <XAxis type="number" stroke="#525252" fontSize={11} domain={[0, 10]} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#525252" fontSize={10} tickLine={false} width={100} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Avg Rating" fill="#404040" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* OMDb Section: Most Awarded Talent */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Most Awarded Directors */}
              <motion.div variants={itemVariants} className="glass-card p-6">
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-[#e50914]" /> Most Awarded Directors
                  </h3>
                  <p className="text-xs text-gray-400 font-light">
                    Filmmakers whose content has accumulated the highest number of awards wins.
                  </p>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={mostAwardedDirectors} 
                      layout="vertical" 
                      margin={{ top: 5, right: 10, left: 30, bottom: 5 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload[0]) {
                          handleLoadPersonProfile(state.activePayload[0].payload.name);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                      <XAxis type="number" stroke="#525252" fontSize={11} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#525252" fontSize={10} tickLine={false} width={100} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Awards Wins" fill="#e50914" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Most Awarded Actors */}
              <motion.div variants={itemVariants} className="glass-card p-6">
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-[#e50914]" /> Most Awarded Actors
                  </h3>
                  <p className="text-xs text-gray-400 font-light">
                    Cast members whose content has accumulated the highest number of awards wins.
                  </p>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={mostAwardedActors} 
                      layout="vertical" 
                      margin={{ top: 5, right: 10, left: 30, bottom: 5 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload[0]) {
                          handleLoadPersonProfile(state.activePayload[0].payload.name);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                      <XAxis type="number" stroke="#525252" fontSize={11} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#525252" fontSize={10} tickLine={false} width={100} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Awards Wins" fill="#404040" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* OMDb Section: Geopolitics of Quality */}
            <motion.div variants={itemVariants} className="glass-card p-6">
              <div className="mb-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                  <Globe2 className="w-4 h-4 text-[#e50914]" /> Countries with Highest Rated Content
                </h3>
                <p className="text-xs text-gray-400 font-light">
                  Geopolitical production hubs sorted by their average IMDb content ratings (minimum 5 catalog titles).
                </p>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={highestRatedCountries} 
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    onClick={(state: any) => {
                      if (state && state.activePayload && state.activePayload[0]) {
                        openDrillThrough("country", state.activePayload[0].payload.name);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="name" stroke="#525252" fontSize={10} tickLine={false} />
                    <YAxis stroke="#525252" fontSize={11} domain={[0, 10]} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Avg Rating" fill="#e50914" radius={[4, 4, 0, 0]}>
                      {highestRatedCountries.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS_RED[index % BAR_COLORS_RED.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Row 3: Talent Search & Filmography */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Search controls */}
              <div className="glass-card p-6 lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                    <Search className="w-4 h-4 text-[#e50914]" /> Talent Filmography Search
                  </h3>
                  <p className="text-xs text-gray-400 font-light">
                    Lookup any director or cast member to compile their historical catalog contributions.
                  </p>
                </div>

                {/* Search box */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
                    placeholder="e.g. Denzel Washington, Mike Flanagan"
                    className="flex-grow bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#e50914] placeholder-gray-600 transition"
                  />
                  <button
                    onClick={() => handleSearch(query)}
                    disabled={isSearching}
                    className="px-4 py-2 bg-[#e50914] hover:bg-[#b80710] disabled:bg-red-800 text-white rounded-lg text-sm font-bold uppercase transition"
                  >
                    Search
                  </button>
                </div>

                {/* Quick recommendations */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Top Directors</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {topDirectors.slice(0, 5).map((d) => (
                      <button
                        key={d.name}
                        onClick={() => handleQuickSearch(d.name)}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#e50914]/40 rounded-full text-xs text-gray-300 transition"
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>

                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-wider mt-4">Top Actors</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {topActors.slice(0, 5).map((a) => (
                      <button
                        key={a.name}
                        onClick={() => handleQuickSearch(a.name)}
                        className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#e50914]/40 rounded-full text-xs text-gray-300 transition"
                      >
                        {a.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filmography results */}
              <div className="glass-card p-6 lg:col-span-3 flex flex-col justify-between min-h-[300px]">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                    {hasSearched ? `Filmography Results for "${query}"` : "Search Results"}
                  </h4>

                  {isSearching ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <div className="w-6 h-6 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-gray-500 font-light">Loading filmography...</span>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                      {searchResults.map((show) => (
                        <div
                          key={show.show_id}
                          onClick={() => openDetails(show)}
                          className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/0 hover:bg-white/5 hover:border-white/10 cursor-pointer group transition duration-300"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-black/40 rounded border border-white/10 text-gray-400 group-hover:text-[#e50914] transition">
                              {show.type === "Movie" ? <Film className="w-3.5 h-3.5" /> : <Tv className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white group-hover:text-red-500 transition duration-300">
                                {show.title}
                              </p>
                              <p className="text-[10px] text-gray-500 font-light">
                                {show.release_year} • {show.duration} • {show.rating}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-gray-600 bg-white/5 px-1.5 py-0.5 rounded uppercase">
                              {show.type}
                            </span>
                            <Eye className="w-4 h-4 text-gray-600 group-hover:text-[#e50914] transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : hasSearched ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                      <AlertCircle className="w-8 h-8 text-gray-600 mb-2" />
                      <p className="text-sm font-bold">No Records Found</p>
                      <p className="text-xs font-light mt-1 max-w-xs">
                        We couldn't find any direct matches in the CSV director or cast lists for "{query}".
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-gray-600">
                      <Play className="w-8 h-8 text-gray-700 mb-2 rotate-90" />
                      <p className="text-sm">Initiate Lookup</p>
                      <p className="text-xs font-light mt-1">
                        Type a name or choose from the recommended list on the left.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox photo viewer modal */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out select-none"
        >
          <div className="relative max-w-full max-h-[90vh] aspect-[3/4] w-[450px]">
            <Image 
              src={lightboxImage} 
              alt="lightbox" 
              fill 
              className="object-contain" 
              unoptimized
            />
          </div>
        </div>
      )}

      {/* Details Modal */}
      <ShowDetailsModal
        show={selectedShow}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onNavigate={handleNavigateToShow}
      />
    </motion.div>
  );
}
