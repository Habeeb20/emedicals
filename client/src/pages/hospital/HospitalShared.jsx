import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { X, Loader2 } from 'lucide-react';
import api, { getErrorMessage } from '@/lib/api.js';
import { useAuth } from '@/context/AuthContext.jsx';

/* ------------------------------------------------------------------ */
/* Real time                                                           */
/* ------------------------------------------------------------------ */

// One socket for the whole app. If you already have a shared socket helper, return it from getSocket instead.
let socket = null;
function getSocket(token) {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL || window.location.origin, { auth: { token } });
  }
  return socket;
}

// useLive(['hospital:visit'], () => reload()): runs the function whenever the server announces that event
export function useLive(events, handler) {
  const auth = useAuth();
  const token = auth?.token ?? localStorage.getItem('token'); // adjust if you keep the token somewhere else
  const latest = useRef(handler);
  latest.current = handler;
  const eventKey = events.join(',');

  useEffect(() => {
    if (!token || !events.length) return undefined;
    const connection = getSocket(token);
    const run = (payload) => latest.current(payload);
    events.forEach((name) => connection.on(name, run));
    return () => events.forEach((name) => connection.off(name, run));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, eventKey]);
}

/* ------------------------------------------------------------------ */
/* Data loading                                                        */
/* ------------------------------------------------------------------ */

// Loads GET `path` and reloads it by itself when any event in `live` arrives.
export function useApi(path, { params, live = [], enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0); // ignore answers that arrive after a newer request was sent
  const timer = useRef(null);
  const paramKey = JSON.stringify(params ?? {});

  const load = useCallback(async (quiet = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    try {
      if (!quiet) setLoading(true);
      const res = await api.get(path, { params });
      if (id !== requestId.current) return;
      setData(res.data.data);
      setError('');
    } catch (err) {
      if (id === requestId.current) setError(getErrorMessage(err));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, paramKey, enabled]);

  useEffect(() => { load(); }, [load]);

  // Many events can arrive together (for example a discharge touches beds, admissions and bills): reload once
  useLive(live, () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => load(true), 300);
  });

  return { data, loading, error, reload: () => load(true) };
}

// The id of the thing being viewed: /hospitals/:id on the public site, or ?id= inside the dashboard
export function useIdParam() {
  const { id } = useParams();
  const [params] = useSearchParams();
  return id ?? params.get('id');
}

