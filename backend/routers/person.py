import urllib.parse
import requests
from fastapi import APIRouter, HTTPException, Query
from config import settings

router = APIRouter(prefix="/api/person", tags=["person"])

# In-memory person cache
person_cache = {}

@router.get("")
def get_person(
    name: str = Query(..., alias="name"),
    details: str = Query("false", alias="details")
):
    name_clean = name.lower().strip()
    is_details = (details == "true")
    cache_key = f"{name_clean}_{'details' if is_details else 'basic'}"

    if cache_key in person_cache:
        return person_cache[cache_key]

    api_key = settings.TMDB_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="TMDb API Key missing")

    # Search person on TMDb
    search_url = f"https://api.themoviedb.org/3/search/person?api_key={api_key}&query={urllib.parse.quote(name)}"
    try:
        res = requests.get(search_url, timeout=10)
        data = res.json()
    except Exception as e:
        print(f"[Router Person] TMDb request failed: {e}")
        raise HTTPException(status_code=500, detail="TMDb API request failed")

    if not data.get("results"):
        empty_payload = {
            "matched": False,
            "name": name,
            "profile_url": None,
            "popularity": 0.0
        }
        person_cache[cache_key] = empty_payload
        return empty_payload

    best_match = data["results"][0]
    person_id = best_match["id"]

    if not is_details:
        basic_payload = {
            "matched": True,
            "id": person_id,
            "name": best_match.get("name"),
            "profile_url": f"https://image.tmdb.org/t/p/w185{best_match.get('profile_path')}" if best_match.get("profile_path") else None,
            "popularity": best_match.get("popularity", 0.0),
            "known_for_department": best_match.get("known_for_department"),
            "known_for": best_match.get("known_for", [])
        }
        person_cache[cache_key] = basic_payload
        return basic_payload

    # Fetch full details
    details_url = f"https://api.themoviedb.org/3/person/{person_id}?api_key={api_key}&append_to_response=combined_credits,images"
    try:
        res = requests.get(details_url, timeout=10)
        details_data = res.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TMDb details request failed: {e}")

    gender_map = {
        0: "Not specified",
        1: "Female",
        2: "Male",
        3: "Non-binary"
    }

    # Combined cast and crew list
    credits_cast = details_data.get("combined_credits", {}).get("cast", [])
    credits_crew = details_data.get("combined_credits", {}).get("crew", [])
    combined_credits = credits_cast + credits_crew

    # Profile images
    profile_images = []
    for img in details_data.get("images", {}).get("profiles", [])[:8]:
        if img.get("file_path"):
            profile_images.append(f"https://image.tmdb.org/t/p/h632{img['file_path']}")

    details_payload = {
        "matched": True,
        "id": person_id,
        "name": details_data.get("name"),
        "profile_url": f"https://image.tmdb.org/t/p/h632{details_data.get('profile_path')}" if details_data.get("profile_path") else None,
        "profile_images": profile_images,
        "popularity": details_data.get("popularity", 0.0),
        "known_for_department": details_data.get("known_for_department"),
        "birthday": details_data.get("birthday"),
        "place_of_birth": details_data.get("place_of_birth"),
        "biography": details_data.get("biography") or "Biography details not available on TMDb.",
        "gender": gender_map.get(details_data.get("gender", 0), "Not specified"),
        "combined_credits": combined_credits
    }

    person_cache[cache_key] = details_payload
    return details_payload
