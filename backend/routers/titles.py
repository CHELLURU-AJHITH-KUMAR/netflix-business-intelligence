import os
import json
import urllib.parse
import requests
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from config import settings
from analytics.engine import (
    get_filtered_titles, get_title_details, get_netflix_data,
    TMDB_CACHE_PATH, OMDB_CACHE_PATH, BASE_DIR
)

router = APIRouter(prefix="/api/titles", tags=["titles"])

# Cache loaders/savers
def load_json_cache(path):
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_json_cache(path, cache):
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[Router Titles] Failed to save cache to {path}: {e}")

def log_unmatched_omdb(title, year, type_str, error_msg):
    log_path = BASE_DIR / "omdb_unmatched.log"
    try:
        log_line = f"[{datetime.utcnow().isoformat()}] Unmatched: \"{title}\" ({year}) [{type_str}] - Reason: {error_msg}\n"
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(log_line)
    except Exception as e:
        print(f"[Router Titles] Failed to write to unmatched log: {e}")

@router.get("")
def get_titles(
    type: str = Query("All", alias="type"),
    year: str = Query("All", alias="year"),
    genre: str = Query("All", alias="genre"),
    country: str = Query("All", alias="country"),
    rating: str = Query("All", alias="rating"),
    search: str = Query("", alias="search"),
    page: int = Query(1, alias="page"),
    limit: int = Query(20, alias="limit"),
    sortBy: str = Query("title", alias="sortBy"),
    sortOrder: str = Query("asc", alias="sortOrder")
):
    params = {
        "type": type,
        "year": year,
        "genre": genre,
        "country": country,
        "rating": rating,
        "search": search,
        "page": page,
        "limit": limit,
        "sortBy": sortBy,
        "sortOrder": sortOrder
    }
    return get_filtered_titles(params)

@router.get("/{id}")
def get_title(id: str):
    details = get_title_details(id)
    if not details:
        raise HTTPException(status_code=404, detail="Title not found")
    return details

@router.get("/{id}/tmdb")
def get_title_tmdb(id: str):
    tmdb_cache = load_json_cache(TMDB_CACHE_PATH)
    if id in tmdb_cache:
        return tmdb_cache[id]

    api_key = settings.TMDB_API_KEY
    if not api_key:
        print("[Router Titles] Warning: TMDB_API_KEY missing from environment.")
        return {"error": "API Key Missing"}

    catalog_item = get_title_details(id)
    if not catalog_item:
        raise HTTPException(status_code=404, detail="Title not found in catalog")

    title = catalog_item["title"]
    type_str = catalog_item["type"]
    release_year = catalog_item["release_year"]
    clean_title = title.strip()

    is_movie = (type_str == "Movie")
    search_endpoint = "movie" if is_movie else "tv"

    # Search TMDb with release year
    search_url = f"https://api.themoviedb.org/3/search/{search_endpoint}?api_key={api_key}&query={urllib.parse.quote(clean_title)}"
    if is_movie:
        search_url += f"&year={release_year}"
    else:
        search_url += f"&first_air_date_year={release_year}"

    try:
        res = requests.get(search_url, timeout=10)
        search_data = res.json()
    except Exception as e:
        print(f"[Router Titles] TMDB request failed: {e}")
        return {"error": "Request failed"}

    # Fallback: search without year
    if not search_data.get("results"):
        fallback_url = f"https://api.themoviedb.org/3/search/{search_endpoint}?api_key={api_key}&query={urllib.parse.quote(clean_title)}"
        try:
            res = requests.get(fallback_url, timeout=10)
            search_data = res.json()
        except Exception:
            pass

    if not search_data.get("results"):
        fallback_data = {
            "matched": False,
            "title": clean_title,
            "poster_url": None,
            "backdrop_url": None,
            "vote_average": 0.0,
            "vote_count": 0,
            "tagline": "",
            "overview": catalog_item["description"],
            "genres": catalog_item["genresList"],
            "imdb_id": None,
            "cast": [],
            "crew": [],
            "similar": [],
        }
        tmdb_cache[id] = fallback_data
        save_json_cache(TMDB_CACHE_PATH, tmdb_cache)
        return fallback_data

    best_match = search_data["results"][0]
    tmdb_id = best_match["id"]

    # Fetch full details, credits, and similar in one go
    details_url = f"https://api.themoviedb.org/3/{search_endpoint}/{tmdb_id}?api_key={api_key}&append_to_response=credits,similar"
    try:
        res = requests.get(details_url, timeout=10)
        details = res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TMDb details fetch failed: {e}")

    # Process cast
    cast_list = []
    for c in details.get("credits", {}).get("cast", [])[:8]:
        cast_list.append({
            "name": c.get("name", ""),
            "character": c.get("character", ""),
            "profile_url": f"https://image.tmdb.org/t/p/w185{c.get('profile_path')}" if c.get("profile_path") else None
        })

    # Process crew
    crew_list = []
    for c in details.get("credits", {}).get("crew", []):
        if c.get("job") in ["Director", "Screenplay", "Writer"]:
            crew_list.append({
                "name": c.get("name", ""),
                "job": c.get("job", "")
            })
            if len(crew_list) >= 4:
                break

    # Process similar titles matched with local CSV
    csv_data = get_netflix_data()
    similar_list = []
    for s in details.get("similar", {}).get("results", [])[:6]:
        sim_title = s.get("title") or s.get("name") or ""
        sim_release_date = s.get("release_date") or s.get("first_air_date") or ""
        try:
            sim_year = datetime.strptime(sim_release_date[:4], "%Y").year if sim_release_date else 0
        except Exception:
            sim_year = 0

        # Match local catalog show_id
        matched_show_id = None
        for item in csv_data:
            is_same = item["title"].lower() == sim_title.lower()
            is_sim = sim_title.lower() in item["title"].lower() or item["title"].lower() in sim_title.lower()
            is_close = abs(item["release_year"] - sim_year) <= 1
            if is_same or (is_sim and is_close):
                matched_show_id = item["show_id"]
                break

        similar_list.append({
            "tmdb_id": s.get("id"),
            "show_id": matched_show_id,
            "title": sim_title,
            "poster_url": f"https://image.tmdb.org/t/p/w342{s.get('poster_path')}" if s.get("poster_path") else None,
            "release_year": sim_year,
            "vote_average": round(s.get("vote_average", 0.0) * 10) / 10
        })

    enriched = {
        "matched": True,
        "tmdb_id": tmdb_id,
        "title": details.get("title") or details.get("name") or clean_title,
        "poster_url": f"https://image.tmdb.org/t/p/w500{details.get('poster_path')}" if details.get("poster_path") else None,
        "backdrop_url": f"https://image.tmdb.org/t/p/w1280{details.get('backdrop_path')}" if details.get("backdrop_path") else None,
        "vote_average": round(details.get("vote_average", 0.0) * 10) / 10,
        "vote_count": details.get("vote_count", 0),
        "tagline": details.get("tagline", ""),
        "overview": details.get("overview") or catalog_item["description"],
        "genres": [g["name"] for g in details.get("genres", [])] if details.get("genres") else catalog_item["genresList"],
        "imdb_id": details.get("imdb_id"),
        "cast": cast_list,
        "crew": crew_list,
        "similar": similar_list,
    }

    tmdb_cache[id] = enriched
    save_json_cache(TMDB_CACHE_PATH, tmdb_cache)
    return enriched

