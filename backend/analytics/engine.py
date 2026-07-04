import os
import json
import re
import math
from datetime import datetime
from pathlib import Path
import pandas as pd
import numpy as np

# Resolve path relative to this file
BASE_DIR = Path(__file__).parent.parent

CSV_PATH = BASE_DIR / "netflix_master_1990_2025.csv"
TMDB_CACHE_PATH = BASE_DIR / "tmdb_cache.json"
OMDB_CACHE_PATH = BASE_DIR / "omdb_cache.json"

cached_netflix_data = []
cached_thinned_data = []
cached_kpis = None
cached_executive_stats = None
cached_content_insights = None
cached_people_geography = None

# Fuzzy unique lists for search indexing
unique_actors = []
unique_directors = []
unique_genres = []
is_search_init = False

def parse_awards(awards: str) -> dict:
    if not awards or awards == 'N/A':
        return {"wins": 0, "nominations": 0}
    wins = 0
    nominations = 0

    win_match = re.search(r'(\d+)\s+win', awards, re.IGNORECASE)
    if win_match:
        wins = int(win_match.group(1))
    else:
        won_matches = re.findall(r'Won\s+(\d+)\s+', awards, re.IGNORECASE)
        if won_matches:
            wins = sum(int(x) for x in won_matches)

    nom_match = re.search(r'(\d+)\s+nomination', awards, re.IGNORECASE)
    if nom_match:
        nominations = int(nom_match.group(1))
    else:
        nom_matches = re.findall(r'Nominated\s+for\s+(\d+)\s+', awards, re.IGNORECASE)
        if nom_matches:
            nominations = sum(int(x) for x in nom_matches)

    return {"wins": wins, "nominations": nominations}

