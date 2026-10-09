import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { AlertCircle, Calendar, RefreshCw, Sparkles, TrendingUp } from 'lucide-react';
import { apiService } from '../services/api';

export default function Forecast({
  lat,
  lon,
  locationName,
  forecastData,
  isForecastLoading,
  forecastError,
  fetchForecastData,
  onLocationSelect
}) {
  const [horizon, setHorizon] = useState(24);
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainResult, setRetrainResult] = useState(null);

  // Re-fetch forecast when horizon changes
  useEffect(() => {
    fetchForecastData(horizon);
  }, [horizon, lat, lon]);

  const handleForceRetrain = async () => {
    setIsRetraining(true);
    setRetrainResult(null);
    try {
      const res = await apiService.forceRetrain(lat, lon);
      setRetrainResult({ success: true, message: res.message });
      // Refresh forecast
      fetchForecastData(horizon);
    } catch (err) {
      console.error(err);
      setRetrainResult({ success: false, message: err.message || "Failed to retrain models." });
    } finally {
      setIsRetraining(false);
    }
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

  // Process data for charts
  const rawList = forecastData?.forecast || [];
  
  const chartData = rawList.map((item) => {
    const d = new Date(item.timestamp);
    const hour = d.getHours().toString().padStart(2, '0') + ':00';
    const day = d.toLocaleDateString([], { weekday: 'short' });
    return {
      ...item,
      timeLabel: `${hour} (${day})`,
      no2: parseFloat(item.no2.toFixed(2)),
      o3: parseFloat(item.o3.toFixed(2)),
    };
  });

  return (
    <div className="forecast-page">
      {/* Title & Horizon controls */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              Predictive Analysis
            </span>
            <span className="badge badge-ai">⚡ AI Predicted</span>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.25rem', color: 'var(--text-primary)' }}>
            AI-Based Air Quality Forecasts
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Location: <strong style={{ color: 'var(--text-primary)' }}>{locationName}</strong>
          </p>
        </div>

        {/* Horizon Toggles */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.35rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
          {[24, 48, 72].map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className="btn"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                borderRadius: '6px',
                background: horizon === h ? 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)' : 'transparent',
                color: horizon === h ? 'white' : 'var(--text-secondary)',
                fontWeight: '600'
              }}
            >
              {h} Hours
            </button>
          ))}
        </div>
      </div>

      {/* Loading/Error and Alerts */}
      {isForecastLoading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid rgba(230,57,70,0.2)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Running ML pipeline and generating recursive forecasts...</p>
        </div>
      ) : forecastError ? (
        <div className="glass-panel" style={{ color: 'var(--accent-danger)', padding: '2rem', display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
          <AlertCircle size={24} />
          <div>
            <h3 style={{ fontWeight: '700' }}>Forecasting Blocked</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Models could not be trained or executed. Please ensure we have loaded a valid historical dataset for these coordinates.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Peak alert details */}
          {forecastData?.aqi_status && (
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between', borderLeft: `4px solid ${getStatusColor(forecastData.aqi_status)}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <TrendingUp size={32} style={{ color: getStatusColor(forecastData.aqi_status) }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Peak Forecast Status ({horizon}H Window)</div>
                  <span className={`badge ${getStatusClass(forecastData.aqi_status)}`} style={{ marginTop: '0.25rem', fontSize: '0.95rem' }}>
                    {forecastData.aqi_status}
                  </span>
                </div>
              </div>
              <div style={{ flex: '1', minWidth: '280px', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                <strong>Forecast Alert:</strong> {forecastData.aqi_explanation}
                {forecastData.aqi_status !== 'Low' && (
                  <span style={{ display: 'block', marginTop: '0.25rem', color: 'var(--accent-warning)', fontWeight: '600' }}>
                    ⚠ Elevated pollution peaks predicted. Limit prolonged outdoor exposure during high-AQI hours.
                  </span>
                )}
              </div>
              <div>
                <button
                  className="btn btn-secondary"
                  onClick={handleForceRetrain}
                  disabled={isRetraining}
                  style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}
                >
                  <RefreshCw size={16} className={isRetraining ? 'spin' : ''} />
                  <span>{isRetraining ? 'Retraining...' : 'Force Model Retrain'}</span>
                </button>
              </div>
            </div>
          )}

          {retrainResult && (
            <div className="glass-panel" style={{
              padding: '1rem',
              fontSize: '0.9rem',
              color: retrainResult.success ? 'var(--accent-success)' : 'var(--accent-danger)',
              border: `1px solid ${retrainResult.success ? 'rgba(42, 157, 143, 0.3)' : 'rgba(217, 4, 41, 0.3)'}`,
              background: retrainResult.success ? 'rgba(42, 157, 143, 0.08)' : 'rgba(217, 4, 41, 0.08)'
            }}>
              {retrainResult.message}
            </div>
          )}

          {/* Forecast Charts Grid */}
          <div className="grid-cols-2">
            {/* NO2 Chart */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-primary)' }}>Predicted Nitrogen Dioxide (NO₂) Trend</h3>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(210, 176, 106, 0.15)" />
                    <XAxis dataKey="timeLabel" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} label={{ value: 'µg/m³', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line name="Predicted NO2" type="monotone" dataKey="no2" stroke="var(--accent-primary)" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* O3 Chart */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-primary)' }}>Predicted Ground-Level Ozone (O₃) Trend</h3>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(210, 176, 106, 0.15)" />
                    <XAxis dataKey="timeLabel" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} label={{ value: 'µg/m³', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line name="Predicted O3" type="monotone" dataKey="o3" stroke="var(--accent-secondary)" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tabular Forecast View */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>Hourly Prediction Table</h3>
            <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Time</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Predicted NO₂ (µg/m³)</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Predicted O₃ (µg/m³)</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Temperature (°C)</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Humidity (%)</th>
                    <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Wind Speed (km/h)</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', hover: { background: 'rgba(255,255,255,0.01)' } }} className="table-row-hover">
                      <td style={{ padding: '0.75rem 1rem', fontWeight: '600' }}>
                        {new Date(row.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--accent-primary)', fontWeight: '700' }}>
                        {row.no2.toFixed(1)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--accent-secondary)', fontWeight: '700' }}>
                        {row.o3.toFixed(1)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>{row.temperature.toFixed(1)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{row.humidity.toFixed(0)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{row.wind_speed.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
