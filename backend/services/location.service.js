const BASE = process.env.LOCATION_API_URL || 'https://nigeria.jamiuadewaleyusuf.com/api/v1';
const TTL = 10 * 60 * 1000;
const cache = new Map();

const remember = (key, value, ttl = TTL) => { cache.set(key, { value, exp: Date.now() + ttl }); return value; };
const recall = (key) => {
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.value;
  cache.delete(key);
  return undefined;
};

async function api(path, params = {}) {
  const url = new URL(BASE + path);
  Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const json = await res.json();
    if (!res.ok || json.status !== 'success') throw new Error(json.message || `Location API ${res.status}`);
    return json;
  } finally { clearTimeout(timer); }
}

const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
const pickCoords = (o) => {
  if (!o) return null;
  const c = o.coordinates || o;
  const lat = num(c.lat ?? c.latitude);
  const lng = num(c.lng ?? c.lon ?? c.longitude);
  return lat != null && lng != null ? { lat, lng } : null;
};

export const haversineKm = (a, b) => {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
export const round1 = (n) => Math.round(n * 10) / 10;

/** Address text -> {lat,lng} using /geocode/search */
export async function geocodeAddress(text) {
  if (!text) return null;
  const key = `g:${text.toLowerCase()}`;
  const hit = recall(key);
  if (hit !== undefined) return hit;
  try {
    const { data } = await api('/geocode/search', { q: text, limit: 1 });
    const first = Array.isArray(data) ? data[0] : data?.results?.[0] ?? data;
    return remember(key, pickCoords(first), 24 * 3600 * 1000);
  } catch { return null; }
}

/** state (+ optional lga) -> centroid, used when the patient has no GPS */
export async function centroidFor(state, lga) {
  if (!state) return null;
  const key = `c:${state}:${lga || ''}`;
  const hit = recall(key);
  if (hit !== undefined) return hit;
  try {
    if (lga) {
      const { data } = await api(`/states/${encodeURIComponent(state)}/lgas`);
      const match = (data || []).find((l) => [l.name, l.slug].some((v) => v?.toLowerCase() === lga.toLowerCase()));
      const c = pickCoords(match);
      if (c) return remember(key, c, 24 * 3600 * 1000);
    }
    const { data } = await api(`/states/${encodeURIComponent(state)}`);
    return remember(key, pickCoords(data), 24 * 3600 * 1000);
  } catch { return null; }
}

// ---- Road route (distance + drive time) -----------------------------------
// NOTE: the exact /route response shape isn't in the docs you pasted. This parser
// tolerates a few common shapes. Log one real response and tighten it.
function normalizeRoute(d) {
  const r = d?.route ?? d?.summary ?? d ?? {};
  let km = num(r.distance_km) ?? num(r.distanceKm) ?? num(r.distance?.km);
  if (km == null) {
    const m = num(r.distance_m) ?? num(r.distance_meters);
    if (m != null) km = m / 1000;
    else if (num(r.distance) != null) km = r.distance > 1000 ? r.distance / 1000 : r.distance; // assume metres if huge
  }
  let min = num(r.duration_min) ?? num(r.durationMin) ?? num(r.duration?.minutes);
  if (min == null) {
    const s = num(r.duration_s) ?? num(r.duration_seconds);
    if (s != null) min = s / 60;
    else if (num(r.duration) != null) min = r.duration / 60; // assume seconds (OSRM default)
  }
  return km != null && min != null ? { distanceKm: round1(km), durationMin: Math.max(1, Math.round(min)) } : null;
}

// Fallback when routing is down: road factor 1.4, ~25 km/h urban average
const estimate = (from, to) => {
  const km = haversineKm(from, to) * 1.4;
  return { distanceKm: round1(km), durationMin: Math.max(1, Math.round((km / 25) * 60)), estimated: true };
};

export async function getRoute(from, to) {
  const key = `r:${from.lat.toFixed(3)},${from.lng.toFixed(3)}>${to.lat.toFixed(3)},${to.lng.toFixed(3)}`;
  const hit = recall(key);
  if (hit) return hit;
  try {
    const json = await api('/route', { from_lat: from.lat, from_lng: from.lng, to_lat: to.lat, to_lng: to.lng });
    const parsed = normalizeRoute(json.data);
    return remember(key, parsed ?? estimate(from, to));
  } catch { return estimate(from, to); }
}

export async function attachTravel(origin, items) {
  await Promise.allSettled(
    items.map(async (it) => { if (it.coords) it.travel = await getRoute(origin, it.coords); })
  );
  return items;
}