def get_netflix_data():
    global cached_netflix_data
    if cached_netflix_data:
        return cached_netflix_data

    if not CSV_PATH.exists():
        print(f"[CSV Engine] Warning: Master CSV file not found at: {CSV_PATH}")
        return []

    try:
        df = pd.read_csv(CSV_PATH, dtype=str)
        df = df.fillna("")
        raw_rows = df.to_dict(orient="records")

        data_list = []
        for row in raw_rows:
            show_id = row.get("show_id", "")
            director_str = row.get("director", "")
            cast_str = row.get("cast", "")
            country_str = row.get("country", "")
            genres_str = row.get("genres", "")
            
            directors_list = [s.strip() for s in director_str.split(",") if s.strip()] if director_str else []
            cast_list = [s.strip() for s in cast_str.split(",") if s.strip()] if cast_str else []
            countries_list = [s.strip() for s in country_str.split(",") if s.strip()] if country_str else []
            genres_list = [s.strip() for s in genres_str.split(",") if s.strip()] if genres_str else []

            title_type = "TV Show" if row.get("type", "") == "TV Show" else "Movie"
            duration_str = row.get("duration", "").strip()
            duration_val = 0
            duration_unit = ""

            if title_type == "Movie":
                if not duration_str:
                    # Generate simulated runtime for movies if empty
                    digits = re.sub(r"\D", "", show_id)
                    seed = int(digits) if digits else 0
                    duration_val = 82 + seed % 78
                    duration_str = f"{duration_val} min"
                    duration_unit = "min"
                else:
                    match = re.match(r"^(\d+)\s*(.*)$", duration_str)
                    if match:
                        duration_val = int(match.group(1))
                        duration_unit = match.group(2) or "min"
            else:
                if not duration_str:
                    duration_str = "1 Season"
                match = re.match(r"^(\d+)\s*(.*)$", duration_str)
                if match:
                    duration_val = int(match.group(1))
                    duration_unit = match.group(2) or "Season"
                else:
                    duration_val = 1
                    duration_unit = "Season"

            # Parse date added
            date_added_str = row.get("date_added", "").strip()
            parsed_date_added = None
            if date_added_str:
                try:
                    # Use pandas to parse flexibly, then convert to ISO format string
                    parsed_dt = pd.to_datetime(date_added_str)
                    if not pd.isna(parsed_dt):
                        parsed_date_added = parsed_dt.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
                except Exception:
                    pass

            imdb_id = row.get("imdb_id", "")
            
            try:
                imdb_rating = float(row.get("imdb_rating", 0))
            except ValueError:
                imdb_rating = 0.0

            imdb_votes_str = row.get("imdb_votes", "").replace(",", "")
            try:
                imdb_votes = int(imdb_votes_str) if imdb_votes_str else 0
            except ValueError:
                imdb_votes = 0

            try:
                metascore = int(row.get("metascore", 0))
            except ValueError:
                metascore = 0

            rt_str = row.get("rotten_tomatoes_rating", "").replace("%", "")
            try:
                rotten_tomatoes_rating = int(rt_str) if rt_str else 0
            except ValueError:
                rotten_tomatoes_rating = 0

            awards = row.get("awards", "")
            rated = row.get("rated", "")
            dvd = row.get("dvd", "")
            
            box_office_str = re.sub(r"[$,]", "", row.get("box_office", ""))
            try:
                box_office = int(box_office_str) if box_office_str else 0
            except ValueError:
                box_office = 0

            production_company = row.get("production_company", "")
            website = row.get("website", "")
            awards_wins = parse_awards(awards)["wins"]

            try:
                popularity = float(row.get("popularity", 0))
            except ValueError:
                popularity = 0.0

            try:
                vote_count = int(row.get("vote_count", 0))
            except ValueError:
                vote_count = 0

            try:
                vote_average = float(row.get("vote_average", 0))
            except ValueError:
                vote_average = 0.0

            data_list.append({
                "show_id": show_id,
                "type": title_type,
                "title": row.get("title", ""),
                "director": director_str,
                "cast": cast_str,
                "country": country_str,
                "date_added": date_added_str,
                "release_year": int(row.get("release_year", 0)) if row.get("release_year") else 0,
                "rating": row.get("rating", "").strip() if row.get("rating") else "Unrated",
                "duration": duration_str,
                "genres": genres_str,
                "language": row.get("language", "en") or "en",
                "description": row.get("description", ""),
                "popularity": popularity,
                "vote_count": vote_count,
                "vote_average": vote_average,
                "poster_path": row.get("poster_path", ""),
                "backdrop_path": row.get("backdrop_path", ""),
                "directorsList": directors_list,
                "castList": cast_list,
                "countriesList": countries_list,
                "genresList": genres_list,
                "durationVal": duration_val,
                "durationUnit": duration_unit,
                "parsedDateAdded": parsed_date_added,
                "imdb_id": imdb_id,
                "imdb_rating": imdb_rating,
                "imdb_votes": imdb_votes,
                "metascore": metascore,
                "rotten_tomatoes_rating": rotten_tomatoes_rating,
                "awards": awards,
                "rated": rated,
                "dvd": dvd,
                "box_office": box_office,
                "production_company": production_company,
                "website": website,
                "awardsWins": awards_wins
            })
        
        cached_netflix_data = data_list
        print(f"[CSV Engine] Loaded {len(cached_netflix_data)} rows successfully.")
        return cached_netflix_data
    except Exception as e:
        print(f"[CSV Engine] Failed to load or parse master CSV: {e}")
        return []

def get_thinned_netflix_data():
    global cached_thinned_data
    if cached_thinned_data:
        return cached_thinned_data

    data = get_netflix_data()

    # Load TMDb cache
    tmdb_cache = {}
    if TMDB_CACHE_PATH.exists():
        try:
            with open(TMDB_CACHE_PATH, "r", encoding="utf-8") as f:
                tmdb_cache = json.load(f)
        except Exception as e:
            print(f"[CSV Engine] Failed to load tmdb_cache.json: {e}")

    thinned = []
    for title in data:
        show_id = title["show_id"]
        cached = tmdb_cache.get(show_id, {})
        
        genres_list = title["genresList"]
        if cached.get("matched") and cached.get("genres"):
            genres_list = cached["genres"]

        vote_average = title["vote_average"]
        if cached.get("matched") and "vote_average" in cached:
            vote_average = cached["vote_average"]

        poster_path = ""
        if cached.get("matched") and cached.get("poster_url"):
            poster_path = cached["poster_url"]

        backdrop_path = ""
        if cached.get("matched") and cached.get("backdrop_url"):
            backdrop_path = cached["backdrop_url"]

        thinned.append({
            "show_id": show_id,
            "type": title["type"],
            "title": title["title"],
            "director": title["director"][:100] if title["director"] else "",
            "cast": title["cast"][:150] if title["cast"] else "",
            "country": title["country"][:100] if title["country"] else "",
            "release_year": title["release_year"],
            "rating": title["rating"],
            "duration": title["duration"],
            "popularity": title["popularity"],
            "vote_average": vote_average,
            "poster_path": poster_path,
            "backdrop_path": backdrop_path,
            "directorsList": title["directorsList"][:2],
            "castList": title["castList"][:3],
            "countriesList": title["countriesList"],
            "genresList": genres_list,
            "durationVal": title["durationVal"],
            "imdb_rating": title["imdb_rating"],
            "imdb_votes": title["imdb_votes"],
            "awardsWins": title["awardsWins"],
            "production_company": title["production_company"],
            "description": title["description"][:60] if title["description"] else "",
            "parsedDateAdded": title["parsedDateAdded"],
            "language": title["language"]
        })
    
    cached_thinned_data = thinned
    return cached_thinned_data

