import React from 'react';
import { Cpu, Database, Globe, Network } from 'lucide-react';

export default function About() {
  return (
    <div className="about-page">
      <div className="glass-panel" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1rem' }}>Project Context & Architecture</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
          This application represents an academic end-to-end Machine Learning project designed for short-term prediction of ground-level gaseous air pollutants (NO₂ and O₃). By merging hourly local weather indicators and previous pollution variables, the system creates localized autoregressive models that accurately forecast air quality up to 72 hours.
        </p>

        {/* Pipeline Diagram */}
        <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '1rem' }}>ML Data Pipeline</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600' }}>
              📥 Open-Meteo & CAMS APIs
            </div>
            <div style={{ color: 'var(--accent-primary)', fontWeight: '800' }}>→</div>
            <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600' }}>
              🗄 PostgreSQL Cache / SQLite
            </div>
            <div style={{ color: 'var(--accent-primary)', fontWeight: '800' }}>→</div>
            <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600' }}>
              ⚙ Feature Engineering (Lags)
            </div>
            <div style={{ color: 'var(--accent-primary)', fontWeight: '800' }}>→</div>
            <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600' }}>
              🏋 Model Training & Evaluation
            </div>
            <div style={{ color: 'var(--accent-primary)', fontWeight: '800' }}>→</div>
            <div style={{ padding: '0.75rem 1rem', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', color: 'white' }}>
              🔮 72h Recursive Predictions
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
            Flow: API Fetch → Cache Validation → Imputation → Auto-lags & Calendar Split → Multi-model Validation → Selection → Step-by-Step Recursive Forecast.
          </p>
        </div>

        {/* Future Extensions (Satellite Data) */}
        <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '1rem' }}>Satellite & Reanalysis Integration Architecture</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
          To scale prediction performance, the model pipeline is designed to support the integration of satellite remote sensing and meteorological reanalysis products.
        </p>

        <div className="grid-cols-3" style={{ gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
              <Globe size={20} />
              <strong style={{ fontSize: '0.95rem' }}>Sentinel-5P Satellite</strong>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Provides daily global columns of tropospheric Nitrogen Dioxide (NO₂) and Ozone (O₃). Useful for identifying regional emission hotspots and background columns.
            </p>
          </div>

          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-secondary)' }}>
              <Database size={20} />
              <strong style={{ fontSize: '0.95rem' }}>ERA5 Reanalysis Data</strong>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              ECMWF's global climate reanalysis provides boundary layer height, solar radiation, and detailed soil moisture parameters that govern chemical dispersion.
            </p>
          </div>

          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-success)' }}>
              <Network size={20} />
              <strong style={{ fontSize: '0.95rem' }}>Feature Fusion</strong>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Combines localized ground sensor readings (representing current microclimate) and satellite columns (representing regional advection) as tabular ML inputs.
            </p>
          </div>
        </div>

        {/* Dynamic Architecture Diagram */}
        <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>Data Synthesis Model</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1.5fr', gap: '1rem', alignItems: 'center', textAlign: 'center', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(230, 57, 70, 0.12)', border: '1px solid var(--accent-primary)', borderRadius: '6px', color: 'var(--text-primary)' }}>
                Ground Observations (PM2.5, PM10)
              </div>
              <div style={{ padding: '0.5rem', background: 'rgba(255, 117, 143, 0.18)', border: '1px solid var(--accent-secondary)', borderRadius: '6px', color: 'var(--text-primary)' }}>
                Weather Indicators (Temp, Wind, Rain)
              </div>
              <div style={{ padding: '0.5rem', background: 'rgba(42, 157, 143, 0.12)', border: '1px solid var(--accent-success)', borderRadius: '6px', color: 'var(--text-primary)' }}>
                Tropospheric Columns (Sentinel-5P)
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>+</div>
            <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: '6px', height: 'fit-content' }}>
              Feature Engineering
              <br />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Auto-lags, Cyclical Lags)</span>
            </div>
            <div style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>→</div>
            <div style={{ padding: '1rem', background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)', borderRadius: '6px', color: 'white', height: 'fit-content' }}>
              <strong>Trained ML Model</strong>
              <br />
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>(Selected Best Regressor)</span>
              <br />
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', padding: '0.25rem', borderRadius: '4px' }}>
                🔮 Pollution Forecast
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
