import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { GlobalFilterProvider } from "@/lib/GlobalFilterContext";
import GlobalFilterBar from "@/components/GlobalFilterBar";
import { getNetflixData } from "@/lib/data";
import fs from "fs";
import path from "path";

import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Netflix Analytics - Production Insights Dashboard",
  description: "Enterprise analytics portal for Netflix content. Analyze shows, movies, release year trends, ratings, and actors based on official catalogs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Load TMDb cache from disk
  let tmdbCache: Record<string, any> = {};
  const cachePath = path.join(process.cwd(), "tmdb_cache.json");
  if (fs.existsSync(cachePath)) {
    try {
      tmdbCache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    } catch (e) {
      console.error("Failed to load tmdb_cache.json in layout:", e);
    }
  }

  // Enrich data elements with TMDb cached posters, backdrops, and ratings
  const rawData = getNetflixData();
  const allTitles = rawData.map((title) => {
    const cached = tmdbCache[title.show_id];
    if (cached && cached.matched) {
      return {
        ...title,
        poster_path: cached.poster_url || "",
        backdrop_path: cached.backdrop_url || "",
        vote_average: cached.vote_average || title.vote_average,
        genresList: cached.genres && cached.genres.length > 0 ? cached.genres : title.genresList,
      };
    }
    return title;
  });

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#040404] text-gray-100 selection:bg-[#e50914] selection:text-white">
        <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin" /></div>}>
          <GlobalFilterProvider allTitles={allTitles}>
            <Navbar />
            <div className="mt-14" />
            <GlobalFilterBar />
            <main className="flex-grow pt-6 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
              {children}
            </main>
            <footer className="border-t border-white/5 py-6 text-center text-xs text-gray-600">
              <p>© {new Date().getFullYear()} Netflix Analytics Portal. Built for enterprise data insights.</p>
            </footer>
          </GlobalFilterProvider>
        </Suspense>
      </body>
    </html>
  );
}