def get_kpis():
    global cached_kpis
    if cached_kpis:
        return cached_kpis

    data = get_netflix_data()
    movies = [d for d in data if d["type"] == "Movie"]
    tv_shows = [d for d in data if d["type"] == "TV Show"]

    unique_countries = set()
    unique_genres = set()

    for d in data:
        for c in d["countriesList"]:
            unique_countries.add(c)
        for g in d["genresList"]:
            unique_genres.add(g)

    avg_movie_duration = 0
    if movies:
        avg_movie_duration = round(sum(m["durationVal"] for m in movies) / len(movies))

    avg_tv_show_seasons = 0.0
    if tv_shows:
        avg_tv_show_seasons = round((sum(t["durationVal"] for t in tv_shows) / len(tv_shows)) * 10) / 10

    titles_with_imdb = [d for d in data if d["imdb_rating"] > 0]
    avg_imdb_rating = 0.0
    if titles_with_imdb:
        avg_imdb_rating = round((sum(d["imdb_rating"] for d in titles_with_imdb) / len(titles_with_imdb)) * 10) / 10

    titles_with_tmdb = [d for d in data if d["vote_average"] > 0]
    avg_tmdb_rating = 0.0
    if titles_with_tmdb:
        avg_tmdb_rating = round((sum(d["vote_average"] for d in titles_with_tmdb) / len(titles_with_tmdb)) * 10) / 10

    cached_kpis = {
        "totalTitles": len(data),
        "movieCount": len(movies),
        "tvShowCount": len(tv_shows),
        "countriesCount": len(unique_countries),
        "genresCount": len(unique_genres),
        "avgMovieDuration": avg_movie_duration,
        "avgTVShowSeasons": avg_tv_show_seasons,
        "avgImdbRating": avg_imdb_rating,
        "avgTmdbRating": avg_tmdb_rating,
    }
    return cached_kpis

def get_executive_stats():
    global cached_executive_stats
    if cached_executive_stats:
        return cached_executive_stats

    data = get_netflix_data()
    total = len(data)
    if total == 0:
        return {}

    movies_count = sum(1 for d in data if d["type"] == "Movie")
    tv_shows_count = total - movies_count

    # 1. Type Distribution
    type_distribution = [
        {"name": "Movies", "value": movies_count, "percentage": round((movies_count / total) * 100)},
        {"name": "TV Shows", "value": tv_shows_count, "percentage": round((tv_shows_count / total) * 100)},
    ]

    # 2. Date Added Trend (2008 - 2025)
    added_by_year = {}
    for d in data:
        if d["parsedDateAdded"]:
            try:
                dt = datetime.strptime(d["parsedDateAdded"], "%Y-%m-%dT%H:%M:%S.%fZ")
                year = dt.year
                if 2008 <= year <= 2025:
                    if year not in added_by_year:
                        added_by_year[year] = {"total": 0, "movies": 0, "tvShows": 0}
                    added_by_year[year]["total"] += 1
                    if d["type"] == "Movie":
                        added_by_year[year]["movies"] += 1
                    else:
                        added_by_year[year]["tvShows"] += 1
            except Exception:
                pass

    date_added_trend = []
    for y in sorted(added_by_year.keys()):
        date_added_trend.append({
            "year": y,
            "total": added_by_year[y]["total"],
            "movies": added_by_year[y]["movies"],
            "tvShows": added_by_year[y]["tvShows"]
        })

    # 3. Top Countries
    country_counts = {}
    for d in data:
        for c in d["countriesList"]:
            if c not in country_counts:
                country_counts[c] = {"movies": 0, "tvShows": 0, "total": 0}
            country_counts[c]["total"] += 1
            if d["type"] == "Movie":
                country_counts[c]["movies"] += 1
            else:
                country_counts[c]["tvShows"] += 1

    top_countries = []
    for c, counts in sorted(country_counts.items(), key=lambda item: item[1]["total"], reverse=True)[:10]:
        top_countries.append({
            "name": c,
            "total": counts["total"],
            "movies": counts["movies"],
            "tvShows": counts["tvShows"]
        })

    # 4. Ratings Distribution
    rating_counts = {}
    for d in data:
        r = d["rating"]
        rating_counts[r] = rating_counts.get(r, 0) + 1

    ratings_distribution = []
    for r, count in sorted(rating_counts.items(), key=lambda item: item[1], reverse=True)[:10]:
        ratings_distribution.append({"name": r, "value": count})

    # 5. OMDb Stats
    titles_with_imdb = [d for d in data if d["imdb_rating"] > 0]
    avg_imdb_rating = 0.0
    if titles_with_imdb:
        avg_imdb_rating = round((sum(d["imdb_rating"] for d in titles_with_imdb) / len(titles_with_imdb)) * 10) / 10

    titles_with_rt = [d for d in data if d["rotten_tomatoes_rating"] > 0]
    avg_rotten_tomatoes = 0
    if titles_with_rt:
        avg_rotten_tomatoes = round(sum(d["rotten_tomatoes_rating"] for d in titles_with_rt) / len(titles_with_rt))

    titles_with_meta = [d for d in data if d["metascore"] > 0]
    avg_metascore = 0
    if titles_with_meta:
        avg_metascore = round(sum(d["metascore"] for d in titles_with_meta) / len(titles_with_meta))

    total_awards_won = sum(d["awardsWins"] for d in data)
    total_imdb_votes = sum(d["imdb_votes"] for d in data)

    cached_executive_stats = {
        "typeDistribution": type_distribution,
        "dateAddedTrend": date_added_trend,
        "topCountries": top_countries,
        "ratingsDistribution": ratings_distribution,
        "kpis": {
            "avgImdbRating": avg_imdb_rating,
            "avgRottenTomatoes": avg_rotten_tomatoes,
            "avgMetascore": avg_metascore,
            "totalAwardsWon": total_awards_won,
            "totalImdbVotes": total_imdb_votes
        }
    }
    return cached_executive_stats

