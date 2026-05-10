import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ClubDto } from '@padel/shared';

// Fix default marker icon paths under Vite (Leaflet's default lookup breaks in bundlers).
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Props {
  clubs: ClubDto[];
  center?: { lat: number; lng: number };
  height?: string;
}

function Recenter({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom());
  }, [center.lat, center.lng, map]);
  return null;
}

export function ClubsMap({ clubs, center, height = '420px' }: Props) {
  const fallback = clubs[0]
    ? { lat: clubs[0].latitude, lng: clubs[0].longitude }
    : { lat: 44.4268, lng: 26.1025 }; // Bucharest centre
  const c = center ?? fallback;

  return (
    <div style={{ height }} className="overflow-hidden rounded-lg border border-border">
      <MapContainer
        center={[c.lat, c.lng]}
        zoom={12}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter center={c} />
        {clubs.map((club) => (
          <Marker key={club.id} position={[club.latitude, club.longitude]}>
            <Popup>
              <strong>{club.name}</strong>
              <br />
              <span className="text-xs">{club.address}</span>
              <br />
              <a href={`/clubs/${club.slug}`} className="text-brand-700 underline">
                Vezi detalii
              </a>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
