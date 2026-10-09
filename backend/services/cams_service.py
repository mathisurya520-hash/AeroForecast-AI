import requests
from typing import Dict, Any, Optional

def fetch_cams_forecast_data(lat: float, lon: float, forecast_days: int = 3) -> Dict[str, Any]:
    """
    Fetches real CAMS (Copernicus Atmosphere Monitoring Service) atmospheric composition forecast.
    Uses Open-Meteo CAMS Air Quality API endpoint.
    """
    url = (
        f"https://air-quality-api.open-meteo.com/v1/air-quality"
        f"?latitude={lat}&longitude={lon}"
        f"&hourly=pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide"
        f"&forecast_days={forecast_days}&domains=cams_global"
    )
    
    try:
        res = requests.get(url, timeout=10)
        if res.status_code == 200:
            data = res.json()
            hourly = data.get("hourly", {})
            times = hourly.get("time", [])
            no2 = hourly.get("nitrogen_dioxide", [])
            o3 = hourly.get("ozone", [])
            pm25 = hourly.get("pm2_5", [])
            pm10 = hourly.get("pm10", [])
            so2 = hourly.get("sulphur_dioxide", [])
            co = hourly.get("carbon_monoxide", [])
            
            records = []
            for i in range(min(len(times), forecast_days * 24)):
                records.append({
                    "timestamp": times[i],
                    "no2": no2[i] if i < len(no2) else None,
                    "o3": o3[i] if i < len(o3) else None,
                    "pm2_5": pm25[i] if i < len(pm25) else None,
                    "pm10": pm10[i] if i < len(pm10) else None,
                    "so2": so2[i] if i < len(so2) else None,
                    "co": co[i] if i < len(co) else None,
                })
                
            return {
                "status": "available",
                "data_source": "CAMS Atmospheric Forecast",
                "source_description": "Atmospheric composition forecast produced by Copernicus Atmosphere Monitoring Service (CAMS).",
                "latitude": lat,
                "longitude": lon,
                "records": records,
                "model": "CAMS Global Atmospheric Composition Model"
            }
    except Exception as e:
        print(f"[CAMS Service] Error fetching CAMS forecast: {e}")
        
    return {
        "status": "unavailable",
        "message": "CAMS forecast service is currently unavailable for this coordinate.",
        "data_source": "CAMS Atmospheric Forecast"
    }
