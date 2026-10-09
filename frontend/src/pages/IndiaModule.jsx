import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Search,
  Activity,
  Calendar,
  TrendingUp,
  AlertCircle,
  Clock,
  ShieldCheck,
  BrainCircuit,
  BarChart3,
  Layers,
  CheckCircle2,
  RefreshCw,
  Globe,
  Cpu,
  HelpCircle,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { apiService } from '../services/api';
import IndiaMapComponent from '../components/IndiaMapComponent';

export default function IndiaModule({ onLocationSelect, setCurrentPage }) {
  // Overview metrics state
  const [overview, setOverview] = useState(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);

  // Filter & Search states
  const [statesList, setStatesList] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [citiesList, setCitiesList] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Stations state
  const [stations, setStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState('TN_CHE_01');
  const [isStationsLoading, setIsStationsLoading] = useState(true);
  const [stationsError, setStationsError] = useState(null);

  // Pollutant selector state
  const [selectedPollutant, setSelectedPollutant] = useState('NO2');

  // Ground observation state
  const [observation, setObservation] = useState(null);
  const [isObsLoading, setIsObsLoading] = useState(false);
  const [obsError, setObsError] = useState(null);

  // Historical trend state
  const [histPeriod, setHistPeriod] = useState('7d');
  const [historical, setHistorical] = useState(null);
  const [isHistLoading, setIsHistLoading] = useState(false);

  // ML Forecast state
  const [forecast, setForecast] = useState(null);
  const [isForecastLoading, setIsForecastLoading] = useState(false);

  // Model comparison metrics state
  const [modelMetrics, setModelMetrics] = useState(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);
  const [isSetAsMain, setIsSetAsMain] = useState(false);

  // 1. Fetch Overview & States list on mount
  useEffect(() => {
    async function initOverview() {
      setIsOverviewLoading(true);
      try {
        const ov = await apiService.getIndiaOverview();
        setOverview(ov);
        const st = await apiService.getIndiaStates();
        setStatesList(st);
      } catch (err) {
        console.error('Failed to load overview:', err);
      } finally {
        setIsOverviewLoading(false);
      }
    }
    initOverview();
  }, []);

  // 2. Fetch Cities when selectedState changes
  useEffect(() => {
    async function loadCities() {
      try {
        const c = await apiService.getIndiaCities(selectedState || null);
        setCitiesList(c);
      } catch (err) {
        console.error('Failed to load cities:', err);
      }
    }
    loadCities();
  }, [selectedState]);

  // 3. Fetch Stations matching selectedState, selectedCity, searchQuery
  useEffect(() => {
    async function loadStations() {
      setIsStationsLoading(true);
      setStationsError(null);
      try {
        const res = await apiService.getIndiaStations(selectedState || null, selectedCity || null, searchQuery || null);
        setStations(res);
        if (res.length > 0) {
          // If current selectedStationId is not in search results, default to first result
          if (!res.some(s => s.id === selectedStationId)) {
            setSelectedStationId(res[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load stations:', err);
        setStationsError('Unable to retrieve data from the selected source.');
      } finally {
        setIsStationsLoading(false);
      }
    }
    loadStations();
  }, [selectedState, selectedCity, searchQuery]);

  // 4. Fetch Observation, History, Forecast & Metrics when selectedStationId or pollutant/period changes
  useEffect(() => {
    if (!selectedStationId) return;

    async function loadStationData() {
      // Load current ground observation
      setIsObsLoading(true);
      setObsError(null);
      try {
        const obs = await apiService.getIndiaObservation(selectedStationId);
        setObservation(obs);
      } catch (err) {
        console.error('Failed to load observation:', err);
        setObsError('No monitoring data available for this location.');
        setObservation(null);
      } finally {
        setIsObsLoading(false);
      }

      // Load historical trend
      setIsHistLoading(true);
      try {
        const hist = await apiService.getIndiaHistory(selectedStationId, selectedPollutant, histPeriod);
        setHistorical(hist);
      } catch (err) {
        console.error('Failed to load historical:', err);
        setHistorical(null);
      } finally {
        setIsHistLoading(false);
      }

      // Load AeroForecast AI ML prediction
      setIsForecastLoading(true);
      try {
        const fc = await apiService.getIndiaForecast(selectedStationId, selectedPollutant);
        setForecast(fc);
      } catch (err) {
        console.error('Failed to load forecast:', err);
        setForecast(null);
      } finally {
        setIsForecastLoading(false);
      }

      // Load Model comparison metrics
      setIsMetricsLoading(true);
      try {
        const mm = await apiService.getIndiaModelMetrics(selectedStationId);
        setModelMetrics(mm);
      } catch (err) {
        console.error('Failed to load model metrics:', err);
        setModelMetrics(null);
      } finally {
        setIsMetricsLoading(false);
      }
    }

    loadStationData();
  }, [selectedStationId, selectedPollutant, histPeriod]);

  // Currently selected station metadata
  const currentStation = stations.find(s => s.id === selectedStationId) || stations[0];
  const availablePollutants = currentStation?.available_pollutants || ['NO2', 'O3', 'PM2.5', 'PM10', 'SO2', 'CO'];

  // Helpers for Feature Importance & Explainable AI Insights
  const getCleanFieldName = (field) => {
    const mappings = {
      pm2_5: "PM2.5 Concentration",
      pm10: "PM10 Concentration",
      temperature: "Air Temperature",
      humidity: "Relative Humidity",
      precipitation: "Hourly Precipitation",
      pressure: "Atmospheric Pressure",
      wind_speed: "Wind Speed",
      wind_direction: "Wind Direction",
      no2_lag_1: "NO2 Lag 1h",
      no2_lag_3: "NO2 Lag 3h",
      no2_lag_6: "NO2 Lag 6h",
      no2_lag_12: "NO2 Lag 12h",
      no2_lag_24: "NO2 Lag 24h",
      o3_lag_1: "O3 Lag 1h",
      o3_lag_3: "O3 Lag 3h",
      o3_lag_6: "O3 Lag 6h",
      o3_lag_12: "O3 Lag 12h",
      o3_lag_24: "O3 Lag 24h",
      hour: "Hour of Day",
      day: "Day of Month",
      month: "Month of Year",
      day_of_week: "Day of Week"
    };
    return mappings[field] || field;
  };

  const getFeatureChartData = () => {
    if (!modelMetrics || !modelMetrics.feature_importances) return [];
    const targetKey = (selectedPollutant || 'NO2').toLowerCase();
    const rawImp = modelMetrics.feature_importances[targetKey] || modelMetrics.feature_importances['no2'];
    if (!rawImp) return [];
    return Object.entries(rawImp)
      .map(([k, v]) => ({
        rawKey: k,
        featureName: getCleanFieldName(k),
        importance: parseFloat((v * 100).toFixed(2))
      }))
      .slice(0, 10);
  };

  const getExplanationText = () => {
    const chartData = getFeatureChartData();
    if (!chartData.length || !modelMetrics || !modelMetrics.targets) return "";
    const targetKey = (selectedPollutant || 'NO2').toLowerCase();
    const targetInfo = modelMetrics.targets[targetKey] || modelMetrics.targets['no2'];
    const bestModel = targetInfo?.best_model || 'XGBoost Regressor';
    const topFeatures = chartData.slice(0, 3).map(f => f.featureName);
    const stationName = currentStation?.station_name || 'selected station';
    return `For CPCB Station "${stationName}", AeroForecast AI dynamically evaluated Linear Regression, Random Forest, and XGBoost models. The automated engine selected ${bestModel} as the best predictor for ${selectedPollutant.toUpperCase()} predictions based on chronological out-of-sample R² evaluation. The top features driving predictions at this station are ${topFeatures[0] || 'autoregressive lags'}, ${topFeatures[1] || 'meteorological conditions'}, and ${topFeatures[2] || 'environmental factors'}.`;
  };

  return (
    <div className="india-module-container" style={{ padding: '2rem 1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div className="module-header glass-panel" style={{ padding: '1.75rem 2rem', borderRadius: '16px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <Globe size={24} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Official National Environmental Monitoring
            </span>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, var(--text-primary), var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            India Air Quality Module
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.4rem', marginBottom: 0 }}>
            Real ground observations from Central Pollution Control Board (CPCB) / Government Open Data Platform paired with AeroForecast AI ML predictions.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
          <div style={{ background: 'rgba(166, 106, 76, 0.12)', border: '1px solid rgba(166, 106, 76, 0.3)', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--accent-highlight)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={16} /> Primary Source: CPCB / data.gov.in
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Last Updated: {overview?.last_updated ? new Date(overview.last_updated).toLocaleString() : 'Live Stream Active'}
          </div>
        </div>
      </div>

      {/* 1. India Overview Cards */}
      <div className="overview-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(166, 106, 76, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
            <Building2 size={26} />
          </div>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Monitoring Stations</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {isOverviewLoading ? '...' : overview?.total_stations || 18}
            </div>
            <div style={{ color: 'var(--accent-highlight)', fontSize: '0.75rem' }}>Active CPCB Networks</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(120, 134, 107, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-secondary)' }}>
            <MapPin size={26} />
          </div>
          <div>
            <div style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Cities Covered</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F8FAFC' }}>
              {isOverviewLoading ? '...' : overview?.total_cities || 11}
            </div>
            <div style={{ color: '#A78BFA', fontSize: '0.75rem' }}>Major Municipalities</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34D399' }}>
            <Layers size={26} />
          </div>
          <div>
            <div style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>States Available</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F8FAFC' }}>
              {isOverviewLoading ? '...' : overview?.total_states || 9}
            </div>
            <div style={{ color: '#34D399', fontSize: '0.75rem' }}>State Boards Connected</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(251, 146, 60, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FB923C' }}>
            <Activity size={26} />
          </div>
          <div>
            <div style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Pollutants Available</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F8FAFC' }}>
              {isOverviewLoading ? '...' : (overview?.available_pollutants?.length || 6)}
            </div>
            <div style={{ color: '#FB923C', fontSize: '0.75rem' }}>NO₂, O₃, PM2.5, PM10, SO₂, CO</div>
          </div>
        </div>
      </div>

      {/* 2. Control Bar (State, City, Station Search Filter) */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={20} style={{ color: '#22D3EE' }} /> State, City & Station Selector
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {/* State Dropdown */}
          <div>
            <label style={{ display: 'block', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              State Selection
            </label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedCity('');
              }}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#F8FAFC',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            >
              <option value="">All Available States</option>
              {statesList.map((st) => (
                <option key={st.name} value={st.name}>
                  {st.name} ({st.stations_count} stations)
                </option>
              ))}
            </select>
          </div>

          {/* City Dropdown */}
          <div>
            <label style={{ display: 'block', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              City Selection
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#F8FAFC',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            >
              <option value="">All Available Cities</option>
              {citiesList.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.state})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label style={{ display: 'block', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              Search Indian City or Station
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search Chennai, Delhi, Mumbai, Bengaluru..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#F8FAFC',
                  border: '1px solid rgba(34, 211, 238, 0.3)',
                  borderRadius: '10px',
                  outline: 'none',
                  fontSize: '0.9rem'
                }}
              />
              <Search size={18} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
            </div>
          </div>
        </div>

        {/* Station Select Dropdown */}
        <div style={{ marginTop: '1.25rem' }}>
          <label style={{ display: 'block', color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
            Active Monitoring Station
          </label>
          {isStationsLoading ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading India air-quality data…</div>
          ) : stations.length === 0 ? (
            <div style={{ padding: '0.8rem', background: 'rgba(200, 75, 49, 0.1)', border: '1px solid rgba(200, 75, 49, 0.3)', borderRadius: '8px', color: '#FCA5A5', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} /> No monitoring data available for this location.
            </div>
          ) : (
            <select
              value={selectedStationId}
              onChange={(e) => setSelectedStationId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                background: 'var(--bg-elevated)',
                color: 'var(--accent-cream)',
                border: '1px solid var(--glass-border-hover)',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.95rem'
              }}
            >
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.station_name} — {s.city}, {s.state} (Lat: {s.latitude.toFixed(2)}, Lon: {s.longitude.toFixed(2)})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 3. India Interactive Map View */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Globe size={20} style={{ color: 'var(--accent-secondary)' }} /> India Station Map View
        </h3>
        <IndiaMapComponent
          stations={stations}
          selectedStationId={selectedStationId}
          onSelectStation={(stId) => setSelectedStationId(stId)}
        />
      </div>

      {/* 4. Pollutant Selector Bar */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', borderRadius: '16px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>Selected Pollutant Parameter</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Pollutant Concentration (µg/m³) — Concentration values are direct physical measurements and not AQI scores.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['NO2', 'O3', 'PM2.5', 'PM10', 'SO2', 'CO'].map((p) => {
            const isSupported = availablePollutants.includes(p);
            const isSelected = selectedPollutant === p;
            return (
              <button
                key={p}
                disabled={!isSupported}
                onClick={() => setSelectedPollutant(p)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: isSupported ? 'pointer' : 'not-allowed',
                  opacity: isSupported ? 1 : 0.4,
                  background: isSelected ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'var(--bg-elevated)',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: isSelected ? 'none' : '1px solid var(--glass-border)'
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Current Observation Card (CPCB Ground Data) */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={20} style={{ color: 'var(--accent-success)' }} /> Current Ground Observation Card
        </h3>

        {isObsLoading ? (
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading India air-quality data…
          </div>
        ) : obsError || !observation ? (
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', color: '#FCA5A5', background: 'rgba(200, 75, 49, 0.1)', border: '1px solid rgba(200, 75, 49, 0.3)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <AlertCircle size={24} /> {obsError || 'No monitoring data available for this location.'}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', borderLeft: '5px solid var(--accent-primary)' }}>
            <div>
              <div style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                {observation.state} &bull; {observation.city}
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {observation.station_name}
              </h2>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                <strong>Coordinates:</strong> Lat {observation.latitude.toFixed(4)}, Lon {observation.longitude.toFixed(4)}
              </div>
              <div style={{ color: 'var(--accent-highlight)', fontSize: '0.85rem', marginTop: '0.4rem', fontWeight: 600 }}>
                Data Source: {observation.data_source}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem 1.5rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
                Current Pollutant: <span style={{ color: '#22D3EE', fontWeight: 800 }}>{selectedPollutant}</span>
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#F8FAFC', margin: '0.2rem 0' }}>
                {observation.pollutants[selectedPollutant]?.value ?? 'N/A'}
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#94A3B8', marginLeft: '0.4rem' }}>
                  {observation.pollutants[selectedPollutant]?.unit || 'µg/m³'}
                </span>
              </div>
              <div style={{ color: '#64748B', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={14} /> Observed: {observation.observed_at ? new Date(observation.observed_at).toLocaleString() : 'N/A'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: '#94A3B8' }}>Data Status:</span>
                <span style={{ fontWeight: 700, color: observation.data_status === 'Available' ? '#34D399' : '#FB923C' }}>
                  {observation.data_status}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: '#94A3B8' }}>Observation Type:</span>
                <span style={{ fontWeight: 700, color: '#38BDF8' }}>Ground Observation</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.85rem' }}>
                <span style={{ color: '#94A3B8' }}>Network Authority:</span>
                <span style={{ fontWeight: 700, color: '#A78BFA' }}>CPCB Govt Portal</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. Historical Trend & Analytical Cards */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} style={{ color: '#22D3EE' }} /> Historical Trend & Pollution Analysis ({selectedPollutant})
          </h3>

          {/* Time range selector */}
          <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.3rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            {['24h', '7d', '30d'].map((p) => (
              <button
                key={p}
                onClick={() => setHistPeriod(p)}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  border: 'none',
                  cursor: 'pointer',
                  background: histPeriod === p ? '#22D3EE' : 'transparent',
                  color: histPeriod === p ? '#030712' : '#94A3B8'
                }}
              >
                {p === '24h' ? '24 Hours' : p === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>
        </div>

        {isHistLoading ? (
          <div className="glass-panel" style={{ padding: '3rem', borderRadius: '16px', textAlign: 'center', color: '#94A3B8' }}>
            Loading historical observations…
          </div>
        ) : !historical || !historical.records || historical.records.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: '16px', color: '#FCA5A5', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <AlertCircle size={22} style={{ marginBottom: '0.5rem' }} />
            <div>{historical?.data_status || 'Insufficient historical data for this analysis.'}</div>
          </div>
        ) : (
          <div>
            {/* Chart */}
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem', height: '360px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historical.records}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(str) => {
                      const d = new Date(str);
                      return histPeriod === '24h' ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    }}
                    stroke="#64748B"
                    fontSize={12}
                  />
                  <YAxis stroke="#64748B" fontSize={12} unit={` ${historical.unit || 'µg/m³'}`} />
                  <Tooltip
                    contentStyle={{ background: '#0F172A', border: '1px solid rgba(34, 211, 238, 0.4)', borderRadius: '8px', color: '#F8FAFC' }}
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                    formatter={(val) => [`${val} ${historical.unit || 'µg/m³'}`, `Ground Observation (${selectedPollutant})`]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={`Observed Concentration (${selectedPollutant})`}
                    stroke="var(--accent-primary)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 6, fill: 'var(--accent-secondary)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Data Source: {historical.data_source} &bull; Ground Observation Stream
              </div>
            </div>

            {/* Pollution Trend Analysis Cards (Section 9) */}
            {historical.analysis && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: '12px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Average Concentration</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '0.2rem' }}>
                    {historical.analysis.average} <span style={{ fontSize: '0.85rem' }}>{historical.unit}</span>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: '12px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Minimum Recorded</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-success)', marginTop: '0.2rem' }}>
                    {historical.analysis.minimum} <span style={{ fontSize: '0.85rem' }}>{historical.unit}</span>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: '12px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Maximum Peak</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-danger)', marginTop: '0.2rem' }}>
                    {historical.analysis.maximum} <span style={{ fontSize: '0.85rem' }}>{historical.unit}</span>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: '12px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Observations Count</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-secondary)', marginTop: '0.2rem' }}>
                    {historical.analysis.count}
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: '12px', gridColumn: 'span 2' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Trend Interpretation</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.3rem' }}>
                    {historical.analysis.trend}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
                    Data Coverage: {historical.analysis.data_coverage}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7. AeroForecast AI ML Prediction Section (Section 10) */}
      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', marginBottom: '2rem', border: '1px solid var(--glass-border-hover)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-secondary)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
              <BrainCircuit size={18} /> AeroForecast AI Machine Learning Engine
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: 'var(--text-primary)' }}>
              AeroForecast AI Prediction
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
              Distinct machine-learning recursive predictions generated independently by AeroForecast AI. This is NOT CPCB’s prediction.
            </p>
          </div>

          <div style={{ background: 'rgba(120, 134, 107, 0.15)', border: '1px solid rgba(120, 134, 107, 0.4)', padding: '0.5rem 1rem', borderRadius: '10px', color: 'var(--accent-highlight)', fontSize: '0.8rem', fontWeight: 700 }}>
            Source: AeroForecast AI ML Model &bull; Machine Learning Prediction
          </div>
        </div>

        {isForecastLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
            Running AeroForecast AI model prediction pipeline…
          </div>
        ) : !forecast || forecast.status === 'unavailable' || !forecast.forecast || forecast.forecast.length === 0 ? (
          <div style={{ padding: '1.5rem', background: 'rgba(200, 75, 49, 0.1)', border: '1px solid rgba(200, 75, 49, 0.3)', borderRadius: '12px', color: '#FCA5A5', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <AlertCircle size={22} />
            <div>{forecast?.message || 'ML forecast is not available for this station.'}</div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem', fontSize: '0.9rem', flexWrap: 'wrap', background: 'var(--bg-elevated)', padding: '1rem', borderRadius: '10px' }}>
              <div><strong style={{ color: 'var(--text-secondary)' }}>Model Architecture:</strong> <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{forecast.model}</span></div>
              <div><strong style={{ color: 'var(--text-secondary)' }}>Target Parameter:</strong> <span style={{ color: 'var(--accent-secondary)', fontWeight: 700 }}>{forecast.pollutant}</span></div>
              <div><strong style={{ color: 'var(--text-secondary)' }}>Forecast Unit:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{forecast.unit}</span></div>
            </div>

            <div style={{ height: '300px', marginBottom: '1.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecast.forecast.slice(0, 48)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(210, 176, 106, 0.15)" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(str) => new Date(str).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    stroke="var(--text-muted)"
                    fontSize={12}
                  />
                  <YAxis stroke="var(--text-muted)" fontSize={12} unit={` ${forecast.unit}`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                    labelFormatter={(label) => new Date(label).toLocaleString()}
                    formatter={(val) => [`${val} ${forecast.unit}`, `ML Forecast (${forecast.pollutant})`]}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted_value"
                    name={`AeroForecast AI Prediction (${forecast.pollutant})`}
                    stroke="var(--accent-secondary)"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Forecast Preview Timeline Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              {forecast.forecast.slice(0, 6).map((item, idx) => (
                <div key={idx} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>
                    +{ (idx + 1) * 4 }h Projection
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-highlight)', marginTop: '0.2rem' }}>
                    {item.predicted_value} <span style={{ fontSize: '0.8rem' }}>{forecast.unit}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.3rem' }}>
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 8. Model Comparison & Time-Series Data Split (Sections 11 & 12) */}
      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart3 size={20} style={{ color: 'var(--accent-primary)' }} /> Model Evaluation & Sequential Time-Series Comparison
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Evaluation metrics computed on sequential time-series split preserving chronological order. Older observations are used for training and recent observations for testing (no random shuffle).
        </p>

        {isMetricsLoading ? (
          <div style={{ color: 'var(--text-secondary)' }}>Loading model evaluation metrics…</div>
        ) : !modelMetrics || !modelMetrics.targets ? (
          <div style={{ color: 'var(--text-secondary)' }}>Model comparison metrics currently unavailable.</div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {['no2', 'o3'].map((tgt) => {
                const tgtInfo = modelMetrics.targets[tgt];
                if (!tgtInfo) return null;
                const comparison = tgtInfo.comparison || {};
                const bestModel = tgtInfo.best_model;

                return (
                  <div key={tgt} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--glass-border)', padding: '1.25rem', borderRadius: '14px' }}>
                    <div style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                      Target Pollutant: {tgt.toUpperCase()}
                    </div>
                    <div style={{ color: 'var(--accent-success)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem' }}>
                      Selected Best Model: {bestModel}
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                          <th style={{ padding: '0.5rem' }}>Model Algorithm</th>
                          <th style={{ padding: '0.5rem' }}>MAE</th>
                          <th style={{ padding: '0.5rem' }}>RMSE</th>
                          <th style={{ padding: '0.5rem' }}>R² Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(comparison).map(([mName, metrics]) => {
                          const isBest = mName === bestModel;
                          return (
                            <tr key={mName} style={{ borderBottom: '1px solid var(--glass-border)', background: isBest ? 'rgba(166, 106, 76, 0.12)' : 'transparent' }}>
                              <td style={{ padding: '0.5rem', fontWeight: isBest ? 700 : 400, color: isBest ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                                {mName} {isBest && '★'}
                              </td>
                              <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{metrics.MAE}</td>
                              <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{metrics.RMSE}</td>
                              <td style={{ padding: '0.5rem', color: isBest ? 'var(--accent-success)' : 'var(--text-secondary)', fontWeight: isBest ? 700 : 400 }}>{metrics.R2}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '1.25rem', padding: '0.8rem 1rem', background: 'rgba(210, 176, 106, 0.04)', borderRadius: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div><strong>Training Split:</strong> {modelMetrics.train_split || 'Older 80% chronological observations'}</div>
              <div><strong>Testing Split:</strong> {modelMetrics.test_split || 'Recent 20% sequential observations'}</div>
              <div><strong>Data Source:</strong> {modelMetrics.data_source}</div>
            </div>
          </div>
        )}
      </div>

      {/* 9. Feature Importance & Explainable AI Insights for India Station */}
      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', marginBottom: '2rem', border: '1px solid var(--glass-border-hover)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
              <Cpu size={18} /> Station Explainable AI Insights
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.2rem 0 0 0', color: 'var(--text-primary)' }}>
              ML Feature Importance & Diagnostics ({selectedPollutant})
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
              Relative contribution of meteorological parameters and historical lags to model predictions for {currentStation?.station_name || 'selected station'}.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {onLocationSelect && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  if (currentStation) {
                    onLocationSelect(
                      currentStation.latitude,
                      currentStation.longitude,
                      `${currentStation.station_name}, ${currentStation.city}, ${currentStation.state}`,
                      'cpcb'
                    );
                    setIsSetAsMain(true);
                    setTimeout(() => setIsSetAsMain(false), 3000);
                  }
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                <MapPin size={16} style={{ color: isSetAsMain ? 'var(--accent-success)' : 'var(--accent-primary)' }} />
                <span style={{ color: isSetAsMain ? 'var(--accent-success)' : 'var(--text-primary)', fontWeight: 600 }}>
                  {isSetAsMain ? '✓ Set as Main Dashboard Location' : 'Set as Main Dashboard Location'}
                </span>
              </button>
            )}
          </div>
        </div>

        {isMetricsLoading ? (
          <div style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>Loading station feature importances…</div>
        ) : !getFeatureChartData().length ? (
          <div style={{ padding: '1.5rem', background: 'rgba(200, 75, 49, 0.1)', border: '1px solid rgba(200, 75, 49, 0.3)', borderRadius: '12px', color: '#FCA5A5', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <AlertCircle size={22} />
            <div>Feature importance diagnostics currently loading or unavailable for this station.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
            {/* Feature Importance Bar Chart */}
            <div style={{ background: 'var(--bg-elevated)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={18} style={{ color: 'var(--accent-primary)' }} /> Top 10 Influencing Features (%)
              </h3>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getFeatureChartData()}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 35, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(210, 176, 106, 0.15)" />
                    <XAxis type="number" stroke="var(--text-muted)" fontSize={10} tickFormatter={(v) => `${v}%`} />
                    <YAxis dataKey="featureName" type="category" stroke="var(--text-secondary)" fontSize={10} width={115} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                      formatter={(v) => [`${v}%`, 'Importance Weight']}
                    />
                    <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                      {getFeatureChartData().map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index % 2 === 0 ? 'var(--accent-primary)' : 'var(--accent-secondary)'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Explainable AI Report */}
            <div style={{ background: 'var(--bg-elevated)', padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BrainCircuit size={20} style={{ color: 'var(--accent-secondary)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Station AI Explanation Report</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                {getExplanationText()}
              </p>
              <div style={{ marginTop: 'auto', background: 'rgba(210, 176, 106, 0.04)', padding: '1rem', borderRadius: '10px', display: 'flex', gap: '0.6rem', alignItems: 'flex-start', border: '1px solid var(--glass-border)' }}>
                <HelpCircle size={20} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  <strong>How to read this:</strong> Autoregressive lags (e.g. "NO2 Lag 1h") show time-series momentum, while meteorological factors (e.g. "Air Temperature", "Wind Speed") reflect atmospheric dispersion effects.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
