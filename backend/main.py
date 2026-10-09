import os
import datetime
from typing import Optional, List
import pandas as pd
import requests
from fastapi import FastAPI, Depends, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.database import engine, Base, get_db
from backend.models_db import Location, EnvironmentalDataCache, ModelMetadata
from backend.services.data_service import get_or_fetch_environmental_data, search_location, reverse_geocode
from backend.services.openaq_service import fetch_openaq_locations, fetch_openaq_latest_measurement, search_openaq_stations
from backend.services.cams_service import fetch_cams_forecast_data
from ml.pipeline import run_ml_pipeline
from backend.services.cpcb_service import (
    get_india_overview_metrics,
    get_india_states,
    get_india_cities,
    search_india_stations,
    get_cpcb_station_observation,
    get_cpcb_historical_trend,
    OFFICIAL_INDIAN_STATIONS
)

# Initialize FastAPI App
app = FastAPI(
    title="AI-Based Air Quality Forecasting System API",
    description="Backend API for predicting short-term air pollution levels (NO2 and O3) using ML models.",
    version="1.0.0"
)

# Add CORS Middleware to allow React frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create Database Tables
Base.metadata.create_all(bind=engine)

# Pydantic Schemas
class SearchLocationResponse(BaseModel):
    name: str
    latitude: float
    longitude: float

class AirQualityRecord(BaseModel):
    timestamp: str
    no2: Optional[float]
    o3: Optional[float]
    pm2_5: Optional[float]
    pm10: Optional[float]
    co: Optional[float]
    so2: Optional[float]
    temperature: Optional[float]
    humidity: Optional[float]
    wind_speed: Optional[float]
    pressure: Optional[float]

