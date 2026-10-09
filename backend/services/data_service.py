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

def fetch_open_meteo_data(lat: float, lon: float):
    """
    Fetches past 92 days of hourly air quality and weather data + forecast from Open-Meteo.
    """
    # 1. Fetch Air Quality (PM2.5, PM10, NO2, O3, CO, SO2)
    aq_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&hourly=pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide&past_days=92"
    
    # 2. Fetch Weather (temp, humidity, precipitation, pressure, wind speed, wind direction)
    weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,relative_humidity_2m,precipitation,pressure_msl,wind_speed_10m,wind_direction_10m&past_days=92"
    
    try:
        aq_res = requests.get(aq_url, timeout=10)
        weather_res = requests.get(weather_url, timeout=10)
        
        if aq_res.status_code != 200 or weather_res.status_code != 200:
            raise Exception("Failed to fetch data from Open-Meteo APIs")
            
        aq_data = aq_res.json()
        weather_data = weather_res.json()
        
        # Verify hourly data structures
        if "hourly" not in aq_data or "hourly" not in weather_data:
            raise Exception("Invalid API response structures from Open-Meteo")
            
        aq_hourly = aq_data["hourly"]
        weather_hourly = weather_data["hourly"]
        
        # Create DataFrames
        df_aq = pd.DataFrame(aq_hourly)
        df_weather = pd.DataFrame(weather_hourly)
        
        # Parse time column
        df_aq["time"] = pd.to_datetime(df_aq["time"])
        df_weather["time"] = pd.to_datetime(df_weather["time"])
        
        # Merge on time
        df_merged = pd.merge(df_aq, df_weather, on="time", how="inner")
        
        # Rename columns to match db schema
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
        
        return df_merged
        
    except Exception as e:
        print(f"Error fetching Open-Meteo data: {e}")
        raise e

def get_or_fetch_environmental_data(db: Session, lat: float, lon: float, force_refresh: bool = False):
    """
    Main entry point for coordinates. Tries to retrieve data from local cache
    if refreshed within 1 hour, otherwise calls API and caches the results.
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
        # Check if we have cached records
        latest_cache = db.query(EnvironmentalDataCache).filter(
            EnvironmentalDataCache.location_id == location.id
        ).order_by(EnvironmentalDataCache.fetched_at.desc()).first()
        
        if not latest_cache or latest_cache.fetched_at < one_hour_ago or force_refresh:
            should_fetch = True
    else:
        # Create a new location entry
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
        try:
            # Fetch from API
            df = fetch_open_meteo_data(lat, lon)
            
            # Clear old cache for this location
            db.query(EnvironmentalDataCache).filter(
                EnvironmentalDataCache.location_id == location.id
            ).delete()
            
            # Insert new cache records
            cache_records = []
            for _, row in df.iterrows():
                # Any row after now is forecast
                # Convert timestamp row to native datetime if needed
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
            
        except Exception as e:
            # If API fetch fails but we already have location/old cache, log and keep going
            print(f"API fetch failed. Falling back to stale cache if available. Error: {e}")
            latest_cache = db.query(EnvironmentalDataCache).filter(
                EnvironmentalDataCache.location_id == location.id
            ).first()
            if not latest_cache:
                # No data at all, re-raise
                raise e

    # Retrieve all records for this location from DB sorted by timestamp
    records = db.query(EnvironmentalDataCache).filter(
        EnvironmentalDataCache.location_id == location.id
    ).order_by(EnvironmentalDataCache.timestamp.asc()).all()
    
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