def get_content_insights():
    global cached_content_insights
    if cached_content_insights:
        return cached_content_insights

    data = get_netflix_data()

    # 1. Release Year Trend (1992 - 2025)
    release_by_year = {}
    for d in data:
        yr = d["release_year"]
        if 1992 <= yr <= 2025:
            if yr not in release_by_year:
                release_by_year[yr] = {"movies": 0, "tvShows": 0, "total": 0}
            release_by_year[yr]["total"] += 1
            if d["type"] == "Movie":
                release_by_year[yr]["movies"] += 1
            else:
                release_by_year[yr]["tvShows"] += 1

    release_year_trend = []
    for y in sorted(release_by_year.keys()):
        release_year_trend.append({
            "year": y,
            "movies": release_by_year[y]["movies"],
            "tvShows": release_by_year[y]["tvShows"],
            "total": release_by_year[y]["total"]
        })

    # 2. Genre Distribution
    genre_counts = {}
    for d in data:
        for g in d["genresList"]:
            if g not in genre_counts:
                genre_counts[g] = {"movies": 0, "tvShows": 0, "total": 0}
            genre_counts[g]["total"] += 1
            if d["type"] == "Movie":
                genre_counts[g]["movies"] += 1
            else:
                genre_counts[g]["tvShows"] += 1

    genre_distribution = []
    for g, counts in sorted(genre_counts.items(), key=lambda item: item[1]["total"], reverse=True)[:15]:
        genre_distribution.append({
            "name": g,
            "total": counts["total"],
            "movies": counts["movies"],
            "tvShows": counts["tvShows"]
        })

    # 3. Duration Distribution
    movie_buckets = {
        "Short (< 95 min)": 0,
        "Medium (95 - 110 min)": 0,
        "Standard (110 - 125 min)": 0,
        "Long (125 - 140 min)": 0,
        "Epic (> 140 min)": 0,
    }

    tv_buckets = {
        "1 Season": 0,
        "2 Seasons": 0,
        "3 Seasons": 0,
        "4-5 Seasons": 0,
        "6+ Seasons": 0,
    }

    for d in data:
        if d["type"] == "Movie":
            mins = d["durationVal"]
            if mins < 95:
                movie_buckets["Short (< 95 min)"] += 1
            elif 95 <= mins <= 110:
                movie_buckets["Medium (95 - 110 min)"] += 1
            elif 110 < mins <= 125:
                movie_buckets["Standard (110 - 125 min)"] += 1
            elif 125 < mins <= 140:
                movie_buckets["Long (125 - 140 min)"] += 1
            else:
                movie_buckets["Epic (> 140 min)"] += 1
        else:
            seasons = d["durationVal"]
            if seasons == 1:
                tv_buckets["1 Season"] += 1
            elif seasons == 2:
                tv_buckets["2 Seasons"] += 1
            elif seasons == 3:
                tv_buckets["3 Seasons"] += 1
            elif 4 <= seasons <= 5:
                tv_buckets["4-5 Seasons"] += 1
            else:
                tv_buckets["6+ Seasons"] += 1

    movie_duration_data = [{"name": k, "value": v} for k, v in movie_buckets.items()]
    tv_duration_data = [{"name": k, "value": v} for k, v in tv_buckets.items()]

    # 4. IMDb, RT, Metascore Distributions
    imdb_rating_buckets = {"Under 5.0": 0, "5.0 - 6.0": 0, "6.0 - 7.0": 0, "7.0 - 8.0": 0, "8.0 - 9.0": 0, "9.0 - 10.0": 0}
    rt_rating_buckets = {"Under 50%": 0, "50% - 60%": 0, "60% - 70%": 0, "70% - 80%": 0, "80% - 90%": 0, "90% - 100%": 0}
    metascore_buckets = {"Under 50": 0, "50 - 60": 0, "60 - 70": 0, "70 - 80": 0, "80 - 90": 0, "90 - 100": 0}

    genre_awards = {}
    genre_rating_sum = {}
    genre_rating_count = {}
    awards_by_year_map = {}

    runtime_imdb_sum = {"< 90 min": 0.0, "90 - 110 min": 0.0, "110 - 130 min": 0.0, "130 - 150 min": 0.0, "> 150 min": 0.0}
    runtime_imdb_count = {"< 90 min": 0, "90 - 110 min": 0, "110 - 130 min": 0, "130 - 150 min": 0, "> 150 min": 0}

    country_rating_sum = {}
    country_rating_count = {}

    for d in data:
        # A. Rating Distributions
        if d["imdb_rating"] > 0:
            rating = d["imdb_rating"]
            if rating < 5.0:
                imdb_rating_buckets["Under 5.0"] += 1
            elif rating < 6.0:
                imdb_rating_buckets["5.0 - 6.0"] += 1
            elif rating < 7.0:
                imdb_rating_buckets["6.0 - 7.0"] += 1
            elif rating < 8.0:
                imdb_rating_buckets["7.0 - 8.0"] += 1
            elif rating < 9.0:
                imdb_rating_buckets["8.0 - 9.0"] += 1
            else:
                imdb_rating_buckets["9.0 - 10.0"] += 1

        if d["rotten_tomatoes_rating"] > 0:
            rt = d["rotten_tomatoes_rating"]
            if rt < 50:
                rt_rating_buckets["Under 50%"] += 1
            elif rt < 60:
                rt_rating_buckets["50% - 60%"] += 1
            elif rt < 70:
                rt_rating_buckets["60% - 70%"] += 1
            elif rt < 80:
                rt_rating_buckets["70% - 80%"] += 1
            elif rt < 90:
                rt_rating_buckets["80% - 90%"] += 1
            else:
                rt_rating_buckets["90% - 100%"] += 1

        if d["metascore"] > 0:
            meta = d["metascore"]
            if meta < 50:
                metascore_buckets["Under 50"] += 1
            elif meta < 60:
                metascore_buckets["50 - 60"] += 1
            elif meta < 70:
                metascore_buckets["60 - 70"] += 1
            elif meta < 80:
                metascore_buckets["70 - 80"] += 1
            elif meta < 90:
                metascore_buckets["80 - 90"] += 1
            else:
                metascore_buckets["90 - 100"] += 1

        # B. Genre analytics
        for g in d["genresList"]:
            genre_awards[g] = genre_awards.get(g, 0) + d["awardsWins"]
            if d["imdb_rating"] > 0:
                genre_rating_sum[g] = genre_rating_sum.get(g, 0.0) + d["imdb_rating"]
                genre_rating_count[g] = genre_rating_count.get(g, 0) + 1

        # C. Awards by release year
        yr = d["release_year"]
        if 1990 <= yr <= 2025:
            awards_by_year_map[yr] = awards_by_year_map.get(yr, 0) + d["awardsWins"]

        # D. Runtime vs IMDb (Movies)
        if d["type"] == "Movie" and d["imdb_rating"] > 0:
            mins = d["durationVal"]
            bucket = None
            if mins < 90:
                bucket = "< 90 min"
            elif mins <= 110:
                bucket = "90 - 110 min"
            elif mins <= 130:
                bucket = "110 - 130 min"
            elif mins <= 150:
                bucket = "130 - 150 min"
            else:
                bucket = "> 150 min"

            runtime_imdb_sum[bucket] += d["imdb_rating"]
            runtime_imdb_count[bucket] += 1

        # E. Country vs IMDb
        for c in d["countriesList"]:
            if d["imdb_rating"] > 0:
                country_rating_sum[c] = country_rating_sum.get(c, 0.0) + d["imdb_rating"]
                country_rating_count[c] = country_rating_count.get(c, 0) + 1

    imdb_rating_distribution = [{"name": k, "value": v} for k, v in imdb_rating_buckets.items()]
    rt_distribution = [{"name": k, "value": v} for k, v in rt_rating_buckets.items()]
    metascore_distribution = [{"name": k, "value": v} for k, v in metascore_buckets.items()]

    awards_by_genre = []
    for g, val in sorted(genre_awards.items(), key=lambda x: x[1], reverse=True)[:12]:
        awards_by_genre.append({"name": g, "value": val})

    awards_by_year = []
    for y in sorted(awards_by_year_map.keys()):
        awards_by_year.append({"year": y, "value": awards_by_year_map[y]})

    runtime_vs_imdb = []
    for k in ["< 90 min", "90 - 110 min", "110 - 130 min", "130 - 150 min", "> 150 min"]:
        s = runtime_imdb_sum[k]
        c = runtime_imdb_count[k]
        runtime_vs_imdb.append({
            "name": k,
            "value": round((s / c) * 10) / 10 if c > 0 else 0.0
        })

    genre_vs_imdb = []
    for g, s in genre_rating_sum.items():
        c = genre_rating_count[g]
        if c >= 5:  # Min 5 titles
            genre_vs_imdb.append({
                "name": g,
                "value": round((s / c) * 10) / 10
            })
    genre_vs_imdb = sorted(genre_vs_imdb, key=lambda x: x["value"], reverse=True)[:12]

    country_vs_imdb = []
    for c, s in country_rating_sum.items():
        cnt = country_rating_count[c]
        if cnt >= 10:  # Min 10 titles
            country_vs_imdb.append({
                "name": c,
                "value": round((s / cnt) * 10) / 10
            })
    country_vs_imdb = sorted(country_vs_imdb, key=lambda x: x["value"], reverse=True)[:12]

    cached_content_insights = {
        "releaseYearTrend": release_year_trend,
        "genreDistribution": genre_distribution,
        "movieDurationData": movie_duration_data,
        "tvDurationData": tv_duration_data,
        "imdbRatingDistribution": imdb_rating_distribution,
        "rtDistribution": rt_distribution,
        "metascoreDistribution": metascore_distribution,
        "awardsByGenre": awards_by_genre,
        "awardsByYear": awards_by_year,
        "runtimeVsImdb": runtime_vs_imdb,
        "genreVsImdb": genre_vs_imdb,
        "countryVsImdb": country_vs_imdb,
    }
    return cached_content_insights

