import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Calendar, CloudSun, Database, Info, Sliders } from 'lucide-react';
import { apiService } from '../services/api';

export default function Historical({ lat, lon, locationName }) {
  const [days, setDays] = useState(7);
  const [pollutant, setPollutant] = useState('no2');
  const [weatherParam, setWeatherParam] = useState('temperature');
  const [histData, setHistData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadHist() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiService.getHistoricalData(lat, lon, days);
        setHistData(data);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load historical data.");
      } finally {
        setIsLoading(false);
      }
    }
    loadHist();
  }, [lat, lon, days]);

  // Compute stats on-the-fly
  const computeStats = () => {
    if (!histData.length) return { avg: 0, max: 0, min: 0, count: 0, correlation: 0 };
    
    const vals = histData.map(d => d[pollutant]).filter(v => v !== null && v !== undefined);
    const wVals = histData.map(d => d[weatherParam]).filter(v => v !== null && v !== undefined);
    
    if (!vals.length) return { avg: 0, max: 0, min: 0, count: 0, correlation: 0 };
    
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / vals.length;
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    
    // Compute Pearson Correlation Coefficient
    let r = 0;
    const n = Math.min(vals.length, wVals.length);
    if (n > 1) {
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
      for (let i = 0; i < n; i++) {
        const x = vals[i];
        const y = wVals[i];
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
        sumY2 += y * y;
      }
      const num = (n * sumXY) - (sumX * sumY);
      const den = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));
      r = den !== 0 ? num / den : 0;
    }
    
    return {
      avg: roundVal(avg),
      max: roundVal(max),
      min: roundVal(min),
      count: vals.length,
      correlation: roundVal(r, 3)
    };
  };

  const roundVal = (v, dec = 1) => {
    return parseFloat(v.toFixed(dec));
  };

  const getCorrelationDescriptor = (r) => {
    const absR = Math.abs(r);
    let desc = "No linear correlation";
    if (absR > 0.7) desc = "Strong";
    else if (absR > 0.4) desc = "Moderate";
    else if (absR > 0.1) desc = "Weak";
    
    const direction = r > 0 ? " positive relationship" : " negative relationship";
    return `${desc}${absR > 0.1 ? direction : ''} (r = ${r})`;
  };

  const stats = computeStats();

  const formattedChartData = histData.map(d => {
    const dt = new Date(d.timestamp);
    const label = dt.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + dt.getHours() + ':00';
    return {
      ...d,
      timeLabel: label,
      [pollutant]: d[pollutant] ? roundVal(d[pollutant], 2) : 0,
      [weatherParam]: d[weatherParam] ? roundVal(d[weatherParam], 2) : 0
    };
  });

  const pollutantLabels = {
    no2: 'Nitrogen Dioxide (NO₂)',
    o3: 'Ozone (O₃)',
    pm2_5: 'Fine Particles (PM2.5)',
    pm10: 'Coarse Particles (PM10)',
    co: 'Carbon Monoxide (CO)',
    so2: 'Sulphur Dioxide (SO₂)'
  };

  const weatherLabels = {
    temperature: 'Temperature (°C)',
    humidity: 'Humidity (%)',
    wind_speed: 'Wind Speed (km/h)',
    pressure: 'Atmospheric Pressure (hPa)'
  };

  return (
    <div className="historical-page">
      {/* Title & Filters */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            Exploratory Data Analysis
          </span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.25rem', color: 'var(--text-primary)' }}>
            Historical Trends & Correlation
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Location: <strong style={{ color: 'var(--text-primary)' }}>{locationName}</strong>
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Days selector */}
          <div className="form-group" style={{ marginBottom: '0', minWidth: '110px' }}>
            <label className="form-label">Range</label>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="input-field"
              style={{ padding: '0.5rem' }}
            >
              <option value={7}>7 Days</option>
              <option value={14}>14 Days</option>
              <option value={30}>30 Days</option>
            </select>
          </div>

          {/* Pollutant selector */}
          <div className="form-group" style={{ marginBottom: '0', minWidth: '150px' }}>
            <label className="form-label">Pollutant</label>
            <select
              value={pollutant}
              onChange={(e) => setPollutant(e.target.value)}
              className="input-field"
              style={{ padding: '0.5rem' }}
            >
              {Object.entries(pollutantLabels).map(([k, v]) => (
                <option key={k} value={k}>{v.split(' ')[0]}</option>
              ))}
            </select>
          </div>

          {/* Weather selector */}
          <div className="form-group" style={{ marginBottom: '0', minWidth: '150px' }}>
            <label className="form-label">Compare With</label>
            <select
              value={weatherParam}
              onChange={(e) => setWeatherParam(e.target.value)}
              className="input-field"
              style={{ padding: '0.5rem' }}
            >
              {Object.entries(weatherLabels).map(([k, v]) => (
                <option key={k} value={k}>{v.split(' ')[0]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid rgba(230,57,70,0.2)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading historical environmental observations...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ color: 'var(--accent-danger)', padding: '2rem', display: 'flex', gap: '0.75rem' }}>
          <Database size={24} />
          <div>
            <h3 style={{ fontWeight: '700' }}>Cache Retrieval Failed</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Historical logs are currently missing in the local database. Try selecting another city or forcing retraining to populate records.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Summary Stat Cards */}
          <div className="grid-cols-4">
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Mean Concentration</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.avg}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>µg/m³</span>
              </div>
            </div>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Peak Level</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.max}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>µg/m³</span>
              </div>
            </div>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Minimum Level</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.min}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>µg/m³</span>
              </div>
            </div>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Hours Analyzed</span>
              <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.count}h</span>
            </div>
          </div>

          {/* Correlation explanation banner */}
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(230, 57, 70, 0.04)', border: '1px solid rgba(230, 57, 70, 0.18)' }}>
            <Info size={24} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <strong>Statistical Insight:</strong> The calculated Pearson correlation between <strong>{pollutantLabels[pollutant]}</strong> and <strong>{weatherLabels[weatherParam]}</strong> indicates a <strong>{getCorrelationDescriptor(stats.correlation)}</strong>. 
              <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                *Note: Feature correlations indicate statistical relationships under historical conditions and do not prove direct physical causation.
              </span>
            </div>
          </div>

          {/* Trend Charts */}
          <div className="grid-cols-2">
            {/* Pollutant Time Series */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                {pollutantLabels[pollutant]} History
              </h3>
              <div style={{ height: '350px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(230, 57, 70, 0.15)" />
                    <XAxis dataKey="timeLabel" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} label={{ value: 'µg/m³', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line name={pollutant.toUpperCase()} type="monotone" dataKey={pollutant} stroke="var(--accent-primary)" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pollution vs Meteorological Parameter */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                {pollutant.toUpperCase()} vs {weatherParam.charAt(0).toUpperCase() + weatherParam.slice(1)} Comparison
              </h3>
              <div style={{ height: '350px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(230, 57, 70, 0.15)" />
                    <XAxis dataKey="timeLabel" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <YAxis yAxisId="left" stroke="var(--accent-primary)" fontSize={10} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--accent-secondary)" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '8px' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line yAxisId="left" name={pollutant.toUpperCase()} type="monotone" dataKey={pollutant} stroke="var(--accent-primary)" strokeWidth={1.5} dot={false} />
                    <Line yAxisId="right" name={weatherParam} type="monotone" dataKey={weatherParam} stroke="var(--accent-secondary)" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
