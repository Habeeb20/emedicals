import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Navigation, Search } from 'lucide-react';
import {
  useApi, useDebounced, Badge, Spinner, Empty, ErrorNote, btn, inputCls, money,
} from './hospitalShared.jsx';
import Departments, { DEPARTMENTS } from '../../config/medicalDepartments.jsx';

const EMPTY_FILTERS = { q: '', state: '', lga: '', city: '', department: '', type: '', is24Hours: false, sort: 'name' };

// "12 Allen Ave, Ikeja, Lagos"
export const placeOf = (address = {}) => [address.street, address.city, address.lga, address.state].filter(Boolean).join(', ');

function HospitalCard({ hospital, onOpen }) {
  const departments = hospital.departments || [];
  return (
    <li>
      <button onClick={() => onOpen(hospital._id)} className="card flex h-full w-full flex-col p-4 text-left hover:border-primary-300">
        <div className="flex items-start gap-3">
          {hospital.logo?.url ? (
            <img src={hospital.logo.url} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-lg font-semibold text-primary-700">
              {hospital.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-navy-900">{hospital.name}</p>
            <p className="flex items-center gap-1 text-sm text-gray-600">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{placeOf(hospital.address) || 'Address not provided'}</span>
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="primary">{hospital.type}</Badge>
          {hospital.is24Hours && <Badge tone="success">Open 24 hours</Badge>}
          {hospital.distanceKm != null && <Badge tone="info">{hospital.distanceKm} km away</Badge>}
        </div>

        {departments.length > 0 && (
          <p className="mt-3 text-sm text-gray-600">
            {departments.slice(0, 4).join(' · ')}
            {departments.length > 4 && <span className="text-gray-500"> +{departments.length - 4} more</span>}
          </p>
        )}

        <p className="mt-auto pt-3 text-xs text-gray-500">
          {hospital.paymentSettings?.appointmentFee > 0 ? `Consultation from ${money(hospital.paymentSettings.appointmentFee)}` : 'Consultation fee not listed'}
        </p>
      </button>
    </li>
  );
}

/*
 * Works in two places:
 *  - the public site at /hospitals (no onNavigate prop, so it uses the router)
 *  - inside the dashboard (Dashboard passes onNavigate, so it stays on ?tab=)
 */
export default function HospitalDirectoryPage({ onNavigate }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const { data: options } = useApi('/hospital/directory/filters');
  const applied = useDebounced(filters); // wait until the person stops typing

  const params = { page, limit: 12, sort: applied.sort, ...(coords || {}) };
  ['q', 'state', 'lga', 'city', 'department', 'type'].forEach((key) => { if (applied[key]) params[key] = applied[key]; });
  if (applied.is24Hours) params.is24Hours = true;

  const { data, loading, error } = useApi('/hospital/directory', { params });

  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value, ...(key === 'state' ? { lga: '' } : {}) })); // a new state clears the LGA
    setPage(1);
  };

  const clearAll = () => { setFilters(EMPTY_FILTERS); setCoords(null); setPage(1); };

  const useMyLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) return setLocationError('Your browser cannot share its location.');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setFilter('sort', 'nearest');
        setLocating(false);
      },
      () => { setLocationError('We could not get your location. Check your browser permission.'); setLocating(false); }
    );
  };

  const open = (id) => (onNavigate ? onNavigate('hospital-profile', { id }) : navigate(`/hospitals/${id}`));

  const lgaChoices = filters.state ? options?.lgas?.[filters.state] || [] : [...new Set(Object.values(options?.lgas || {}).flat())].sort();
  const filtersActive = JSON.stringify({ ...filters, sort: 'name' }) !== JSON.stringify({ ...EMPTY_FILTERS }) || coords;

  return (
    <div className="grid gap-6 lg:grid-cols-[17rem_1fr]">
      {/* ---------- Filters ---------- */}
      <aside className="card h-fit space-y-4 p-4" aria-label="Filter hospitals">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-navy-700">Search</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input className={`${inputCls} pl-9`} placeholder="Name, area or department" value={filters.q} onChange={(e) => setFilter('q', e.target.value)} />
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-navy-700">State</span>
          <select className={inputCls} value={filters.state} onChange={(e) => setFilter('state', e.target.value)}>
            <option value="">All states</option>
            {options?.states?.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-navy-700">Local government (LGA)</span>
          <select className={inputCls} value={filters.lga} onChange={(e) => setFilter('lga', e.target.value)}>
            <option value="">All LGAs</option>
            {lgaChoices.map((l) => <option key={l}>{l}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-navy-700">City or town</span>
          <input className={inputCls} value={filters.city} onChange={(e) => setFilter('city', e.target.value)} />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-navy-700">Department</span>
          <select className={inputCls} value={filters.department} onChange={(e) => setFilter('department', e.target.value)}>
  <option value="">Any department</option>
  {DEPARTMENTS.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
</select>
        
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-navy-700">Type</span>
          <select className={inputCls} value={filters.type} onChange={(e) => setFilter('type', e.target.value)}>
            <option value="">Hospitals and clinics</option>
            <option value="hospital">Hospitals</option>
            <option value="clinic">Clinics</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-navy-700">
          <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={filters.is24Hours} onChange={(e) => setFilter('is24Hours', e.target.checked)} />
          <Clock className="h-4 w-4 text-gray-500" /> Open 24 hours
        </label>

        <div className="space-y-2 border-t border-gray-100 pt-4">
          <button className={`${btn.ghost} w-full`} onClick={useMyLocation} disabled={locating}>
            <Navigation className="h-4 w-4" /> {locating ? 'Finding you…' : coords ? 'Location on' : 'Hospitals near me'}
          </button>
          {locationError && <p className="text-xs text-danger-dark">{locationError}</p>}
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-navy-700">Sort by</span>
            <select className={inputCls} value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)}>
              <option value="name">Name (A to Z)</option>
              <option value="newest">Newest</option>
              <option value="nearest" disabled={!coords}>Nearest{coords ? '' : ' (turn on location)'}</option>
            </select>
          </label>
          {filtersActive && <button className="w-full text-sm font-semibold text-primary-700 hover:underline" onClick={clearAll}>Clear all filters</button>}
        </div>
      </aside>

      {/* ---------- Results ---------- */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-navy-900">Hospitals and clinics</h1>
          {data && <p className="text-sm text-gray-600">{data.total} found</p>}
        </div>

        <ErrorNote message={error} />
        {loading && <Spinner />}
        {!loading && data?.items.length === 0 && <Empty title="No hospital matches these filters" hint="Try another LGA or department, or clear the filters." />}

        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data?.items.map((hospital) => <HospitalCard key={hospital._id} hospital={hospital} onOpen={open} />)}
        </ul>

        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button className={btn.ghost} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="text-sm text-gray-600">Page {data.page} of {data.pages}</span>
            <button className={btn.ghost} disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </section>
    </div>
    
  );
}