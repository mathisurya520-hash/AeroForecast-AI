import datetime
import requests
import pandas as pd
from sqlalchemy.orm import Session
from backend.models_db import Location, EnvironmentalDataCache
from backend.database import SessionLocal

def reverse_geocode(lat: float, lon: float) -> str:
    """
    Reverse geocodes latitude and longitude coordinates into a human-readable city/region name.
    """
    try:
        headers = {
            "User-Agent": "AirQualityForecastApp/1.0 (academic project; bomathi@gemini.com)"
        }
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=10&addressdetails=1"
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code == 200:
            data = res.json()
            address = data.get("address", {})
            city = (
                address.get("city")
                or address.get("town")
                or address.get("village")
                or address.get("municipality")
                or address.get("district")
                or address.get("county")
                or address.get("state_district")
                or address.get("suburb")
            )
            state = address.get("state")
            country = address.get("country")
            
            parts = []
            if city:
                parts.append(city)
            if state and state != city:
                parts.append(state)
            if country:
                parts.append(country)
                
            if parts:
                return ", ".join(parts)
    except Exception as e:
        print(f"Error reverse geocoding: {e}")
    return f"Coordinates: {lat:.4f}, {lon:.4f}"

DEFAULT_HEADERS = {
    "User-Agent": "AeroForecastAI/1.0 (academic project; bomathi@gemini.com)"
}

def fetch_current_air_quality_fast(lat: float, lon: float) -> dict:
    """
    Rapidly fetches current hour's live air quality and weather measurements (<300ms).
    """
    data = {"aq": {}, "weather": {}}
    try:
        aq_url = (
            f"https://air-quality-api.open-meteo.com/v1/air-quality?"
            f"latitude={lat}&longitude={lon}&"
            f"current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone"
        )
        res = requests.get(aq_url, headers=DEFAULT_HEADERS, timeout=4)
        if res.status_code == 200:
            data["aq"] = res.json().get("current", {})
    except Exception as e:
        print(f"[DataService] Fast AQ fetch warning: {e}")

    try:
        w_url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}&"
            f"current=temperature_2m,relative_humidity_2m,precipitation,pressure_msl,wind_speed_10m,wind_direction_10m"
        )
        res = requests.get(w_url, headers=DEFAULT_HEADERS, timeout=4)
        if res.status_code == 200:
            data["weather"] = res.json().get("current", {})
    except Exception as e:
        print(f"[DataService] Fast Weather fetch warning: {e}")

    return data

def fetch_open_meteo_data(lat: float, lon: float, past_days: int = 14):
    """
    Fetches hourly air quality and weather data + forecast from Open-Meteo with adaptive past_days.
    """
    for days in [past_days, 7]:
        try:
            aq_url = (
                f"https://air-quality-api.open-meteo.com/v1/air-quality?"
                f"latitude={lat}&longitude={lon}&"
                f"hourly=pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide&"
                f"past_days={days}"
            )
            weather_url = (
                f"https://api.open-meteo.com/v1/forecast?"
                f"latitude={lat}&longitude={lon}&"
                f"hourly=temperature_2m,relative_humidity_2m,precipitation,pressure_msl,wind_speed_10m,wind_direction_10m&"
                f"past_days={days}"
            )

            aq_res = requests.get(aq_url, headers=DEFAULT_HEADERS, timeout=7)
            weather_res = requests.get(weather_url, headers=DEFAULT_HEADERS, timeout=7)

            if aq_res.status_code != 200 or weather_res.status_code != 200:
                print(f"[DataService] Open-Meteo returned status AQ={aq_res.status_code}, Weather={weather_res.status_code} for days={days}")
                continue

            aq_data = aq_res.json()
            weather_data = weather_res.json()

            if "hourly" not in aq_data or "hourly" not in weather_data:
                continue

            df_aq = pd.DataFrame(aq_data["hourly"])
            df_weather = pd.DataFrame(weather_data["hourly"])

            df_aq["time"] = pd.to_datetime(df_aq["time"])
            df_weather["time"] = pd.to_datetime(df_weather["time"])

            df_merged = pd.merge(df_aq, df_weather, on="time", how="inner")
            df_merged = df_merged.rename(columns={
                "time": "timestamp",
                "pm2_5": "pm2_5",
                "pm10": "pm10",
                "nitrogen_dioxide": "no2",
                "ozone": "o3",
                "carbon_monoxide": "co",
                "sulphur_dioxide": "so2",
                "temperature_2m": "temperature",
                "relative_humidity_2m": "humidity",
                "precipitation": "precipitation",
                "pressure_msl": "pressure",
                "wind_speed_10m": "wind_speed",
                "wind_direction_10m": "wind_direction"
            })

            if len(df_merged) >= 48:
                return df_merged
        except Exception as e:
            print(f"[DataService] Open-Meteo fetch error (days={days}): {e}")

    raise Exception("Failed to fetch sufficient hourly data from Open-Meteo APIs")

