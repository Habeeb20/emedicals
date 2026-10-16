import { useEffect, useMemo, useState } from 'react';
import {
  Search, MapPin, FlaskConical, ArrowLeft, Star, Heart, Eye, Phone, Clock,
  Truck, Check, Droplet, Navigation, ChevronRight,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import LabBooking from './LabBooking';
import LabOrderDetail from './LabOrderDetail';
import { labApi, errMsg, naira, dateFmt, inputCls } from './labApi';

/* ---------- helpers (defensive about how your data is shaped) ---------- */

const addressText = (a) =>
  a ? [a.street, a.city, a.state].filter(Boolean).join(', ') : '';

// openingHours may be a string, an array, or an object keyed by day
const hoursLines = (h) => {
  if (!h) return [];
  if (typeof h === 'string') return [h];
  const fmt = (day, v) => {
    if (typeof v === 'string') return `${day}: ${v}`;
    if (!v || v.closed) return `${day}: Closed`;
    return `${day}: ${v.open || ''} - ${v.close || ''}`;
  };
  if (Array.isArray(h)) {
    return h.map((x) => (typeof x === 'string' ? x : fmt(x.day || '', x)));
  }
  return Object.entries(h).map(([day, v]) => fmt(day, v));
};

// coordinates may be {lat,lng}, {latitude,longitude}, [lng,lat] or GeoJSON
const mapsLink = (c) => {
  if (!c) return null;
  let lat; let lng;
  if (Array.isArray(c)) [lng, lat] = c;
  else if (Array.isArray(c.coordinates)) [lng, lat] = c.coordinates;
  else { lat = c.lat ?? c.latitude; lng = c.lng ?? c.lon ?? c.longitude; }
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
};

const Rating = ({ avg, count }) => (
  <span className="inline-flex items-center gap-1 text-sm text-gray-600">
    <Star size={14} className="fill-yellow-400 text-yellow-400" />
    {count ? `${Number(avg).toFixed(1)} (${count})` : 'No reviews yet'}
  </span>
);

/* ---------- Step 1: browse labs ---------- */

export function LabPicker({ onPick, onBack }) {
  const [labs, setLabs] = useState(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('name');
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      labApi.listLabs({ q: q || undefined, sort })
        .then((d) => { setLabs(d.labs); setError(''); })
        .catch((e) => setError(errMsg(e)));
    }, 300);
    return () => clearTimeout(t);
  }, [q, sort]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-900">
        <ArrowLeft size={16} /> Back to my orders
      </button>
      <h1 className="text-3xl font-bold text-navy-900">Choose a lab</h1>
      <p className="mt-1 text-gray-600">Tap a lab to see its details and the tests it offers.</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-3.5 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search labs by name" className={`${inputCls} pl-11`} />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={`${inputCls} sm:w-48`}>
          <option value="name">Name (A-Z)</option>
          <option value="top">Top rated</option>
          <option value="views">Most viewed</option>
          <option value="likes">Most liked</option>
        </select>
      </div>

      {error && <p className="mt-4 text-danger">{error}</p>}
      {!labs ? <p className="mt-8 text-gray-500">Loading labs…</p>
        : labs.length === 0 ? <p className="mt-8 text-gray-500">No labs found.</p>
        : (
          <div className="mt-6 space-y-3">
            {labs.map((lab) => {
              const place = addressText(lab.address);
              const empty = !lab.testsCount;
              return (
                <button key={lab._id} onClick={() => onPick(lab._id)} disabled={empty}
                  className="flex w-full items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:border-lab-300 hover:shadow disabled:cursor-not-allowed disabled:opacity-60">
                  {lab.logo
                    ? <img src={lab.logo} alt="" className="h-14 w-14 rounded-xl object-cover" />
                    : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-lab-50 text-lab-700"><FlaskConical size={24} /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-navy-900">{lab.name}</span>
                      {lab.is24Hours && <span className="rounded-full bg-lab-50 px-2 py-0.5 text-xs font-semibold text-lab-700">Open 24 hours</span>}
                      {lab.offersDelivery && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">Home collection</span>}
                    </span>
                    {lab.about && <span className="mt-1 line-clamp-2 block text-sm text-gray-600">{lab.about}</span>}
                    <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                      <Rating avg={lab.ratingAverage} count={lab.ratingCount} />
                      {place && <span className="flex items-center gap-1"><MapPin size={14} />{place}</span>}
                      <span className="flex items-center gap-1"><Heart size={14} />{lab.likesCount || 0}</span>
                      <span className="flex items-center gap-1"><Eye size={14} />{lab.viewsCount || 0}</span>
                    </span>
                    <span className="mt-2 block text-sm font-medium text-lab-700">
                      {empty ? 'No tests listed yet' : `${lab.testsCount} test${lab.testsCount > 1 ? 's' : ''} available`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
    </div>
  );
}

/* ---------- Step 2: lab details + choose tests ---------- */

export function LabDetail({ labId, initialPicked, onBack, onBook }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(() => new Set(initialPicked));
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);

  useEffect(() => {
    if (!labId) { setError('No lab selected.'); return; }
    setData(null);
    setError('');
    labApi.getLab(labId)
      .then((d) => { setData(d); setLiked(!!d.lab.liked); setLikes(d.lab.likesCount || 0); })
      .catch((e) => setError(errMsg(e)));
    labApi.recordView(labId).catch(() => {}); // counted once per day by the server
  }, [labId]);

  const groups = useMemo(() => {
    const list = (data?.tests || []).filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
    return list.reduce((acc, t) => ((acc[t.category || 'Other tests'] ||= []).push(t), acc), {});
  }, [data, q]);

  const toggle = (id) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const like = () => labApi.toggleLike(labId)
    .then((r) => { setLiked(r.liked); setLikes(r.likesCount); })
    .catch((e) => setError(errMsg(e)));

  const back = (
    <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-900">
      <ArrowLeft size={16} /> All labs
    </button>
  );

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        {back}
        <p className={error ? 'text-danger' : 'text-gray-500'}>{error || 'Loading lab…'}</p>
      </div>
    );
  }

  const { lab, tests } = data;
  const total = tests.filter((t) => picked.has(t._id)).reduce((s, t) => s + t.price, 0);
  const lines = hoursLines(lab.openingHours);
  const map = mapsLink(lab.coordinates);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8">
      {back}

      {/* lab details */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-4">
          {lab.logo
            ? <img src={lab.logo} alt="" className="h-16 w-16 rounded-xl object-cover" />
            : <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-lab-50 text-lab-700"><FlaskConical size={28} /></span>}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-navy-900">{lab.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
              <Rating avg={lab.ratingAverage} count={lab.ratingCount} />
              <span className="flex items-center gap-1 text-sm text-gray-500"><Eye size={14} />{lab.viewsCount || 0} views</span>
            </div>
          </div>
          <button onClick={like} aria-pressed={liked} aria-label="Like this lab"
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm ${liked ? 'border-red-200 bg-red-50 text-red-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Heart size={16} className={liked ? 'fill-red-500' : ''} />{likes}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        {lab.about && <p className="mt-4 text-gray-700">{lab.about}</p>}

        <div className="mt-5 grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
          {addressText(lab.address) && (
            <p className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-lab-700" />{addressText(lab.address)}</p>
          )}
          {lab.phone && (
            <p className="flex items-center gap-2"><Phone size={16} className="shrink-0 text-lab-700" /><a href={`tel:${lab.phone}`} className="hover:underline">{lab.phone}</a></p>
          )}
          {(lab.is24Hours || lines.length > 0) && (
            <div className="flex items-start gap-2">
              <Clock size={16} className="mt-0.5 shrink-0 text-lab-700" />
              <div>
                {lab.is24Hours && <p className="font-medium">Open 24 hours</p>}
                {!lab.is24Hours && lines.map((l, i) => <p key={i}>{l}</p>)}
              </div>
            </div>
          )}
          {lab.offersDelivery && (
            <p className="flex items-center gap-2"><Truck size={16} className="shrink-0 text-lab-700" />Offers home sample collection / delivery</p>
          )}
          {map && (
            <a href={map} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-lab-700 hover:underline">
              <Navigation size={16} />View on map
            </a>
          )}
        </div>
      </div>

      {/* tests */}
      <h2 className="mt-8 text-xl font-bold text-navy-900">Tests available ({tests.length})</h2>
      <p className="mt-1 text-sm text-gray-600">Tap the tests you want, then continue to book. You'll pay the lab when you give your sample.</p>

      <div className="relative mt-4">
        <Search size={18} className="absolute left-4 top-3.5 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this lab's tests" className={`${inputCls} pl-11`} />
      </div>

      {Object.keys(groups).length === 0 && <p className="mt-6 text-gray-500">No tests match your search.</p>}
      {Object.entries(groups).map(([cat, list]) => (
        <section key={cat} className="mt-6">
          <h3 className="mb-3 font-semibold capitalize text-lab-700">{cat}</h3>
          <div className="space-y-3">
            {list.map((t) => {
              const on = picked.has(t._id);
              return (
                <button key={t._id} onClick={() => toggle(t._id)} aria-pressed={on}
                  className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${on ? 'border-lab-500 bg-lab-50' : 'border-gray-200 bg-white hover:border-lab-300'}`}>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${on ? 'border-lab-600 bg-lab-600 text-white' : 'border-gray-300'}`}>
                    {on && <Check size={14} strokeWidth={3} />}
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold text-navy-900">{t.name}{t.code && <span className="ml-2 text-xs font-normal text-gray-400">{t.code}</span>}</span>
                    <span className="mt-1 flex flex-wrap gap-x-4 text-sm text-gray-500">
                      {t.sampleType && <span className="flex items-center gap-1 capitalize"><Droplet size={14} />{t.sampleType}</span>}
                      {t.turnaroundHours && <span className="flex items-center gap-1"><Clock size={14} />Results in {t.turnaroundHours}h</span>}
                      {t.referenceRange && <span>Ref: {t.referenceRange}</span>}
                    </span>
                  </span>
                  <span className="font-semibold text-navy-900">{naira(t.price)}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <div className="sticky bottom-0 -mx-4 mt-8 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-sm text-gray-500">{picked.size} test{picked.size === 1 ? '' : 's'} selected</p>
            <p className="text-xl font-bold text-navy-900">{naira(total)}</p>
          </div>
          <button onClick={() => onBook([...picked])} disabled={!picked.size} className="btn-primary disabled:opacity-50">
            Continue to booking
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Main page ---------- */

export default function MyLabOrders() {
  const [view, setView] = useState('list'); // 'list' | 'pick' | 'detail' | 'book'
  const [labId, setLabId] = useState(null);
  const [pickedIds, setPickedIds] = useState([]);
  const [orderId, setOrderId] = useState(null); // order currently open from the list
  const [orders, setOrders] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = () => labApi.myOrders()
    .then((d) => { setOrders(d.orders); setError(''); })
    .catch((e) => { setError(errMsg(e)); setOrders([]); });

  useEffect(() => { load(); }, []);

  const goList = () => { setView('list'); setLabId(null); setPickedIds([]); };

  const handlePlaced = (order) => {
    setNotice(`Order ${order.orderNumber} placed. You'll pay the lab when you give your sample.`);
    goList();
    load();
  };

  // An order was opened from the list: show its full details
  if (orderId) {
    return (
      <LabOrderDetail
        mode="patient"
        orderId={orderId}
        onBack={() => { setOrderId(null); load(); }}
      />
    );
  }

  if (view === 'pick') {
    return <LabPicker onBack={goList} onPick={(id) => { setLabId(id); setPickedIds([]); setView('detail'); }} />;
  }

  if (view === 'detail') {
    return (
      <LabDetail
        labId={labId}
        initialPicked={pickedIds}
        onBack={() => setView('pick')}
        onBook={(ids) => { setPickedIds(ids); setView('book'); }}
      />
    );
  }

  if (view === 'book') {
    return (
      <LabBooking
        labId={labId}
        initialPicked={pickedIds}
        onBack={() => setView('detail')}
        onPlaced={handlePlaced}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-navy-900">My lab orders</h1>
        <button onClick={() => { setNotice(''); setView('pick'); }} className="btn-primary">New order</button>
      </div>

      {notice && <p className="mt-4 rounded-xl bg-success-light px-4 py-3 text-sm text-success-dark">{notice}</p>}
      {error && <p className="mt-4 text-danger">{error}</p>}

      {!orders ? <p className="mt-8 text-gray-500">Loading…</p>
        : orders.length === 0 ? <p className="mt-8 text-gray-500">You have no lab orders yet. Click "New order" to book your first test.</p>
        : (
          <div className="mt-6 space-y-3">
            {orders.map((o) => (
              <button key={o._id} onClick={() => { setNotice(''); setOrderId(o._id); }}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:border-lab-300 hover:shadow">
                <div>
                  <p className="font-semibold text-navy-900">{o.lab?.name}</p>
                  <p className="text-sm text-gray-500">{o.orderNumber} · {dateFmt(o.createdAt)} · {o.items.length} test{o.items.length > 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-navy-900">{naira(o.totalAmount)}</span>
                  <StatusBadge status={o.status} />
                  <ChevronRight size={18} className="text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}
    </div>
  );
}