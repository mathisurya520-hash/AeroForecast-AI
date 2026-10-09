import React from 'react';
import { Shield, Cpu, Map, TrendingUp, AlertTriangle } from 'lucide-react';
import Globe3D from '../components/Globe3D';

export default function Home({ setCurrentPage, locationName, isLocationLoading, requestGeolocation, onLocationSelect }) {
  return (
    <div className="home-page">
      <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', marginBottom: '2.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '4px',
          background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-highlight), var(--accent-secondary))'
        }} />
        <h1 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '1rem', lineHeight: '1.2' }}>
          Short-Term <span style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-highlight) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Air Quality Forecasting</span>
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '800px', margin: '0 auto 2rem auto' }}>
          An end-to-end Machine Learning system that predicts upcoming NO₂ and O₃ concentrations using historical air-quality reanalysis, real-time meteorological conditions, and advanced tree-based modeling.
        </p>

        {/* Location Box */}
        <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto 2rem auto', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📍 Detected Location
          </div>
          {isLocationLoading ? (
            <div style={{ color: 'var(--text-secondary)' }}>Detecting your location...</div>
          ) : (
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent-primary)', textAlign: 'center' }}>
              {locationName || 'Location access denied or unavailable.'}
            </div>
          )}
          {!locationName && !isLocationLoading && (
            <button className="btn btn-secondary" onClick={requestGeolocation} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              Enable Location
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setCurrentPage('dashboard')}>
            Explore Live Air Quality
          </button>
          <button className="btn btn-ai" onClick={() => setCurrentPage('forecast')}>
            ⚡ View AI Forecast
          </button>
        </div>
      </div>

      {/* Interactive 3D Earth Globe Section */}
      <Globe3D
        onSelectLocation={(newLat, newLon, newName) => {
          if (onLocationSelect) {
            onLocationSelect(newLat, newLon, newName, 'globe');
          }
          setCurrentPage('dashboard');
        }}
      />

      {/* Highlights Grid */}
      <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '1.5rem', textAlign: 'center' }}>System Features</h2>
      <div className="grid-cols-4" style={{ marginBottom: '3rem' }}>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(166, 106, 76, 0.15)', width: 'fit-content' }}>
            <Cpu style={{ color: 'var(--accent-primary)' }} size={24} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Time-Series Machine Learning</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Trains Linear Regression, Random Forest, and XGBoost on-the-fly and selects the best model per location based on real validation metrics.
          </p>
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(120, 134, 107, 0.18)', width: 'fit-content' }}>
            <TrendingUp style={{ color: 'var(--accent-secondary)' }} size={24} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>72-Hour Predictions</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Performs recursive multi-step forecasting to map gaseous concentrations (NO₂ and O₃) up to three days into the future.
          </p>
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(210, 176, 106, 0.15)', width: 'fit-content' }}>
            <Map style={{ color: 'var(--accent-highlight)' }} size={24} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Interactive OSM Mapping</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Click anywhere on the global map or search for any city to dynamically retrieve historical reanalysis, train local models, and generate predictions.
          </p>
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(217, 130, 54, 0.15)', width: 'fit-content' }}>
            <Shield style={{ color: 'var(--accent-warning)' }} size={24} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Explainable AI Metrics</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Exposes model diagnostics, historical metrics (RMSE, R²), and feature importance breakdowns to explain predictions transparently.
          </p>
        </div>
      </div>

      {/* Environmental Context / AI Explanation */}
      <div className="grid-cols-2" style={{ gap: '2rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Why Forecast NO₂ & O₃?</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            <strong>Nitrogen Dioxide (NO₂)</strong> enters the atmosphere mainly from burning fuel. It forms from emissions from cars, trucks, power plants, and off-road equipment. High concentrations cause airway inflammation and exacerbate asthma.
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            <strong>Ground-level Ozone (O₃)</strong> is not emitted directly but created by chemical reactions between oxides of nitrogen (NOx) and volatile organic compounds (VOC) in the presence of sunlight. It is a main component of smog and triggers breathing problems.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(217, 130, 54, 0.08)', border: '1px solid rgba(217, 130, 54, 0.3)', padding: '1rem', borderRadius: '8px', color: 'var(--accent-warning)', fontSize: '0.85rem' }}>
            <AlertTriangle size={24} style={{ flexShrink: 0 }} />
            <span>This tool provides general environmental guidance and estimates. It is not intended for clinical health diagnoses.</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '700' }}>How the AI Predicts Pollution</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            1. <strong>Historical Fetching:</strong> The backend downloads 92 days of hourly chemical concentrations (NO₂, O₃, PM2.5) and weather measurements (temperature, humidity, wind) for the coordinates.
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            2. <strong>Lag Engineering:</strong> We construct lag values ($T-1$, $T-3$, $T-6$, $T-12$, $T-24$) to capture time-series inertia, and extract hour, day, and month to capture cyclical patterns.
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            3. <strong>Dynamic Selection:</strong> The server splits the history sequentially, trains multiple models, computes metrics, and selects the one with the highest R² score.
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            4. <strong>Recursive Loop:</strong> Predictions are generated step-by-step into the future, feeding the model's own predicted pollution outputs back as lag features for subsequent hours.
          </p>
        </div>
      </div>
    </div>
  );
}
