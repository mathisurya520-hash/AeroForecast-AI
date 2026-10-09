# AeroForecast AI - AI-Based Air Quality Forecasting System

An end-to-end Machine Learning web application designed to forecast short-term ground-level gaseous air pollutants ($\text{NO}_2$ and $\text{O}_3$) up to 72 hours in advance. The system combines hourly meteorological forecasts and Copernicus Atmosphere Monitoring Service (CAMS) reanalysis data to train, compare, and execute advanced regression algorithms.

---

## Key Features

1. **Dynamic Data Collection**: Pulls 92 days of hourly history and weather predictions dynamically from Open-Meteo for any latitude/longitude coordinate.
2. **On-the-Fly ML Pipeline**:
   - Cleans and imputes missing time-series records.
   - Engineers auto-lags (1h, 3h, 6h, 12h, 24h) and cyclical temporal features.
   - Compares **Linear Regression**, **Random Forest**, and **XGBoost Regressor** on sequential splits.
   - Selects the best algorithm dynamically per region and stores model artifacts.
3. **Recursive Forecasting**: Feeds predictions back as lag features to project concentrations 24h, 48h, and 72h into the future.
4. **Accurate Geolocation Selector**:
   - Geolocation auto-detection with reverse-geocoding via OpenStreetMap's Nominatim API.
   - Manual search bar to input and find cities.
5. **Interactive Mapping**: Leaflet-based map allowing coordinate selection by clicking or panning.
6. **Feature Explainability**: Visualizes feature importances (split gains for trees, coefficients for linear models) to explain why predictions were made.
7. **Production Caching (PostgreSQL)**: Caches environmental API data and model metadata in a PostgreSQL database with an automatic fallback to local SQLite for zero-configuration testing.

---

## Project Structure

```text
air-quality-forecasting/
│
├── frontend/                 # React Frontend (Vite)
│   ├── public/
│   └── src/
│       ├── components/       # Map, Header, Footer
│       ├── pages/            # Home, Dashboard, Forecast, Historical, MLInsights, About
│       ├── services/         # api.js Client
│       └── index.css         # Vanilla CSS System
│
├── backend/                  # FastAPI Server
│   ├── main.py               # API Router and Endpoints
│   ├── database.py           # DB Sessions & fallback
│   ├── models_db.py          # SQLAlchemy models
│   └── services/
│       └── data_service.py   # OSM Lookup & Open-Meteo fetchers
│
├── ml/                       # ML Preprocessor & Models
│   ├── preprocessing.py      # Cleans, imputes, and engineers lags
│   ├── models.py             # LR, RF, XGBoost splitters & estimators
│   └── pipeline.py           # ML Orchestrator
│
├── saved_models/             # Persisted joblib model binaries
│
├── requirements.txt          # Python packages
└── README.md                 # Setup & running instructions
```

---

## Setup & Running Instructions

### 1. Backend API (FastAPI)

1. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Database (Optional)**:
   By default, the server falls back to SQLite (`air_quality.db` in the root). To connect to a PostgreSQL instance, define the environment variable:
   ```bash
   # Windows PowerShell
   $env:DATABASE_URL="postgresql://user:password@localhost:5532/dbname"
   
   # Linux/macOS
   export DATABASE_URL="postgresql://user:password@localhost:5532/dbname"
   ```

3. **Start the API server**:
   ```bash
   # Make sure you are in the workspace root
   uvicorn backend.main:app --reload
   ```
   The backend API will run on `http://127.0.0.1:8000`. You can inspect interactive Swagger documentation at `http://127.0.0.1:8000/docs`.

### 2. Frontend App (React + Vite)

1. **Install npm dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Run in development mode**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## Technical Details

### AQI Status Classification
We apply pollutant concentration thresholds (µg/m³) to evaluate categories:
- **NO₂ (Nitrogen Dioxide)**: Low (0-40), Moderate (40-80), High (80-180), Very High (>180)
- **O₃ (Ozone)**: Low (0-50), Moderate (50-100), High (100-168), Very High (>168)
- **PM2.5**: Low (0-30), Moderate (30-60), High (60-90), Very High (>90)
Overall AQI status is the maximum risk score of the three parameters.
