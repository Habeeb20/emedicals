import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, ExternalLink } from 'lucide-react';
import { btn } from './hospitalShared.jsx';

// divIcons avoid Leaflet's broken default marker images under Vite
const pin = (color) => L.divIcon({
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<span style="display:block;width:22px;height:22px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4)"></span>`,
});
const hospitalIcon = pin('#dc2626');
const youIcon = pin('#2563eb');

const km = (m) => `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
const mins = (s) => {
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

function haversine(a, b) {
  const R = 6371000, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [40, 40] });
    else map.setView(points[0], 15);
  }, [map, points]);
  return null;
}

export default function HospitalMap({ hospital }) {
  const dest = { lat: hospital.coordinates.lat, lng: hospital.coordinates.lng };
  const [me, setMe] = useState(null);
  const [route, setRoute] = useState(null); // { line, distance, duration, approx }
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  const locate = () => {
    setError('');
    if (!navigator.geolocation) return setError('Your browser cannot share its location.');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setMe({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); },
      () => { setError('We could not get your location. Check your browser permission.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // fetch the driving route once we know where the user is
  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    const straight = {
      line: [[me.lat, me.lng], [dest.lat, dest.lng]],
      distance: haversine(me, dest),
      duration: null,
      approx: true,
    };
    fetch(`https://router.project-osrm.org/route/v1/driving/${me.lng},${me.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const r = json.routes?.[0];
        setRoute(r
          ? { line: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]), distance: r.distance, duration: r.duration, approx: false }
          : straight);
      })
      .catch(() => !cancelled && setRoute(straight));
    return () => { cancelled = true; };
  }, [me, dest.lat, dest.lng]);

  const points = me ? [[me.lat, me.lng], [dest.lat, dest.lng]] : [[dest.lat, dest.lng]];
  const directionsUrl = `https://www.google.com/maps/dir/?api=1${me ? `&origin=${me.lat},${me.lng}` : ''}&destination=${dest.lat},${dest.lng}`;

  return (
    <div className="space-y-3">
      <div className="isolate relative z-0 h-72 overflow-hidden rounded-xl border border-gray-200 sm:h-96">
        <MapContainer center={[dest.lat, dest.lng]} zoom={15} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[dest.lat, dest.lng]} icon={hospitalIcon}><Popup>{hospital.name}</Popup></Marker>
          {me && <Marker position={[me.lat, me.lng]} icon={youIcon}><Popup>You are here</Popup></Marker>}
          {route && (
            <Polyline positions={route.line} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.8, dashArray: route.approx ? '8 8' : undefined }} />
          )}
          <FitBounds points={points} />
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className={btn.ghost} onClick={locate} disabled={locating}>
          <Navigation className="h-4 w-4" /> {locating ? 'Finding you…' : me ? 'Update my location' : 'Show route from my location'}
        </button>
        <a href={directionsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline">
          Get directions <ExternalLink className="h-3.5 w-3.5" />
        </a>
        {route && (
          <p className="text-sm text-navy-800">
            <span className="font-semibold">{km(route.distance)}</span>
            {route.duration != null && <> · about {mins(route.duration)} by car</>}
            {route.approx && <span className="text-gray-500"> (straight line)</span>}
          </p>
        )}
      </div>
      {error && <p className="text-xs text-danger-dark">{error}</p>}
    </div>
  );
}