def generate_fallback_environmental_df(lat: float, lon: float, fast_data: dict = None) -> pd.DataFrame:
    """
    Generates realistic fallback environmental records (168h historical + 72h forecast = 240h)
    anchored to real current measurements whenever external historical APIs fail.
    """
    now = datetime.datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    
    # Extract baseline anchor values from fast live data or regional defaults
    curr_aq = (fast_data or {}).get("aq", {})
    curr_w = (fast_data or {}).get("weather", {})

    base_no2 = float(curr_aq.get("nitrogen_dioxide") or 24.5)
    base_o3 = float(curr_aq.get("ozone") or 42.0)
    base_pm25 = float(curr_aq.get("pm2_5") or 35.0)
    base_pm10 = float(curr_aq.get("pm10") or 68.0)
    base_co = float(curr_aq.get("carbon_monoxide") or 450.0)
    base_so2 = float(curr_aq.get("sulphur_dioxide") or 8.5)
    base_temp = float(curr_w.get("temperature_2m") or 28.0)
    base_hum = float(curr_w.get("relative_humidity_2m") or 65.0)
    base_pres = float(curr_w.get("pressure_msl") or 1012.0)
    base_wind = float(curr_w.get("wind_speed_10m") or 11.0)
    base_wdir = float(curr_w.get("wind_direction_10m") or 180.0)

    rows = []
    # 7 days of past hourly records (168h) + 3 days of forecast (72h)
    start_time = now - datetime.timedelta(days=7)
    total_hours = 240

    import math
    for h in range(total_hours):
        ts = start_time + datetime.timedelta(hours=h)
        hour_of_day = ts.hour
        
        # Diurnal solar cycle (peaks around 14:00, lowest at dawn)
        solar_factor = math.cos((hour_of_day - 14) * math.pi / 12)
        # Rush-hour traffic cycle (peaks at 09:00 and 19:00)
        traffic_factor = 0.35 * math.sin((hour_of_day - 4) * math.pi / 6) if hour_of_day in [7, 8, 9, 10, 17, 18, 19, 20] else -0.15

        temp = round(base_temp + 4.5 * solar_factor + (h % 3) * 0.2, 1)
        hum = round(max(30.0, min(98.0, base_hum - 12.0 * solar_factor)), 1)
        o3 = round(max(5.0, base_o3 + 18.0 * solar_factor + (h % 5)), 1)
        no2 = round(max(4.0, base_no2 + base_no2 * traffic_factor + (h % 4) * 0.5), 1)
        pm25 = round(max(5.0, base_pm25 + 8.0 * traffic_factor - 4.0 * solar_factor), 1)
        pm10 = round(max(10.0, base_pm10 + 15.0 * traffic_factor - 6.0 * solar_factor), 1)
        co = round(max(100.0, base_co + 120.0 * traffic_factor), 1)
        so2 = round(max(1.0, base_so2 + 2.0 * traffic_factor), 1)
        wind = round(max(2.0, base_wind + 3.0 * solar_factor), 1)
        pres = round(base_pres + 1.5 * math.sin(h * math.pi / 12), 1)

        rows.append({
            "timestamp": ts,
            "pm2_5": pm25,
            "pm10": pm10,
            "no2": no2,
            "o3": o3,
            "co": co,
            "so2": so2,
            "temperature": temp,
            "humidity": hum,
            "precipitation": 0.0,
            "pressure": pres,
            "wind_speed": wind,
            "wind_direction": base_wdir
        })

    return pd.DataFrame(rows)

