"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Play, Info } from "lucide-react";
import { NetflixTitle } from "@/lib/data";

interface MovieCardProps {
  show: NetflixTitle;
  onClick: () => void;
}

// In-memory global cache for loaded posters to prevent re-fetching on scroll
const posterCache: Record<string, string> = {};

export default function MovieCard({ show, onClick }: MovieCardProps) {
  const initialPoster = (show.poster_path && show.poster_path.startsWith("http"))
    ? show.poster_path
    : (posterCache[show.show_id] || null);

  const [isInView, setIsInView] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(initialPoster);
  const [isLoading, setIsLoading] = useState(!initialPoster);
  const cardRef = useRef<HTMLDivElement>(null);

  // Set up intersection observer to lazy-load the poster if not preloaded
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
      { rootMargin: "200px" } // trigger load before it enters view
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [show.show_id, initialPoster]);

  // Fetch poster once in view if not preloaded
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
        // Fallback or leave null
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
    <div
      ref={cardRef}
      onClick={onClick}
      className="relative flex-shrink-0 w-28 sm:w-36 h-40 sm:h-52 rounded-md overflow-hidden bg-zinc-900 border border-white/5 shadow-lg cursor-pointer group transition-all duration-300 hover:z-20 hover:scale-105"
    >
      {/* Background Poster Image */}
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={show.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      ) : (
        /* Shimmer Loading Skeleton / Text Fallback */
        <div className="w-full h-full flex flex-col justify-between p-3 bg-gradient-to-br from-zinc-800 to-zinc-900 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
          )}
          <span className="text-[8px] font-black uppercase text-red-600/75 tracking-wider">
            {show.type}
          </span>
          <span className="text-[10px] sm:text-xs font-bold text-white line-clamp-3 leading-snug">
            {show.title}
          </span>
          <div className="text-[9px] text-zinc-500 font-mono">
            {show.release_year}
          </div>
        </div>
      )}

      {/* Glassmorphic Info Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2 sm:p-3">
        <div className="space-y-1 sm:space-y-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-[9px] sm:text-xs font-black text-white line-clamp-1">
            {show.title}
          </p>

          <div className="flex items-center flex-wrap gap-1.5 text-[8px] sm:text-[9px] font-bold">
            <span className="text-gray-300">{show.release_year}</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-300 truncate max-w-[60px]">{show.duration}</span>
          </div>

          <div className="flex items-center gap-2 text-[8px] sm:text-[9px] font-black">
            {show.imdb_rating > 0 && (
              <span className="text-yellow-500 flex items-center gap-0.5 bg-black/50 px-1 py-0.5 rounded border border-yellow-500/10">
                IMDb {show.imdb_rating}
              </span>
            )}
            {show.vote_average > 0 && (
              <span className="text-emerald-400 flex items-center gap-0.5 bg-black/50 px-1 py-0.5 rounded border border-emerald-500/10">
                TMDb {show.vote_average}
              </span>
            )}
          </div>

          <p className="text-[8px] sm:text-[9px] text-gray-400 line-clamp-1 italic">
            {show.genresList.slice(0, 2).join(" • ")}
          </p>

          {/* Action Buttons indicator */}
          <div className="flex gap-1 pt-0.5">
            <span className="p-1 bg-[#e50914] text-white rounded-full hover:bg-[#b80710] transition">
              <Play className="w-2 h-2 fill-white" />
            </span>
            <span className="p-1 bg-white/20 text-white rounded-full hover:bg-white/30 transition">
              <Info className="w-2 h-2" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