export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// const [run, busy] = useAction();  if (await run(() => api.post(...), 'Saved')) close();
export function useAction() {
  const [busy, setBusy] = useState(false);
  const run = async (task, successMessage) => {
    setBusy(true);
    try {
      const result = await task();
      if (successMessage) toast.success(successMessage);
      return result ?? true;
    } catch (err) {
      toast.error(getErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return [run, busy];
}

// const [form, bind, setForm] = useFields({ name: '' });  <input {...bind('name')} />
export function useFields(initial) {
  const [form, setForm] = useState(initial);
  const bind = (key) => ({
    value: form[key] ?? '',
    onChange: (event) => setForm((current) => ({ ...current, [key]: event.target.value })),
  });
  return [form, bind, setForm];
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export const money = (n) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n || 0);

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export const ageOf = (dob) => (dob ? Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000) : null);

export const balanceOf = (invoice) => Math.max(0, (invoice.total || 0) - (invoice.amountPaid || 0));

export const daysSince = (date) => Math.max(1, Math.ceil((Date.now() - new Date(date).getTime()) / 86400000));

/* ------------------------------------------------------------------ */
/* Look and feel (only colours from colors.js)                         */
/* ------------------------------------------------------------------ */

export const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-navy-800 outline-none placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 disabled:bg-gray-50';

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-400 disabled:cursor-not-allowed disabled:opacity-50';

export const btn = {
  primary: `${buttonBase} bg-primary-600 text-white hover:bg-primary-700`,
  ghost: `${buttonBase} border border-gray-300 bg-white text-navy-700 hover:bg-gray-50`,
  danger: `${buttonBase} bg-danger text-white hover:bg-danger-dark`,
  small: 'px-3 py-1.5 text-xs',
};

const TONES = {
  neutral: 'bg-gray-100 text-gray-700',
  primary: 'bg-primary-50 text-primary-700',
  success: 'bg-success-light text-success-dark',
  warning: 'bg-warning-light text-warning-dark',
  danger: 'bg-danger-light text-danger-dark',
  info: 'bg-info-light text-info-dark',
};

export function Badge({ tone = 'neutral', children }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;
}

const STATUS_TONE = {
  waiting: 'warning', triaged: 'info', in_consultation: 'primary', completed: 'success', cancelled: 'neutral',
  unpaid: 'danger', partial: 'warning', paid: 'success', void: 'neutral',
  admitted: 'primary', discharged: 'neutral',
  available: 'success', occupied: 'danger', maintenance: 'warning',
  normal: 'neutral', urgent: 'warning', emergency: 'danger',
  pending: 'warning', active: 'success', inactive: 'neutral',
};

export function StatusBadge({ value }) {
  return <Badge tone={STATUS_TONE[value] || 'neutral'}>{String(value).replace(/_/g, ' ')}</Badge>;
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16 text-primary-600" role="status" aria-label="Loading">
      <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" />
    </div>
  );
}

export function Empty({ title, hint }) {
  return (
    <div className="card px-6 py-12 text-center">
      <p className="font-semibold text-navy-900">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-gray-600">{hint}</p>}
    </div>
  );
}

export function ErrorNote({ message }) {
  if (!message) return null;
  return <p className="rounded-lg bg-danger-light px-4 py-3 text-sm text-danger-dark" role="alert">{message}</p>;
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-navy-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={value === tab.key}
          onClick={() => onChange(tab.key)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
            value === tab.key ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-600 hover:text-navy-900'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && <span className="ml-1.5 text-xs text-gray-500">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
        className={`flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'}`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-navy-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces several pages share                                          */
/* ------------------------------------------------------------------ */

// Search for a patient by name, MRN or phone, then pick one
export function PatientPicker({ value, onChange }) {
  const [q, setQ] = useState('');
  const search = useDebounced(q);
  const { data: results, loading } = useApi('/hospital/patients', { params: { q: search }, enabled: !value && search.length > 1 });

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-primary-200 bg-primary-50 px-3 py-2">
        <div>
          <p className="text-sm font-semibold text-navy-900">{value.fullName}</p>
          <p className="text-xs text-gray-600">{value.mrn}</p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="text-xs font-semibold text-primary-700 hover:underline">
          Change
        </button>
      </div>
    );
  }

  return (
    <div>
      <input className={inputCls} placeholder="Search by name, MRN or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      {search.length > 1 && (
        <ul className="mt-2 max-h-48 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
          {loading && <li className="px-3 py-2 text-sm text-gray-500">Searching…</li>}
          {!loading && !results?.length && <li className="px-3 py-2 text-sm text-gray-500">No patient found</li>}
          {results?.map((patient) => (
            <li key={patient._id}>
              <button type="button" onClick={() => onChange(patient)} className="w-full px-3 py-2 text-left hover:bg-gray-50">
                <span className="block text-sm font-medium text-navy-900">{patient.fullName}</span>
                <span className="block text-xs text-gray-500">{patient.mrn}{patient.phone ? ` · ${patient.phone}` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const VITAL_FIELDS = [
  ['bloodPressure', 'Blood pressure', '120/80', 'text'],
  ['temperature', 'Temperature (°C)', '36.8', 'number'],
  ['pulse', 'Pulse (per min)', '72', 'number'],
  ['respiratoryRate', 'Breathing (per min)', '16', 'number'],
  ['oxygenSaturation', 'Oxygen, SpO₂ (%)', '98', 'number'],
  ['weight', 'Weight (kg)', '70', 'number'],
  ['height', 'Height (cm)', '170', 'number'],
];

export function VitalsForm({ onSubmit, busy }) {
  const [form, bind] = useFields({});
  return (
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {VITAL_FIELDS.map(([key, label, placeholder, type]) => (
          <Field key={key} label={label}>
            <input className={inputCls} type={type} step="any" min="0" placeholder={placeholder} {...bind(key)} />
          </Field>
        ))}
      </div>
      <button className={btn.primary} disabled={busy}>{busy ? 'Saving…' : 'Save vitals'}</button>
    </form>
  );
}

// A saved set of readings, shown compactly
export function VitalsSummary({ vitals }) {
  if (!vitals) return <p className="text-sm text-gray-500">No vitals recorded yet.</p>;
  const shown = VITAL_FIELDS.filter(([key]) => vitals[key] !== undefined && vitals[key] !== null);
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
      {shown.map(([key, label]) => (
        <div key={key}>
          <dt className="text-xs text-gray-500">{label}</dt>
          <dd className="text-sm font-semibold text-navy-900">{vitals[key]}</dd>
        </div>
      ))}
    </dl>
  );
}

// Beds that are free right now, grouped by ward. Updates live as beds are taken or released.
export function useFreeBeds() {
  const { data: wards } = useApi('/hospital/wards', { live: ['hospital:bed'] });
  return (wards || [])
    .map((ward) => ({ ...ward, beds: ward.beds.filter((bed) => bed.status === 'available') }))
    .filter((ward) => ward.beds.length);
}

export function BedSelect({ value, onChange }) {
  const wards = useFreeBeds();
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{wards.length ? 'Choose a bed' : 'No free beds'}</option>
      {wards.map((ward) => (
        <optgroup key={ward._id} label={`${ward.name} (${money(ward.dailyRate)} per day)`}>
          {ward.beds.map((bed) => <option key={bed._id} value={bed._id}>{bed.label}</option>)}
        </optgroup>
      ))}
    </select>
  );
}