@router.get("/{id}/omdb")
def get_title_omdb(id: str, imdbId: str = Query(None)):
    omdb_cache = load_json_cache(OMDB_CACHE_PATH)
    
    # Check cache by IMDb ID
    if imdbId and imdbId in omdb_cache:
        return {"matched": True, **omdb_cache[imdbId]}

    # Check cache by generated key
    catalog_item = get_title_details(id)
    if not catalog_item:
        raise HTTPException(status_code=404, detail="Title not found in catalog")

    title = catalog_item["title"]
    release_year = catalog_item["release_year"]
    type_str = catalog_item["type"]
    norm_type = "series" if "tv" in type_str.lower() or "series" in type_str.lower() else "movie"
    cache_key = f"{title.lower().strip()}_{release_year}_{norm_type}"

    if cache_key in omdb_cache:
        return {"matched": True, **omdb_cache[cache_key]}

    api_key = settings.OMDB_API_KEY
    if not api_key:
        print("[Router Titles] Warning: OMDB_API_KEY missing from environment.")
        return {"matched": False, "title": title, "release_year": release_year, "type": type_str}

    # Fetch from OMDb
    if imdbId and imdbId.strip().startswith("tt"):
        url = f"https://www.omdbapi.com/?apikey={api_key}&i={urllib.parse.quote(imdbId.strip())}"
    else:
        url = f"https://www.omdbapi.com/?apikey={api_key}&t={urllib.parse.quote(title.strip())}&y={release_year}&type={norm_type}"

    try:
        res = requests.get(url, timeout=10)
        data = res.json()
    except Exception as e:
        print(f"[Router Titles] OMDb request failed: {e}")
        return {"matched": False, "title": title, "release_year": release_year, "type": type_str}

    if data.get("Response") == "True":
        rotten_tomatoes = ""
        metacritic = ""
        ratings = data.get("Ratings", [])
        if isinstance(ratings, list):
            for r in ratings:
                if r.get("Source") == "Rotten Tomatoes":
                    rotten_tomatoes = r.get("Value", "")
                elif r.get("Source") == "Metacritic":
                    metacritic = r.get("Value", "")

        def clean_na(val):
            return val if (val and val != "N/A") else None

        enriched = {
            "imdbRating": clean_na(data.get("imdbRating")),
            "imdbVotes": clean_na(data.get("imdbVotes")),
            "Metascore": clean_na(data.get("Metascore")),
            "Awards": clean_na(data.get("Awards")),
            "Rated": clean_na(data.get("Rated")),
            "DVD": clean_na(data.get("DVD")),
            "BoxOffice": clean_na(data.get("BoxOffice")),
            "Production": clean_na(data.get("Production")),
            "Website": clean_na(data.get("Website")),
            "RottenTomatoesRating": clean_na(rotten_tomatoes),
            "MetacriticRating": clean_na(metacritic),
            "Language": clean_na(data.get("Language")),
            "Country": clean_na(data.get("Country")),
            "Genre": clean_na(data.get("Genre")),
            "Runtime": clean_na(data.get("Runtime")),
            "imdbID": clean_na(data.get("imdbID")),
            "Title": data.get("Title", title),
            "Year": data.get("Year", str(release_year)),
            "_source": "api"
        }

        # Cache it
        omdb_cache[cache_key] = enriched
        if enriched.get("imdbID"):
            omdb_cache[enriched["imdbID"]] = enriched
        
        save_json_cache(OMDB_CACHE_PATH, omdb_cache)
        return {"matched": True, **enriched}
    else:
        error_msg = data.get("Error", "Not Found")
        # Log unmatched
        log_unmatched_omdb(title, release_year, type_str, error_msg)
        return {"matched": False, "title": title, "release_year": release_year, "type": type_str}
