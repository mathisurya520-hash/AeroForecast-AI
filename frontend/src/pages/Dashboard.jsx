import React, { useState } from 'react';
import { Search, Navigation, AlertCircle, CloudRain, Thermometer, Droplets, Wind, Activity } from 'lucide-react';
import MapComponent from '../components/MapComponent';
import { apiService } from '../services/api';

export default function Dashboard({
  lat,
  lon,
  locationName,
  isLocationLoading,
  locationSource,
  currentAQ,
  isAQLoading,
  aqError,
  onLocationSelect,
  requestGeolocation
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    try {
      const results = await apiService.searchLocation(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result) => {
    onLocationSelect(result.latitude, result.longitude, result.name, 'manual');
    setSearchResults([]);
    setSearchQuery('');
  };

  const getStatusClass = (status) => {
    if (!status) return 'badge-good';
    const s = status.toLowerCase();
    if (s.includes('good') || s === 'low') return 'badge-good';
    if (s.includes('moderate')) return 'badge-moderate';
    if (s.includes('sensitive') || s === 'high') return 'badge-unhealthy-sensitive';
    if (s.includes('very unhealthy')) return 'badge-very-unhealthy';
    if (s.includes('unhealthy')) return 'badge-unhealthy';
    if (s.includes('hazardous')) return 'badge-hazardous';
    return 'badge-unhealthy';
  };

  const getStatusColor = (status) => {
    if (!status) return 'var(--aqi-good)';
    const s = status.toLowerCase();
    if (s.includes('good') || s === 'low') return 'var(--aqi-good)';
    if (s.includes('moderate')) return 'var(--aqi-moderate)';
    if (s.includes('sensitive') || s === 'high') return 'var(--aqi-unhealthy-sensitive)';
    if (s.includes('very unhealthy')) return 'var(--aqi-very-unhealthy)';
    if (s.includes('unhealthy')) return 'var(--aqi-unhealthy)';
    if (s.includes('hazardous')) return 'var(--aqi-hazardous)';
    return 'var(--aqi-unhealthy)';
  };

  // Card list builder helper
  const pollutants = currentAQ?.pollutants || {};
  const weather = currentAQ?.weather || {};
  const aqi = currentAQ?.aqi || {};

  const pollutantCards = [
    { key: 'no2', name: 'NO₂', val: pollutants.no2, unit: 'µg/m³', desc: 'Nitrogen Dioxide' },
    { key: 'o3', name: 'O₃', val: pollutants.o3, unit: 'µg/m³', desc: 'Ozone' },
    { key: 'pm2_5', name: 'PM2.5', val: pollutants.pm2_5, unit: 'µg/m³', desc: 'Fine Particles' },
    { key: 'pm10', name: 'PM10', val: pollutants.pm10, unit: 'µg/m³', desc: 'Coarse Particles' },
    { key: 'co', name: 'CO', val: pollutants.co, unit: 'µg/m³', desc: 'Carbon Monoxide' },
    { key: 'so2', name: 'SO₂', val: pollutants.so2, unit: 'µg/m³', desc: 'Sulphur Dioxide' },
  ];

  const weatherCards = [
    { name: 'Temperature', val: weather.temperature, unit: '°C', icon: <Thermometer size={20} className="text-secondary" /> },
    { name: 'Humidity', val: weather.humidity, unit: '%', icon: <Droplets size={20} className="text-secondary" /> },
    { name: 'Wind Speed', val: weather.wind_speed, unit: 'km/h', icon: <Wind size={20} className="text-secondary" /> },
    { name: 'Pressure', val: weather.pressure, unit: 'hPa', icon: <Activity size={20} className="text-secondary" /> },
  ];

  return (
    <div className="dashboard-page">
      {/* Controls panel */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '2.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={requestGeolocation} disabled={isLocationLoading} style={{ padding: '0.6rem 1rem' }}>
            <Navigation size={18} />
            <span>Use My Location</span>
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Status: <strong style={{ color: 'var(--accent-primary)' }}>{locationSource === 'gps' ? 'Using your current location' : 'Location selected manually'}</strong>
          </span>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', position: 'relative', width: '100%', maxWidth: '400px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search for a city or region..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingRight: '2.5rem' }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0 1rem', borderTopLeftRadius: '0', borderBottomLeftRadius: '0', position: 'absolute', right: '0', top: '0', bottom: '0' }}>
            <Search size={18} />
          </button>

          {/* Search dropdown results */}
          {searchResults.length > 0 && (
            <div className="glass-panel" style={{ position: 'absolute', top: '105%', left: '0', right: '0', zIndex: '1000', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '250px', overflowY: 'auto' }}>
              {searchResults.map((r, i) => (
                <div
                  key={i}
                  onClick={() => selectSearchResult(r)}
                  style={{ padding: '0.6rem 0.8rem', cursor: 'pointer', borderRadius: '4px', transition: 'var(--transition)', fontSize: '0.9rem' }}
                  className="search-item-hover"
                >
                  {r.name}
                </div>
              ))}
            </div>
          )}

          {isSearching && (
            <div className="glass-panel" style={{ position: 'absolute', top: '105%', left: '0', right: '0', zIndex: '1000', padding: '0.75rem', fontSize: '0.9rem', textAlign: 'center' }}>
              Searching...
            </div>
          )}
        </form>
      </div>

      {/* Main Grid: Info Cards on left, map on right */}
      <div className="dashboard-hero">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header information */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            {isAQLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ height: '24px', width: '300px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                <div style={{ height: '16px', width: '150px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
              </div>
            ) : aqError ? (
              <div style={{ display: 'flex', gap: '0.75rem', color: 'var(--accent-danger)' }}>
                <AlertCircle size={24} />
                <div>
                  <h3 style={{ fontWeight: '700' }}>Fetch Error</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                    Air-quality data is currently unavailable for this location. Let's try searching for another city.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                    Current Observations
                  </span>
                  <span className="badge badge-live">● Live</span>
                </div>
                <h2 style={{ fontSize: '2rem', fontWeight: '800', marginTop: '0.25rem', color: 'var(--text-primary)' }}>
                  {locationName || 'Unknown Location'}
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Latitude: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{lat.toFixed(4)}</strong> &nbsp;|&nbsp; Longitude: <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{lon.toFixed(4)}</strong>
                </p>
                
                {/* AQI Indicator */}
                {aqi.status && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', borderLeft: `4px solid ${getStatusColor(aqi.status)}` }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Overall Air Quality</div>
                      <span className={`badge ${getStatusClass(aqi.status)}`} style={{ marginTop: '0.25rem', fontSize: '1rem', padding: '0.4rem 1rem' }}>
                        {aqi.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {aqi.explanation}
                    </div>
                  </div>
                )}
                
                {currentAQ?.timestamp && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'right' }}>
                    Last updated: {new Date(currentAQ.timestamp).toLocaleString()} | Source: {currentAQ.data_source}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Gaseous and Particulate Pollutants */}
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>Pollutant Concentrations</h3>
            <div className="grid-cols-3">
              {pollutantCards.map((card, i) => (
                <div key={i} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{card.desc}</span>
                    <strong style={{ color: 'var(--accent-primary)', fontSize: '1.1rem' }}>{card.name}</strong>
                  </div>
                  {isAQLoading ? (
                    <div style={{ height: '32px', width: '80px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                  ) : card.val !== null && card.val !== undefined ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                      <span className="font-mono" style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>{card.val.toFixed(1)}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{card.unit}</span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Data unavailable</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Meteorological Parameters */}
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>Meteorological Conditions</h3>
            <div className="grid-cols-4">
              {weatherCards.map((card, i) => (
                <div key={i} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(34, 211, 238, 0.08)' }}>
                    {card.icon}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{card.name}</span>
                    {isAQLoading ? (
                      <div style={{ height: '20px', width: '50px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', animation: 'pulse 1.5s infinite', marginTop: '0.25rem' }} />
                    ) : card.val !== null && card.val !== undefined ? (
                      <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {card.val.toFixed(1)}{card.unit}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>N/A</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map Panel on Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>📍 Interactive Selection Map</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Click anywhere on the map below or search for a city above to update target coordinates. Models will retrain automatically for the selected region.
            </p>
            <MapComponent
              lat={lat}
              lon={lon}
              locationName={locationName}
              onLocationSelect={onLocationSelect}
            />
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(210, 176, 106, 0.04)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <strong>Note:</strong> Monitoring locations and air-quality observations are displayed only when data is available from supported sources. Pan and zoom to pinpoint global coordinates.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
