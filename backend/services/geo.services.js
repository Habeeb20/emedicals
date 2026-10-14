import { HttpError } from '../utils/engagement.js';

const GEO = process.env.GEO_API_URL || 'https://nigeria.jamiuadewaleyusuf.com/api/v1';

// Delivery pricing (override in .env)
const BASE_FEE = Number(process.env.DELIVERY_BASE_FEE || 500);   // ₦ for the first km band
const PER_KM = Number(process.env.DELIVERY_PER_KM || 120);       // ₦ per km
const MAX_KM = Number(process.env.DELIVERY_MAX_KM || 25);
const ROAD_FACTOR = 1.3; // straight line -> approximate road distance

const validCoords = (c) =>
  c && Number.isFinite(c.lat) && Number.isFinite(c.lng) && c.lat > 3.5 && c.lat < 14.5 && c.lng > 2.5 && c.lng < 15;

export const haversineKm = (a, b) => {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

// The geocode response shape is read defensively: adjust here if your API differs.
const normalizePlace = (r) => {
  const lat = Number(r?.coordinates?.lat ?? r?.lat ?? r?.latitude);
  const lng = Number(r?.coordinates?.lng ?? r?.lng ?? r?.longitude ?? r?.lon);
  if (!validCoords({ lat, lng })) return null;
  const label =
    r.display_name || r.formatted_address || r.full_address || r.address ||
    [r.name, r.lga, r.state].filter(Boolean).join(', ');
  return label ? { label, lat, lng } : null;
};

export async function searchAddress(q) {
  const query = String(q || '').trim();
  if (query.length < 3) return [];
  try {
    const res = await fetch(`${GEO}/geocode/search?${new URLSearchParams({ q: query })}`, {
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.status !== 'success') return [];
    const list = Array.isArray(json.data) ? json.data : json.data?.results || [];
    return list.map(normalizePlace).filter(Boolean).slice(0, 6);
  } catch {
    return [];
  }
}

/** Fee + distance from the pharmacy to the customer's coordinates. */
export async function deliveryQuote(pharmacy, dest) {
  if (!validCoords(dest)) throw new HttpError(400, 'Pick your delivery address from the suggestions so we can price the delivery');

  let origin = pharmacy.coordinates;
  if (!validCoords(origin)) {
    const a = pharmacy.address || {};
    const [hit] = await searchAddress([a.street, a.city, a.state].filter(Boolean).join(', '));
    origin = hit && { lat: hit.lat, lng: hit.lng };
  }
  if (!validCoords(origin)) throw new HttpError(422, "This pharmacy hasn't set its location, so delivery isn't available. Choose pickup.");

  const distanceKm = Math.round(haversineKm(origin, dest) * ROAD_FACTOR * 10) / 10;
  if (distanceKm > MAX_KM) throw new HttpError(422, `This address is ${distanceKm} km away. This pharmacy delivers within ${MAX_KM} km.`);

  const fee = Math.max(BASE_FEE, Math.round((BASE_FEE + Math.max(0, distanceKm - 1) * PER_KM) / 50) * 50);
  return { distanceKm, fee };
}