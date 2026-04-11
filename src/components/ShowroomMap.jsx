import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon (Leaflet + Vite issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Lat/Lng del Showroom — Arenal Grande 2667, Montevideo
const POSITION = [-34.8799698, -56.1766206];
const ZOOM = 16;

// Reset view helper (útil si el mapa ya estaba montado)
function SetView({ center, zoom }) {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom); }, []);
  return null;
}

export default function ShowroomMap() {
  return (
    <div style={{ width: '100%', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
      <MapContainer
        center={POSITION}
        zoom={ZOOM}
        scrollWheelZoom={false}
        style={{ width: '100%', aspectRatio: '280/160' }}
        attributionControl={false}
      >
        <SetView center={POSITION} zoom={ZOOM} />

        {/* Tiles estilo Voyager de CartoDB (neutro, legible) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <Marker position={POSITION}>
          <Popup>
            <strong style={{ fontSize: 13 }}>Showroom User</strong><br />
            Arenal Grande 2667, Montevideo
          </Popup>
        </Marker>
      </MapContainer>

      {/* Botón para abrir Google Maps */}
      <a
        href="https://www.google.com/maps/search/Arenal+Grande+2667+Montevideo"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.75)',
          fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textDecoration: 'none',
          padding: '7px 0', textTransform: 'uppercase',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        Abrir en Google Maps
      </a>
    </div>
  );
}