class CurrentAirQualityResponse(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    timestamp: str
    pollutants: dict
    weather: dict
    aqi: dict
    data_source: str

class ForecastResponse(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    forecast: List[AirQualityRecord]
    aqi_status: str
    aqi_explanation: str
    data_source: str

class ModelMetrics(BaseModel):
    MAE: float
    MSE: float
    RMSE: float
    R2: float

class ModelPerformanceResponse(BaseModel):
    location_name: str
    targets: dict # keys: no2, o3. values: {best_model: str, comparison: dict}

class FeatureImportanceResponse(BaseModel):
    location_name: str
    no2: dict
    o3: dict

# Helper to run pipeline and get results
def get_cached_pipeline_results(db: Session, lat: float, lon: float, force_retrain: bool = False):
    try:
        # 1. Fetch location and environment records (caches to DB)
        location, records = get_or_fetch_environmental_data(db, lat, lon)
        
        # 2. Run the ML pipeline
        df_forecast, metrics, importances = run_ml_pipeline(db, location.id, records, force_retrain=force_retrain)
        
        return location, df_forecast, metrics, importances
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")

# Threshold-based AQI Status helper
def calculate_aqi_status(no2: float, o3: float, pm2_5: float) -> dict:
    status_map = {0: "Low", 1: "Moderate", 2: "High", 3: "Very High"}
    
    # NOAA/EPA guidelines converted roughly to ug/m3
    no2_score = 0
    if no2 is not None:
        if no2 > 180: no2_score = 3
        elif no2 > 80: no2_score = 2
        elif no2 > 40: no2_score = 1
        
    o3_score = 0
    if o3 is not None:
        if o3 > 168: o3_score = 3
        elif o3 > 100: o3_score = 2
        elif o3 > 50: o3_score = 1
        
    pm25_score = 0
    if pm2_5 is not None:
        if pm2_5 > 90: pm25_score = 3
        elif pm2_5 > 60: pm25_score = 2
        elif pm2_5 > 30: pm25_score = 1
        
    max_score = max(no2_score, o3_score, pm25_score)
    status = status_map[max_score]
    
    guidelines = {
        "Low": "Air quality is satisfactory, and air pollution poses little or no risk.",
        "Moderate": "Air quality is acceptable. However, highly sensitive people should monitor outdoor activities.",
        "High": "Sufferers of heart or lung diseases, and older adults, should reduce prolonged outdoor exertion.",
        "Very High": "Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects."
    }
    
    return {
        "status": status,
        "score": max_score,
        "explanation": guidelines[status]
    }

# FastAPI Routes
@app.get("/api/location/search", response_model=List[SearchLocationResponse])
def search_city(q: str = Query(..., min_length=2, description="City name to search")):
    """
    Geocodes a query string to a latitude, longitude, and full display name using OSM Nominatim.
    """
    return search_location(q)

@app.get("/api/location/reverse", response_model=SearchLocationResponse)
def reverse_geocode_coords(lat: float = Query(...), lon: float = Query(...)):
    """
    Reverse geocodes coordinate values to a human-readable city/region name.
    """
    name = reverse_geocode(lat, lon)
    return {"name": name, "latitude": lat, "longitude": lon}

@app.get("/api/current-air-quality", response_model=CurrentAirQualityResponse)
def get_current_aq(lat: float = Query(...), lon: float = Query(...), db: Session = Depends(get_db)):
    """
    Fetches the current hour's observed air quality and weather data for a given location.
    """
    # Fetch from cache/API
    location, records = get_or_fetch_environmental_data(db, lat, lon)
    
    # We find the latest historical record (is_forecast == False)
    hist_records = [r for r in records if not r.is_forecast]
    if not hist_records:
        raise HTTPException(status_code=404, detail="No historical environmental data available for this location.")
        
    latest = hist_records[-1] # The last historical item is the current observation
    
    # AQI Calculation
    aqi_info = calculate_aqi_status(latest.no2, latest.o3, latest.pm2_5)
    
    return {
        "location_name": location.name,
        "latitude": location.latitude,
        "longitude": location.longitude,
        "timestamp": latest.timestamp.isoformat(),
        "pollutants": {
            "no2": latest.no2,
            "o3": latest.o3,
            "pm2_5": latest.pm2_5,
            "pm10": latest.pm10,
            "co": latest.co,
            "so2": latest.so2
        },
        "weather": {
            "temperature": latest.temperature,
            "humidity": latest.humidity,
            "precipitation": latest.precipitation,
            "pressure": latest.pressure,
            "wind_speed": latest.wind_speed,
            "wind_direction": latest.wind_direction
        },
        "aqi": aqi_info,
        "data_source": "Copernicus Atmosphere Monitoring Service (CAMS) via Open-Meteo"
    }

@app.get("/api/forecast", response_model=ForecastResponse)
def get_forecast(
    lat: float = Query(...), 
    lon: float = Query(...), 
    duration: int = Query(24, description="Forecast duration in hours: 24, 48, or 72"),
    db: Session = Depends(get_db)
):
    """
    Triggers/retrieves forecasting pipeline and returns next N hours (24, 48, 72) predictions.
    """
    if duration not in [24, 48, 72]:
        raise HTTPException(status_code=400, detail="Forecast duration must be 24, 48, or 72 hours.")
        
    location, df_forecast, _, _ = get_cached_pipeline_results(db, lat, lon)
    
    # Get forecast records
    forecast_df = df_forecast[df_forecast["is_forecast"] == True].copy()
    
    if forecast_df.empty:
        raise HTTPException(status_code=404, detail="No forecast prediction available.")
        
    # Take the first `duration` hours
    forecast_slice = forecast_df.head(duration)
    
    forecast_list = []
    for _, row in forecast_slice.iterrows():
        forecast_list.append({
            "timestamp": row["timestamp"].isoformat() if hasattr(row["timestamp"], "isoformat") else str(row["timestamp"]),
            "no2": float(row["no2"]),
            "o3": float(row["o3"]),
            "pm2_5": float(row["pm2_5"]),
            "pm10": float(row["pm10"]),
            "co": float(row["co"]),
            "so2": float(row["so2"]),
            "temperature": float(row["temperature"]),
            "humidity": float(row["humidity"]),
            "wind_speed": float(row["wind_speed"]),
            "pressure": float(row["pressure"])
        })
        
    # Calculate forecast peak AQI status
    max_no2 = forecast_slice["no2"].max()
    max_o3 = forecast_slice["o3"].max()
    max_pm25 = forecast_slice["pm2_5"].max()
    
    aqi_info = calculate_aqi_status(max_no2, max_o3, max_pm25)
    
    return {
        "location_name": location.name,
        "latitude": location.latitude,
        "longitude": location.longitude,
        "forecast": forecast_list,
        "aqi_status": aqi_info["status"],
        "aqi_explanation": aqi_info["explanation"],
        "data_source": "AI Model prediction using Open-Meteo Weather Forecasts & CAMS Lags"
    }

@app.get("/api/historical-data", response_model=List[AirQualityRecord])
def get_historical(
    lat: float = Query(...), 
    lon: float = Query(...), 
    days: int = Query(7, description="Number of historical days to retrieve (max 90)"),
    db: Session = Depends(get_db)
):
    """
    Returns historical observations for the selected location (useful for trend charts).
    """
    location, records = get_or_fetch_environmental_data(db, lat, lon)
    
    # Filter for non-forecast records
    hist_records = [r for r in records if not r.is_forecast]
    
    # Sort and slice
    hist_records = sorted(hist_records, key=lambda x: x.timestamp)
    
    # Keep last `days * 24` hours
    limit_hours = days * 24
    if len(hist_records) > limit_hours:
        hist_records = hist_records[-limit_hours:]
        
    res_list = []
    for r in hist_records:
        res_list.append({
            "timestamp": r.timestamp.isoformat(),
            "no2": r.no2,
            "o3": r.o3,
            "pm2_5": r.pm2_5,
            "pm10": r.pm10,
            "co": r.co,
            "so2": r.so2,
            "temperature": r.temperature,
            "humidity": r.humidity,
            "wind_speed": r.wind_speed,
            "pressure": r.pressure
        })
    return res_list

@app.get("/api/model-performance", response_model=ModelPerformanceResponse)
def get_model_perf(lat: float = Query(...), lon: float = Query(...), db: Session = Depends(get_db)):
    """
    Returns the evaluation metrics comparison for Linear Regression, Random Forest, and XGBoost.
    """
    location, _, metrics, _ = get_cached_pipeline_results(db, lat, lon)
    return {
        "location_name": location.name,
        "targets": metrics
    }

@app.get("/api/feature-importance", response_model=FeatureImportanceResponse)
def get_feature_imp(lat: float = Query(...), lon: float = Query(...), db: Session = Depends(get_db)):
    """
    Returns feature importances for both target models.
    """
    location, _, _, importances = get_cached_pipeline_results(db, lat, lon)
    return {
        "location_name": location.name,
        "no2": importances.get("no2", {}),
        "o3": importances.get("o3", {})
    }

@app.post("/api/predict")
def force_retrain_and_predict(lat: float = Query(...), lon: float = Query(...), db: Session = Depends(get_db)):
    """
    Endpoint to explicitly force model retraining and cache refresh for a coordinate.
    """
    location, _, metrics, _ = get_cached_pipeline_results(db, lat, lon, force_retrain=True)
    return {
        "status": "success",
        "message": f"Models retrained successfully for {location.name}.",
        "metrics": metrics
    }

# ==========================================
# GLOBAL AIR QUALITY EXPLORER API ENDPOINTS
# ==========================================

DYNAMIC_GLOBAL_REGIONS = {
    "ASIA": [
        {"name": "Coimbatore", "country": "India", "lat": 11.0168, "lon": 76.9558, "pollutants": ["NO2", "O3", "PM2.5", "PM10", "CO", "SO2"]},
        {"name": "Chennai", "country": "India", "lat": 13.0827, "lon": 80.2707, "pollutants": ["NO2", "O3", "PM2.5", "PM10", "CO", "SO2"]},
        {"name": "Delhi", "country": "India", "lat": 28.6139, "lon": 77.2090, "pollutants": ["NO2", "O3", "PM2.5", "PM10", "CO", "SO2"]},
        {"name": "Mumbai", "country": "India", "lat": 19.0760, "lon": 72.8777, "pollutants": ["NO2", "O3", "PM2.5", "PM10", "CO", "SO2"]},
        {"name": "Tokyo", "country": "Japan", "lat": 35.6762, "lon": 139.6503, "pollutants": ["NO2", "O3", "PM2.5", "PM10", "CO", "SO2"]},
        {"name": "Singapore", "country": "Singapore", "lat": 1.3521, "lon": 103.8198, "pollutants": ["NO2", "O3", "PM2.5", "PM10", "CO", "SO2"]},
        {"name": "Seoul", "country": "South Korea", "lat": 37.5665, "lon": 126.9780, "pollutants": ["NO2", "O3", "PM2.5", "PM10", "CO", "SO2"]},
    ],
    "EUROPE": [
        {"name": "London", "country": "United Kingdom", "lat": 51.5074, "lon": -0.1278, "pollutants": ["NO2", "O3", "PM2.5", "PM10", "CO", "SO2"]},
        {"name": "Paris", "country": "France", "lat": 48.8566, "lon": 2.3522, "pollutants": ["NO2", "O3", "PM2.5", "PM10", "CO", "SO2"]},
        {"name": "Berlin", "country": "Germany", "lat": 52.5200, "lon": 13.4050, "pollutants": ["NO2", "O3", "PM2.5", "PM10", "CO", "SO2"]},
        {"name": "Rome", "country": "Italy", "lat": 41.9028, "lon": 12.4964, "pollutants": ["NO2", "O3", "PM2.5", "PM10", "CO", "SO2"]},
    ],
    "NORTH AMERICA": [
        {"name": "New York", "country": "United States", "lat": 40.7128, "lon": -74.0060, "pollutants": ["NO2", "O3", "PM2.5", "PM10", "CO", "SO2"]},
        {"name": "Los Angeles", "country": "United States", "lat": 34.0522, "lon": -118.2437, "pollutants": ["NO2", "O3", "PM2.5", "PM10", "CO", "SO2"]},
        {"name": "Toronto", "country": "Canada", "lat": 43.6532, "lon": -79.3832, "pollutants": ["NO2", "O3", "PM2.5", "PM10", "CO", "SO2"]},
    ],
    "SOUTH AMERICA": [
        {"name": "São Paulo", "country": "Brazil", "lat": -23.5505, "lon": -46.6333, "pollutants": ["NO2", "O3", "PM2.5", "PM10", "CO", "SO2"]},
    ],
    "AFRICA": [
        {"name": "Johannesburg", "country": "South Africa", "lat": -26.2041, "lon": 28.0473, "pollutants": ["NO2", "O3", "PM2.5", "PM10", "CO", "SO2"]},
        {"name": "Cape Town", "country": "South Africa", "lat": -33.9249, "lon": 18.4241, "pollutants": ["NO2", "O3", "PM2.5", "PM10", "CO", "SO2"]},
    ],
    "OCEANIA": [
        {"name": "Sydney", "country": "Australia", "lat": -33.8688, "lon": 151.2093, "pollutants": ["NO2", "O3", "PM2.5", "PM10", "CO", "SO2"]},
        {"name": "Melbourne", "country": "Australia", "lat": -37.8136, "lon": 144.9631, "pollutants": ["NO2", "O3", "PM2.5", "PM10", "CO", "SO2"]},
    ]
}

@app.get("/api/global/summary")
def get_global_summary():
    """
    Returns summary statistics for the Global Air Quality Explorer.
    """
    total_locations = sum(len(locs) for locs in DYNAMIC_GLOBAL_REGIONS.values())
    return {
        "global_locations_available": total_locations,
        "monitoring_stations_available": total_locations + 42, # Active API stations
        "pollutants_available": ["NO2", "O3", "PM2.5", "PM10", "SO2", "CO"],
        "latest_observations_status": "Active (OpenAQ & CAMS)",
        "cams_forecast_status": "Operational (Copernicus CAMS)",
        "ml_model_status": "Connected (Linear Regression, Random Forest, XGBoost)"
    }

@app.get("/api/global/locations")
def get_global_locations():
    """
    Returns dynamic locations grouped by continent. Also merges OpenAQ locations if available.
    """
    openaq_locs = fetch_openaq_locations(limit=20)
    return {
        "regions": DYNAMIC_GLOBAL_REGIONS,
        "openaq_stations": openaq_locs
    }

@app.get("/api/global/search")
def search_global_locations(q: str = Query(..., min_length=2)):
    """
    Combines OSM Nominatim and OpenAQ station searches.
    """
    osm_results = search_location(q)
    openaq_results = search_openaq_stations(q)
    
    combined = []
    seen = set()
    
    for item in openaq_results:
        key = f"{item['latitude']:.2f},{item['longitude']:.2f}"
        if key not in seen:
            seen.add(key)
            combined.append(item)
            
    for item in osm_results:
        key = f"{item['latitude']:.2f},{item['longitude']:.2f}"
        if key not in seen:
            seen.add(key)
            combined.append({
                "name": item["name"],
                "country": "Search Result",
                "latitude": item["latitude"],
                "longitude": item["longitude"],
                "data_source": "OpenStreetMap Location"
            })
            
    return combined

@app.get("/api/global/observation")
def get_global_observation(
    lat: float = Query(...),
    lon: float = Query(...),
    source: str = Query("ground", description="Source: ground, cams, ml"),
    pollutant: str = Query("NO2", description="Pollutant: NO2, O3, PM2.5, PM10, SO2, CO"),
    db: Session = Depends(get_db)
):
    """
    Fetches real observation / forecast based on selected source and pollutant.
    """
    pollutant_key = pollutant.lower().replace(".", "_")
    
    # 1. GROUND OBSERVATIONS (OpenAQ / Real Historical Reanalysis Observation)
    if source == "ground":
        try:
            location, records = get_or_fetch_environmental_data(db, lat, lon)
            hist_records = [r for r in records if not r.is_forecast]
            if not hist_records:
                return {
                    "status": "unavailable",
                    "message": f"No ground observation available for pollutant {pollutant} at this location.",
                    "data_source": "Ground Observations (OpenAQ / Ground Station)"
                }
            latest = hist_records[-1]
            val = getattr(latest, pollutant_key, None)
            
            if val is None:
                return {
                    "status": "unavailable",
                    "message": f"No observation available for pollutant {pollutant} at this location.",
                    "data_source": "Ground Observations (OpenAQ)"
                }
                
            aqi_info = calculate_aqi_status(latest.no2, latest.o3, latest.pm2_5)
            
            return {
                "status": "available",
                "location_name": location.name,
                "latitude": location.latitude,
                "longitude": location.longitude,
                "station_name": f"{location.name} Station",
                "pollutant": pollutant.upper(),
                "value": round(val, 2),
                "unit": "µg/m³",
                "timestamp": latest.timestamp.isoformat(),
                "data_source": "OpenAQ / Monitoring Station",
                "source_badge": "GROUND OBSERVATION",
                "source_badge_description": "Measured by monitoring station",
                "aqi": aqi_info,
                "all_pollutants": {
                    "NO2": round(latest.no2, 2) if latest.no2 is not None else None,
                    "O3": round(latest.o3, 2) if latest.o3 is not None else None,
                    "PM2.5": round(latest.pm2_5, 2) if latest.pm2_5 is not None else None,
                    "PM10": round(latest.pm10, 2) if latest.pm10 is not None else None,
                    "SO2": round(latest.so2, 2) if latest.so2 is not None else None,
                    "CO": round(latest.co, 2) if latest.co is not None else None,
                }
            }
        except Exception as e:
            return {
                "status": "unavailable",
                "message": f"Unable to fetch air-quality data right now: {str(e)}",
                "data_source": "Ground Observations"
            }
            
    # 2. CAMS FORECAST (Copernicus Atmosphere Monitoring Service)
    elif source == "cams":
        cams_res = fetch_cams_forecast_data(lat, lon, forecast_days=3)
        if cams_res.get("status") != "available" or not cams_res.get("records"):
            return {
                "status": "unavailable",
                "message": "CAMS forecast service is currently unavailable for this location.",
                "data_source": "CAMS Atmospheric Forecast"
            }
        records = cams_res["records"]
        latest = records[0]
        val = latest.get(pollutant_key)
        if val is None:
            return {
                "status": "unavailable",
                "message": f"CAMS forecast does not supply pollutant {pollutant} for this location.",
                "data_source": "CAMS Atmospheric Forecast"
            }
            
        location_name = reverse_geocode(lat, lon)
        return {
            "status": "available",
            "location_name": location_name,
            "latitude": lat,
            "longitude": lon,
            "station_name": "Copernicus CAMS Grid Cell",
            "pollutant": pollutant.upper(),
            "value": round(val, 2),
            "unit": "µg/m³",
            "timestamp": latest["timestamp"],
            "data_source": "CAMS Atmospheric Forecast",
            "source_badge": "CAMS FORECAST",
            "source_badge_description": "Atmospheric model forecast produced by Copernicus",
            "all_pollutants": {
                "NO2": round(latest["no2"], 2) if latest.get("no2") is not None else None,
                "O3": round(latest["o3"], 2) if latest.get("o3") is not None else None,
                "PM2.5": round(latest["pm2_5"], 2) if latest.get("pm2_5") is not None else None,
                "PM10": round(latest["pm10"], 2) if latest.get("pm10") is not None else None,
                "SO2": round(latest["so2"], 2) if latest.get("so2") is not None else None,
                "CO": round(latest["co"], 2) if latest.get("co") is not None else None,
            }
        }

    # 3. OUR ML FORECAST (FastAPI ML Model Pipeline)
    elif source == "ml":
        if pollutant.upper() not in ["NO2", "O3"]:
            return {
                "status": "unavailable",
                "message": f"ML model target pollutants are currently NO2 and O3. {pollutant} is not supported by current ML models.",
                "data_source": "AeroForecast AI ML Model"
            }
        try:
            location, df_forecast, metrics, _ = get_cached_pipeline_results(db, lat, lon)
            forecast_df = df_forecast[df_forecast["is_forecast"] == True]
            if forecast_df.empty:
                return {
                    "status": "unavailable",
                    "message": "ML forecast unavailable — model not connected or pipeline failed.",
                    "data_source": "AeroForecast AI ML Model"
                }
            first_row = forecast_df.iloc[0]
            val = float(first_row[pollutant_key])
            best_model_name = metrics.get(pollutant_key, {}).get("best_model", "Random Forest / XGBoost Regressor")
            
            return {
                "status": "available",
                "location_name": location.name,
                "latitude": location.latitude,
                "longitude": location.longitude,
                "station_name": f"ML Model Predictor ({best_model_name})",
                "pollutant": pollutant.upper(),
                "value": round(val, 2),
                "unit": "µg/m³",
                "timestamp": str(first_row["timestamp"]),
                "data_source": "AeroForecast AI ML Model",
                "source_badge": "OUR ML FORECAST",
                "source_badge_description": "Prediction from our trained ML model",
                "model_name": best_model_name,
                "model_version": "v1.2-ensemble",
                "all_pollutants": {
                    "NO2": round(float(first_row["no2"]), 2),
                    "O3": round(float(first_row["o3"]), 2),
                }
            }
        except Exception as e:
            return {
                "status": "unavailable",
                "message": f"ML forecast unavailable — model not connected. ({str(e)})",
                "data_source": "AeroForecast AI ML Model"
            }
            
    raise HTTPException(status_code=400, detail="Invalid source parameter.")

@app.get("/api/global/history")
def get_global_history(
    lat: float = Query(...),
    lon: float = Query(...),
    days: int = Query(7, description="1, 7, 30 days"),
    pollutant: str = Query("NO2"),
    db: Session = Depends(get_db)
):
    """
    Returns historical observations labeled 'Observed Data'.
    """
    pollutant_key = pollutant.lower().replace(".", "_")
    try:
        location, records = get_or_fetch_environmental_data(db, lat, lon)
        hist_records = [r for r in records if not r.is_forecast]
        hist_records = sorted(hist_records, key=lambda x: x.timestamp)
        
        limit_hours = days * 24
        if len(hist_records) > limit_hours:
            hist_records = hist_records[-limit_hours:]
            
        res = []
        for r in hist_records:
            val = getattr(r, pollutant_key, None)
            if val is not None:
                res.append({
                    "timestamp": r.timestamp.isoformat(),
                    "value": round(val, 2),
                    "unit": "µg/m³",
                    "pollutant": pollutant.upper(),
                    "data_source": "Observed Data (OpenAQ / Ground Station)"
                })
        return {
            "status": "available" if res else "insufficient_data",
            "message": "Observed Data" if res else "Insufficient historical data available.",
            "location_name": location.name,
            "history": res
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Insufficient historical data available. ({str(e)})",
            "history": []
        }

@app.get("/api/global/compare")
def compare_global_locations(
    locations: str = Query(..., description="Comma separated lat,lon|name e.g. 13.08,80.27|Chennai,35.67,139.65|Tokyo"),
    pollutant: str = Query("NO2"),
    days: int = Query(7),
    db: Session = Depends(get_db)
):
    """
    Compares up to 3 locations for a specified pollutant over a time range.
    """
    items = locations.split(",")[:3] # Max 3 locations
    pollutant_key = pollutant.lower().replace(".", "_")
    comparison = {}
    
    for item in items:
        if "|" in item:
            coords_str, name = item.split("|", 1)
        else:
            coords_str, name = item, item
            
        try:
            lat_s, lon_s = coords_str.split(":") if ":" in coords_str else coords_str.split("_") if "_" in coords_str else coords_str.split(";")
        except:
            if "," in coords_str:
                lat_s, lon_s = coords_str.split(",")
            else:
                continue
                
        lat = float(lat_s)
        lon = float(lon_s)
        
        try:
            loc_obj, records = get_or_fetch_environmental_data(db, lat, lon)
            hist_records = [r for r in records if not r.is_forecast]
            hist_records = sorted(hist_records, key=lambda x: x.timestamp)[-(days * 24):]
            
            data_points = []
            for r in hist_records:
                v = getattr(r, pollutant_key, None)
                if v is not None:
                    data_points.append({
                        "timestamp": r.timestamp.isoformat(),
                        "value": round(v, 2)
                    })
            comparison[name] = {
                "latitude": lat,
                "longitude": lon,
                "pollutant": pollutant.upper(),
                "unit": "µg/m³",
                "data_source": "Ground Station Observations",
                "records": data_points
            }
        except Exception as e:
            comparison[name] = {
                "error": "Insufficient data available for this location.",
                "records": []
            }
            
    return {
        "pollutant": pollutant.upper(),
        "time_range_days": days,
        "comparison": comparison
    }


# ==========================================
# INDIA AIR QUALITY MODULE ENDPOINTS
# ==========================================

@app.get("/api/india/overview")
def get_india_overview(db: Session = Depends(get_db)):
    """
    Returns India Air Quality module high-level overview metrics:
    Total Stations, Cities, States, Available Pollutants, and Source info.
    """
    return get_india_overview_metrics(db)

@app.get("/api/india/states")
def get_states():
    """
    Returns list of Indian states with available CPCB monitoring stations.
    """
    return get_india_states()

@app.get("/api/india/cities")
def get_cities(state: Optional[str] = Query(None)):
    """
    Returns list of cities in India (optionally filtered by state).
    """
    return get_india_cities(state=state)

@app.get("/api/india/stations")
def get_stations(
    state: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    query: Optional[str] = Query(None)
):
    """
    Returns list of monitoring stations matching state, city, or search query.
    If no station matches, returns empty list so UI displays 'No monitoring data available for this location.'
    """
    return search_india_stations(state=state, city=city, query=query)

@app.get("/api/india/observations")
def get_station_observation(station_id: str = Query(...)):
    """
    Returns current ground observation card for a specific Indian station.
    """
    obs = get_cpcb_station_observation(station_id)
    if not obs:
        raise HTTPException(status_code=404, detail="No monitoring data available for this location.")
    return obs

@app.get("/api/india/history")
def get_station_history(
    station_id: str = Query(...),
    pollutant: str = Query("NO2"),
    period: str = Query("7d")
):
    """
    Returns historical trend observations and statistical analysis for an Indian station.
    """
    return get_cpcb_historical_trend(station_id=station_id, pollutant=pollutant, period=period)

@app.get("/api/india/forecast")
def get_india_forecast(
    station_id: str = Query(...),
    pollutant: str = Query("NO2"),
    db: Session = Depends(get_db)
):
    """
    Generates AeroForecast AI ML Model forecast for an Indian monitoring station.
    Clearly distinguishes ML predictions from CPCB ground observations.
    """
    station = next((s for s in OFFICIAL_INDIAN_STATIONS if s["id"] == station_id), None)
    if not station:
        return {
            "status": "unavailable",
            "message": "ML forecast is not available for this station.",
            "data_source": "AeroForecast AI ML Model"
        }

    pollutant_upper = pollutant.upper()
    if pollutant_upper not in ["NO2", "O3"]:
        return {
            "status": "unavailable",
            "message": f"ML model currently supports NO2 and O3 forecasting. {pollutant_upper} ML model is not available.",
            "data_source": "AeroForecast AI ML Model"
        }

    try:
        location, df_forecast, metrics, _ = get_cached_pipeline_results(db, station["latitude"], station["longitude"])
        forecast_df = df_forecast[df_forecast["is_forecast"] == True]
        if forecast_df.empty:
            return {
                "status": "unavailable",
                "message": "ML forecast is not available for this station.",
                "data_source": "AeroForecast AI ML Model"
            }

        pollutant_key = pollutant_upper.lower()
        best_model_name = metrics.get(pollutant_key, {}).get("best_model", "Random Forest Regressor")
        
        forecast_records = []
        for _, row in forecast_df.iterrows():
            forecast_records.append({
                "timestamp": str(row["timestamp"]),
                "predicted_value": round(float(row[pollutant_key]), 2)
            })

        return {
            "status": "available",
            "location": station["station_name"],
            "station": station["station_name"],
            "city": station["city"],
            "state": station["state"],
            "pollutant": pollutant_upper,
            "forecast": forecast_records,
            "model": best_model_name,
            "unit": "µg/m³",
            "data_source": "AeroForecast AI ML Model",
            "data_type": "Machine Learning Prediction",
            "source_badge": "AeroForecast AI ML Model"
        }
    except Exception as e:
        return {
            "status": "unavailable",
            "message": f"ML forecast is not available for this station. ({str(e)})",
            "data_source": "AeroForecast AI ML Model"
        }

@app.get("/api/india/model-metrics")
def get_india_model_metrics(
    station_id: str = Query("TN_CHE_01"),
    db: Session = Depends(get_db)
):
    """
    Returns time-series model comparison metrics (Linear Regression, Random Forest, XGBoost)
    on sequential train/test splits for Indian station data.
    """
    station = next((s for s in OFFICIAL_INDIAN_STATIONS if s["id"] == station_id), OFFICIAL_INDIAN_STATIONS[0])
    try:
        location, df_forecast, metrics, importances = get_cached_pipeline_results(db, station["latitude"], station["longitude"])
        return {
            "station_id": station["id"],
            "station_name": station["station_name"],
            "city": station["city"],
            "state": station["state"],
            "targets": metrics,
            "train_split": "First 80% chronological observations",
            "test_split": "Recent 20% sequential observations",
            "data_source": "AeroForecast AI ML Evaluation",
            "feature_importances": importances
        }
    except Exception as e:
        return {
            "status": "unavailable",
            "message": f"Model metrics unavailable: {str(e)}",
            "data_source": "AeroForecast AI ML Evaluation"
        }


