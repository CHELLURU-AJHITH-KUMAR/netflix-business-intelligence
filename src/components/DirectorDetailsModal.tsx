"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Film, Star, User, Trophy } from "lucide-react";
import { NetflixTitle } from "@/lib/data";

interface DirectorDetailsModalProps {
  directorName: string;
  isOpen: boolean;
  onClose: () => void;
  allTitles: NetflixTitle[];
  onShowSelect: (show: NetflixTitle) => void;
}

export default function DirectorDetailsModal({
  directorName,
  isOpen,
  onClose,
  allTitles,
  onShowSelect,
}: DirectorDetailsModalProps) {
  const [profileData, setProfileData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Find all titles directed by this director in the catalog
  const directedTitles = allTitles.filter((show) =>
    show.directorsList.some((d) => d.toLowerCase().trim() === directorName.toLowerCase().trim())
  );

  // Calculations for this director
  const totalTitlesCount = directedTitles.length;
  
  const imdbRatings = directedTitles.filter((d) => d.imdb_rating > 0);
  const avgImdb = imdbRatings.length > 0
    ? (imdbRatings.reduce((sum, d) => sum + d.imdb_rating, 0) / imdbRatings.length).toFixed(1)
    : "N/A";

  const tmdbRatings = directedTitles.filter((d) => d.vote_average > 0);
  const avgTmdb = tmdbRatings.length > 0
    ? (tmdbRatings.reduce((sum, d) => sum + d.vote_average, 0) / tmdbRatings.length).toFixed(1)
    : "N/A";

  const totalAwards = directedTitles.reduce((sum, d) => sum + (d.awardsWins || 0), 0);

  useEffect(() => {
    if (!isOpen || !directorName) return;

    setIsLoading(true);
    setProfileData(null);

    const fetchPerson = async () => {
      try {
        const res = await fetch(`/api/person?name=${encodeURIComponent(directorName)}`);
        if (res.ok) {
          const data = await res.json();
          setProfileData(data);
        }
      } catch (e) {
        console.error("Failed to load director profile:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPerson();
  }, [directorName, isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col z-10"
        >
          {/* Top red glow accent */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#e50914] via-red-500 to-[#e50914]" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-[#e50914] text-gray-300 hover:text-white rounded-full border border-white/10 hover:border-[#e50914]/40 transition duration-300 focus:outline-none z-20"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 overflow-y-auto space-y-6">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
              {/* Photo */}
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 flex-shrink-0 relative shadow-lg">
                {profileData?.profile_url ? (
                  <img
                    src={profileData.profile_url}
                    alt={directorName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                    {isLoading ? (
                      <div className="w-6 h-6 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <User className="w-12 h-12 text-zinc-700" />
                    )}
                  </div>
                )}
              </div>

              {/* Bio details */}
              <div className="space-y-2 mt-2 sm:mt-0 flex-grow">
                <span className="text-[10px] font-black text-[#e50914] tracking-widest uppercase bg-[#e50914]/10 border border-[#e50914]/20 px-2 py-0.5 rounded">
                  Director Profile
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">{directorName}</h3>
                
                <div className="grid grid-cols-3 gap-2 pt-2 max-w-sm">
                  <div className="bg-white/5 border border-white/5 p-2 rounded text-center">
                    <span className="text-[8px] text-gray-500 font-bold uppercase block">Titles</span>
                    <span className="text-sm font-black text-white">{totalTitlesCount}</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-2 rounded text-center">
                    <span className="text-[8px] text-gray-500 font-bold uppercase block">Avg IMDb</span>
                    <span className="text-sm font-black text-yellow-500">{avgImdb}</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-2 rounded text-center">
                    <span className="text-[8px] text-gray-500 font-bold uppercase block">Awards Wins</span>
                    <span className="text-sm font-black text-red-500 flex items-center justify-center gap-0.5">
                      <Trophy className="w-3.5 h-3.5 text-yellow-500" /> {totalAwards}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Catalog Filmography Section */}
            <div className="space-y-3 border-t border-white/5 pt-5">
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <Film className="w-4 h-4 text-[#e50914]" /> Catalog Directorial Log ({directedTitles.length} Titles)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                {directedTitles.map((show) => (
                  <div
                    key={show.show_id}
                    onClick={() => {
                      onShowSelect(show);
                    }}
                    className="p-3 bg-white/5 border border-white/5 hover:border-[#e50914]/30 hover:bg-white/10 rounded-lg cursor-pointer flex justify-between items-center gap-3 transition group"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white group-hover:text-red-500 transition duration-300 line-clamp-1">
                        {show.title}
                      </p>
                      <div className="flex items-center gap-1.5 text-[9px] text-gray-500">
                        <span className="bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-gray-400">
                          {show.release_year}
                        </span>
                        <span>{show.duration}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {show.imdb_rating > 0 && (
                        <span className="text-[10px] text-yellow-500 font-bold flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" />
                          {show.imdb_rating}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
