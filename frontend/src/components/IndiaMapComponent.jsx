import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom Terracotta Pin Icon for Selected CPCB Station
const selectedStationIcon = L.divIcon({
  className: 'custom-station-pin-selected',
  html: `<div style="
    width: 28px;
    height: 28px;
    background: #A66A4C;
    border: 2px solid #D2B06A;
    border-radius: 50%;
    box-shadow: 0 4px 14px rgba(166, 106, 76, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #F1EDE5;
    font-size: 13px;
    font-weight: bold;
    cursor: pointer;
  ">📍</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

// Custom Olive/Sand Pin Icon for Other CPCB Stations
const unselectedStationIcon = L.divIcon({
  className: 'custom-station-pin-unselected',
  html: `<div style="
    width: 20px;
    height: 20px;
    background: #78866B;
    border: 1.5px solid #D2B06A;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #F1EDE5;
    font-size: 10px;
    cursor: pointer;
    opacity: 0.85;
  ">•</div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -12],
});

// Custom map center controller with smooth flyTo
function MapCenterHandler({ center }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (center && center[0] && center[1]) {
      const currentZoom = map.getZoom();
      const targetZoom = currentZoom < 8 ? 9 : currentZoom;
      map.flyTo(center, targetZoom, {
        animate: true,
        duration: 1.2
      });
    }
  }, [center, map]);
  return null;
}

export default function IndiaMapComponent({ stations, selectedStationId, onSelectStation }) {
  const selectedStation = stations.find(s => s.id === selectedStationId) || stations[0];
  const center = selectedStation ? [selectedStation.latitude, selectedStation.longitude] : [20.5937, 78.9629];

  return (
    <div className="india-map-wrapper glass-panel" style={{ height: '440px', width: '100%', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={5}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        zoomControl={true}
        dragging={true}
        style={{ height: '100%', width: '100%', borderRadius: '16px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <MapCenterHandler center={center} />
        {stations.map((s) => {
          const isSelected = s.id === selectedStationId;
          return (
            <Marker 
              key={s.id} 
              position={[s.latitude, s.longitude]}
              icon={isSelected ? selectedStationIcon : unselectedStationIcon}
            >
              <Popup>
                <div style={{ color: '#F1EDE5', fontSize: '0.85rem', padding: '0.35rem', maxWidth: '240px', fontFamily: 'var(--font-body)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#D2B06A', textTransform: 'uppercase', marginBottom: '0.2rem', letterSpacing: '0.05em' }}>
                    {s.state} &bull; {s.city}
                  </div>
                  <strong style={{ color: '#F1EDE5', fontSize: '0.95rem', display: 'block', marginBottom: '0.35rem' }}>
                    {s.station_name}
                  </strong>
                  <div style={{ color: '#AAA397', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                    <strong>Lat:</strong> {s.latitude.toFixed(4)} | <strong>Lon:</strong> {s.longitude.toFixed(4)}
                  </div>
                  <div style={{ color: '#AAA397', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                    <strong>Pollutants:</strong> <span style={{ color: '#78866B' }}>{s.available_pollutants ? s.available_pollutants.join(', ') : 'NO2, O3, PM2.5'}</span>
                  </div>
                  <div style={{ color: '#D2B06A', fontSize: '0.75rem', marginBottom: '0.6rem' }}>
                    <strong>Source:</strong> {s.data_source || 'CPCB / OGD Platform'}
                  </div>
                  <button
                    onClick={() => onSelectStation(s.id)}
                    style={{
                      width: '100%',
                      padding: '0.4rem 0.6rem',
                      background: isSelected 
                        ? 'linear-gradient(135deg, #A66A4C, #D2B06A)' 
                        : 'rgba(166, 106, 76, 0.15)',
                      color: isSelected ? '#121212' : '#D2B06A',
                      border: '1px solid rgba(210, 176, 106, 0.4)',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isSelected ? 'Currently Selected' : 'Select Station'}
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
