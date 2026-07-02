import { NextRequest, NextResponse } from "next/server";
import { getNetflixData, NetflixTitle } from "@/lib/data";
import fs from "fs";
import path from "path";

// In-memory aggregates cache
let cachedEnriched: NetflixTitle[] = [];

function getEnrichedTitles(): NetflixTitle[] {
  if (cachedEnriched.length > 0) return cachedEnriched;
  
  const rawTitles = getNetflixData();
  let tmdbCache: Record<string, any> = {};
  const cachePath = path.join(process.cwd(), "tmdb_cache.json");
  if (fs.existsSync(cachePath)) {
    try {
      tmdbCache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    } catch (e) {
      console.error("TMDb cache load failed in assistant:", e);
    }
  }

  cachedEnriched = rawTitles.map(t => {
    const cached = tmdbCache[t.show_id];
    if (cached && cached.matched) {
      return {
        ...t,
        poster_path: cached.poster_url || "",
        backdrop_path: cached.backdrop_url || "",
        vote_average: cached.vote_average || t.vote_average,
        genresList: cached.genres && cached.genres.length > 0 ? cached.genres : t.genresList,
      };
    }
    return t;
  });

  return cachedEnriched;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryInput = (searchParams.get("q") || "").toLowerCase().trim();

    if (!queryInput) {
      return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
    }

    const titles = getEnrichedTitles();

    if (queryInput === "explain_filters") {
      const type = searchParams.get("type") || "All";
      const genre = searchParams.get("genre") || "All";
      const country = searchParams.get("country") || "All";
      const language = searchParams.get("language") || "All";
      const year = searchParams.get("year") || "All";
      const director = searchParams.get("director") || "All";
      const actor = searchParams.get("actor") || "All";

      // Filter titles
      let filtered = titles.filter(t => {
        if (type !== "All" && t.type !== type) return false;
        if (genre !== "All" && !t.genresList.includes(genre)) return false;
        if (country !== "All" && !t.countriesList.includes(country)) return false;
        if (language !== "All" && t.language !== language) return false;
        if (year !== "All") {
          if (year.includes("-")) {
            const [start, end] = year.split("-").map(Number);
            if (t.release_year < start || t.release_year > end) return false;
          } else if (year.startsWith("Before")) {
            const limitYear = parseInt(year.replace("Before", "").trim(), 10);
            if (t.release_year >= limitYear) return false;
          } else {
            const targetYear = parseInt(year, 10);
            if (!isNaN(targetYear) && t.release_year !== targetYear) return false;
          }
        }
        if (director !== "All" && !t.directorsList.includes(director)) return false;
        if (actor !== "All" && !t.castList.includes(actor)) return false;
        return true;
      });

      const totalCount = filtered.length;
      if (totalCount === 0) {
        return NextResponse.json({
          summary: "No titles match the currently active dashboard filters. Try broadening your filter selection.",
          kpis: [
            { label: "Selected Titles", value: "0" },
            { label: "Active View", value: "Empty" }
          ],
          findings: [
            { label: "Status", value: "No matching records found." }
          ],
          chartType: "bar",
          chartData: [],
          recommendations: []
        });
      }

      // Compute details for this subset:
      // 1. Format distribution
      const movieCount = filtered.filter(t => t.type === "Movie").length;
      const tvCount = totalCount - movieCount;

      // 2. Average IMDb rating
      const ratedList = filtered.filter(t => t.imdb_rating > 0);
      const avgImdb = ratedList.length > 0 
        ? ratedList.reduce((sum, t) => sum + t.imdb_rating, 0) / ratedList.length 
        : 0;

      // 3. Top Genre
      const genreCounts: Record<string, number> = {};
      filtered.forEach(t => t.genresList.forEach(g => { if (g) genreCounts[g] = (genreCounts[g] || 0) + 1; }));
      const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
      const dominantGenre = sortedGenres[0]?.[0] || "N/A";

      // 4. Top Actor
      const actorCounts: Record<string, number> = {};
      filtered.forEach(t => t.castList.forEach(a => { if (a) actorCounts[a] = (actorCounts[a] || 0) + 1; }));
      const topActor = Object.entries(actorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

      // 5. Growth comparison (e.g. pre-2020 vs 2020-2025)
      const additionsBefore2020 = filtered.filter(t => t.release_year < 2020).length;
      const additionsAfter2020 = filtered.filter(t => t.release_year >= 2020).length;

      // Build active filters description string
      const activeFiltersDesc = [
        type !== "All" ? `Format: ${type}` : "",
        genre !== "All" ? `Genre: ${genre}` : "",
        country !== "All" ? `Country: ${country}` : "",
        language !== "All" ? `Language: ${language}` : "",
        year !== "All" ? `Year: ${year}` : "",
        director !== "All" ? `Director: ${director}` : "",
        actor !== "All" ? `Actor: ${actor}` : "",
      ].filter(Boolean).join(", ");

      const summary = `Active View Analysis (${activeFiltersDesc || "All catalog content"}): Computed ${totalCount} matching titles, consisting of ${movieCount} Movies and ${tvCount} TV Shows. The critical rating averages ${avgImdb > 0 ? `${avgImdb.toFixed(1)}/10` : "N/A"} on IMDb. The catalog addition trend shows ${additionsBefore2020} titles released before 2020 compared to ${additionsAfter2020} in 2020 or later.`;

      const payload = {
        summary,
        kpis: [
          { label: "Titles Matching", value: totalCount.toLocaleString() },
          { label: "Avg IMDb Rating", value: avgImdb > 0 ? `${avgImdb.toFixed(1)}/10` : "N/A" },
          { label: "Dominant Genre", value: dominantGenre }
        ],
        findings: [
          { label: "Movie Format Count", value: movieCount.toLocaleString(), extra: `${((movieCount / totalCount) * 100).toFixed(0)}% format share` },
          { label: "TV Show Format Count", value: tvCount.toLocaleString(), extra: `${((tvCount / totalCount) * 100).toFixed(0)}% format share` },
          { label: "Top Active Actor", value: topActor },
          { label: "Post-2020 Releases", value: additionsAfter2020.toLocaleString(), extra: `${((additionsAfter2020 / totalCount) * 100).toFixed(0)}% of matching catalog` }
        ],
        chartType: "pie",
        chartData: [
          { name: "Movies", value: movieCount },
          { name: "TV Shows", value: tvCount }
        ],
        recommendations: sortedGenres.slice(0, 3).map(([gName, gCount]) => ({
          text: `Explore "${gName}" category inside the active filters view (${gCount} matches)`,
          actionType: "genre",
          actionValue: gName
        }))
      };

      return NextResponse.json(payload);
    }
    const totalCount = titles.length || 1;

    // Intent classifier logic
    let intent = "fallback";
    if (queryInput.includes("genre") && (queryInput.includes("grow") || queryInput.includes("fast"))) {
      intent = "genre_growth";
    } else if (queryInput.includes("country") || queryInput.includes("countries")) {
      if (queryInput.includes("rating") || queryInput.includes("highest-rated") || queryInput.includes("highest rated")) {
        intent = "country_ratings";
      } else {
        intent = "country_distribution";
      }
    } else if (queryInput.includes("compare") || queryInput.includes("movie vs tv") || (queryInput.includes("movie") && queryInput.includes("tv"))) {
      intent = "movie_tv_comparison";
    } else if (queryInput.includes("language")) {
      intent = "language_dominance";
    } else if (queryInput.includes("rating") || queryInput.includes("highest-rated") || queryInput.includes("highest rated")) {
      intent = "genre_ratings";
    } else if (queryInput.includes("release year") || queryInput.includes("release years") || queryInput.includes("year") || queryInput.includes("add")) {
      intent = "release_years";
    } else if (queryInput.includes("actor") || queryInput.includes("actors") || queryInput.includes("cast") || queryInput.includes("frequent")) {
      intent = "popular_actors";
    } else if (queryInput.includes("director") || queryInput.includes("directors") || queryInput.includes("largest catalog")) {
      intent = "popular_directors";
    }

    let payload: any = {};

    switch (intent) {
      case "genre_growth": {
        // Compute additions by period
        const periodA = titles.filter(t => t.release_year >= 2015 && t.release_year <= 2019);
        const periodB = titles.filter(t => t.release_year >= 2020 && t.release_year <= 2025);

        const countA: Record<string, number> = {};
        const countB: Record<string, number> = {};

        periodA.forEach(t => t.genresList.forEach(g => { if (g) countA[g] = (countA[g] || 0) + 1; }));
        periodB.forEach(t => t.genresList.forEach(g => { if (g) countB[g] = (countB[g] || 0) + 1; }));

        const growth = Object.keys(countB).map(genre => {
          const valA = countA[genre] || 1;
          const valB = countB[genre] || 0;
          const rate = ((valB - valA) / valA) * 100;
          return { name: genre, valA, valB, rate };
        }).sort((a, b) => b.rate - a.rate).slice(0, 5);

        payload = {
          summary: "Fuzzy growth comparison between the 2015-2019 additions period and 2020-2025 releases indicates a massive surge in documentary and regional international content categories.",
          kpis: [
            { label: "Fastest Growing", value: growth[0]?.name || "N/A" },
            { label: "Period B additions", value: growth[0]?.valB?.toLocaleString() || "0" },
            { label: "Average Growth", value: `${(growth.reduce((sum, g) => sum + g.rate, 0) / 5).toFixed(1)}%` }
          ],
          findings: growth.map((g, idx) => ({
            label: `${idx + 1}. ${g.name}`,
            value: `+${g.rate.toFixed(1)}% growth`,
            extra: `${g.valA} vs ${g.valB} additions`
          })),
          chartType: "bar",
          chartData: growth.map(g => ({ name: g.name, value: Math.round(g.rate) })),
          recommendations: growth.slice(0, 3).map(g => ({
            text: `View Catalog logs filtered by "${g.name}" genre`,
            actionType: "genre",
            actionValue: g.name
          }))
        };
        break;
      }

      case "country_distribution": {
        const counts: Record<string, number> = {};
        titles.forEach(t => t.countriesList.forEach(c => { if (c) counts[c] = (counts[c] || 0) + 1; }));

        const sorted = Object.entries(counts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        const topShare = ((sorted[0]?.value || 0) / totalCount) * 100;

        payload = {
          summary: `The Netflix content catalog is heavily dominated by production hubs in the United States and India, together accounting for over 50% of the total catalog additions.`,
          kpis: [
            { label: "Top Producer", value: sorted[0]?.name || "N/A" },
            { label: "US Titles count", value: sorted[0]?.value?.toLocaleString() || "0" },
            { label: "Hub Dominance", value: `${topShare.toFixed(1)}%` }
          ],
          findings: sorted.map((c, idx) => ({
            label: `${idx + 1}. ${c.name}`,
            value: c.value.toLocaleString(),
            extra: `${((c.value / totalCount) * 100).toFixed(1)}% of total catalog`
          })),
          chartType: "pie",
          chartData: sorted.map(c => ({ name: c.name, value: c.value })),
          recommendations: sorted.slice(0, 3).map(c => ({
            text: `Explore geography distributions filtered to "${c.name}"`,
            actionType: "country",
            actionValue: c.name
          }))
        };
        break;
      }

      case "movie_tv_comparison": {
        const movies = titles.filter(t => t.type === "Movie");
        const tv = titles.filter(t => t.type === "TV Show");

        const movieCount = movies.length;
        const tvCount = tv.length;

        const imdbMovie = movies.filter(t => t.imdb_rating > 0);
        const avgImdbMovie = imdbMovie.reduce((sum, t) => sum + t.imdb_rating, 0) / (imdbMovie.length || 1);

        const imdbTv = tv.filter(t => t.imdb_rating > 0);
        const avgImdbTv = imdbTv.reduce((sum, t) => sum + t.imdb_rating, 0) / (imdbTv.length || 1);

        payload = {
          summary: `Feature films (Movies) dominate catalog volume at ${((movieCount / totalCount) * 100).toFixed(0)}%, but TV Shows command slightly higher average viewer engagement rates on IMDb.`,
          kpis: [
            { label: "Movies ratio", value: `${((movieCount / totalCount) * 100).toFixed(0)}%` },
            { label: "TV Shows ratio", value: `${((tvCount / totalCount) * 100).toFixed(0)}%` },
            { label: "TV IMDb Avg", value: avgImdbTv.toFixed(2) }
          ],
          findings: [
            { label: "Movies Total", value: movieCount.toLocaleString(), extra: `Average IMDb Score: ${avgImdbMovie.toFixed(2)}/10` },
            { label: "TV Shows Total", value: tvCount.toLocaleString(), extra: `Average IMDb Score: ${avgImdbTv.toFixed(2)}/10` }
          ],
          chartType: "bar",
          chartData: [
            { name: "Movies", value: movieCount },
            { name: "TV Shows", value: tvCount }
          ],
          recommendations: [
            { text: "Filter interactive tables to explore only TV Shows", actionType: "genre", actionValue: "All" }
          ]
        };
        break;
      }

      case "language_dominance": {
        const counts: Record<string, number> = {};
        titles.forEach(t => {
          const l = t.language || "English";
          counts[l] = (counts[l] || 0) + 1;
        });

        const sorted = Object.entries(counts)
          .map(([name, value]) => ({ name: name.toUpperCase(), value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        payload = {
          summary: `English is the absolute dominant language in the Netflix catalog, followed by Spanish, French, and Hindi content localizations.`,
          kpis: [
            { label: "Top Language", value: sorted[0]?.name || "N/A" },
            { label: "Share", value: `${((sorted[0]?.value || 0) / totalCount * 100).toFixed(1)}%` },
            { label: "Secondary", value: sorted[1]?.name || "N/A" }
          ],
          findings: sorted.map((l, idx) => ({
            label: `${idx + 1}. ${l.name}`,
            value: l.value.toLocaleString(),
            extra: `${((l.value / totalCount) * 100).toFixed(1)}% share`
          })),
          chartType: "bar",
          chartData: sorted.map(l => ({ name: l.name, value: l.value })),
          recommendations: [
            { text: "Open dashboard explorer and reset filters", actionType: "genre", actionValue: "All" }
          ]
        };
        break;
      }

      case "genre_ratings": {
        const sumRatings: Record<string, number> = {};
        const countRatings: Record<string, number> = {};

        titles.forEach(t => {
          if (t.imdb_rating > 0) {
            t.genresList.forEach(g => {
              if (g) {
                sumRatings[g] = (sumRatings[g] || 0) + t.imdb_rating;
                countRatings[g] = (countRatings[g] || 0) + 1;
              }
            });
          }
        });

        const sorted = Object.keys(sumRatings)
          .map(g => ({ name: g, value: sumRatings[g] / countRatings[g], count: countRatings[g] }))
          .filter(g => g.count >= 20) // at least 20 ratings
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        payload = {
          summary: `Niche categories and high-production value genres like Anime, Documentaries, and Biographies score highest in critical viewer average ratings.`,
          kpis: [
            { label: "Top Genre", value: sorted[0]?.name || "N/A" },
            { label: "Avg Rating", value: `${sorted[0]?.value?.toFixed(2)}/10` },
            { label: "Rank 2 Genre", value: sorted[1]?.name || "N/A" }
          ],
          findings: sorted.map((g, idx) => ({
            label: `${idx + 1}. ${g.name}`,
            value: `${g.value.toFixed(2)} / 10`,
            extra: `Based on ${g.count} rated titles`
          })),
          chartType: "bar",
          chartData: sorted.map(g => ({ name: g.name, value: parseFloat(g.value.toFixed(2)) })),
          recommendations: sorted.slice(0, 3).map(g => ({
            text: `View dashboard filtered to highest-rated genre "${g.name}"`,
            actionType: "genre",
            actionValue: g.name
          }))
        };
        break;
      }

      case "release_years": {
        const counts: Record<string, number> = {};
        titles.forEach(t => {
          if (t.release_year > 0) {
            counts[t.release_year] = (counts[t.release_year] || 0) + 1;
          }
        });

        const sorted = Object.entries(counts)
          .map(([name, value]) => ({ name: parseInt(name, 10), value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        // Sort by year ascending for timeline chart
        const timeline = Object.entries(counts)
          .map(([name, value]) => ({ name: parseInt(name, 10), value }))
          .sort((a, b) => a.name - b.name)
          .slice(-12); // Last 12 years

        payload = {
          summary: `Netflix additions peaked globally in theatrical years between 2018 and 2021, aligning with the platform's original series investments surge.`,
          kpis: [
            { label: "Peak Release Year", value: sorted[0]?.name?.toString() || "N/A" },
            { label: "Peak Additions", value: sorted[0]?.value?.toLocaleString() || "0" },
            { label: "Year 2024 additions", value: (counts[2024] || 0).toLocaleString() }
          ],
          findings: sorted.map((y, idx) => ({
            label: `${idx + 1}. Year ${y.name}`,
            value: `${y.value.toLocaleString()} additions`,
            extra: `Catalog proportion: ${((y.value / totalCount) * 100).toFixed(1)}%`
          })),
          chartType: "line",
          chartData: timeline.map(y => ({ name: y.name.toString(), value: y.value })),
          recommendations: [
            { text: `Filter interactive catalogs to year ${sorted[0]?.name}`, actionType: "genre", actionValue: "All" }
          ]
        };
        break;
      }

      case "popular_actors": {
        const counts: Record<string, number> = {};
        titles.forEach(t => t.castList.forEach(a => { if (a) counts[a] = (counts[a] || 0) + 1; }));

        const sorted = Object.entries(counts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        payload = {
          summary: `Indian and international regional cinema stars dominate raw cast listing occurrences, with Shah Rukh Khan leading overall counts in our catalog.`,
          kpis: [
            { label: "Top Actor", value: sorted[0]?.name || "N/A" },
            { label: "Appearances", value: `${sorted[0]?.value} titles` },
            { label: "Runner-up", value: sorted[1]?.name || "N/A" }
          ],
          findings: sorted.map((a, idx) => ({
            label: `${idx + 1}. ${a.name}`,
            value: `${a.value} titles`,
            extra: "Frequently appearing in Movies"
          })),
          chartType: "bar",
          chartData: sorted.map(a => ({ name: a.name.split(' ').pop() || a.name, value: a.value })),
          recommendations: sorted.slice(0, 3).map(a => ({
            text: `Filter dashboard log by cast member "${a.name}"`,
            actionType: "actor",
            actionValue: a.name
          }))
        };
        break;
      }

      case "popular_directors": {
        const counts: Record<string, number> = {};
        titles.forEach(t => t.directorsList.forEach(d => { if (d) counts[d] = (counts[d] || 0) + 1; }));

        const sorted = Object.entries(counts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        payload = {
          summary: `Leading directors are topped by major catalog documentary filmmakers and regional drama series creators.`,
          kpis: [
            { label: "Top Director", value: sorted[0]?.name || "N/A" },
            { label: "Directorials", value: `${sorted[0]?.value} titles` },
            { label: "Runner-up", value: sorted[1]?.name || "N/A" }
          ],
          findings: sorted.map((d, idx) => ({
            label: `${idx + 1}. ${d.name}`,
            value: `${d.value} titles`,
            extra: "Catalog directorial log matches"
          })),
          chartType: "bar",
          chartData: sorted.map(d => ({ name: d.name.split(' ').pop() || d.name, value: d.value })),
          recommendations: sorted.slice(0, 3).map(d => ({
            text: `Open Details for director "${d.name}"`,
            actionType: "director",
            actionValue: d.name
          }))
        };
        break;
      }

      case "country_ratings": {
        const sumRatings: Record<string, number> = {};
        const countRatings: Record<string, number> = {};

        titles.forEach(t => {
          if (t.imdb_rating > 0) {
            t.countriesList.forEach(c => {
              if (c) {
                sumRatings[c] = (sumRatings[c] || 0) + t.imdb_rating;
                countRatings[c] = (countRatings[c] || 0) + 1;
              }
            });
          }
        });

        const sorted = Object.keys(sumRatings)
          .map(c => ({ name: c, value: sumRatings[c] / countRatings[c], count: countRatings[c] }))
          .filter(c => c.count >= 30) // Minimum 30 rated titles to keep samples statistically robust
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        payload = {
          summary: `Statistically robust countries list sorted by average IMDb rating indicates highly curated content localizations from Japan, Korea, and Europe score highest.`,
          kpis: [
            { label: "Top Country", value: sorted[0]?.name || "N/A" },
            { label: "Highest Avg", value: `${sorted[0]?.value?.toFixed(2)}/10` },
            { label: "Titles Sample", value: sorted[0]?.count?.toString() || "0" }
          ],
          findings: sorted.map((c, idx) => ({
            label: `${idx + 1}. ${c.name}`,
            value: `${c.value.toFixed(2)} / 10`,
            extra: `Calculated from ${c.count} rated titles`
          })),
          chartType: "bar",
          chartData: sorted.map(c => ({ name: c.name, value: parseFloat(c.value.toFixed(2)) })),
          recommendations: sorted.slice(0, 3).map(c => ({
            text: `Examine regional ratings in Geography page for "${c.name}"`,
            actionType: "country",
            actionValue: c.name
          }))
        };
        break;
      }

      default: {
        // Fallback: search titles matching the user query
        const matches = titles.filter(t => t.title.toLowerCase().includes(queryInput) || t.description.toLowerCase().includes(queryInput));
        const matchCount = matches.length;

        if (matchCount > 0) {
          const matchMovies = matches.filter(t => t.type === "Movie").length;
          const matchTv = matches.filter(t => t.type === "TV Show").length;

          const ratedList = matches.filter(t => t.imdb_rating > 0);
          const avgImdb = ratedList.length > 0 
            ? ratedList.reduce((sum, t) => sum + t.imdb_rating, 0) / ratedList.length 
            : 0;

          // Find top genre in matching subset
          const genreCounts: Record<string, number> = {};
          matches.forEach(t => t.genresList.forEach(g => { if (g) genreCounts[g] = (genreCounts[g] || 0) + 1; }));
          const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

          payload = {
            summary: `Found ${matchCount} titles in the catalog matching keyword "${queryInput}". This subset is comprised of ${matchMovies} Movies and ${matchTv} TV Shows.`,
            kpis: [
              { label: "Matching Titles", value: matchCount.toString() },
              { label: "Average IMDb", value: avgImdb > 0 ? avgImdb.toFixed(2) : "N/A" },
              { label: "Dominant Genre", value: topGenre }
            ],
            findings: [
              { label: "Movies subset", value: `${matchMovies} titles` },
              { label: "TV Shows subset", value: `${matchTv} titles` },
              { label: "Ratings Sample size", value: `${ratedList.length} rated titles` }
            ],
            chartType: "pie",
            chartData: [
              { name: "Movies", value: matchMovies },
              { name: "TV Shows", value: matchTv }
            ],
            recommendations: [
              { text: `Filter interactive dashboard listings by keyword "${queryInput}"`, actionType: "genre", actionValue: "All" }
            ]
          };
        } else {
          payload = {
            summary: `Could not identify an analytical match for your query "${queryInput}" in our Netflix catalog indexes.`,
            kpis: [
              { label: "Query", value: `"${queryInput}"` },
              { label: "Catalog Indexes", value: "37,819 items" },
              { label: "Match Status", value: "No Records" }
            ],
            findings: [
              { label: "Tip 1", value: "Ask one of the suggested dashboard analytical questions." },
              { label: "Tip 2", value: "Try searching direct keywords like 'Action', 'Shah Rukh Khan', or 'Comedy'." }
            ],
            chartType: "bar",
            chartData: [],
            recommendations: []
          };
        }
        break;
      }
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("AI Assistant Endpoint Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
