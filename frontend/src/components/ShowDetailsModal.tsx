"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Info, Star, Award, Film, Calendar, Clock, MapPin, Tag, User, Users, Lock, Link as LinkIcon, Loader2 } from "lucide-react";
import { NetflixTitle } from "@/lib/data";

interface TmdbCast {
  name: string;
  character: string;
  profile_url: string | null;
}

interface TmdbCrew {
  name: string;
  job: string;
}

interface TmdbSimilar {
  tmdb_id: number;
  show_id: string | null;
  title: string;
  poster_url: string | null;
  release_year: number;
  vote_average: number;
}

interface TmdbData {
  matched: boolean;
  tmdb_id?: number;
  title?: string;
  poster_url?: string | null;
  backdrop_url?: string | null;
  vote_average?: number;
  vote_count?: number;
  tagline?: string;
  overview?: string;
  genres?: string[];
  imdb_id?: string | null;
  cast?: TmdbCast[];
  crew?: TmdbCrew[];
  similar?: TmdbSimilar[];
}

interface ShowDetailsModalProps {
  show: NetflixTitle | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (showId: string) => void;
}

export default function ShowDetailsModal({ show, isOpen, onClose, onNavigate }: ShowDetailsModalProps) {
  const renderStars = (ratingVal: number) => {
    const stars = [];
    const normalized = ratingVal / 2; // 0-10 -> 0-5
    const fullStars = Math.floor(normalized);
    const hasHalf = (normalized - fullStars) >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<Star key={i} className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />);
      } else if (i === fullStars + 1 && hasHalf) {
        stars.push(
          <div key={i} className="relative inline-block text-yellow-500" style={{ width: '14px', height: '14px' }}>
            <Star className="w-3.5 h-3.5 text-zinc-700" />
            <div className="absolute top-0 left-0 overflow-hidden w-1/2">
              <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
            </div>
          </div>
        );
      } else {
        stars.push(<Star key={i} className="w-3.5 h-3.5 text-zinc-700" />);
      }
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  const [activeTab, setActiveTab] = useState<"details" | "integrations" | "analytics">("details");
  const [tmdbData, setTmdbData] = useState<TmdbData | null>(null);
  const [omdbData, setOmdbData] = useState<any | null>(null);
  const [catalogDetails, setCatalogDetails] = useState<NetflixTitle | null>(null);
  const [isLoadingTmdb, setIsLoadingTmdb] = useState(false);
  const [errorTmdb, setErrorTmdb] = useState<string | null>(null);

  // Fetch TMDb and OMDb enrichment details when show changes
  useEffect(() => {
    if (!isOpen || !show) {
      setTmdbData(null);
      setOmdbData(null);
      setCatalogDetails(null);
      return;
    }

    const fetchEnrichment = async () => {
      setIsLoadingTmdb(true);
      setErrorTmdb(null);
      try {
        // Fetch full catalog details asynchronously
        fetch(`/api/titles/${show.show_id}`)
          .then(res => {
            if (res.ok) return res.json();
          })
          .then(data => {
            if (data) setCatalogDetails(data);
          })
          .catch(e => console.error("Failed to fetch full title catalog details:", e));

        // 1. Fetch TMDb Details
        const tmdbResponse = await fetch(`/api/titles/${show.show_id}/tmdb`);
        if (!tmdbResponse.ok) throw new Error("Failed to load TMDb details");
        const tmdb = await tmdbResponse.json();
        setTmdbData(tmdb);

        // 2. Fetch OMDb Details (passing the IMDb ID from TMDb if it exists)
        const imdbIdParam = tmdb?.imdb_id ? `?imdbId=${tmdb.imdb_id}` : '';
        const omdbResponse = await fetch(`/api/titles/${show.show_id}/omdb${imdbIdParam}`);
        if (omdbResponse.ok) {
          const omdb = await omdbResponse.json();
          setOmdbData(omdb);
        }
      } catch (err: any) {
        console.error("Enrichment fetch error:", err);
        setErrorTmdb(err.message);
      } finally {
        setIsLoadingTmdb(false);
      }
    };

    fetchEnrichment();
    // Default tab back to details when active show changes
    setActiveTab("details");
  }, [show, isOpen]);

  if (!show) return null;

  const showBackdrop = tmdbData?.backdrop_url;
  const showPoster = tmdbData?.poster_url;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-3xl bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header Banner */}
            <div
              className="relative h-56 flex flex-col justify-end p-6 border-b border-white/5 transition-all duration-700 bg-cover bg-center"
              style={{
                backgroundImage: showBackdrop
                  ? `linear-gradient(to top, rgba(20, 20, 20, 1) 0%, rgba(20, 20, 20, 0.4) 50%, rgba(0, 0, 0, 0.7) 100%), url(${showBackdrop})`
                  : `linear-gradient(to right, rgba(163, 20, 26, 0.3) 0%, rgba(20, 20, 20, 1) 100%)`,
              }}
            >
              {/* Top Accent Lines */}
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#e50914] via-red-500 to-[#e50914]" />
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-[#e50914] text-gray-300 hover:text-white rounded-full border border-white/10 hover:border-[#e50914]/40 transition duration-300 focus:outline-none z-20"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-2 max-w-xl z-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#e50914] text-white text-[9px] font-black rounded-sm tracking-widest uppercase shadow">
                    {show.type}
                  </span>
                  <span className="text-xs text-gray-300 font-semibold flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                    <Calendar className="w-3 h-3 text-[#e50914]" /> {show.release_year}
                  </span>
                  <span className="text-xs text-gray-300 font-semibold flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                    <Clock className="w-3 h-3 text-[#e50914]" /> {show.duration}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 border border-white/10 bg-black/40 text-gray-300 rounded text-[9px] font-black uppercase">
                    {show.rating}
                  </span>
                  {tmdbData?.matched && tmdbData.vote_average ? (
                    <span className="text-[10px] text-emerald-400 font-black flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-emerald-500/20">
                      TMDb: {tmdbData.vote_average}
                    </span>
                  ) : null}
                  {omdbData?.matched && omdbData.imdbRating ? (
                    <span className="text-[10px] text-yellow-500 font-black flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-yellow-500/20">
                      IMDb: {omdbData.imdbRating}
                    </span>
                  ) : null}
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight glow-text-red">
                  {show.title}
                </h2>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-white/5 bg-black/40 px-6">
              {[
                { id: "details", label: "Catalog Details", icon: Info },
                { id: "integrations", label: "TMDb & IMDb Insights", icon: Award },
                { id: "analytics", label: "User Engagement (V2)", icon: Lock },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-3.5 px-4 border-b-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                      isActive
                        ? "border-[#e50914] text-white bg-white/5"
                        : "border-transparent text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive && tab.id !== 'analytics' ? 'text-[#e50914]' : 'text-gray-500'}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="p-6 overflow-y-auto flex-grow space-y-6">
              
              {/* Tab 1: Catalog Details */}
              {activeTab === "details" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Poster Column */}
                    {showPoster ? (
                      <div className="flex-shrink-0 mx-auto sm:mx-0 w-36 sm:w-44 h-52 sm:h-64 relative rounded-lg overflow-hidden border border-white/10 shadow-lg">
                        <img
                          src={showPoster}
                          alt={show.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : null}

                    {/* Metadata details */}
                    <div className="flex-grow space-y-4">
                      {tmdbData?.tagline && (
                        <p className="text-sm italic text-[#e50914] font-medium tracking-wide">
                          "{tmdbData.tagline}"
                        </p>
                      )}
                      
                      <div className="space-y-2">
                        <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Description</h4>
                        <p className="text-gray-300 text-sm sm:text-base leading-relaxed font-light">
                          {tmdbData?.overview || catalogDetails?.description || show.description || "No description available."}
                        </p>
                      </div>

                      {/* OMDb Ratings Segment */}
                      {omdbData?.matched && (
                        <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Critics & Audience Scores</span>
                            {omdbData.imdbRating && (
                              <div className="flex items-center gap-1.5">
                                {renderStars(parseFloat(omdbData.imdbRating) || 0)}
                                <span className="text-[11px] font-black text-white">{omdbData.imdbRating}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2">
                            {/* IMDb Badge */}
                            <div className="bg-black/40 border border-white/5 rounded-lg p-2 text-center space-y-0.5">
                              <span className="text-[8px] font-black text-yellow-500 tracking-wider uppercase block">IMDb</span>
                              <span className="text-xs font-black text-white">{omdbData.imdbRating ? `${omdbData.imdbRating}/10` : 'N/A'}</span>
                              <span className="text-[8px] text-gray-500 block truncate">{omdbData.imdbVotes || '0'} votes</span>
                            </div>

                            {/* Rotten Tomatoes Badge */}
                            <div className="bg-black/40 border border-white/5 rounded-lg p-2 text-center space-y-0.5">
                              <span className="text-[8px] font-black text-red-500 tracking-wider uppercase block">Rotten Tomatoes</span>
                              <span className="text-xs font-black text-white">{omdbData.RottenTomatoesRating || 'N/A'}</span>
                              <span className="text-[8px] text-gray-500 block truncate">Critics score</span>
                            </div>

                            {/* Metacritic Badge */}
                            <div className="bg-black/40 border border-white/5 rounded-lg p-2 text-center space-y-0.5">
                              <span className="text-[8px] font-black text-purple-400 tracking-wider uppercase block">Metacritic</span>
                              <span className="text-xs font-black text-white">{omdbData.Metascore ? `${omdbData.Metascore}/100` : 'N/A'}</span>
                              <span className="text-[8px] text-gray-500 block truncate">Metascore</span>
                            </div>
                          </div>

                          {omdbData.Awards && omdbData.Awards !== 'N/A' && (
                            <div className="flex items-start gap-2 pt-2 border-t border-white/5 text-[10px]">
                              <Award className="w-3.5 h-3.5 text-[#e50914] flex-shrink-0 mt-0.5" />
                              <span className="text-gray-300 font-light">{omdbData.Awards}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Mini Metadata list */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/5 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Director</span>
                          <span className="text-white font-semibold">
                            {omdbData?.Director && omdbData.Director !== 'N/A'
                              ? omdbData.Director
                              : tmdbData?.crew && tmdbData.crew.length > 0 
                                ? tmdbData.crew.filter(c => c.job === 'Director').map(c => c.name).join(", ") 
                                : catalogDetails?.director || show.director || "Unknown Director"}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Genres</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(omdbData?.Genre && omdbData.Genre !== 'N/A' 
                              ? omdbData.Genre.split(',').map((s: string) => s.trim())
                              : tmdbData?.genres || show.genresList
                            ).map((g: string) => (
                              <span key={g} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-[10px] text-gray-300 font-light">
                                {g}
                              </span>
                            ))}
                          </div>
                        </div>

                        {omdbData?.matched && (
                          <>
                            <div>
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Rated Certification</span>
                              <span className="text-white font-medium">{omdbData.Rated || "Not Rated"}</span>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">DVD Release Date</span>
                              <span className="text-white font-medium">{omdbData.DVD || "N/A"}</span>
                            </div>

                            {show.type === 'Movie' && omdbData.BoxOffice && omdbData.BoxOffice !== 'N/A' && (
                              <div>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Box Office Revenue</span>
                                <span className="text-emerald-400 font-extrabold">{omdbData.BoxOffice}</span>
                              </div>
                            )}

                            {omdbData.Production && omdbData.Production !== 'N/A' && (
                              <div>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Production Company</span>
                                <span className="text-white font-medium">{omdbData.Production}</span>
                              </div>
                            )}

                            {omdbData.Website && omdbData.Website !== 'N/A' && (
                              <div className="sm:col-span-2">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Official Website</span>
                                <a 
                                  href={omdbData.Website} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-red-500 hover:text-red-400 hover:underline font-medium break-all flex items-center gap-1 mt-0.5"
                                >
                                  {omdbData.Website} <LinkIcon className="w-3 h-3" />
                                </a>
                              </div>
                            )}

                            <div className="sm:col-span-2">
                               <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Languages</span>
                               <span className="text-gray-300 font-medium">{omdbData.Language || catalogDetails?.language || show.language}</span>
                             </div>
                           </>
                         )}

                         <div className="sm:col-span-2">
                           <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Country of Origin</span>
                           <span className="text-gray-300 font-medium">
                             {omdbData?.Country && omdbData.Country !== 'N/A' ? omdbData.Country : catalogDetails?.country || show.country || "Not specified"}
                           </span>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Cast Avatar section */}
                  <div className="border-t border-white/5 pt-4">
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#e50914]" /> Featured Cast members
                    </h4>

                    {isLoadingTmdb ? (
                      <div className="flex justify-center items-center py-6 gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#e50914]" />
                        <span className="text-xs text-gray-500 font-light">Loading cast profiles...</span>
                      </div>
                    ) : tmdbData?.cast && tmdbData.cast.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {tmdbData.cast.map((actor) => (
                          <div key={actor.name} className="flex items-center gap-2.5 p-2 rounded-lg bg-white/0 border border-white/5 hover:border-white/10 transition">
                            {actor.profile_url ? (
                              <img
                                src={actor.profile_url}
                                alt={actor.name}
                                className="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-gray-500 border border-white/10 flex-shrink-0">
                                <User className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-[10.5px] font-bold text-white truncate">{actor.name}</p>
                              <p className="text-[9px] text-gray-500 truncate">{actor.character}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-300 text-xs font-light leading-relaxed">
                        {catalogDetails?.cast || show.cast || "No cast lists recorded in catalog."}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: API Integrations (TMDb / IMDb Insights) */}
              {activeTab === "integrations" && (
                <div className="space-y-6 py-2">
                  
                  {/* API Match Status header */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* TMDb stats */}
                    <div className="glass-card p-4 border border-white/10 flex flex-col justify-between h-28">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-emerald-500 tracking-wider uppercase">TMDb Score</span>
                        <Film className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      {isLoadingTmdb ? (
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                      ) : tmdbData?.matched ? (
                        <div className="space-y-0.5">
                          <span className="text-2xl font-black text-white">{tmdbData.vote_average} <span className="text-xs text-gray-500">/ 10</span></span>
                          <p className="text-[9px] text-gray-400 font-light">Based on {tmdbData.vote_count?.toLocaleString()} votes</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500 italic">No record matched</span>
                      )}
                    </div>

                    {/* IMDb Sync Link */}
                    <div className="glass-card p-4 border border-white/10 flex flex-col justify-between h-28">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-yellow-500 tracking-wider uppercase">IMDb Profile</span>
                        <Star className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      {isLoadingTmdb ? (
                        <Loader2 className="w-5 h-5 animate-spin text-yellow-500" />
                      ) : tmdbData?.matched && tmdbData.imdb_id ? (
                        <a
                          href={`https://www.imdb.com/title/${tmdbData.imdb_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500 hover:text-black border border-yellow-500/30 text-yellow-500 font-bold rounded-lg text-[10px] uppercase tracking-wider transition w-fit"
                        >
                          Visit IMDb Profile <LinkIcon className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-gray-500 italic">Not available</span>
                      )}
                    </div>

                    {/* API Connection Indicator */}
                    <div className="glass-card p-4 border border-white/10 flex flex-col justify-between h-28">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-blue-500 tracking-wider uppercase">Sync Connection</span>
                        <Award className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${tmdbData?.matched ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                          <span className="text-xs font-bold text-white">{tmdbData?.matched ? "Connected" : "Disconnected"}</span>
                        </div>
                        <p className="text-[9px] text-gray-500 font-mono">ID: {tmdbData?.tmdb_id || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Similar Content row */}
                  <div className="border-t border-white/5 pt-4 space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Film className="w-4 h-4 text-[#e50914]" /> Related & Similar Content
                      </h4>
                      <p className="text-[10px] text-gray-500 font-light mt-0.5">
                        TMDb recommendations. Clicking items marked with <span className="text-[#e50914] font-bold">In Catalog</span> redirects your active detail window.
                      </p>
                    </div>

                    {isLoadingTmdb ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-[#e50914]" />
                        <span className="text-xs text-gray-500 font-light">Loading similar titles...</span>
                      </div>
                    ) : tmdbData?.similar && tmdbData.similar.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {tmdbData.similar.map((item) => (
                          <div
                            key={item.tmdb_id}
                            onClick={() => {
                              if (item.show_id && onNavigate) {
                                onNavigate(item.show_id);
                              }
                            }}
                            className={`glass-card p-3 flex flex-col justify-between h-56 relative ${
                              item.show_id 
                                ? "cursor-pointer border-red-500/20 hover:border-[#e50914] hover:shadow-[#e50914]/15" 
                                : "opacity-40 cursor-not-allowed select-none"
                            }`}
                          >
                            <div className="space-y-2">
                              {item.poster_url ? (
                                <img
                                  src={item.poster_url}
                                  alt={item.title}
                                  className="w-full h-32 object-cover rounded-lg"
                                />
                              ) : (
                                <div className="w-full h-32 bg-zinc-800 flex items-center justify-center rounded-lg text-gray-600">
                                  <Film className="w-8 h-8" />
                                </div>
                              )}
                              
                              <h5 className="text-[10.5px] font-bold text-white line-clamp-1 group-hover:text-red-500 transition duration-300">{item.title}</h5>
                              <p className="text-[9px] text-gray-400 font-light">{item.release_year} • ★ {item.vote_average}</p>
                            </div>

                            {item.show_id && (
                              <span className="absolute top-2 right-2 bg-[#e50914] text-white text-[7px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider shadow">
                                In Catalog
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-xs py-4">No related content recommendations available from TMDb.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: User Engagement (V2 Locked) */}
              {activeTab === "analytics" && (
                <div className="space-y-6 py-4">
                  <div className="p-5 border border-red-600/20 bg-red-950/15 rounded-xl flex items-start gap-3">
                    <Lock className="w-5 h-5 text-[#e50914] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">User Behaviour Tracking Locked</h4>
                      <p className="text-xs text-gray-400 font-light mt-1 leading-relaxed">
                        Detailed telemetry dashboards (watch time distribution, user satisfaction index, average drop-off rate, and viewer demographic breakdown) are disabled in Version 1. 
                        They require integration with user tracking datasets.
                      </p>
                    </div>
                  </div>

                  {/* Telemetry charts skeleton */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="glass-card p-5 border border-dashed border-white/10 flex flex-col justify-between h-44 relative">
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                        <Lock className="w-6 h-6 text-red-500/80" />
                        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Locked (V2)</span>
                      </div>
                      <div>
                        <h6 className="text-[11px] font-bold text-gray-400 uppercase">Viewer Completion Rate</h6>
                        <span className="text-2xl font-black text-white">-%</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#e50914] h-full w-[40%] animate-pulse" />
                      </div>
                      <span className="text-[9px] text-gray-600">Sync with telemetry logs needed</span>
                    </div>

                    <div className="glass-card p-5 border border-dashed border-white/10 flex flex-col justify-between h-44 relative">
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                        <Lock className="w-6 h-6 text-red-500/80" />
                        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Locked (V2)</span>
                      </div>
                      <div>
                        <h6 className="text-[11px] font-bold text-gray-400 uppercase">Watch Time Distribution</h6>
                        <span className="text-2xl font-black text-white">- hrs</span>
                      </div>
                      <div className="flex items-end gap-1.5 h-16 pt-2">
                        {[40, 20, 60, 80, 50, 70, 90].map((h, i) => (
                          <div key={i} className="flex-grow bg-white/10 rounded-sm" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                      <span className="text-[9px] text-gray-600">Daily viewer hours logs needed</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-white/5 p-4 bg-black/60 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition duration-300 focus:outline-none"
              >
                Close Details
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
