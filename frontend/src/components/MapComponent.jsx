import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom Terracotta + Warm Sand Marker Icon matching AeroForecast Theme
const customLocationIcon = L.divIcon({
  className: 'custom-terracotta-pin',
  html: `<div style="
    width: 28px;
    height: 28px;
    background: #A66A4C;
    border: 2px solid #D2B06A;
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(166, 106, 76, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #F1EDE5;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
  ">📍</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

// Map handler for smooth flying and coordinate clicks
function MapEventsHandler({ onMapClick, center }) {
  const map = useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    if (center && center[0] && center[1]) {
      const currentZoom = map.getZoom();
      const targetZoom = currentZoom < 8 ? 10 : currentZoom;
      map.flyTo(center, targetZoom, {
        animate: true,
        duration: 1.2
      });
    }
  }, [center, map]);

  return null;
}

export default function MapComponent({ lat, lon, locationName, onLocationSelect }) {
  const position = [lat || 13.0827, lon || 80.2707];

  return (
    <div className="leaflet-map-wrapper" style={{ height: '380px', width: '100%', position: 'relative' }}>
      <MapContainer
        center={position}
        zoom={6}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        zoomControl={true}
        dragging={true}
        style={{ height: '100%', width: '100%', borderRadius: '16px', border: '1px solid var(--glass-border)' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <Marker position={position} icon={customLocationIcon}>
          <Popup>
            <div style={{ color: '#F1EDE5', fontSize: '0.85rem', padding: '0.25rem', fontFamily: 'var(--font-body)' }}>
              <strong style={{ color: '#D2B06A', fontSize: '0.95rem', display: 'block', marginBottom: '0.2rem' }}>
                {locationName || 'Selected Location'}
              </strong>
              <div className="font-mono" style={{ color: '#AAA397', fontSize: '0.8rem' }}>
                Lat: {lat.toFixed(4)} | Lon: {lon.toFixed(4)}
              </div>
            </div>
          </Popup>
        </Marker>
        <MapEventsHandler
          center={position}
          onMapClick={(clickedLat, clickedLon) => {
            if (onLocationSelect) {
              onLocationSelect(clickedLat, clickedLon);
            }
          }}
        />
      </MapContainer>
    </div>
  );
}
