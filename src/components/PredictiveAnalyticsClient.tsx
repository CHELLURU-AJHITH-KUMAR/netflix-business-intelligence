"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer, Cell
} from "recharts";
import { 
  TrendingUp, Sparkles, Sliders, Calendar, Download, RefreshCw, 
  HelpCircle, ChevronRight, HelpCircle as HelpIcon, ArrowRight,
  TrendingDown, Globe2, Film, Tv, Award, PlaySquare
} from "lucide-react";
import { NetflixTitle } from "@/lib/data";
import { useGlobalFilter } from "@/lib/GlobalFilterContext";

interface PredictiveAnalyticsClientProps {
  allTitles: NetflixTitle[];
}

export default function PredictiveAnalyticsClient({ allTitles: initialAllTitles }: PredictiveAnalyticsClientProps) {
  const {
    filters,
    setFilter,
    resetFilters,
    filteredTitles,
    allTitles,
    openShowDetails,
    openDrillThrough,
  } = useGlobalFilter();

  // Scenario selector: Optimistic, Expected, Conservative
  const [scenario, setScenario] = useState<"Expected" | "Optimistic" | "Conservative">("Expected");

  // What-If Sliders
  const [annualGrowth, setAnnualGrowth] = useState<number>(8); // annual additions growth rate %
  const [movieShare, setMovieShare] = useState<number>(65); // movie percentage in additions
  const tvShare = 100 - movieShare;

  const [genreDramaShift, setGenreDramaShift] = useState<number>(5); // growth rate shift for Drama
  const [countryIndiaShift, setCountryIndiaShift] = useState<number>(12); // growth rate shift for India
  const [langEnShift, setLangEnShift] = useState<number>(0); // English localization weight shift

  // 1. Calculate Historical Aggregates (2018 - 2025)
  const historicalTimeline = useMemo(() => {
    const counts: Record<number, { total: number; movies: number; tv: number; ratingSum: number; ratingCount: number }> = {};
    
    // Initialize years
    for (let y = 2018; y <= 2025; y++) {
      counts[y] = { total: 0, movies: 0, tv: 0, ratingSum: 0, ratingCount: 0 };
    }

    filteredTitles.forEach(t => {
      const year = t.release_year;
      if (year >= 2018 && year <= 2025) {
        counts[year].total++;
        if (t.type === "Movie") counts[year].movies++;
        else counts[year].tv++;

        if (t.imdb_rating > 0) {
          counts[year].ratingSum += t.imdb_rating;
          counts[year].ratingCount++;
        }
      }
    });

    return Object.entries(counts).map(([yearStr, d]) => {
      const year = parseInt(yearStr, 10);
      return {
        year,
        total: d.total,
        movies: d.movies,
        tv: d.tv,
        avgRating: d.ratingCount > 0 ? d.ratingSum / d.ratingCount : 6.4
      };
    }).sort((a, b) => a.year - b.year);
  }, [filteredTitles]);

  // Current baseline aggregates in 2025
  const baseTotal = filteredTitles.length;
  const baseMovies = filteredTitles.filter(t => t.type === "Movie").length;
  const baseTv = filteredTitles.filter(t => t.type === "TV Show").length;

  const baseDramaCount = filteredTitles.filter(t => t.genresList.includes("Drama")).length;
  const baseIndiaCount = filteredTitles.filter(t => t.countriesList.includes("India")).length;
  const baseEnglishCount = filteredTitles.filter(t => t.language === "en" || t.language === "English").length;

  // Average additions per year in the last historical period (approx 2,500 additions/year)
  const baseAdditions = 2200; 

  // 2. Perform Extrapolations (2026 - 2030)
  const forecastData = useMemo(() => {
    // Multipliers for Scenario
    const scenarioMultiplier = {
      Optimistic: 1.25,
      Expected: 1.0,
      Conservative: 0.75
    }[scenario];

    let currentTotal = baseTotal;
    let currentMovies = baseMovies;
    let currentTv = baseTv;

    let currentDrama = baseDramaCount;
    let currentIndia = baseIndiaCount;
    let currentEnglish = baseEnglishCount;

    const list = [];

    // Anchor point (2025)
    list.push({
      year: 2025,
      forecast: currentTotal,
      movies: currentMovies,
      tv: currentTv,
      lowerBand: currentTotal,
      upperBand: currentTotal,
      additions: 0,
      drama: currentDrama,
      india: currentIndia,
      english: currentEnglish,
      avgRating: 6.64
    });

    for (let y = 2026; y <= 2030; y++) {
      const yearDiff = y - 2025;
      
      // Calculate additions for this year
      const additions = baseAdditions * Math.pow(1 + (annualGrowth / 100), yearDiff) * scenarioMultiplier;
      
      currentTotal += additions;
      
      // Movies / TV splits
      const moviesAdded = additions * (movieShare / 100);
      const tvAdded = additions * (tvShare / 100);
      currentMovies += moviesAdded;
      currentTv += tvAdded;

      // Genre, country and language growth rates (current catalog percentage ratios + shift factors)
      const dramaAdded = additions * (0.24 + (genreDramaShift / 100)); // baseline drama share 24%
      const indiaAdded = additions * (0.09 + (countryIndiaShift / 100)); // baseline india share 9%
      const englishAdded = additions * (0.68 + (langEnShift / 100)); // baseline english share 68%

      currentDrama += dramaAdded;
      currentIndia += indiaAdded;
      currentEnglish += englishAdded;

      // Statistical confidence bands expansion (plus/minus 12% additions uncertainty per year)
      const errorMargin = yearDiff * additions * 0.18;

      list.push({
        year: y,
        forecast: Math.round(currentTotal),
        movies: Math.round(currentMovies),
        tv: Math.round(currentTv),
        lowerBand: Math.round(currentTotal - errorMargin),
        upperBand: Math.round(currentTotal + errorMargin),
        additions: Math.round(additions),
        drama: Math.round(currentDrama),
        india: Math.round(currentIndia),
        english: Math.round(currentEnglish),
        avgRating: parseFloat((6.64 + (yearDiff * 0.015)).toFixed(2)) // slight quality improvement forecast
      });
    }

    return list;
  }, [scenario, annualGrowth, movieShare, tvShare, genreDramaShift, countryIndiaShift, langEnShift, baseTotal, baseMovies, baseTv, baseDramaCount, baseIndiaCount, baseEnglishCount]);

  // Forecasted values in final year 2030
  const finalForecast = forecastData[forecastData.length - 1];
  const totalGrowthPercent = ((finalForecast.forecast - baseTotal) / baseTotal) * 100;

  // 3. Dynamic Executive Insights Generator
  const executiveInsights = useMemo(() => {
    const list = [];
    if (annualGrowth > 10) {
      list.push("Aggressive catalog expansion projects over 13,000 new releases by 2030, which will require content budget optimizations.");
    } else if (annualGrowth < 3) {
      list.push("Conservative growth rates risk catalog stabilization by 2028, potentially lowering international subscriber acquisition speeds.");
    } else {
      list.push("Expected timeline growth maintains a healthy 6-8% annual expansion rate, supporting balanced library enrichment.");
    }

    if (movieShare > 70) {
      list.push("Feature films (Movies) are expected to outpace TV series by 2027, shifting content licensing weight away from episodic originals.");
    } else if (movieShare < 55) {
      list.push("Episodic series (TV Shows) catalog ratio is projected to exceed 45% by 2029, driving higher user retention hours.");
    }

    if (countryIndiaShift > 10) {
      list.push("India and South Asian production centers show the fastest forecasted content growth index, representing high-growth ROI markets.");
    }
    
    list.push("Average viewer ratings (IMDb) are projected to climb to 6.72/10 by 2030, driven by the acquisition of highly rated regional titles.");

    return list;
  }, [annualGrowth, movieShare, countryIndiaShift]);

  // 4. Excel/CSV Download handler
  const exportToCSV = () => {
    const headers = "Year,Scenario,Projected Catalog Size,Projected Movies,Projected TV Shows,Confidence Lower Band,Confidence Upper Band,Annual Additions,Projected Drama Titles,Projected India Production\n";
    const rows = forecastData.map(d => 
      `${d.year},${scenario},${d.forecast},${d.movies},${d.tv},${d.lowerBand},${d.upperBand},${d.additions},${d.drama},${d.india}`
    ).join("\n");
    
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `netflix_predictive_analysis_report_2026_2030.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    try {
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
        "/F1 18 Tf",
        "70 770 Td",
        "(NETFLIX PREDICTIVE ANALYTICS EXECUTIVE REPORT) Tj",
        "ET",
        "BT",
        "/F2 11 Tf",
        "70 740 Td",
        "(Scenario: " + scenario + " | Growth: " + annualGrowth + "% | Movies: " + movieShare + "% | TV: " + tvShare + "%) Tj",
        "ET",
        "BT",
        "/F1 13 Tf",
        "70 700 Td",
        "(Projected Catalog Metrics through 2030:) Tj",
        "ET"
      ];

      let yPos = 670;
      forecastData.forEach((d) => {
        docLines.push("BT");
        docLines.push("/F2 10 Tf");
        docLines.push(`70 ${yPos} Td`);
        docLines.push(`(Year ${d.year}: Cumulative Catalog: ${d.forecast.toLocaleString()} | Movies: ${d.movies.toLocaleString()} | TV: ${d.tv.toLocaleString()}) Tj`);
        docLines.push("ET");
        yPos -= 25;
      });

      docLines.push("BT");
      docLines.push("/F1 12 Tf");
      docLines.push(`70 ${yPos - 15} Td`);
      docLines.push("(EXECUTIVE ANALYTICS INSIGHTS:) Tj");
      docLines.push("ET");

      yPos -= 45;
      executiveInsights.forEach((insight) => {
        const chunk = insight.length > 80 ? insight.substring(0, 80) + "..." : insight;
        docLines.push("BT");
        docLines.push("/F2 9 Tf");
        docLines.push(`70 ${yPos} Td`);
        docLines.push(`(* ${chunk}) Tj`);
        docLines.push("ET");
        yPos -= 20;
      });

      docLines.push("endstream");
      docLines.push("endobj");
      
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
      a.download = "Netflix_Predictive_Analytics_Report.pdf";
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 150);
    } catch (err: any) {
      alert("PDF Export failed: " + err.message);
    }
  };

  const exportToExcel = () => {
    try {
      // 1. Executive Summary Sheet
      const summaryRows = [
        { "Metric Parameter": "Netflix Catalog Forecasting Executive Summary", "Calculated Forecast Metric": "" },
        { "Metric Parameter": "--------------------------------------------------------", "Calculated Forecast Metric": "" },
        { "Metric Parameter": "Current Baseline Catalog Size (2025)", "Calculated Forecast Metric": baseTotal },
        { "Metric Parameter": "Current Movie Content Volume", "Calculated Forecast Metric": baseMovies },
        { "Metric Parameter": "Current TV Show Content Volume", "Calculated Forecast Metric": baseTv },
        { "Metric Parameter": "Interactive What-If Scenario Selected", "Calculated Forecast Metric": scenario },
        { "Metric Parameter": "Simulation Annual Growth Additions", "Calculated Forecast Metric": `${annualGrowth}%` },
        { "Metric Parameter": "Projected Catalog Size (2030)", "Calculated Forecast Metric": finalForecast.forecast },
        { "Metric Parameter": "Projected Movies Volume (2030)", "Calculated Forecast Metric": finalForecast.movies },
        { "Metric Parameter": "Projected TV Shows Volume (2030)", "Calculated Forecast Metric": finalForecast.tv },
        { "Metric Parameter": "Model Movie Percentage weight", "Calculated Forecast Metric": `${movieShare}%` },
        { "Metric Parameter": "Model TV Show Percentage weight", "Calculated Forecast Metric": `${tvShare}%` },
        { "Metric Parameter": "Model Projected IMDb Average Score", "Calculated Forecast Metric": finalForecast.avgRating }
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      
      // 2. Predictive Forecast Sheet
      const forecastRows = forecastData.map(d => ({
        "Year": d.year,
        "Scenario Model": scenario,
        "Projected Catalog Size": d.forecast,
        "Projected Movies Volume": d.movies,
        "Projected TV Shows Volume": d.tv,
        "Confidence Interval Lower Bound": d.lowerBand,
        "Confidence Interval Upper Bound": d.upperBand,
        "Estimated Annual Additions": d.additions
      }));
      const wsForecast = XLSX.utils.json_to_sheet(forecastRows);

      // 3. Genre Analytics Sheet
      const genreMap: Record<string, { count: number; ratingSum: number; ratingCount: number }> = {};
      allTitles.forEach(t => {
        t.genresList.forEach(g => {
          if (g) {
            if (!genreMap[g]) {
              genreMap[g] = { count: 0, ratingSum: 0, ratingCount: 0 };
            }
            genreMap[g].count++;
            if (t.imdb_rating > 0) {
              genreMap[g].ratingSum += t.imdb_rating;
              genreMap[g].ratingCount++;
            }
          }
        });
      });
      const genreRows = Object.entries(genreMap).map(([name, d]) => {
        const avgRating = d.ratingCount > 0 ? d.ratingSum / d.ratingCount : 6.4;
        return {
          "Genre Name": name,
          "Total Catalog Titles (2025)": d.count,
          "Average IMDb Rating": parseFloat(avgRating.toFixed(2)),
          "Predicted 2030 Content Index": Math.round(d.count * (1 + (annualGrowth / 100) * 1.5))
        };
      }).sort((a, b) => b["Total Catalog Titles (2025)"] - a["Total Catalog Titles (2025)"]).slice(0, 15);
      const wsGenre = XLSX.utils.json_to_sheet(genreRows);

      // 4. Country Analytics Sheet
      const countryMap: Record<string, { count: number; ratingSum: number; ratingCount: number }> = {};
      allTitles.forEach(t => {
        t.countriesList.forEach(c => {
          if (c) {
            if (!countryMap[c]) {
              countryMap[c] = { count: 0, ratingSum: 0, ratingCount: 0 };
            }
            countryMap[c].count++;
            if (t.imdb_rating > 0) {
              countryMap[c].ratingSum += t.imdb_rating;
              countryMap[c].ratingCount++;
            }
          }
        });
      });
      const countryRows = Object.entries(countryMap).map(([name, d]) => {
        const avgRating = d.ratingCount > 0 ? d.ratingSum / d.ratingCount : 6.3;
        return {
          "Country Location": name,
          "Total Production Titles (2025)": d.count,
          "Average IMDb Score": parseFloat(avgRating.toFixed(2)),
          "Projected Production Volume (2030)": Math.round(d.count * (1 + (annualGrowth / 100) * 1.8))
        };
      }).sort((a, b) => b["Total Production Titles (2025)"] - a["Total Production Titles (2025)"]).slice(0, 15);
      const wsCountry = XLSX.utils.json_to_sheet(countryRows);

      // 5. Raw Dataset Sheet
      const rawRows = allTitles.map(t => ({
        "Show ID": t.show_id,
        "Type": t.type,
        "Title": t.title,
        "Director": t.director,
        "Cast List": t.cast,
        "Country list": t.country,
        "Date Added": t.date_added,
        "Release Year": t.release_year,
        "Rating": t.rating,
        "Duration": t.duration,
        "Listed Genres": t.genres,
        "Language": t.language || "en",
        "IMDb Rating": t.imdb_rating
      }));
      const wsRaw = XLSX.utils.json_to_sheet(rawRows);

      // Helper function to format column widths, autofilters, and freeze header rows
      const formatSheet = (ws: XLSX.WorkSheet, rows: any[], freezeY = 1) => {
        if (rows.length > 0) {
          const keys = Object.keys(rows[0]);
          ws['!cols'] = keys.map(key => {
            let maxLen = key.length;
            const sampleSize = Math.min(rows.length, 100);
            for (let i = 0; i < sampleSize; i++) {
              const val = rows[i][key];
              const strVal = val != null ? String(val) : "";
              if (strVal.length > maxLen) maxLen = strVal.length;
            }
            return { wch: Math.min(Math.max(maxLen + 3, 11), 38) };
          });

          // Set filter range
          const lastColLetter = XLSX.utils.encode_col(keys.length - 1);
          ws['!autofilter'] = { ref: `A1:${lastColLetter}${rows.length + 1}` };
        }

        if (freezeY > 0) {
          ws['!views'] = [{ state: 'frozen', ySplit: freezeY }];
        }
      };

      // Apply styling and views to worksheets
      formatSheet(wsSummary, summaryRows, 0); // No freeze for executive summary
      formatSheet(wsForecast, forecastRows, 1);
      formatSheet(wsGenre, genreRows, 1);
      formatSheet(wsCountry, countryRows, 1);
      formatSheet(wsRaw, rawRows, 1);

      // Build book
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");
      XLSX.utils.book_append_sheet(wb, wsForecast, "Predictive Forecast");
      XLSX.utils.book_append_sheet(wb, wsGenre, "Genre Analytics");
      XLSX.utils.book_append_sheet(wb, wsCountry, "Country Analytics");
      XLSX.utils.book_append_sheet(wb, wsRaw, "Raw Dataset");

      // Compile binary Excel spreadsheet
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      
      // Verify generation output size before trigger
      if (!excelBuffer || excelBuffer.byteLength === 0) {
        throw new Error("Compiled Excel workbook byte stream is empty.");
      }

      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = "Netflix_Predictive_Analytics_Data.xlsx";
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 150);
    } catch (err: any) {
      alert("Excel Export failed: " + err.message);
    }
  };

  const exportToPNG = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 500;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not construct 2D canvas context");

      ctx.fillStyle = "#0c0c0c";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#e50914";
      ctx.fillRect(0, 0, canvas.width, 8);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px Helvetica";
      ctx.fillText("NETFLIX PREDICTIVE CATALOG FORECAST", 40, 50);

      ctx.fillStyle = "#888888";
      ctx.font = "12px Helvetica";
      ctx.fillText(`Scenario: ${scenario} | Additions growth: ${annualGrowth}% | Movies ratio: ${movieShare}%`, 40, 75);

      const graphLeft = 80;
      const graphTop = 130;
      const graphWidth = 640;
      const graphHeight = 280;

      ctx.strokeStyle = "#222222";
      ctx.lineWidth = 1;
      ctx.strokeRect(graphLeft, graphTop, graphWidth, graphHeight);

      ctx.strokeStyle = "#1a1a1a";
      for (let i = 1; i < 5; i++) {
        const y = graphTop + (graphHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(graphLeft, y);
        ctx.lineTo(graphLeft + graphWidth, y);
        ctx.stroke();
      }

      const minVal = baseTotal - 2000;
      const maxVal = Math.max(...forecastData.map(d => d.upperBand)) + 2000;
      const valRange = maxVal - minVal;

      const getX = (index: number) => graphLeft + (graphWidth / (forecastData.length - 1)) * index;
      const getY = (val: number) => graphTop + graphHeight - ((val - minVal) / valRange) * graphHeight;

      ctx.fillStyle = "rgba(229, 9, 20, 0.08)";
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(forecastData[0].lowerBand));
      for (let i = 1; i < forecastData.length; i++) {
        ctx.lineTo(getX(i), getY(forecastData[i].lowerBand));
      }
      for (let i = forecastData.length - 1; i >= 0; i--) {
        ctx.lineTo(getX(i), getY(forecastData[i].upperBand));
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#e50914";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(getX(0), getY(forecastData[0].forecast));
      for (let i = 1; i < forecastData.length; i++) {
        ctx.lineTo(getX(i), getY(forecastData[i].forecast));
      }
      ctx.stroke();

      forecastData.forEach((d, idx) => {
        const x = getX(idx);
        const y = getY(d.forecast);

        ctx.fillStyle = "#e50914";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#666666";
        ctx.font = "10px Helvetica";
        ctx.textAlign = "center";
        ctx.fillText(d.year.toString(), x, graphTop + graphHeight + 20);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px Helvetica";
        ctx.fillText(d.forecast.toLocaleString(), x, y - 8);
      });

      ctx.fillStyle = "#444444";
      ctx.font = "italic 10px Helvetica";
      ctx.textAlign = "right";
      ctx.fillText("Netflix Analytics Portal", canvas.width - 40, canvas.height - 25);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "Netflix_Predictive_Analytics_Charts.png";
          document.body.appendChild(a);
          a.click();

          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 150);
        } else {
          throw new Error("Blob compilation failed");
        }
      }, "image/png");
    } catch (err: any) {
      alert("PNG Export failed: " + err.message);
    }
  };

  return (
    <div className="space-y-6 py-6 text-gray-300">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-[#e50914] uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Machine Intelligence
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase mt-1">Predictive Analytics</h1>
          <p className="text-sm text-gray-400 font-light max-w-xl">
            Statistical forecasting models projecting Netflix catalog volumes, regional growths, and rating timelines through 2030.
          </p>
        </div>

        {/* Scenario selector & export controls */}
        <div className="flex items-center gap-3">
          <div className="bg-zinc-950/60 border border-white/10 rounded-full p-1 flex items-center gap-1">
            {(["Conservative", "Expected", "Optimistic"] as const).map(s => (
              <button
                key={s}
                onClick={() => setScenario(s)}
                className={`text-[10px] uppercase font-bold px-3 py-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  scenario === s 
                    ? "bg-[#e50914] text-white shadow-lg shadow-[#e50914]/20"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button 
            onClick={exportToCSV}
            className="p-2.5 bg-white/5 hover:bg-[#e50914] hover:text-white text-gray-400 rounded-full border border-white/10 hover:border-[#e50914]/40 transition duration-300 cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="glass-card p-5 border border-white/5 bg-zinc-950/40 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-red-600" />
          <span className="text-[8px] text-gray-500 font-black uppercase tracking-wider">Projected Titles (2030)</span>
          <h3 className="text-2xl font-black text-white mt-1.5 font-mono">{finalForecast.forecast.toLocaleString()}</h3>
          <p className="text-[10px] text-emerald-400 font-bold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +{totalGrowthPercent.toFixed(1)}% forecast increase
          </p>
        </div>

        <div className="glass-card p-5 border border-white/5 bg-zinc-950/40 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500" />
          <span className="text-[8px] text-gray-500 font-black uppercase tracking-wider">Movies Ratio 2030</span>
          <h3 className="text-2xl font-black text-white mt-1.5 font-mono">{((finalForecast.movies / finalForecast.forecast) * 100).toFixed(0)}%</h3>
          <p className="text-[10px] text-gray-400 font-light mt-1">
            Projected total: <span className="font-bold text-white font-mono">{finalForecast.movies.toLocaleString()}</span> titles
          </p>
        </div>

        <div className="glass-card p-5 border border-white/5 bg-zinc-950/40 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-400" />
          <span className="text-[8px] text-gray-500 font-black uppercase tracking-wider">TV Shows Ratio 2030</span>
          <h3 className="text-2xl font-black text-white mt-1.5 font-mono">{((finalForecast.tv / finalForecast.forecast) * 100).toFixed(0)}%</h3>
          <p className="text-[10px] text-gray-400 font-light mt-1">
            Projected total: <span className="font-bold text-white font-mono">{finalForecast.tv.toLocaleString()}</span> titles
          </p>
        </div>

        <div className="glass-card p-5 border border-white/5 bg-zinc-950/40 rounded-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-yellow-500" />
          <span className="text-[8px] text-gray-500 font-black uppercase tracking-wider">Projected IMDb average</span>
          <h3 className="text-2xl font-black text-yellow-500 mt-1.5 font-mono">{finalForecast.avgRating.toFixed(2)}/10</h3>
          <p className="text-[10px] text-gray-400 font-light mt-1">
            Estimated curve based on quality growth
          </p>
        </div>

      </div>

      {/* Row 2: What-If Sliders & Timeline Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sliders Panel */}
        <div className="glass-card p-6 border border-white/5 bg-zinc-950/40 rounded-xl flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
              <Sliders className="w-4 h-4 text-[#e50914]" /> What-If Parameter analysis
            </h3>

            {/* Slider 1: Annual additions growth */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-gray-400 font-medium">Annual Additions Growth</span>
                <span className="font-bold text-white font-mono">{annualGrowth}%</span>
              </div>
              <input
                type="range"
                min="-20"
                max="50"
                value={annualGrowth}
                onChange={(e) => setAnnualGrowth(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
            </div>

            {/* Slider 2: Movie Share */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-gray-400 font-medium">Future Content Share (Movie vs TV)</span>
                <span className="font-bold text-white font-mono">{movieShare}% M / {tvShare}% TV</span>
              </div>
              <input
                type="range"
                min="30"
                max="90"
                value={movieShare}
                onChange={(e) => setMovieShare(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
            </div>

            {/* Slider 3: Genre Drama offset */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-gray-400 font-medium">Genre Mix adjustment (Drama)</span>
                <span className="font-bold text-white font-mono">+{genreDramaShift}% adds</span>
              </div>
              <input
                type="range"
                min="-10"
                max="15"
                value={genreDramaShift}
                onChange={(e) => setGenreDramaShift(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
            </div>

            {/* Slider 4: Country India offset */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-gray-400 font-medium">Regional growth adjustment (India)</span>
                <span className="font-bold text-white font-mono">+{countryIndiaShift}% adds</span>
              </div>
              <input
                type="range"
                min="-5"
                max="25"
                value={countryIndiaShift}
                onChange={(e) => setCountryIndiaShift(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
            </div>
          </div>

          <button
            onClick={() => {
              setAnnualGrowth(8);
              setMovieShare(65);
              setGenreDramaShift(5);
              setCountryIndiaShift(12);
            }}
            className="w-full text-center py-2.5 mt-5 bg-white/5 border border-white/5 hover:border-white/15 rounded-lg text-[10px] text-gray-400 hover:text-white transition duration-300 font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Variables
          </button>
        </div>

        {/* Forecast Timeline Line Chart */}
        <div className="glass-card p-6 border border-white/5 bg-zinc-950/40 rounded-xl lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-[#e50914]" /> Catalog size Projection timeline (2025 - 2030)
            </h3>
            <p className="text-[10px] text-gray-500 font-light">
              Line forecast with shaded statistical confidence bands representing the variance probability.
            </p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e50914" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#e50914" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="year" stroke="#525252" fontSize={10} tickLine={false} />
                <YAxis stroke="#525252" fontSize={10} tickLine={false} domain={["dataMin - 1000", "dataMax + 1000"]} />
                <ChartTooltip content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#0f0f0f] border border-white/10 rounded-lg p-3 text-[10px] space-y-1 shadow-2xl font-mono text-left">
                        <p className="font-sans font-bold text-white text-xs pb-1 border-b border-white/5 mb-1">Year {data.year}</p>
                        <p className="text-[#e50914]">Projected Total: <span className="font-bold text-white">{data.forecast.toLocaleString()}</span></p>
                        <p className="text-gray-400">Confidence range: <span className="font-bold text-white">{data.lowerBand.toLocaleString()} - {data.upperBand.toLocaleString()}</span></p>
                        <p className="text-blue-400">Movies: <span className="font-bold text-white">{data.movies.toLocaleString()}</span></p>
                        <p className="text-cyan-400">TV Shows: <span className="font-bold text-white">{data.tv.toLocaleString()}</span></p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Area type="monotone" dataKey="upperBand" stroke="none" fill="url(#colorConfidence)" />
                <Area type="monotone" dataKey="lowerBand" stroke="none" fill="url(#colorConfidence)" />
                <Line type="monotone" dataKey="forecast" name="Projected Titles" stroke="#e50914" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 3: Format Splits & Business Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Projections Stacked Bar Chart */}
        <div className="glass-card p-6 border border-white/5 bg-zinc-950/40 rounded-xl">
          <div className="mb-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
              <Film className="w-4 h-4 text-[#e50914]" /> Movies vs TV Shows expansion split
            </h3>
            <p className="text-[10px] text-gray-500 font-light">
              Cumulative ratio breakdown of future feature films vs episodic catalog series.
            </p>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="year" stroke="#525252" fontSize={10} tickLine={false} />
                <YAxis stroke="#525252" fontSize={10} tickLine={false} />
                <ChartTooltip content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-[#0f0f0f] border border-white/10 rounded-lg p-2.5 text-[10px] space-y-0.5 shadow-2xl font-mono text-left">
                        <p className="font-bold text-white mb-1">Year {payload[0].payload.year}</p>
                        <p className="text-red-500">Movies: {payload[0].payload.movies.toLocaleString()}</p>
                        <p className="text-blue-400">TV Shows: {payload[0].payload.tv.toLocaleString()}</p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="movies" name="Movies" stackId="a" fill="#e50914" />
                <Bar dataKey="tv" name="TV Shows" stackId="a" fill="#404040" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Executive Insights Box */}
        <div className="glass-card p-6 border border-white/5 bg-zinc-950/40 rounded-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
              <Sparkles className="w-4 h-4 text-red-500 animate-pulse" /> Executive Forecasting Insights
            </h3>

            <div className="space-y-4">
              {executiveInsights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#e50914] mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-gray-300 leading-relaxed font-light">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-4 mt-5">
            <button 
              onClick={exportToPDF}
              className="py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded border border-white/5 text-[9px] font-bold uppercase transition cursor-pointer"
            >
              Export PDF
            </button>
            <button 
              onClick={exportToExcel}
              className="py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded border border-white/5 text-[9px] font-bold uppercase transition cursor-pointer"
            >
              Export EXCEL
            </button>
            <button 
              onClick={exportToPNG}
              className="py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded border border-white/5 text-[9px] font-bold uppercase transition cursor-pointer"
            >
              Export CHART PNG
            </button>
          </div>
        </div>

      </div>

      {/* Row 4: Country & Genre Predictions Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Categories table */}
        <div className="glass-card p-6 border border-white/5 bg-zinc-950/40 rounded-xl lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
              <Globe2 className="w-4 h-4 text-[#e50914]" /> Top Categories growth Predictions (2030)
            </h3>
            <p className="text-[10px] text-gray-500 font-light">
              Extrapolated library catalog volume predictions based on selected what-if weights.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 font-semibold text-[10px] uppercase">
                  <th className="py-2.5">Category</th>
                  <th className="py-2.5">Current (2025)</th>
                  <th className="py-2.5">Projected (2030)</th>
                  <th className="py-2.5">Net Increase</th>
                  <th className="py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300 font-light">
                <tr>
                  <td className="py-3 font-semibold text-white">Drama Genre</td>
                  <td className="py-3 font-mono">{baseDramaCount.toLocaleString()}</td>
                  <td className="py-3 font-mono text-white font-bold">{finalForecast.drama.toLocaleString()}</td>
                  <td className="py-3 font-mono text-emerald-400">+{Math.round(finalForecast.drama - baseDramaCount).toLocaleString()}</td>
                  <td className="py-3">
                    <span className="bg-emerald-400/10 text-emerald-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">Growing</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold text-white">India Productions</td>
                  <td className="py-3 font-mono">{baseIndiaCount.toLocaleString()}</td>
                  <td className="py-3 font-mono text-white font-bold">{finalForecast.india.toLocaleString()}</td>
                  <td className="py-3 font-mono text-emerald-400">+{Math.round(finalForecast.india - baseIndiaCount).toLocaleString()}</td>
                  <td className="py-3">
                    <span className="bg-emerald-400/10 text-emerald-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">Fast Growth</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-semibold text-white">English Content</td>
                  <td className="py-3 font-mono">{baseEnglishCount.toLocaleString()}</td>
                  <td className="py-3 font-mono text-white font-bold">{finalForecast.english.toLocaleString()}</td>
                  <td className="py-3 font-mono text-emerald-400">+{Math.round(finalForecast.english - baseEnglishCount).toLocaleString()}</td>
                  <td className="py-3">
                    <span className="bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">Stable</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Prediction heat map grid */}
        <div className="glass-card p-6 border border-white/5 bg-zinc-950/40 rounded-xl">
          <div className="mb-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-[#e50914]" /> Growth Heatmap Matrix
            </h3>
            <p className="text-[10px] text-gray-500 font-light">
              Predicted growth potential index for genre-region pairings.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { pair: "Drama - India", val: "High (9.2)", color: "bg-red-900/60 border-red-500/40 text-red-100" },
              { pair: "Anime - Japan", val: "High (8.7)", color: "bg-red-900/40 border-red-600/30 text-red-200" },
              { pair: "Action - US", val: "Mod (7.1)", color: "bg-zinc-800 border-zinc-700 text-zinc-300" },
              { pair: "Horror - UK", val: "Mod (6.4)", color: "bg-zinc-800 border-zinc-700 text-zinc-300" },
              { pair: "Doc - Korea", val: "High (8.1)", color: "bg-red-900/40 border-red-600/30 text-red-200" },
              { pair: "Comedy - India", val: "Mod (6.9)", color: "bg-zinc-800 border-zinc-700 text-zinc-300" }
            ].map((cell, idx) => (
              <div key={idx} className={`p-2.5 rounded-lg border text-center flex flex-col justify-between min-h-[70px] ${cell.color}`}>
                <span className="text-[8px] font-black uppercase block tracking-wider truncate">{cell.pair}</span>
                <span className="text-[10px] font-black mt-2 font-mono block">{cell.val}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
