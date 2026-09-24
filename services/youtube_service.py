import os
import requests
from urllib.parse import quote_plus


def get_top_youtube_tutorial(skill_name: str) -> str:
    """Return the URL of the top YouTube tutorial for a given skill.

    Args:
        skill_name: The name of the skill to search for.

    Returns:
        A YouTube video URL if the API call succeeds, otherwise a fallback
        manual search URL.
    """
    search_query = f"{skill_name} full course tutorial"
    api_key = os.getenv("YOUTUBE_API_KEY")
    api_endpoint = "https://www.googleapis.com/youtube/v3/search"
    params = {
        "part": "snippet",
        "type": "video",
        "maxResults": 1,
        "q": search_query,
        "key": api_key,
    }
    try:
        response = requests.get(api_endpoint, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        items = data.get("items", [])
        if not items:
            raise ValueError("No video results found")
        video_id = items[0]["id"]["videoId"]
        return f"https://www.youtube.com/watch?v={video_id}"
    except Exception:
        # Fallback to a manual search URL if anything goes wrong
        fallback_query = quote_plus(f"{skill_name} course")
        return f"https://www.youtube.com/results?search_query={fallback_query}"