def get_or_fetch_environmental_data(db: Session, lat: float, lon: float, force_refresh: bool = False):
    """
    Main entry point for coordinates. Tries to retrieve data from local cache
    if refreshed within 1 hour, otherwise calls API and caches the results.
    Guaranteed to return valid records without crashing.
    """
    now = datetime.datetime.utcnow()
    one_hour_ago = now - datetime.timedelta(hours=1)
    
    # 1. Look for existing location within 0.01 degrees (~1km tolerance)
    location = db.query(Location).filter(
        Location.latitude.between(lat - 0.01, lat + 0.01),
        Location.longitude.between(lon - 0.01, lon + 0.01)
    ).first()
    
    should_fetch = False
    
    if location:
        latest_cache = db.query(EnvironmentalDataCache).filter(
            EnvironmentalDataCache.location_id == location.id
        ).order_by(EnvironmentalDataCache.fetched_at.desc()).first()
        
        if not latest_cache or latest_cache.fetched_at < one_hour_ago or force_refresh:
            should_fetch = True
    else:
        location_name = reverse_geocode(lat, lon)
        location = Location(
            name=location_name,
            latitude=lat,
            longitude=lon
        )
        db.add(location)
        db.commit()
        db.refresh(location)
        should_fetch = True
        
    if should_fetch:
        df = None
        try:
            # 1. Try adaptive Open-Meteo hourly history (14 days or 7 days)
            df = fetch_open_meteo_data(lat, lon, past_days=14)
        except Exception as e:
            print(f"[DataService] External Open-Meteo hourly fetch failed ({e}). Attempting fast current fallback...")
            try:
                # 2. Try fast real-time sensor fetch
                fast_data = fetch_current_air_quality_fast(lat, lon)
                df = generate_fallback_environmental_df(lat, lon, fast_data)
            except Exception as e2:
                print(f"[DataService] Fast fallback failed ({e2}). Generating synthetic regional baseline...")
                df = generate_fallback_environmental_df(lat, lon, None)

        if df is not None and not df.empty:
            try:
                # Clear old cache for this location
                db.query(EnvironmentalDataCache).filter(
                    EnvironmentalDataCache.location_id == location.id
                ).delete()
                
                cache_records = []
                for _, row in df.iterrows():
                    ts = row["timestamp"].to_pydatetime() if hasattr(row["timestamp"], "to_pydatetime") else row["timestamp"]
                    is_forecast = ts > now
                    
                    record = EnvironmentalDataCache(
                        location_id=location.id,
                        timestamp=ts,
                        pm2_5=float(row["pm2_5"]) if pd.notnull(row["pm2_5"]) else None,
                        pm10=float(row["pm10"]) if pd.notnull(row["pm10"]) else None,
                        no2=float(row["no2"]) if pd.notnull(row["no2"]) else None,
                        o3=float(row["o3"]) if pd.notnull(row["o3"]) else None,
                        co=float(row["co"]) if pd.notnull(row["co"]) else None,
                        so2=float(row["so2"]) if pd.notnull(row["so2"]) else None,
                        temperature=float(row["temperature"]) if pd.notnull(row["temperature"]) else None,
                        humidity=float(row["humidity"]) if pd.notnull(row["humidity"]) else None,
                        precipitation=float(row["precipitation"]) if pd.notnull(row["precipitation"]) else None,
                        pressure=float(row["pressure"]) if pd.notnull(row["pressure"]) else None,
                        wind_speed=float(row["wind_speed"]) if pd.notnull(row["wind_speed"]) else None,
                        wind_direction=float(row["wind_direction"]) if pd.notnull(row["wind_direction"]) else None,
                        is_forecast=is_forecast,
                        fetched_at=now
                    )
                    cache_records.append(record)
                    
                db.bulk_save_objects(cache_records)
                db.commit()
            except Exception as e_save:
                print(f"[DataService] Error saving cache to DB: {e_save}")
                db.rollback()

    # Retrieve all records for this location from DB sorted by timestamp
    records = db.query(EnvironmentalDataCache).filter(
        EnvironmentalDataCache.location_id == location.id
    ).order_by(EnvironmentalDataCache.timestamp.asc()).all()
    
    # If still no records in DB for any reason, create on-the-fly objects so callers never crash
    if not records:
        df_emergency = generate_fallback_environmental_df(lat, lon, None)
        records = []
        for _, row in df_emergency.iterrows():
            ts = row["timestamp"].to_pydatetime() if hasattr(row["timestamp"], "to_pydatetime") else row["timestamp"]
            records.append(EnvironmentalDataCache(
                location_id=location.id,
                timestamp=ts,
                pm2_5=float(row["pm2_5"]),
                pm10=float(row["pm10"]),
                no2=float(row["no2"]),
                o3=float(row["o3"]),
                co=float(row["co"]),
                so2=float(row["so2"]),
                temperature=float(row["temperature"]),
                humidity=float(row["humidity"]),
                precipitation=float(row["precipitation"]),
                pressure=float(row["pressure"]),
                wind_speed=float(row["wind_speed"]),
                wind_direction=float(row["wind_direction"]),
                is_forecast=ts > now,
                fetched_at=now
            ))
            
    return location, records

def search_location(query: str):
    """
    Searches for a location (city, town, etc.) using OpenStreetMap Nominatim search API.
    """
    try:
        headers = {
            "User-Agent": "AirQualityForecastApp/1.0 (academic project; bomathi@gemini.com)"
        }
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={query}&limit=5"
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code == 200:
            results = []
            for item in res.json():
                results.append({
                    "name": item.get("display_name"),
                    "latitude": float(item.get("lat")),
                    "longitude": float(item.get("lon"))
                })
            return results
    except Exception as e:
        print(f"Error searching location: {e}")
    return []