def get_people_geography():
    global cached_people_geography
    if cached_people_geography:
        return cached_people_geography

    data = get_netflix_data()

    # 1. Top Directors
    director_counts = {}
    for d in data:
        for dir_name in d["directorsList"]:
            if dir_name not in director_counts:
                director_counts[dir_name] = {"total": 0, "movies": 0, "tvShows": 0}
            director_counts[dir_name]["total"] += 1
            if d["type"] == "Movie":
                director_counts[dir_name]["movies"] += 1
            else:
                director_counts[dir_name]["tvShows"] += 1

    top_directors = []
    for name, counts in sorted(director_counts.items(), key=lambda x: x[1]["total"], reverse=True)[:15]:
        top_directors.append({
            "name": name,
            "total": counts["total"],
            "movies": counts["movies"],
            "tvShows": counts["tvShows"]
        })

    # 2. Top Cast Members
    actor_counts = {}
    for d in data:
        for act in d["castList"]:
            if act not in actor_counts:
                actor_counts[act] = {"total": 0, "movies": 0, "tvShows": 0}
            actor_counts[act]["total"] += 1
            if d["type"] == "Movie":
                actor_counts[act]["movies"] += 1
            else:
                actor_counts[act]["tvShows"] += 1

    top_actors = []
    for name, counts in sorted(actor_counts.items(), key=lambda x: x[1]["total"], reverse=True)[:15]:
        top_actors.append({
            "name": name,
            "total": counts["total"],
            "movies": counts["movies"],
            "tvShows": counts["tvShows"]
        })

    # 3. Country Details
    country_counts = {}
    for d in data:
        for c in d["countriesList"]:
            if c not in country_counts:
                country_counts[c] = {"total": 0, "movies": 0, "tvShows": 0}
            country_counts[c]["total"] += 1
            if d["type"] == "Movie":
                country_counts[c]["movies"] += 1
            else:
                country_counts[c]["tvShows"] += 1

    country_details = []
    for c, counts in sorted(country_counts.items(), key=lambda x: x[1]["total"], reverse=True)[:12]:
        country_details.append({
            "country": c,
            "Movies": counts["movies"],
            "TV Shows": counts["tvShows"],
            "total": counts["total"]
        })

    # 4. OMDb People Calculations
    director_rating_sum = {}
    director_rating_count = {}
    director_awards = {}

    actor_rating_sum = {}
    actor_rating_count = {}
    actor_awards = {}

    country_rating_sum_geo = {}
    country_rating_count_geo = {}

    for d in data:
        # Directors
        for dir_name in d["directorsList"]:
            director_awards[dir_name] = director_awards.get(dir_name, 0) + d["awardsWins"]
            if d["imdb_rating"] > 0:
                director_rating_sum[dir_name] = director_rating_sum.get(dir_name, 0.0) + d["imdb_rating"]
                director_rating_count[dir_name] = director_rating_count.get(dir_name, 0) + 1

        # Actors
        for act in d["castList"]:
            actor_awards[act] = actor_awards.get(act, 0) + d["awardsWins"]
            if d["imdb_rating"] > 0:
                actor_rating_sum[act] = actor_rating_sum.get(act, 0.0) + d["imdb_rating"]
                actor_rating_count[act] = actor_rating_count.get(act, 0) + 1

        # Countries
        for c in d["countriesList"]:
            if d["imdb_rating"] > 0:
                country_rating_sum_geo[c] = country_rating_sum_geo.get(c, 0.0) + d["imdb_rating"]
                country_rating_count_geo[c] = country_rating_count_geo.get(c, 0) + 1

    highest_rated_directors = []
    for name, s in director_rating_sum.items():
        c = director_rating_count[name]
        if c >= 3:
            highest_rated_directors.append({
                "name": name,
                "value": round((s / c) * 10) / 10,
                "count": c
            })
    highest_rated_directors = sorted(highest_rated_directors, key=lambda x: x["value"], reverse=True)[:15]

    highest_rated_actors = []
    for name, s in actor_rating_sum.items():
        c = actor_rating_count[name]
        if c >= 3:
            highest_rated_actors.append({
                "name": name,
                "value": round((s / c) * 10) / 10,
                "count": c
            })
    highest_rated_actors = sorted(highest_rated_actors, key=lambda x: x["value"], reverse=True)[:15]

    most_awarded_directors = []
    for name, val in sorted(director_awards.items(), key=lambda x: x[1], reverse=True)[:15]:
        most_awarded_directors.append({"name": name, "value": val})

    most_awarded_actors = []
    for name, val in sorted(actor_awards.items(), key=lambda x: x[1], reverse=True)[:15]:
        most_awarded_actors.append({"name": name, "value": val})

    highest_rated_countries = []
    for name, s in country_rating_sum_geo.items():
        c = country_rating_count_geo[name]
        if c >= 5:
            highest_rated_countries.append({
                "name": name,
                "value": round((s / c) * 10) / 10,
                "count": c
            })
    highest_rated_countries = sorted(highest_rated_countries, key=lambda x: x["value"], reverse=True)[:15]

    cached_people_geography = {
        "topDirectors": top_directors,
        "topActors": top_actors,
        "countryDetails": country_details,
        "highestRatedDirectors": highest_rated_directors,
        "highestRatedActors": highest_rated_actors,
        "mostAwardedDirectors": most_awarded_directors,
        "mostAwardedActors": most_awarded_actors,
        "highestRatedCountries": highest_rated_countries,
    }
    return cached_people_geography

