"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useGlobalFilter } from "@/lib/GlobalFilterContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { Calendar, Tag, Clock, BarChart2, Star, Trophy, Globe2, Sparkles, Percent, X } from "lucide-react";

interface ContentInsightsClientProps {
  data: {
    releaseYearTrend: Array<{ year: number; movies: number; tvShows: number; total: number }>;
    genreDistribution: Array<{ name: string; total: number; movies: number; tvShows: number }>;
    movieDurationData: Array<{ name: string; value: number }>;
    tvDurationData: Array<{ name: string; value: number }>;
    imdbRatingDistribution: Array<{ name: string; value: number }>;
    rtDistribution: Array<{ name: string; value: number }>;
    metascoreDistribution: Array<{ name: string; value: number }>;
    awardsByGenre: Array<{ name: string; value: number }>;
    awardsByYear: Array<{ year: number; value: number }>;
    runtimeVsImdb: Array<{ name: string; value: number }>;
    genreVsImdb: Array<{ name: string; value: number }>;
    countryVsImdb: Array<{ name: string; value: number }>;
  };
}

const BAR_COLORS = ["#e50914", "#c60710", "#a8060c", "#890509", "#6b0407", "#4d0205"];

export default function ContentInsightsClient({ data: initialData }: ContentInsightsClientProps) {
  const {
    filters,
    setFilter,
    resetFilters,
    filteredTitles,
    openShowDetails,
    openDrillThrough,
  } = useGlobalFilter();

  const computedData = useMemo(() => {
    // 1. Release Year Trend
    const releaseByYear: Record<number, { movies: number; tvShows: number; total: number }> = {};
    for (let y = 1990; y <= 2025; y++) {
      releaseByYear[y] = { movies: 0, tvShows: 0, total: 0 };
    }
    filteredTitles.forEach(d => {
      const yr = d.release_year;
      if (yr >= 1990 && yr <= 2025) {
        releaseByYear[yr].total++;
        if (d.type === 'Movie') {
          releaseByYear[yr].movies++;
        } else {
          releaseByYear[yr].tvShows++;
        }
      }
    });
    const releaseYearTrend = Object.keys(releaseByYear)
      .map(y => {
        const yearNum = parseInt(y, 10);
        return {
          year: yearNum,
          movies: releaseByYear[yearNum].movies,
          tvShows: releaseByYear[yearNum].tvShows,
          total: releaseByYear[yearNum].total,
        };
      })
      .sort((a, b) => a.year - b.year);

    // 2. Genre Distribution
    const genreCounts: Record<string, { movies: number; tvShows: number; total: number }> = {};
    filteredTitles.forEach(d => {
      d.genresList.forEach(g => {
        if (!genreCounts[g]) {
          genreCounts[g] = { movies: 0, tvShows: 0, total: 0 };
        }
        genreCounts[g].total++;
        if (d.type === 'Movie') {
          genreCounts[g].movies++;
        } else {
          genreCounts[g].tvShows++;
        }
      });
    });
    const genreDistribution = Object.keys(genreCounts)
      .map(g => ({
        name: g,
        total: genreCounts[g].total,
        movies: genreCounts[g].movies,
        tvShows: genreCounts[g].tvShows,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);

    // 3. Duration Distribution
    const movieBuckets = {
      'Short (< 95 min)': 0,
      'Medium (95 - 110 min)': 0,
      'Standard (110 - 125 min)': 0,
      'Long (125 - 140 min)': 0,
      'Epic (> 140 min)': 0,
    };
    const tvBuckets = {
      '1 Season': 0,
      '2 Seasons': 0,
      '3 Seasons': 0,
      '4-5 Seasons': 0,
      '6+ Seasons': 0,
    };
    filteredTitles.forEach(d => {
      if (d.type === 'Movie') {
        const mins = d.durationVal;
        if (mins < 95) movieBuckets['Short (< 95 min)']++;
        else if (mins >= 95 && mins <= 110) movieBuckets['Medium (95 - 110 min)']++;
        else if (mins > 110 && mins <= 125) movieBuckets['Standard (110 - 125 min)']++;
        else if (mins > 125 && mins <= 140) movieBuckets['Long (125 - 140 min)']++;
        else movieBuckets['Epic (> 140 min)']++;
      } else {
        const seasons = d.durationVal;
        if (seasons === 1) tvBuckets['1 Season']++;
        else if (seasons === 2) tvBuckets['2 Seasons']++;
        else if (seasons === 3) tvBuckets['3 Seasons']++;
        else if (seasons >= 4 && seasons <= 5) tvBuckets['4-5 Seasons']++;
        else tvBuckets['6+ Seasons']++;
      }
    });
    const movieDurationData = Object.keys(movieBuckets).map(k => ({
      name: k,
      value: movieBuckets[k as keyof typeof movieBuckets],
    }));
    const tvDurationData = Object.keys(tvBuckets).map(k => ({
      name: k,
      value: tvBuckets[k as keyof typeof tvBuckets],
    }));

    // 4. Rating Distributions
    const imdbRatingBuckets = {
      'Under 5.0': 0, '5.0 - 6.0': 0, '6.0 - 7.0': 0, '7.0 - 8.0': 0, '8.0 - 9.0': 0, '9.0 - 10.0': 0,
    };
    const rtRatingBuckets = {
      'Under 50%': 0, '50% - 60%': 0, '60% - 70%': 0, '70% - 80%': 0, '80% - 90%': 0, '90% - 100%': 0,
    };
    const metascoreBuckets = {
      'Under 50': 0, '50 - 60': 0, '60 - 70': 0, '70 - 80': 0, '80 - 90': 0, '90 - 100': 0,
    };

    const genreAwards: Record<string, number> = {};
    const genreRatingSum: Record<string, number> = {};
    const genreRatingCount: Record<string, number> = {};
    const awardsByYearMap: Record<number, number> = {};

    const runtimeImdbSum = {
      '< 90 min': 0, '90 - 110 min': 0, '110 - 130 min': 0, '130 - 150 min': 0, '> 150 min': 0
    };
    const runtimeImdbCount = {
      '< 90 min': 0, '90 - 110 min': 0, '110 - 130 min': 0, '130 - 150 min': 0, '> 150 min': 0
    };

    const countryRatingSum: Record<string, number> = {};
    const countryRatingCount: Record<string, number> = {};

    filteredTitles.forEach(d => {
      if (d.imdb_rating > 0) {
        const rating = d.imdb_rating;
        if (rating < 5.0) imdbRatingBuckets['Under 5.0']++;
        else if (rating < 6.0) imdbRatingBuckets['5.0 - 6.0']++;
        else if (rating < 7.0) imdbRatingBuckets['6.0 - 7.0']++;
        else if (rating < 8.0) imdbRatingBuckets['7.0 - 8.0']++;
        else if (rating < 9.0) imdbRatingBuckets['8.0 - 9.0']++;
        else imdbRatingBuckets['9.0 - 10.0']++;
      }

      if (d.rotten_tomatoes_rating > 0) {
        const rt = d.rotten_tomatoes_rating;
        if (rt < 50) rtRatingBuckets['Under 50%']++;
        else if (rt < 60) rtRatingBuckets['50% - 60%']++;
        else if (rt < 70) rtRatingBuckets['60% - 70%']++;
        else if (rt < 80) rtRatingBuckets['70% - 80%']++;
        else if (rt < 90) rtRatingBuckets['80% - 90%']++;
        else rtRatingBuckets['90% - 100%']++;
      }

      if (d.metascore > 0) {
        const meta = d.metascore;
        if (meta < 50) metascoreBuckets['Under 50']++;
        else if (meta < 60) metascoreBuckets['50 - 60']++;
        else if (meta < 70) metascoreBuckets['60 - 70']++;
        else if (meta < 80) metascoreBuckets['70 - 80']++;
        else if (meta < 90) metascoreBuckets['80 - 90']++;
        else metascoreBuckets['90 - 100']++;
      }

      d.genresList.forEach(g => {
        genreAwards[g] = (genreAwards[g] || 0) + d.awardsWins;
        if (d.imdb_rating > 0) {
          genreRatingSum[g] = (genreRatingSum[g] || 0) + d.imdb_rating;
          genreRatingCount[g] = (genreRatingCount[g] || 0) + 1;
        }
      });

      const yr = d.release_year;
      if (yr >= 1990 && yr <= 2025) {
        awardsByYearMap[yr] = (awardsByYearMap[yr] || 0) + d.awardsWins;
      }

      if (d.type === 'Movie' && d.imdb_rating > 0) {
        const mins = d.durationVal;
        let bucket: keyof typeof runtimeImdbSum | null = null;
        if (mins < 90) bucket = '< 90 min';
        else if (mins <= 110) bucket = '90 - 110 min';
        else if (mins <= 130) bucket = '110 - 130 min';
        else if (mins <= 150) bucket = '130 - 150 min';
        else bucket = '> 150 min';

        if (bucket) {
          runtimeImdbSum[bucket] += d.imdb_rating;
          runtimeImdbCount[bucket]++;
        }
      }

      d.countriesList.forEach(c => {
        if (d.imdb_rating > 0) {
          countryRatingSum[c] = (countryRatingSum[c] || 0) + d.imdb_rating;
          countryRatingCount[c] = (countryRatingCount[c] || 0) + 1;
        }
      });
    });

    const imdbRatingDistribution = Object.keys(imdbRatingBuckets).map(k => ({
      name: k,
      value: imdbRatingBuckets[k as keyof typeof imdbRatingBuckets],
    }));
    const rtDistribution = Object.keys(rtRatingBuckets).map(k => ({
      name: k,
      value: rtRatingBuckets[k as keyof typeof rtRatingBuckets],
    }));
    const metascoreDistribution = Object.keys(metascoreBuckets).map(k => ({
      name: k,
      value: metascoreBuckets[k as keyof typeof metascoreBuckets],
    }));

    const awardsByGenre = Object.keys(genreAwards).map(k => ({
      name: k,
      value: genreAwards[k],
    })).sort((a, b) => b.value - a.value).slice(0, 15);

    const awardsByYear = Object.keys(awardsByYearMap).map(k => ({
      year: parseInt(k, 10),
      value: awardsByYearMap[parseInt(k, 10)],
    })).sort((a, b) => a.year - b.year);

    const runtimeVsImdb = Object.keys(runtimeImdbSum).map(k => ({
      name: k,
      value: runtimeImdbCount[k as keyof typeof runtimeImdbCount] > 0
        ? Math.round((runtimeImdbSum[k as keyof typeof runtimeImdbSum] / runtimeImdbCount[k as keyof typeof runtimeImdbCount]) * 10) / 10
        : 0,
    }));

    const genreVsImdb = Object.keys(genreRatingSum).map(k => ({
      name: k,
      value: genreRatingCount[k] > 0 ? Math.round((genreRatingSum[k] / genreRatingCount[k]) * 10) / 10 : 0,
    })).sort((a, b) => b.value - a.value).slice(0, 15);

    const countryVsImdb = Object.keys(countryRatingSum).map(k => ({
      name: k,
      value: countryRatingCount[k] > 5 ? Math.round((countryRatingSum[k] / countryRatingCount[k]) * 10) / 10 : 0,
      count: countryRatingCount[k]
    })).filter(c => c.value > 0).sort((a, b) => b.value - a.value).slice(0, 15);

    return {
      releaseYearTrend,
      genreDistribution,
      movieDurationData,
      tvDurationData,
      imdbRatingDistribution,
      rtDistribution,
      metascoreDistribution,
      awardsByGenre,
      awardsByYear,
      runtimeVsImdb,
      genreVsImdb,
      countryVsImdb,
    };
  }, [filteredTitles]);

  const {
    releaseYearTrend,
    genreDistribution,
    movieDurationData,
    tvDurationData,
    imdbRatingDistribution,
    rtDistribution,
    metascoreDistribution,
    awardsByGenre,
    awardsByYear,
    runtimeVsImdb,
    genreVsImdb,
    countryVsImdb,
  } = computedData;

  const searchParams = useSearchParams();
  const filterGenre = searchParams.get("genre") || searchParams.get("search") || "";

  // Apply filtered sub-arrays for genre-dependent charts
  const finalGenreDistribution = filterGenre
    ? genreDistribution.filter(g => g.name.toLowerCase() === filterGenre.toLowerCase())
    : genreDistribution;

  const finalAwardsByGenre = filterGenre
    ? awardsByGenre.filter(g => g.name.toLowerCase() === filterGenre.toLowerCase())
    : awardsByGenre;

  const finalGenreVsImdb = filterGenre
    ? genreVsImdb.filter(g => g.name.toLowerCase() === filterGenre.toLowerCase())
    : genreVsImdb;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip p-3 text-xs bg-black/90 border border-[#e50914]/40 rounded-lg">
          <p className="font-bold text-white mb-1">{label}</p>
          {payload.map((pld: any, idx: number) => (
            <p key={idx} className="font-light" style={{ color: pld.color || pld.fill }}>
              {pld.name}: <span className="font-bold">{pld.value.toLocaleString()}</span>
            </p>
          ))}
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
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#e50914] uppercase tracking-widest flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5" />
            Content Dashboard
          </span>
          {filterGenre && (
            <Link
              href="/content"
              className="text-[10px] px-2.5 py-1 bg-[#e50914]/20 border border-[#e50914]/40 hover:bg-[#e50914] text-white font-bold rounded uppercase transition flex items-center gap-1.5"
            >
              Filtered by Genre: {filterGenre} <X className="w-3 h-3" />
            </Link>
          )}
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight uppercase">Content Insights</h1>
        <p className="text-sm text-gray-400 font-light max-w-2xl">
          Deep-dive charts on theatrical release history, top genre preferences, and duration trends.
        </p>
      </div>

      {/* Section 1: Release Year Trends */}
      <motion.div variants={itemVariants} className="glass-card p-6">
        <div className="mb-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-[#e50914]" /> Release Year Trends
          </h3>
          <p className="text-xs text-gray-400 font-light">
            Distribution of content by original theatrical release year (1992 - 2025).
          </p>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={releaseYearTrend} 
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onClick={(state: any) => {
                if (state && state.activeLabel) {
                  setFilter("year", state.activeLabel.toString());
                }
              }}
              className="cursor-crosshair"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="year" stroke="#525252" fontSize={11} tickLine={false} />
              <YAxis stroke="#525252" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="movies"
                name="Movies"
                stroke="#e50914"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="tvShows"
                name="TV Shows"
                stroke="#808080"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Section 2: Genre Distribution */}
      <motion.div variants={itemVariants} className="glass-card p-6">
        <div className="mb-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-[#e50914]" /> Catalog Genre Analysis
          </h3>
          <p className="text-xs text-gray-400 font-light">
            Top 15 genres in the Netflix system, grouped by total content count. Shows the portion of Movies vs TV Shows in each genre.
          </p>
        </div>

        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={finalGenreDistribution}
              layout="vertical"
              margin={{ top: 5, right: 10, left: 40, bottom: 5 }}
              onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload[0]) {
                  openDrillThrough("genre", state.activePayload[0].payload.name);
                }
              }}
              className="cursor-pointer"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
              <XAxis type="number" stroke="#525252" fontSize={11} tickLine={false} />
              <YAxis dataKey="name" type="category" stroke="#525252" fontSize={11} tickLine={false} width={120} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="movies" name="Movies" stackId="a" fill="#e50914" />
              <Bar dataKey="tvShows" name="TV Shows" stackId="a" fill="#404040" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Section 3: Durations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Movie Durations */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#e50914]" /> Movie Runtime Buckets
            </h3>
            <p className="text-xs text-gray-400 font-light">
              Distribution of film lengths into standard running time ranges.
            </p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={movieDurationData} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload[0]) {
                    setFilter("runtimeBucket", state.activePayload[0].payload.name);
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="name" stroke="#525252" fontSize={10} tickLine={false} />
                <YAxis stroke="#525252" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Movies Count" radius={[4, 4, 0, 0]}>
                  {movieDurationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* TV Series Seasons */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#e50914]" /> TV Show Season Distribution
            </h3>
            <p className="text-xs text-gray-400 font-light">
              Distribution of television series by the number of active seasons in the catalog.
            </p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={tvDurationData} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload[0]) {
                    const val = state.activePayload[0].payload.name;
                    if (val === '1 Season') setFilter("seasonCount", [1, 1]);
                    else if (val === '2 Seasons') setFilter("seasonCount", [2, 2]);
                    else if (val === '3 Seasons') setFilter("seasonCount", [3, 3]);
                    else if (val === '4-5 Seasons') setFilter("seasonCount", [4, 5]);
                    else if (val === '6+ Seasons') setFilter("seasonCount", [6, 25]);
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="name" stroke="#525252" fontSize={11} tickLine={false} />
                <YAxis stroke="#525252" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Series Count" radius={[4, 4, 0, 0]}>
                  {tvDurationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Section 4: Critical Ratings Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* IMDb Rating Distribution */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-[#e50914]" /> IMDb Rating Spread
            </h3>
            <p className="text-xs text-gray-400 font-light">
              Volume of titles binned by IMDb score ranges.
            </p>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={imdbRatingDistribution} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload[0]) {
                    const val = state.activePayload[0].payload.name;
                    if (val === 'Under 5.0') setFilter("imdbRatingRange", [0, 5.0]);
                    else if (val === '5.0 - 6.0') setFilter("imdbRatingRange", [5.0, 6.0]);
                    else if (val === '6.0 - 7.0') setFilter("imdbRatingRange", [6.0, 7.0]);
                    else if (val === '7.0 - 8.0') setFilter("imdbRatingRange", [7.0, 8.0]);
                    else if (val === '8.0 - 9.0') setFilter("imdbRatingRange", [8.0, 9.0]);
                    else if (val === '9.0 - 10.0') setFilter("imdbRatingRange", [9.0, 10.0]);
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="name" stroke="#525252" fontSize={10} tickLine={false} />
                <YAxis stroke="#525252" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Titles Count" radius={[4, 4, 0, 0]}>
                  {imdbRatingDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Rotten Tomatoes Spread */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
              <Percent className="w-4 h-4 text-[#e50914]" /> RT Critics Spread
            </h3>
            <p className="text-xs text-gray-400 font-light">
              Volume of titles binned by Rotten Tomatoes percentage scores.
            </p>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={rtDistribution} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload[0]) {
                    const val = state.activePayload[0].payload.name;
                    if (val === 'Under 50%') setFilter("tmdbRatingRange", [0, 5.0]);
                    else if (val === '50% - 60%') setFilter("tmdbRatingRange", [5.0, 6.0]);
                    else if (val === '60% - 70%') setFilter("tmdbRatingRange", [6.0, 7.0]);
                    else if (val === '70% - 80%') setFilter("tmdbRatingRange", [7.0, 8.0]);
                    else if (val === '80% - 90%') setFilter("tmdbRatingRange", [8.0, 9.0]);
                    else if (val === '90% - 100%') setFilter("tmdbRatingRange", [9.0, 10.0]);
                  }
                }}
                className="cursor-crosshair"
              >
                <defs>
                  <linearGradient id="colorRt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e50914" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#e50914" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="name" stroke="#525252" fontSize={10} tickLine={false} />
                <YAxis stroke="#525252" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" name="Titles Count" stroke="#e50914" strokeWidth={2} fillOpacity={1} fill="url(#colorRt)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Metascore Spread */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
              <BarChart2 className="w-4 h-4 text-[#e50914]" /> Metascore Spread
            </h3>
            <p className="text-xs text-gray-400 font-light">
              Volume of titles binned by Metascore industry metrics.
            </p>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={metascoreDistribution} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload[0]) {
                    const val = state.activePayload[0].payload.name;
                    if (val === 'Under 50') setFilter("imdbRatingRange", [0, 5.0]);
                    else if (val === '50 - 60') setFilter("imdbRatingRange", [5.0, 6.0]);
                    else if (val === '60 - 70') setFilter("imdbRatingRange", [6.0, 7.0]);
                    else if (val === '70 - 80') setFilter("imdbRatingRange", [7.0, 8.0]);
                    else if (val === '80 - 90') setFilter("imdbRatingRange", [8.0, 9.0]);
                    else if (val === '90 - 100') setFilter("imdbRatingRange", [9.0, 10.0]);
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="name" stroke="#525252" fontSize={10} tickLine={false} />
                <YAxis stroke="#525252" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Titles Count" radius={[4, 4, 0, 0]}>
                  {metascoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Section 5: Awards Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Awards by Genre */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-[#e50914]" /> Awards volume by Genre
            </h3>
            <p className="text-xs text-gray-400 font-light">
              Total awards won by catalog content in each genre.
            </p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={finalAwardsByGenre} 
                layout="vertical" 
                margin={{ top: 5, right: 10, left: 30, bottom: 5 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload[0]) {
                    openDrillThrough("genre", state.activePayload[0].payload.name);
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                <XAxis type="number" stroke="#525252" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#525252" fontSize={10} tickLine={false} width={90} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Awards Won" fill="#e50914" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Awards by Release Year */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-[#e50914]" /> Awards won by Release Year
            </h3>
            <p className="text-xs text-gray-400 font-light">
              Analysis of awards achievements over the years (1990 - 2025).
            </p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={awardsByYear} 
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(state: any) => {
                  if (state && state.activeLabel) {
                    setFilter("year", state.activeLabel.toString());
                  }
                }}
                className="cursor-crosshair"
              >
                <defs>
                  <linearGradient id="colorAwardsYear" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e50914" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#e50914" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="year" stroke="#525252" fontSize={11} tickLine={false} />
                <YAxis stroke="#525252" fontSize={11} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" name="Awards Won" stroke="#e50914" strokeWidth={2} fillOpacity={1} fill="url(#colorAwardsYear)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Section 6: Critical Correlations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Runtime vs IMDb */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#e50914]" /> Runtime vs Avg IMDb Rating
            </h3>
            <p className="text-xs text-gray-400 font-light">
              Correlation between running time ranges and average viewer scores (Movies).
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={runtimeVsImdb} 
                margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload[0]) {
                    setFilter("runtimeBucket", state.activePayload[0].payload.name);
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="name" stroke="#525252" fontSize={9} tickLine={false} />
                <YAxis stroke="#525252" fontSize={11} domain={[0, 10]} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Avg Rating" fill="#e50914" radius={[4, 4, 0, 0]}>
                  {runtimeVsImdb.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Genre vs IMDb */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-[#e50914]" /> Genre vs Avg IMDb Rating
            </h3>
            <p className="text-xs text-gray-400 font-light">
              Top 12 rated genres by average IMDb score.
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={finalGenreVsImdb} 
                layout="vertical" 
                margin={{ top: 5, right: 10, left: 30, bottom: 5 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload[0]) {
                    openDrillThrough("genre", state.activePayload[0].payload.name);
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                <XAxis type="number" stroke="#525252" fontSize={11} domain={[0, 10]} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#525252" fontSize={10} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Avg Rating" fill="#404040" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Country vs IMDb */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
              <Globe2 className="w-4 h-4 text-[#e50914]" /> Country vs Avg IMDb Rating
            </h3>
            <p className="text-xs text-gray-400 font-light">
              Top 12 rated countries by average IMDb score.
            </p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={countryVsImdb} 
                margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload[0]) {
                    openDrillThrough("country", state.activePayload[0].payload.name);
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="name" stroke="#525252" fontSize={9} tickLine={false} />
                <YAxis stroke="#525252" fontSize={11} domain={[0, 10]} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Avg Rating" fill="#e50914" radius={[4, 4, 0, 0]}>
                  {countryVsImdb.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
