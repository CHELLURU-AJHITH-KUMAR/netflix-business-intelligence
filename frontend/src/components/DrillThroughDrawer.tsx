"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Film, Tv, Star, Users, MapPin, User, Calendar, ArrowLeft } from "lucide-react";
import { useGlobalFilter } from "@/lib/GlobalFilterContext";
import { NetflixTitle } from "@/lib/data";

export default function DrillThroughDrawer() {
  const {
    drillThroughData,
    closeDrillThrough,
    filteredTitles,
    openShowDetails,
    openDrillThrough,
    setDrillThroughLevel,
    setFilter,
  } = useGlobalFilter();

  const { type, value, level, parentValue } = drillThroughData;

  // Filter titles belonging to the current drill-through context
  const currentList = useMemo(() => {
    if (!type) return [];
    
    return filteredTitles.filter(t => {
      if (type === "genre") return t.genresList.includes(value);
      if (type === "country") return t.countriesList.includes(value);
      if (type === "actor") return t.castList.includes(value);
      if (type === "director") return t.directorsList.includes(value);
      if (type === "year") {
        if (value.includes("-")) {
          const [start, end] = value.split("-").map(Number);
          return t.release_year >= start && t.release_year <= end;
        } else {
          return t.release_year.toString() === value;
        }
      }
      return true;
    });
  }, [type, value, filteredTitles]);

  // Compute top directors (for country/genre drill down)
  const topDirectors = useMemo(() => {
    if (type !== "country" && type !== "genre") return [];
    
    const counts: Record<string, { total: number; ratingSum: number; ratingCount: number }> = {};
    currentList.forEach(t => {
      t.directorsList.forEach(d => {
        if (!d) return;
        if (!counts[d]) counts[d] = { total: 0, ratingSum: 0, ratingCount: 0 };
        counts[d].total++;
        if (t.imdb_rating > 0) {
          counts[d].ratingSum += t.imdb_rating;
          counts[d].ratingCount++;
        }
      });
    });

    return Object.entries(counts)
      .map(([name, data]) => ({
        name,
        total: data.total,
        avgRating: data.ratingCount > 0 ? (data.ratingSum / data.ratingCount).toFixed(1) : "N/A",
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [currentList, type]);

  // If level 1 of country drill-through: filter by director as well
  const displayTitles = useMemo(() => {
    if (type === "country" && level === 1 && parentValue) {
      // parentValue is the director name
      return currentList.filter(t => t.directorsList.includes(parentValue));
    }
    return currentList;
  }, [currentList, type, level, parentValue]);

  if (!type) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={closeDrillThrough}
          className="absolute inset-0 bg-black/80 backdrop-blur-xs pointer-events-auto cursor-pointer"
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="absolute top-0 right-0 h-full w-full max-w-lg bg-[#0e0e0e]/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col pointer-events-auto overflow-hidden text-gray-200 font-sans"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 bg-white/2 flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-[#e50914] tracking-widest font-mono">
                Drill-Through Analysis
              </span>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                {type === "country" && <MapPin className="w-5 h-5 text-[#e50914]" />}
                {type === "genre" && <Film className="w-5 h-5 text-[#e50914]" />}
                {type === "actor" && <Users className="w-5 h-5 text-[#e50914]" />}
                {type === "director" && <User className="w-5 h-5 text-[#e50914]" />}
                {type === "year" && <Calendar className="w-5 h-5 text-[#e50914]" />}
                {value}
              </h2>

              {/* Breadcrumbs */}
              <div className="flex items-center gap-1 text-[10px] text-gray-500 font-semibold uppercase tracking-wider pt-1">
                <span>Filters</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-gray-400 capitalize">{type}</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-white truncate max-w-[120px]">{value}</span>
                {level === 1 && parentValue && (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-[#e50914] truncate max-w-[120px]">Director: {parentValue}</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={closeDrillThrough}
              className="p-2 hover:bg-white/10 hover:text-white rounded-full transition border border-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
            {/* Hierarchy Level 0: Country Overview */}
            {type === "country" && level === 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                    Top Directors in {value}
                  </span>
                  <span className="text-[10px] text-gray-500 font-semibold font-mono">
                    {topDirectors.length} matches
                  </span>
                </div>
                
                {topDirectors.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No directors listed for this dataset.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {topDirectors.map(d => (
                      <button
                        key={d.name}
                        onClick={() => setDrillThroughLevel(1, d.name)}
                        className="p-3 bg-white/5 border border-white/5 hover:border-[#e50914]/40 hover:bg-[#e50914]/5 rounded-xl text-left transition duration-200 group flex justify-between items-center cursor-pointer"
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-white group-hover:text-[#e50914] transition truncate max-w-[150px]">
                            {d.name}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {d.total} {d.total === 1 ? "title" : "titles"}
                          </p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Hierarchy Level 1: drilled from Country into Director */}
            {type === "country" && level === 1 && parentValue && (
              <div className="space-y-3">
                <button
                  onClick={() => setDrillThroughLevel(0)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white font-bold transition pb-2 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to {value} Overview
                </button>
                <div className="p-3 bg-[#e50914]/5 border border-[#e50914]/20 rounded-xl">
                  <p className="text-xs font-medium text-white">
                    Showing filmography of <span className="text-[#e50914] font-bold">{parentValue}</span> produced in <span className="font-bold">{value}</span>.
                  </p>
                </div>
              </div>
            )}

            {/* List of Titles */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                {level === 1 ? "Filtered Catalog List" : `Top Titles (${currentList.length} total)`}
              </span>

              {displayTitles.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-xs italic bg-white/2 rounded-xl border border-dashed border-white/5">
                  No matching titles in the filtered dataset.
                </div>
              ) : (
                <div className="space-y-2">
                  {displayTitles.slice(0, 30).map(title => (
                    <div
                      key={title.show_id}
                      onClick={() => openShowDetails(title)}
                      className="p-3 bg-zinc-950/60 border border-white/5 hover:border-white/10 rounded-xl flex items-center gap-3 transition cursor-pointer hover:bg-white/5"
                    >
                      {/* Image Thumbnail */}
                      <div className="w-10 h-14 bg-zinc-900 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/5">
                        {title.poster_path ? (
                          <img
                            src={title.poster_path}
                            alt={title.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as any).style.display = "none";
                            }}
                          />
                        ) : (
                          <Film className="w-4 h-4 text-gray-600" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-grow min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[8px] px-1 py-0.2 rounded font-black tracking-wider uppercase font-mono ${
                            title.type === "Movie" ? "bg-red-500/20 text-red-400 border border-red-500/20" : "bg-blue-500/20 text-blue-400 border border-blue-500/20"
                          }`}>
                            {title.type === "Movie" ? "Movie" : "TV"}
                          </span>
                          <span className="text-[10px] text-gray-500 font-bold font-mono">
                            {title.release_year}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white truncate" title={title.title}>
                          {title.title}
                        </h4>
                        <p className="text-[10px] text-gray-400 truncate max-w-[280px]">
                          {title.director || title.cast || "No details available"}
                        </p>
                      </div>

                      {/* Ratings */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0 font-mono text-[10px]">
                        {title.imdb_rating > 0 && (
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="w-3 h-3 fill-yellow-500" />
                            <span className="font-bold">{title.imdb_rating.toFixed(1)}</span>
                          </div>
                        )}
                        {title.vote_average > 0 && (
                          <div className="text-gray-400 text-[9px] font-semibold">
                            TMDb: <span className="text-white">{title.vote_average.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {displayTitles.length > 30 && (
                    <div className="text-center py-2 text-[10px] text-gray-500 italic">
                      Showing top 30 of {displayTitles.length} items. Broaden filters to narrow search.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
