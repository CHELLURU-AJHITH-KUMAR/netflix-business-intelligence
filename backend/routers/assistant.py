import math
from fastapi import APIRouter, Query, Request
from analytics.engine import get_netflix_data

router = APIRouter(prefix="/api/assistant", tags=["assistant"])

# Cache enriched list helper (poster, ratings, genres)
cached_enriched_assistant = []

def get_enriched_assistant_titles():
    global cached_enriched_assistant
    if cached_enriched_assistant:
        return cached_enriched_assistant

    # Re-use engine's netflix data loader (already enriched via cache)
    cached_enriched_assistant = get_netflix_data()
    return cached_enriched_assistant

@router.get("")
def get_assistant(
    request: Request,
    q: str = Query(..., alias="q"),
    type: str = Query("All", alias="type"),
    genre: str = Query("All", alias="genre"),
    country: str = Query("All", alias="country"),
    language: str = Query("All", alias="language"),
    year: str = Query("All", alias="year"),
    director: str = Query("All", alias="director"),
    actor: str = Query("All", alias="actor")
):
    query_input = q.lower().strip()
    titles = get_enriched_assistant_titles()

    if query_input == "explain_filters":
        # Filter titles based on parameters
        filtered = []
        for t in titles:
            if type != "All" and t["type"] != type:
                continue
            if genre != "All" and genre not in t["genresList"]:
                continue
            if country != "All" and country not in t["countriesList"]:
                continue
            if language != "All" and t["language"] != language:
                continue
            if year != "All":
                if "-" in year:
                    try:
                        start, end = map(int, year.split("-"))
                        if not (start <= t["release_year"] <= end):
                            continue
                    except ValueError:
                        pass
                elif year.startswith("Before"):
                    try:
                        limit_year = int(year.replace("Before", "").strip())
                        if t["release_year"] >= limit_year:
                            continue
                    except ValueError:
                        pass
                else:
                    try:
                        target_year = int(year)
                        if t["release_year"] != target_year:
                            continue
                    except ValueError:
                        pass
            if director != "All" and director not in t["directorsList"]:
                continue
            if actor != "All" and actor not in t["castList"]:
                continue
            filtered.append(t)

        total_count = len(filtered)
        if total_count == 0:
            return {
                "summary": "No titles match the currently active dashboard filters. Try broadening your filter selection.",
                "kpis": [
                    {"label": "Selected Titles", "value": "0"},
                    {"label": "Active View", "value": "Empty"}
                ],
                "findings": [
                    {"label": "Status", "value": "No matching records found."}
                ],
                "chartType": "bar",
                "chartData": [],
                "recommendations": []
            }

        # Computations
        movie_count = sum(1 for t in filtered if t["type"] == "Movie")
        tv_count = total_count - movie_count

        rated_list = [t for t in filtered if t["imdb_rating"] > 0]
        avg_imdb = sum(t["imdb_rating"] for t in rated_list) / len(rated_list) if rated_list else 0.0

        genre_counts = {}
        for t in filtered:
            for g in t["genresList"]:
                if g:
                    genre_counts[g] = genre_counts.get(g, 0) + 1
        sorted_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)
        dominant_genre = sorted_genres[0][0] if sorted_genres else "N/A"

        actor_counts = {}
        for t in filtered:
            for a in t["castList"]:
                if a:
                    actor_counts[a] = actor_counts.get(a, 0) + 1
        sorted_actors = sorted(actor_counts.items(), key=lambda x: x[1], reverse=True)
        top_actor = sorted_actors[0][0] if sorted_actors else "N/A"

        additions_before_2020 = sum(1 for t in filtered if t["release_year"] < 2020)
        additions_after_2020 = sum(1 for t in filtered if t["release_year"] >= 2020)

        # Build filter desc
        filter_parts = []
        if type != "All": filter_parts.append(f"Format: {type}")
        if genre != "All": filter_parts.append(f"Genre: {genre}")
        if country != "All": filter_parts.append(f"Country: {country}")
        if language != "All": filter_parts.append(f"Language: {language}")
        if year != "All": filter_parts.append(f"Year: {year}")
        if director != "All": filter_parts.append(f"Director: {director}")
        if actor != "All": filter_parts.append(f"Actor: {actor}")
        active_filters_desc = ", ".join(filter_parts)

        summary = f"Active View Analysis ({active_filters_desc or 'All catalog content'}): Computed {total_count} matching titles, consisting of {movie_count} Movies and {tv_count} TV Shows. The critical rating averages {f'{avg_imdb:.1f}/10' if avg_imdb > 0 else 'N/A'} on IMDb. The catalog addition trend shows {additions_before_2020} titles released before 2020 compared to {additions_after_2020} in 2020 or later."

        return {
            "summary": summary,
            "kpis": [
                {"label": "Titles Matching", "value": f"{total_count:,}"},
                {"label": "Avg IMDb Rating", "value": f"{avg_imdb:.1f}/10" if avg_imdb > 0 else "N/A"},
                {"label": "Dominant Genre", "value": dominant_genre}
            ],
            "findings": [
                {"label": "Movie Format Count", "value": f"{movie_count:,}", "extra": f"{((movie_count / total_count) * 100):.0f}% format share"},
                {"label": "TV Show Format Count", "value": f"{tv_count:,}", "extra": f"{((tv_count / total_count) * 100):.0f}% format share"},
                {"label": "Top Active Actor", "value": top_actor},
                {"label": "Post-2020 Releases", "value": f"{additions_after_2020:,}", "extra": f"{((additions_after_2020 / total_count) * 100):.0f}% of matching catalog"}
            ],
            "chartType": "pie",
            "chartData": [
                {"name": "Movies", "value": movie_count},
                {"name": "TV Shows", "value": tv_count}
            ],
            "recommendations": [
                {
                    "text": f"Explore \"{gName}\" category inside the active filters view ({gCount} matches)",
                    "actionType": "genre",
                    "actionValue": gName
                } for gName, gCount in sorted_genres[:3]
            ]
        }

    total_count = len(titles) or 1

    # Intent classifier
    intent = "fallback"
    if "genre" in query_input and ("grow" in query_input or "fast" in query_input):
        intent = "genre_growth"
    elif "country" in query_input or "countries" in query_input:
        if "rating" in query_input or "highest-rated" in query_input or "highest rated" in query_input:
            intent = "country_ratings"
        else:
            intent = "country_distribution"
    elif "compare" in query_input or "movie vs tv" in query_input or ("movie" in query_input and "tv" in query_input):
        intent = "movie_tv_comparison"
    elif "language" in query_input:
        intent = "language_dominance"
    elif "rating" in query_input or "highest-rated" in query_input or "highest rated" in query_input:
        intent = "genre_ratings"
    elif "release year" in query_input or "release years" in query_input or "year" in query_input or "add" in query_input:
        intent = "release_years"
    elif "actor" in query_input or "actors" in query_input or "cast" in query_input or "frequent" in query_input:
        intent = "popular_actors"
    elif "director" in query_input or "directors" in query_input or "largest catalog" in query_input:
        intent = "popular_directors"

    payload = {}

    if intent == "genre_growth":
        period_a = [t for t in titles if 2015 <= t["release_year"] <= 2019]
        period_b = [t for t in titles if 2020 <= t["release_year"] <= 2025]

        count_a = {}
        count_b = {}
        for t in period_a:
            for g in t["genresList"]:
                if g: count_a[g] = count_a.get(g, 0) + 1
        for t in period_b:
            for g in t["genresList"]:
                if g: count_b[g] = count_b.get(g, 0) + 1

        growth = []
        for genre_name, val_b in count_b.items():
            val_a = count_a.get(genre_name, 1)
            rate = ((val_b - val_a) / val_a) * 100
            growth.append({"name": genre_name, "valA": val_a, "valB": val_b, "rate": rate})
        growth = sorted(growth, key=lambda x: x["rate"], reverse=True)[:5]

        avg_growth_rate = sum(g["rate"] for g in growth) / 5 if growth else 0.0

        payload = {
            "summary": "Fuzzy growth comparison between the 2015-2019 additions period and 2020-2025 releases indicates a massive surge in documentary and regional international content categories.",
            "kpis": [
                {"label": "Fastest Growing", "value": growth[0]["name"] if growth else "N/A"},
                {"label": "Period B additions", "value": f"{growth[0]['valB']:,}" if growth else "0"},
                {"label": "Average Growth", "value": f"{avg_growth_rate:.1f}%"}
            ],
            "findings": [
                {
                    "label": f"{idx + 1}. {g['name']}",
                    "value": f"+{g['rate']:.1f}% growth",
                    "extra": f"{g['valA']} vs {g['valB']} additions"
                } for idx, g in enumerate(growth)
            ],
            "chartType": "bar",
            "chartData": [{"name": g["name"], "value": round(g["rate"])} for g in growth],
            "recommendations": [
                {
                    "text": f"View Catalog logs filtered by \"{g['name']}\" genre",
                    "actionType": "genre",
                    "actionValue": g["name"]
                } for g in growth[:3]
            ]
        }

    elif intent == "country_distribution":
        counts = {}
        for t in titles:
            for c in t["countriesList"]:
                if c: counts[c] = counts.get(c, 0) + 1
        sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:5]
        top_share = (sorted_counts[0][1] / total_count) * 100 if sorted_counts else 0.0

        payload = {
            "summary": "The Netflix content catalog is heavily dominated by production hubs in the United States and India, together accounting for over 50% of the total catalog additions.",
            "kpis": [
                {"label": "Top Producer", "value": sorted_counts[0][0] if sorted_counts else "N/A"},
                {"label": "US Titles count", "value": f"{sorted_counts[0][1]:,}" if sorted_counts else "0"},
                {"label": "Hub Dominance", "value": f"{top_share:.1f}%"}
            ],
            "findings": [
                {
                    "label": f"{idx + 1}. {c[0]}",
                    "value": f"{c[1]:,}",
                    "extra": f"{((c[1] / total_count) * 100):.1f}% of total catalog"
                } for idx, c in enumerate(sorted_counts)
            ],
            "chartType": "pie",
            "chartData": [{"name": c[0], "value": c[1]} for c in sorted_counts],
            "recommendations": [
                {
                    "text": f"Explore geography distributions filtered to \"{c[0]}\"",
                    "actionType": "country",
                    "actionValue": c[0]
                } for c in sorted_counts[:3]
            ]
        }

    elif intent == "movie_tv_comparison":
        movies = [t for t in titles if t["type"] == "Movie"]
        tv = [t for t in titles if t["type"] == "TV Show"]
        movie_count = len(movies)
        tv_count = len(tv)

        imdb_movie = [t for t in movies if t["imdb_rating"] > 0]
        avg_imdb_movie = sum(t["imdb_rating"] for t in imdb_movie) / len(imdb_movie) if imdb_movie else 0.0

        imdb_tv = [t for t in tv if t["imdb_rating"] > 0]
        avg_imdb_tv = sum(t["imdb_rating"] for t in imdb_tv) / len(imdb_tv) if imdb_tv else 0.0

        payload = {
            "summary": f"Feature films (Movies) dominate catalog volume at {((movie_count / total_count) * 100):.0f}%, but TV Shows command slightly higher average viewer engagement rates on IMDb.",
            "kpis": [
                {"label": "Movies ratio", "value": f"{((movie_count / total_count) * 100):.0f}%"},
                {"label": "TV Shows ratio", "value": f"{((tv_count / total_count) * 100):.0f}%"},
                {"label": "TV IMDb Avg", "value": f"{avg_imdb_tv:.2f}"}
            ],
            "findings": [
                {"label": "Movies Total", "value": f"{movie_count:,}", "extra": f"Average IMDb Score: {avg_imdb_movie:.2f}/10"},
                {"label": "TV Shows Total", "value": f"{tv_count:,}", "extra": f"Average IMDb Score: {avg_imdb_tv:.2f}/10"}
            ],
            "chartType": "bar",
            "chartData": [
                {"name": "Movies", "value": movie_count},
                {"name": "TV Shows", "value": tv_count}
            ],
            "recommendations": [
                {"text": "Filter interactive tables to explore only TV Shows", "actionType": "genre", "actionValue": "All"}
            ]
        }

    elif intent == "language_dominance":
        counts = {}
        for t in titles:
            l = t["language"] or "English"
            counts[l] = counts.get(l, 0) + 1
        sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:5]

        payload = {
            "summary": "English is the absolute dominant language in the Netflix catalog, followed by Spanish, French, and Hindi content localizations.",
            "kpis": [
                {"label": "Top Language", "value": sorted_counts[0][0].upper() if sorted_counts else "N/A"},
                {"label": "Share", "value": f"{((sorted_counts[0][1] / total_count) * 100):.1f}%" if sorted_counts else "0.0%"},
                {"label": "Secondary", "value": sorted_counts[1][0].upper() if len(sorted_counts) > 1 else "N/A"}
            ],
            "findings": [
                {
                    "label": f"{idx + 1}. {l[0].upper()}",
                    "value": f"{l[1]:,}",
                    "extra": f"{((l[1] / total_count) * 100):.1f}% share"
                } for idx, l in enumerate(sorted_counts)
            ],
            "chartType": "bar",
            "chartData": [{"name": l[0].upper(), "value": l[1]} for l in sorted_counts],
            "recommendations": [
                {"text": "Open dashboard explorer and reset filters", "actionType": "genre", "actionValue": "All"}
            ]
        }

    elif intent == "genre_ratings":
        sum_ratings = {}
        count_ratings = {}
        for t in titles:
            if t["imdb_rating"] > 0:
                for g in t["genresList"]:
                    if g:
                        sum_ratings[g] = sum_ratings.get(g, 0.0) + t["imdb_rating"]
                        count_ratings[g] = count_ratings.get(g, 0) + 1
        genres_rated = []
        for g, s in sum_ratings.items():
            cnt = count_ratings[g]
            if cnt >= 20:  # Min 20 ratings
                genres_rated.append({"name": g, "value": s / cnt, "count": cnt})
        genres_rated = sorted(genres_rated, key=lambda x: x["value"], reverse=True)[:5]

        payload = {
            "summary": "Niche categories and high-production value genres like Anime, Documentaries, and Biographies score highest in critical viewer average ratings.",
            "kpis": [
                {"label": "Top Genre", "value": genres_rated[0]["name"] if genres_rated else "N/A"},
                {"label": "Avg Rating", "value": f"{genres_rated[0]['value']:.2f}/10" if genres_rated else "N/A"},
                {"label": "Rank 2 Genre", "value": genres_rated[1]["name"] if len(genres_rated) > 1 else "N/A"}
            ],
            "findings": [
                {
                    "label": f"{idx + 1}. {g['name']}",
                    "value": f"{g['value']:.2f} / 10",
                    "extra": f"Based on {g['count']} rated titles"
                } for idx, g in enumerate(genres_rated)
            ],
            "chartType": "bar",
            "chartData": [{"name": g["name"], "value": round(g["value"], 2)} for g in genres_rated],
            "recommendations": [
                {
                    "text": f"View dashboard filtered to highest-rated genre \"{g['name']}\"",
                    "actionType": "genre",
                    "actionValue": g["name"]
                } for g in genres_rated[:3]
            ]
        }

    elif intent == "release_years":
        counts = {}
        for t in titles:
            if t["release_year"] > 0:
                counts[t["release_year"]] = counts.get(t["release_year"], 0) + 1
        sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:5]

        timeline_years = sorted(counts.keys())[-12:]
        timeline = [{"name": str(y), "value": counts[y]} for y in timeline_years]

        payload = {
            "summary": "Netflix additions peaked globally in theatrical years between 2018 and 2021, aligning with the platform's original series investments surge.",
            "kpis": [
                {"label": "Peak Release Year", "value": str(sorted_counts[0][0]) if sorted_counts else "N/A"},
                {"label": "Peak Additions", "value": f"{sorted_counts[0][1]:,}" if sorted_counts else "0"},
                {"label": "Year 2024 additions", "value": f"{counts.get(2024, 0):,}"}
            ],
            "findings": [
                {
                    "label": f"{idx + 1}. Year {y[0]}",
                    "value": f"{y[1]:,} additions",
                    "extra": f"Catalog proportion: {((y[1] / total_count) * 100):.1f}%"
                } for idx, y in enumerate(sorted_counts)
            ],
            "chartType": "line",
            "chartData": timeline,
            "recommendations": [
                {"text": f"Filter interactive catalogs to year {sorted_counts[0][0]}", "actionType": "genre", "actionValue": "All"}
            ]
        }

    elif intent == "popular_actors":
        counts = {}
        for t in titles:
            for a in t["castList"]:
                if a: counts[a] = counts.get(a, 0) + 1
        sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:5]

        payload = {
            "summary": "Indian and international regional cinema stars dominate raw cast listing occurrences, with Shah Rukh Khan leading overall counts in our catalog.",
            "kpis": [
                {"label": "Top Actor", "value": sorted_counts[0][0] if sorted_counts else "N/A"},
                {"label": "Appearances", "value": f"{sorted_counts[0][1]} titles" if sorted_counts else "0 titles"},
                {"label": "Runner-up", "value": sorted_counts[1][0] if len(sorted_counts) > 1 else "N/A"}
            ],
            "findings": [
                {
                    "label": f"{idx + 1}. {a[0]}",
                    "value": f"{a[1]} titles",
                    "extra": "Frequently appearing in Movies"
                } for idx, a in enumerate(sorted_counts)
            ],
            "chartType": "bar",
            "chartData": [{"name": a[0].split(" ")[-1] if a[0] else "", "value": a[1]} for a in sorted_counts],
            "recommendations": [
                {
                    "text": f"Filter dashboard log by cast member \"{a[0]}\"",
                    "actionType": "actor",
                    "actionValue": a[0]
                } for a in sorted_counts[:3]
            ]
        }

    elif intent == "popular_directors":
        counts = {}
        for t in titles:
            for d in t["directorsList"]:
                if d: counts[d] = counts.get(d, 0) + 1
        sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:5]

        payload = {
            "summary": "Leading directors are topped by major catalog documentary filmmakers and regional drama series creators.",
            "kpis": [
                {"label": "Top Director", "value": sorted_counts[0][0] if sorted_counts else "N/A"},
                {"label": "Directorials", "value": f"{sorted_counts[0][1]} titles" if sorted_counts else "0 titles"},
                {"label": "Runner-up", "value": sorted_counts[1][0] if len(sorted_counts) > 1 else "N/A"}
            ],
            "findings": [
                {
                    "label": f"{idx + 1}. {d[0]}",
                    "value": f"{d[1]} titles",
                    "extra": "Catalog directorial log matches"
                } for idx, d in enumerate(sorted_counts)
            ],
            "chartType": "bar",
            "chartData": [{"name": d[0].split(" ")[-1] if d[0] else "", "value": d[1]} for d in sorted_counts],
            "recommendations": [
                {
                    "text": f"Open Details for director \"{d[0]}\"",
                    "actionType": "director",
                    "actionValue": d[0]
                } for d in sorted_counts[:3]
            ]
        }

    elif intent == "country_ratings":
        sum_ratings = {}
        count_ratings = {}
        for t in titles:
            if t["imdb_rating"] > 0:
                for c in t["countriesList"]:
                    if c:
                        sum_ratings[c] = sum_ratings.get(c, 0.0) + t["imdb_rating"]
                        count_ratings[c] = count_ratings.get(c, 0) + 1
        countries_rated = []
        for c, s in sum_ratings.items():
            cnt = count_ratings[c]
            if cnt >= 30:  # Statistically robust min sample 30
                countries_rated.append({"name": c, "value": s / cnt, "count": cnt})
        countries_rated = sorted(countries_rated, key=lambda x: x["value"], reverse=True)[:5]

        payload = {
            "summary": "Statistically robust countries list sorted by average IMDb rating indicates highly curated content localizations from Japan, Korea, and Europe score highest.",
            "kpis": [
                {"label": "Top Country", "value": countries_rated[0]["name"] if countries_rated else "N/A"},
                {"label": "Highest Avg", "value": f"{countries_rated[0]['value']:.2f}/10" if countries_rated else "N/A"},
                {"label": "Titles Sample", "value": str(countries_rated[0]["count"]) if countries_rated else "0"}
            ],
            "findings": [
                {
                    "label": f"{idx + 1}. {c['name']}",
                    "value": f"{c['value']:.2f} / 10",
                    "extra": f"Calculated from {c['count']} rated titles"
                } for idx, c in enumerate(countries_rated)
            ],
            "chartType": "bar",
            "chartData": [{"name": c["name"], "value": round(c["value"], 2)} for c in countries_rated],
            "recommendations": [
                {
                    "text": f"Examine regional ratings in Geography page for \"{c['name']}\"",
                    "actionType": "country",
                    "actionValue": c["name"]
                } for c in countries_rated[:3]
            ]
        }

    else:
        # Fallback keyword match
        matches = [t for t in titles if query_input in t["title"].lower() or query_input in t["description"].lower()]
        match_count = len(matches)

        if match_count > 0:
            match_movies = sum(1 for t in matches if t["type"] == "Movie")
            match_tv = match_count - match_movies

            rated_list = [t for t in matches if t["imdb_rating"] > 0]
            avg_imdb = sum(t["imdb_rating"] for t in rated_list) / len(rated_list) if rated_list else 0.0

            genre_counts = {}
            for t in matches:
                for g in t["genresList"]:
                    if g: genre_counts[g] = genre_counts.get(g, 0) + 1
            sorted_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)
            top_genre = sorted_genres[0][0] if sorted_genres else "N/A"

            payload = {
                "summary": f"Found {match_count} titles in the catalog matching keyword \"{query_input}\". This subset is comprised of {match_movies} Movies and {match_tv} TV Shows.",
                "kpis": [
                    {"label": "Matching Titles", "value": str(match_count)},
                    {"label": "Average IMDb", "value": f"{avg_imdb:.2f}" if avg_imdb > 0 else "N/A"},
                    {"label": "Dominant Genre", "value": top_genre}
                ],
                "findings": [
                    {"label": "Movies subset", "value": f"{match_movies} titles"},
                    {"label": "TV Shows subset", "value": f"{match_tv} titles"},
                    {"label": "Ratings Sample size", "value": f"{len(rated_list)} rated titles"}
                ],
                "chartType": "pie",
                "chartData": [
                    {"name": "Movies", "value": match_movies},
                    {"name": "TV Shows", "value": match_tv}
                ],
                "recommendations": [
                    {"text": f"Filter interactive dashboard listings by keyword \"{query_input}\"", "actionType": "genre", "actionValue": "All"}
                ]
            }
        else:
            payload = {
                "summary": f"Could not identify an analytical match for your query \"{query_input}\" in our Netflix catalog indexes.",
                "kpis": [
                    {"label": "Query", "value": f"\"{query_input}\""},
                    {"label": "Catalog Indexes", "value": "37,819 items"},
                    {"label": "Match Status", "value": "No Records"}
                ],
                "findings": [
                    {"label": "Tip 1", "value": "Ask one of the suggested dashboard analytical questions."},
                    {"label": "Tip 2", "value": "Try searching direct keywords like 'Action', 'Shah Rukh Khan', or 'Comedy'."}
                ],
                "chartType": "bar",
                "chartData": [],
                "recommendations": []
            }

    return payload
