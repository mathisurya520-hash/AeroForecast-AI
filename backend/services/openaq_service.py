import os
import requests
from typing import List, Dict, Any, Optional

OPENAQ_API_URL = "https://api.openaq.org/v3"

def get_openaq_api_key() -> Optional[str]:
    """
    Retrieves the OpenAQ API key from environment variables if configured.
    """
    return os.getenv("OPENAQ_API_KEY", None)

def get_headers() -> Dict[str, str]:
    headers = {
        "Accept": "application/json",
        "User-Agent": "AeroForecastAI/2.0 (OpenAQ Integration)"
    }
    api_key = get_openaq_api_key()
    if api_key:
        headers["X-API-Key"] = api_key
    return headers

def fetch_openaq_locations(limit: int = 40) -> List[Dict[str, Any]]:
    """
    Fetches real active monitoring locations from OpenAQ v3 API.
    """
    url = f"{OPENAQ_API_URL}/locations?limit={limit}&order_by=lastUpdated"
    try:
        res = requests.get(url, headers=get_headers(), timeout=8)
        if res.status_code == 200:
            data = res.json()
            results = data.get("results", [])
            locations = []
            for item in results:
                loc_id = item.get("id")
                name = item.get("name") or f"Station #{loc_id}"
                country_info = item.get("country", {})
                country = country_info.get("name") if isinstance(country_info, dict) else str(country_info or "Global")
                
                coords = item.get("coordinates", {})
                lat = coords.get("latitude")
                lon = coords.get("longitude")
                
                sensors = item.get("sensors", [])
                pollutants = []
                for s in sensors:
                    param = s.get("parameter", {})
                    p_name = param.get("name") if isinstance(param, dict) else str(param)
                    if p_name:
                        pollutants.append(p_name.upper())

                if lat is not None and lon is not None:
                    locations.append({
                        "id": str(loc_id),
                        "name": name,
                        "country": country,
                        "latitude": float(lat),
                        "longitude": float(lon),
                        "available_pollutants": list(set(pollutants)),
                        "data_source": "OpenAQ Ground Station",
                        "last_updated": item.get("datetimeLast", {}).get("utc") if isinstance(item.get("datetimeLast"), dict) else None
                    })
            return locations
    except Exception as e:
        print(f"[OpenAQ Service] Error fetching locations: {e}")
    
    return []

def fetch_openaq_latest_measurement(location_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetches the latest pollutant measurements for a specific OpenAQ station location.
    """
    url = f"{OPENAQ_API_URL}/locations/{location_id}/latest"
    try:
        res = requests.get(url, headers=get_headers(), timeout=8)
        if res.status_code == 200:
            data = res.json()
            results = data.get("results", [])
            if results:
                return {
                    "location_id": location_id,
                    "measurements": results,
                    "fetched_at": data.get("meta", {}).get("found")
                }
    except Exception as e:
        print(f"[OpenAQ Service] Error fetching latest for location {location_id}: {e}")
    return None

def search_openaq_stations(query: str) -> List[Dict[str, Any]]:
    """
    Searches OpenAQ locations by keyword or city name.
    """
    url = f"{OPENAQ_API_URL}/locations?limit=15&name={requests.utils.quote(query)}"
    try:
        res = requests.get(url, headers=get_headers(), timeout=8)
        if res.status_code == 200:
            data = res.json()
            results = data.get("results", [])
            matched = []
            for item in results:
                coords = item.get("coordinates", {})
                lat = coords.get("latitude")
                lon = coords.get("longitude")
                if lat is not None and lon is not None:
                    country_info = item.get("country", {})
                    country = country_info.get("name") if isinstance(country_info, dict) else str(country_info or "Global")
                    matched.append({
                        "id": str(item.get("id")),
                        "name": item.get("name") or query,
                        "country": country,
                        "latitude": float(lat),
                        "longitude": float(lon),
                        "data_source": "OpenAQ Ground Station"
                    })
            return matched
    except Exception as e:
        print(f"[OpenAQ Service] Search error: {e}")
    return []
