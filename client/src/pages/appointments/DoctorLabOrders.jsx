import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ArrowLeft, ChevronRight, User, CreditCard, Check, FileText, X } from 'lucide-react';

import { LabPicker, LabDetail } from '../Lab/MylabOrders';
import StatusBadge from '../Lab/StatusBadge';
import { labApi, errMsg, naira, dateFmt, inputCls } from '../Lab/Labapi';

const STEPS = [
  ['ordered', 'Ordered'],
  ['sample_collected', 'Sample collected'],
  ['processing', 'Processing'],
  ['completed', 'Results ready'],
];

const PAY_TONE = {
  paid: 'bg-success-light text-success-dark',
  unpaid: 'bg-warning-light text-warning-dark',
  refunded: 'bg-gray-100 text-gray-600',
};
const FLAG_TONE = {
  normal: 'bg-success-light text-success-dark',
  low: 'bg-warning-light text-warning-dark',
  high: 'bg-warning-light text-warning-dark',
  critical: 'bg-danger-light text-danger-dark',
};

const PayBadge = ({ value = 'unpaid' }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${PAY_TONE[value] || PAY_TONE.unpaid}`}>{value}</span>
);

const FILTERS = [
  ['all', 'All', () => true],
  ['unpaid', 'Awaiting payment', (o) => o.paymentStatus === 'unpaid' && o.status !== 'cancelled'],
  ['active', 'In progress', (o) => ['ordered', 'sample_collected', 'processing'].includes(o.status)],
  ['done', 'Results ready', (o) => o.status === 'completed'],
];

const startPayment = async (orderId) => {
  const { authorizationUrl } = await labApi.payOrder(orderId);
  window.location.href = authorizationUrl; // Paystack checkout, returns to this tab with ?reference=
};

/* ---------------- choose the patient ---------------- */

function PatientPicker({ value, onChange }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (q.trim().length < 3) { setResults([]); setSearching(false); return undefined; }
    let stale = false;
    setSearching(true);
    const t = setTimeout(() => {
      labApi.searchPatients(q.trim())
        .then((d) => { if (!stale) { setResults(d.patients); setError(''); } })
        .catch((e) => !stale && setError(errMsg(e)))
        .finally(() => !stale && setSearching(false));
    }, 300);
    return () => { stale = true; clearTimeout(t); };
  }, [q]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-lab-300 bg-lab-50 p-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-lab-700"><User size={18} /></span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-navy-900">{value.fullName}</p>
            <p className="truncate text-sm text-gray-600">{[value.email, value.phone].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        <button type="button" onClick={() => onChange(null)} className="text-sm font-semibold text-lab-700 hover:underline">Change</button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search size={18} className="absolute left-4 top-3.5 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patient by name, email or phone" className={`${inputCls} pl-11`} />
      </div>
      {q.trim().length > 0 && q.trim().length < 3 && <p className="mt-2 text-xs text-gray-500">Type at least 3 characters.</p>}
      {searching && <p className="mt-2 text-sm text-gray-500">Searching…</p>}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      {!searching && q.trim().length >= 3 && results.length === 0 && !error && <p className="mt-2 text-sm text-gray-500">No patient found.</p>}
      {results.length > 0 && (
        <ul className="mt-2 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {results.map((p) => (
            <li key={p._id}>
              <button type="button" onClick={() => onChange(p)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-navy-900">{p.fullName}</span>
                  <span className="block truncate text-sm text-gray-500">{[p.email, p.phone].filter(Boolean).join(' · ')}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-gray-400" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- review and place the order ---------------- */

function OrderReview({ labId, testIds, onBack, onPlaced }) {
  const [data, setData] = useState(null);
  const [patient, setPatient] = useState(null);
  const [clinicalNote, setClinicalNote] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    labApi.getLab(labId).then(setData).catch((e) => setError(errMsg(e)));
  }, [labId]);

  const chosen = useMemo(() => (data?.tests || []).filter((t) => testIds.includes(t._id)), [data, testIds]);
  const total = chosen.reduce((s, t) => s + t.price, 0);

  const submit = async (payNow) => {
    if (!patient) return setError('Choose the patient this order is for.');
    setBusy(true);
    setError('');
    let order;
    try {
      ({ order } = await labApi.createDoctorOrder({ labId, patientId: patient._id, testIds, clinicalNote: clinicalNote.trim() || undefined, urgent }));
    } catch (e) {
      setError(errMsg(e));
      setBusy(false);
      return;
    }
    if (!payNow) return onPlaced(order);
    try {
      await startPayment(order._id); // leaves the page on success
    } catch (e) {
      onPlaced(order, `Order ${order.orderNumber} was placed, but payment could not start: ${errMsg(e)}. You can pay from the order page.`);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-900">
        <ArrowLeft size={16} /> Back to tests
      </button>
      <h1 className="text-2xl font-bold text-navy-900">Order tests for a patient</h1>
      {data && <p className="mt-1 text-gray-600">at {data.lab.name}</p>}

      <section className="mt-6 space-y-3">
        <h2 className="font-semibold text-navy-900">1. Patient</h2>
        <PatientPicker value={patient} onChange={setPatient} />
      </section>

      <section className="mt-8">
        <h2 className="font-semibold text-navy-900">2. Tests</h2>
        {!data ? <p className="mt-2 text-gray-500">Loading…</p> : (
          <ul className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white">
            {chosen.map((t) => (
              <li key={t._id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-navy-900">{t.name}</span>
                  <span className="block text-xs capitalize text-gray-500">{[t.sampleType, t.turnaroundHours && `results in ${t.turnaroundHours}h`].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="font-semibold text-navy-900">{naira(t.price)}</span>
              </li>
            ))}
            <li className="flex items-center justify-between px-4 py-3">
              <span className="font-semibold text-navy-900">Total</span>
              <span className="text-lg font-bold text-navy-900">{naira(total)}</span>
            </li>
          </ul>
        )}
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="font-semibold text-navy-900">3. Clinical details <span className="text-sm font-normal text-gray-500">(optional)</span></h2>
        <textarea rows={3} value={clinicalNote} onChange={(e) => setClinicalNote(e.target.value)} maxLength={1000}
          placeholder="Reason for the tests, suspected condition, fasting instructions…" className={inputCls} />
        <label className="flex items-center gap-2 text-sm text-navy-800">
          <input type="checkbox" className="h-4 w-4 accent-lab-600" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
          Mark as urgent
        </label>
      </section>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button onClick={() => submit(true)} disabled={busy || !data || !patient} className="btn-primary disabled:opacity-50">
          <CreditCard size={16} className="mr-2 inline" />{busy ? 'Please wait…' : `Place order and pay ${naira(total)}`}
        </button>
        <button onClick={() => submit(false)} disabled={busy || !data || !patient} className="btn-outline disabled:opacity-50">
          Place order, pay later
        </button>
      </div>
    </div>
  );
}

/* ---------------- track one order and read its results ---------------- */

function OrderDetail({ orderId, notice, onBack }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () => labApi.doctorOrder(orderId).then((d) => { setOrder(d.order); setError(''); }).catch((e) => setError(errMsg(e))),
    [orderId]
  );
  useEffect(() => { load(); }, [load]);

  // refresh while the order is still moving
  const live = order && !['completed', 'cancelled'].includes(order.status);
  useEffect(() => {
    if (!live) return undefined;
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [live, load]);

  const act = async (fn) => {
    setBusy(true);
    setError('');
    try { await fn(); await load(); } catch (e) { setError(errMsg(e)); }
    setBusy(false);
  };

  const back = (
    <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-900">
      <ArrowLeft size={16} /> All lab orders
    </button>
  );

  if (!order) {
    return <div className="mx-auto max-w-4xl px-4 py-8">{back}<p className={error ? 'text-danger' : 'text-gray-500'}>{error || 'Loading…'}</p></div>;
  }

  const stepIndex = STEPS.findIndex(([key]) => key === order.status);
  const stamps = { ordered: order.createdAt, sample_collected: order.collectedAt, completed: order.completedAt };
  const cancelled = order.status === 'cancelled';
  const canPay = !cancelled && order.paymentStatus === 'unpaid';
  const canCancel = order.status === 'ordered' && order.paymentStatus === 'unpaid';
  const patient = order.patient || {};

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {back}
      {notice && <p className="mb-4 rounded-xl bg-success-light px-4 py-3 text-sm text-success-dark">{notice}</p>}
      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-navy-900">{order.orderNumber}</h1>
            <p className="text-sm text-gray-600">{order.lab?.name} · {dateFmt(order.createdAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            {order.urgent && <span className="rounded-full bg-danger-light px-2.5 py-0.5 text-xs font-semibold text-danger-dark">Urgent</span>}
            <PayBadge value={order.paymentStatus} />
            <StatusBadge status={order.status} />
          </div>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-gray-500">Patient</dt><dd className="font-medium text-navy-900">{patient.fullName || '—'}</dd><dd className="break-all text-gray-600">{[patient.email, patient.phone].filter(Boolean).join(' · ')}</dd></div>
          {order.clinicalNote && <div><dt className="text-xs text-gray-500">Clinical note</dt><dd className="whitespace-pre-wrap break-words text-gray-700">{order.clinicalNote}</dd></div>}
        </dl>

        {cancelled ? (
          <p className="mt-6 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-700">This order was cancelled.</p>
        ) : (
          <ol className="mt-6 grid grid-cols-4 gap-2">
            {STEPS.map(([key, label], i) => {
              const done = i <= stepIndex;
              return (
                <li key={key} className="text-center">
                  <span className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-sm font-semibold ${done ? 'bg-lab-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {done ? <Check size={16} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={`mt-1 block text-xs ${done ? 'font-semibold text-navy-900' : 'text-gray-500'}`}>{label}</span>
                  {stamps[key] && done && <span className="block text-[11px] text-gray-500">{dateFmt(stamps[key])}</span>}
                </li>
              );
            })}
          </ol>
        )}

        {(canPay || canCancel) && (
          <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
            {canPay && (
              <button disabled={busy} className="btn-primary disabled:opacity-50" onClick={() => act(() => startPayment(order._id))}>
                <CreditCard size={16} className="mr-2 inline" />Pay {naira(order.totalAmount)}
              </button>
            )}
            {canCancel && (
              <button disabled={busy} className="btn-outline disabled:opacity-50"
                onClick={() => window.confirm('Cancel this order?') && act(() => labApi.cancelDoctorOrder(order._id))}>
                <X size={16} className="mr-2 inline" />Cancel order
              </button>
            )}
          </div>
        )}
      </div>

      <h2 className="mt-8 text-lg font-bold text-navy-900">Tests and results</h2>
      <div className="mt-3 space-y-3">
        {order.items.map((item) => (
          <div key={item._id} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-navy-900">{item.testName}</p>
              <span className="shrink-0 text-sm text-gray-600">{naira(item.price)}</span>
            </div>
            {item.result ? (
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-gray-50 px-4 py-3 text-sm">
                <span><span className="text-gray-500">Result </span><span className="text-base font-bold text-navy-900">{item.result}</span>{item.unit && <span className="ml-1 text-gray-600">{item.unit}</span>}</span>
                {item.referenceRange && <span className="text-gray-600"><span className="text-gray-500">Reference </span>{item.referenceRange}</span>}
                {item.flag && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${FLAG_TONE[item.flag]}`}>{item.flag}</span>}
                {item.resultAttachment?.url && (
                  <a href={item.resultAttachment.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-lab-700 hover:underline">
                    <FileText size={14} />View report
                  </a>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">{cancelled ? 'Cancelled' : 'Result not ready yet'}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- the component the dashboard renders ---------------- */

export default function DoctorLabOrders() {
  const [view, setView] = useState('list'); // list | pick | detail | review | order
  const [labId, setLabId] = useState(null);
  const [pickedIds, setPickedIds] = useState([]);
  const [orderId, setOrderId] = useState(null);
  const [orders, setOrders] = useState(null);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(
    () => labApi.doctorOrders().then((d) => { setOrders(d.orders); setError(''); }).catch((e) => { setError(errMsg(e)); setOrders([]); }),
    []
  );
  useEffect(() => { load(); }, [load]);

  // coming back from Paystack: ?tab=lab-orders&reference=...
  useEffect(() => {
    const url = new URL(window.location.href);
    const reference = url.searchParams.get('reference') || url.searchParams.get('trxref');
    if (!reference) return;
    url.searchParams.delete('reference');
    url.searchParams.delete('trxref');
    window.history.replaceState({}, '', url);
    labApi.verifyPayment(reference)
      .then(({ order }) => {
        setNotice(order.paymentStatus === 'paid' ? `Payment received for ${order.orderNumber}.` : 'We have not received the payment confirmation yet. This page updates when it arrives.');
        setOrderId(order._id);
        setView('order');
        load();
      })
      .catch((e) => setNotice(errMsg(e)));
  }, [load]);

  const goList = () => { setView('list'); setLabId(null); setPickedIds([]); setOrderId(null); load(); };

  const shown = useMemo(() => {
    const test = FILTERS.find(([key]) => key === filter)[2];
    const needle = q.trim().toLowerCase();
    return (orders || []).filter(test).filter((o) =>
      !needle || [o.orderNumber, o.patient?.fullName, o.lab?.name].some((v) => v?.toLowerCase().includes(needle)));
  }, [orders, filter, q]);

  if (view === 'order') return <OrderDetail orderId={orderId} notice={notice} onBack={() => { setNotice(''); goList(); }} />;

  if (view === 'pick') {
    return <LabPicker onBack={goList} onPick={(id) => { setLabId(id); setPickedIds([]); setView('detail'); }} />;
  }

  if (view === 'detail') {
    return (
      <LabDetail labId={labId} initialPicked={pickedIds} payNote="Next you'll choose the patient and can pay straight away."
        onBack={() => setView('pick')} onBook={(ids) => { setPickedIds(ids); setView('review'); }} />
    );
  }

  if (view === 'review') {
    return (
      <OrderReview labId={labId} testIds={pickedIds} onBack={() => setView('detail')}
        onPlaced={(order, msg) => { setNotice(msg || `Order ${order.orderNumber} placed.`); setOrderId(order._id); setView('order'); }} />
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Lab orders</h1>
          <p className="mt-1 text-gray-600">Tests you have ordered for your patients.</p>
        </div>
        <button onClick={() => { setNotice(''); setView('pick'); }} className="btn-primary">New order</button>
      </div>

      {notice && <p className="mt-4 rounded-xl bg-success-light px-4 py-3 text-sm text-success-dark">{notice}</p>}
      {error && <p className="mt-4 text-danger">{error}</p>}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-3.5 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by patient, lab or order number" className={`${inputCls} pl-11`} />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {FILTERS.map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${filter === key ? 'bg-lab-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {!orders ? <p className="mt-8 text-gray-500">Loading…</p>
        : shown.length === 0 ? <p className="mt-8 text-gray-500">{orders.length ? 'No orders match.' : 'No lab orders yet. Click "New order" to book tests for a patient.'}</p>
        : (
          <div className="mt-6 space-y-3">
            {shown.map((o) => (
              <button key={o._id} onClick={() => { setNotice(''); setOrderId(o._id); setView('order'); }}
                className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:border-lab-300 hover:shadow">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-navy-900">{o.patient?.fullName || 'Patient'}</p>
                  <p className="text-sm text-gray-500">{o.lab?.name} · {o.orderNumber} · {dateFmt(o.createdAt)} · {o.items.length} test{o.items.length > 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-navy-900">{naira(o.totalAmount)}</span>
                  <PayBadge value={o.paymentStatus} />
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