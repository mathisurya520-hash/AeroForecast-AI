import React from 'react';

export default function Footer() {
  return (
    <footer>
      <p>&copy; {new Date().getFullYear()} AeroForecast AI. Final Year ML Project.</p>
      <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
        Environmental data provided by Copernicus Atmosphere Monitoring Service (CAMS) and weather predictions by Open-Meteo (CC BY 4.0).
      </p>
    </footer>
  );
}