def get_filtered_titles(params: dict):
    data = get_netflix_data()
    result = list(data)

    # Search filter
    search_q = params.get("search", "")
    if search_q and search_q.strip():
        query = search_q.lower().strip()
        result = [
            d for d in result
            if query in d["title"].lower() or
               query in d["director"].lower() or
               query in d["cast"].lower() or
               query in d["description"].lower()
        ]

    # Type filter
    title_type = params.get("type", "All")
    if title_type and title_type != "All":
        result = [d for d in result if d["type"] == title_type]

    # Genre filter
    genre = params.get("genre", "All")
    if genre and genre != "All":
        result = [d for d in result if genre in d["genresList"]]

    # Country filter
    country = params.get("country", "All")
    if country and country != "All":
        result = [d for d in result if country in d["countriesList"]]

    # Rating filter
    rating = params.get("rating", "All")
    if rating and rating != "All":
        result = [d for d in result if d["rating"] == rating]

    # Year filter
    year_param = params.get("year", "All")
    if year_param and year_param != "All":
        if "-" in year_param:
            try:
                start, end = map(int, year_param.split("-"))
                result = [d for d in result if start <= d["release_year"] <= end]
            except ValueError:
                pass
        elif year_param.startswith("Before"):
            try:
                limit_year = int(year_param.replace("Before", "").strip())
                result = [d for d in result if d["release_year"] < limit_year]
            except ValueError:
                pass
        else:
            try:
                target_year = int(year_param)
                result = [d for d in result if d["release_year"] == target_year]
            except ValueError:
                pass

    # Sorting
    sort_by = params.get("sortBy", "title")
    sort_order = params.get("sortOrder", "asc")
    reverse_sort = (sort_order == "desc")

    def get_sort_key(item):
        if sort_by == "release_year":
            return item["release_year"]
        elif sort_by == "date_added":
            if item["parsedDateAdded"]:
                return item["parsedDateAdded"]
            return ""
        # Default to title
        return item["title"].lower()

    result.sort(key=get_sort_key, reverse=reverse_sort)

    # Compute unique lists for controls from full dataset
    genres = sorted(list(set(g for d in data for g in d["genresList"])))
    countries = sorted(list(set(c for d in data for c in d["countriesList"])))
    ratings = sorted(list(set(d["rating"] for d in data)))
    years = sorted(list(set(d["release_year"] for d in data)), reverse=True)

    # Pagination
    page = int(params.get("page", 1))
    limit = int(params.get("limit", 20))
    start_index = (page - 1) * limit
    paginated_result = result[start_index:start_index + limit]

    return {
        "titles": paginated_result,
        "totalCount": len(result),
        "totalPages": math.ceil(len(result) / limit) if limit > 0 else 1,
        "page": page,
        "limit": limit,
        "filterOptions": {
            "genres": genres,
            "countries": countries,
            "ratings": ratings,
            "years": years,
        }
    }

