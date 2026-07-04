from fastapi import APIRouter, Query
from analytics.engine import (
    get_netflix_data, init_search_indexing,
    unique_actors, unique_directors, unique_genres
)

router = APIRouter(prefix="/api/search", tags=["search"])

@router.get("")
def get_search(q: str = Query("", alias="q")):
    # Ensure indexing lists are populated
    init_search_indexing()

    query = q.lower().strip()
    if not query:
        return {
            "movies": [],
            "tvShows": [],
            "actors": [],
            "directors": [],
            "genres": []
        }

    # Helper to check matching substring
    def matches(s):
        return query in str(s).lower()

    # Filter Movies and TV Shows from the enriched list
    data = get_netflix_data()
    
    matched_titles = [t for t in data if matches(t["title"]) or matches(t["release_year"])]
    
    movies = [t for t in matched_titles if t["type"] == "Movie"][:5]
    tv_shows = [t for t in matched_titles if t["type"] == "TV Show"][:5]

    # Filter actors, directors, genres
    actors = [a for a in unique_actors if matches(a["name"])][:5]
    directors = [d for d in unique_directors if matches(d["name"])][:5]
    genres = [g for g in unique_genres if matches(g["name"])][:5]

    return {
        "movies": movies,
        "tvShows": tv_shows,
        "actors": actors,
        "directors": directors,
        "genres": genres
    }
