from fastapi import APIRouter
from analytics.engine import (
    get_netflix_data, get_thinned_netflix_data, get_kpis,
    get_content_insights, get_people_geography
)

router = APIRouter(tags=["analytics"])

@router.get("/api/analytics/home")
def get_analytics_home():
    data = get_thinned_netflix_data()
    kpis = get_kpis()

    def get_top(filter_fn, sort_fn, count=20):
        filtered = [x for x in data if filter_fn(x)]
        filtered.sort(key=sort_fn, reverse=True)
        return filtered[:count]

    # 1. Trending Now (popularity desc)
    trending = get_top(lambda x: True, lambda x: x["popularity"])

    # 2. Top Rated (IMDb)
    top_rated_imdb = get_top(lambda x: x["imdb_rating"] > 0, lambda x: x["imdb_rating"])

    # 3. Top Rated (TMDb)
    top_rated_tmdb = get_top(lambda x: x["vote_average"] > 0, lambda x: x["vote_average"])

    # 4. Recently Added (parsedDateAdded desc)
    recently_added = get_top(
        lambda x: x["parsedDateAdded"] is not None,
        lambda x: x["parsedDateAdded"]
    )

    # 5. Top Movies
    top_movies = get_top(lambda x: x["type"] == "Movie", lambda x: x["popularity"])

    # 6. Top TV Shows
    top_tv_shows = get_top(lambda x: x["type"] == "TV Show", lambda x: x["popularity"])

    # 7. Award Winning Titles
    award_winning = get_top(lambda x: x["awardsWins"] > 0, lambda x: x["awardsWins"])

    # Helper to check genres
    def has_genre(d, genre_name):
        return any(genre_name.lower() in g.lower() for g in d["genresList"])

    # 8. Family Friendly
    family_friendly = get_top(
        lambda x: has_genre(x, "family") or has_genre(x, "children") or x["rating"] in ["G", "PG", "TV-G", "TV-Y", "TV-Y7"],
        lambda x: x["popularity"]
    )

    # 9. Action Collection
    action = get_top(lambda x: has_genre(x, "action") or has_genre(x, "adventure"), lambda x: x["popularity"])

    # 10. Comedy Collection
    comedy = get_top(lambda x: has_genre(x, "comedy"), lambda x: x["popularity"])

    # 11. Drama Collection
    drama = get_top(lambda x: has_genre(x, "drama"), lambda x: x["popularity"])

    # 12. Horror Collection
    horror = get_top(lambda x: has_genre(x, "horror") or has_genre(x, "thriller"), lambda x: x["popularity"])

    # 13. Sci-Fi Collection
    scifi = get_top(lambda x: has_genre(x, "science fiction") or has_genre(x, "sci-fi") or has_genre(x, "fantasy"), lambda x: x["popularity"])

    # 14. Animation Collection
    animation = get_top(lambda x: has_genre(x, "animation") or has_genre(x, "anime"), lambda x: x["popularity"])

    rows = {
        "trending": trending,
        "topRatedImdb": top_rated_imdb,
        "topRatedTmdb": top_rated_tmdb,
        "recentlyAdded": recently_added,
        "topMovies": top_movies,
        "topTvShows": top_tv_shows,
        "awardWinning": award_winning,
        "familyFriendly": family_friendly,
        "action": action,
        "comedy": comedy,
        "drama": drama,
        "horror": horror,
        "scifi": scifi,
        "animation": animation
    }

    return {
        "kpis": kpis,
        "rows": rows
    }

@router.get("/api/analytics/content")
def get_analytics_content():
    return get_content_insights()

@router.get("/api/analytics/people")
def get_analytics_people():
    return get_people_geography()

@router.get("/data/titles.json")
def get_titles_json_db():
    return get_thinned_netflix_data()
