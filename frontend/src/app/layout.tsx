import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { GlobalFilterProvider } from "@/lib/GlobalFilterContext";
import GlobalFilterBar from "@/components/GlobalFilterBar";
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
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#040404] text-gray-100 selection:bg-[#e50914] selection:text-white">
        <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#e50914] border-t-transparent rounded-full animate-spin" /></div>}>
          <GlobalFilterProvider>
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