def get_title_details(show_id: str):
    data = get_netflix_data()
    for d in data:
        if d["show_id"] == show_id:
            return d
    return None

def init_search_indexing():
    global unique_actors, unique_directors, unique_genres, is_search_init
    if is_search_init:
        return

    data = get_netflix_data()
    
    # Enrich with poster / backdrop if TMDB cache matches
    tmdb_cache = {}
    if TMDB_CACHE_PATH.exists():
        try:
            with open(TMDB_CACHE_PATH, "r", encoding="utf-8") as f:
                tmdb_cache = json.load(f)
        except Exception:
            pass

    actor_counts = {}
    director_counts = {}
    genre_counts = {}

    for t in data:
        show_id = t["show_id"]
        cached = tmdb_cache.get(show_id, {})
        
        # Apply cache-enrichment in-memory for index consistency
        if cached.get("matched"):
            t["poster_path"] = cached.get("poster_url", "")
            t["backdrop_path"] = cached.get("backdrop_url", "")
            t["vote_average"] = cached.get("vote_average", t["vote_average"])
            if cached.get("genres"):
                t["genresList"] = cached["genres"]

        for a in t["castList"]:
            if a:
                actor_counts[a] = actor_counts.get(a, 0) + 1
        for d_name in t["directorsList"]:
            if d_name:
                director_counts[d_name] = director_counts.get(d_name, 0) + 1
        for g in t["genresList"]:
            if g:
                genre_counts[g] = genre_counts.get(g, 0) + 1

    unique_actors = [{"name": k, "count": v} for k, v in actor_counts.items()]
    unique_directors = [{"name": k, "count": v} for k, v in director_counts.items()]
    unique_genres = [{"name": k, "count": v} for k, v in genre_counts.items()]

    is_search_init = True
