import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Award, BrainCircuit, Cpu, HelpCircle, Table } from 'lucide-react';
import { apiService } from '../services/api';

export default function Insights({ lat, lon, locationName }) {
  const [target, setTarget] = useState('no2');
  const [metrics, setMetrics] = useState(null);
  const [importances, setImportances] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadInsights() {
      setIsLoading(true);
      setError(null);
      try {
        const perfPromise = apiService.getModelPerformance(lat, lon);
        const impPromise = apiService.getFeatureImportance(lat, lon);
        
        const [perf, imp] = await Promise.all([perfPromise, impPromise]);
        setMetrics(perf.targets);
        setImportances(imp);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load model insights.");
      } finally {
        setIsLoading(false);
      }
    }
    loadInsights();
  }, [lat, lon]);

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

  const getModelDetails = () => {
    if (!metrics || !metrics[target]) return null;
    const targetMetrics = metrics[target];
    const bestModel = targetMetrics.best_model;
    const comparison = targetMetrics.comparison;
    
    return { bestModel, comparison };
  };

  const modelDetails = getModelDetails();

  // Parse feature importances for chart
  const getChartData = () => {
    if (!importances || !importances[target]) return [];
    
    const rawImp = importances[target];
    const chartList = Object.entries(rawImp)
      .map(([k, v]) => ({
        rawKey: k,
        featureName: getCleanFieldName(k),
        importance: parseFloat((v * 100).toFixed(2)) // Convert to percentage
      }))
      .slice(0, 10); // Display top 10 features
      
    return chartList;
  };

  const chartData = getChartData();

  // Explain feature importance text
  const getExplanationText = () => {
    if (!chartData.length || !modelDetails) return "";
    
    const topFeatures = chartData.slice(0, 3).map(f => f.featureName);
    return `The system automatically evaluated three models for predicting ${target.toUpperCase()} concentrations: Linear Regression, Random Forest, and XGBoost. The validation engine selected ${modelDetails.bestModel} as the best predictor based on its R² score. For this model, the top features influencing predictions are ${topFeatures[0]}, ${topFeatures[1]}, and ${topFeatures[2]}. This indicates that recent historical trends (autoregressive lags) and local weather conditions have the strongest influence on predicted changes.`;
  };

  return (
    <div className="insights-page">
      {/* Page Header */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            Diagnostics & Explainability
          </span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '0.25rem', color: 'var(--text-primary)' }}>
            ML Model Insights & Performance
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Location: <strong style={{ color: 'var(--text-primary)' }}>{locationName}</strong>
          </p>
        </div>

        {/* Target Toggles */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.35rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
          <button
            onClick={() => setTarget('no2')}
            className="btn"
            style={{
              padding: '0.5rem 1.25rem',
              fontSize: '0.85rem',
              borderRadius: '6px',
              background: target === 'no2' ? 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)' : 'transparent',
              color: target === 'no2' ? 'white' : 'var(--text-secondary)',
              fontWeight: '600'
            }}
          >
            Nitrogen Dioxide (NO₂)
          </button>
          <button
            onClick={() => setTarget('o3')}
            className="btn"
            style={{
              padding: '0.5rem 1.25rem',
              fontSize: '0.85rem',
              borderRadius: '6px',
              background: target === 'o3' ? 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)' : 'transparent',
              color: target === 'o3' ? 'white' : 'var(--text-secondary)',
              fontWeight: '600'
            }}
          >
            Ozone (O₃)
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid rgba(230,57,70,0.2)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Analyzing ML models and feature importances...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ color: 'var(--accent-danger)', padding: '2rem', display: 'flex', gap: '0.75rem' }}>
          <BrainCircuit size={24} />
          <div>
            <h3 style={{ fontWeight: '700' }}>Diagnostics Unavailable</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Models have not been trained for these coordinates yet. Select a location on the dashboard to trigger training.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Best Model Banner */}
          {modelDetails && (
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1.25rem', alignItems: 'center', borderLeft: '4px solid var(--accent-success)' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(42, 157, 143, 0.12)', color: 'var(--accent-success)' }}>
                <Award size={32} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Optimal Model Selected</span>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.1rem' }}>
                  {modelDetails.bestModel} (for {target.toUpperCase()})
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  This model generated the lowest prediction errors and the highest fit index (R² = {modelDetails.comparison[modelDetails.bestModel]?.R2 || 0}) on out-of-sample historical test slices.
                </p>
              </div>
            </div>
          )}

          {/* Model Comparison Table */}
          {modelDetails && (
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Table size={20} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Out-Of-Sample Model Performance Comparison</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Algorithm</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>MAE (µg/m³)</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>MSE (µg/m³)²</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>RMSE (µg/m³)</th>
                      <th style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Coefficient of Determination (R²)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(modelDetails.comparison).map(([name, m], i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: '1px solid rgba(230,57,70,0.08)',
                          background: name === modelDetails.bestModel ? 'rgba(42, 157, 143, 0.08)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '0.75rem 1rem', fontWeight: '700', color: name === modelDetails.bestModel ? 'var(--accent-success)' : 'var(--text-primary)' }}>
                          {name} {name === modelDetails.bestModel && '★ (Best)'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>{m.MAE}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{m.MSE}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{m.RMSE}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: '700' }}>{m.R2}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Feature Importance & Explanation */}
          <div className="grid-cols-2" style={{ gap: '2rem' }}>
            {/* Feature Importance Chart */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Cpu size={20} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Top 10 Feature Importances (%)</h3>
              </div>
              <div style={{ height: '320px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 45, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(210, 176, 106, 0.15)" />
                    <XAxis type="number" stroke="var(--text-muted)" fontSize={10} tickFormatter={(v) => `${v}%`} />
                    <YAxis dataKey="featureName" type="category" stroke="var(--text-muted)" fontSize={10} width={110} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', borderRadius: '8px' }} formatter={(v) => [`${v}%`, 'Importance']} />
                    <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
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

            {/* Natural Language Interpretation */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BrainCircuit size={20} style={{ color: 'var(--accent-secondary)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Explainable AI Report</h3>
              </div>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                {getExplanationText()}
              </p>
              <div style={{ marginTop: 'auto', background: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid var(--glass-border)', borderRadius: '8px', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <HelpCircle size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  <strong>How to interpret feature importance:</strong> This represents the percentage contribution of each feature to reduction in split variance (gain) during training. Autoregressive lags (e.g. "NO2 Lag 1h") show time-series inertia, while meteorological factors show external weather impacts.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
