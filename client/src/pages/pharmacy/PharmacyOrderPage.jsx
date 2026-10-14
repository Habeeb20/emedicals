// import { useCallback, useEffect, useState } from 'react';
// import api from './api';
// import { Card, EmptyState, ErrorNote, PageHeader, PageShell, Skeleton } from '../appointments/ui';
// import { Field, PharmacyNav, Pill, field, fmtDate, ghostBtn, money, primaryBtn } from './PharmacyShared';

// import { body } from './shop/cart';
// const TABS = [['active', 'Active'], ['completed', 'Completed'], ['cancelled', 'Cancelled']];
// const LABEL = { confirmed: 'New', preparing: 'Preparing', ready: 'Ready for pickup', out_for_delivery: 'Out for delivery', completed: 'Completed', cancelled: 'Cancelled' };

// function OrderCard({ o, onChanged }) {
//   const [mode, setMode] = useState(null); // 'verify' | 'rider' | 'reject'
//   const [code, setCode] = useState('');
//   const [rider, setRider] = useState({ name: '', phone: '' });
//   const [reason, setReason] = useState('');
//   const [busy, setBusy] = useState(false);
//   const [error, setError] = useState('');

//   const run = async (path, method, payload) => {
//     setBusy(true); setError('');
//     try { await api(`/pharmacy/orders/${o._id}/${path}`, { method, body: payload }); setMode(null); setCode(''); onChanged(); }
//     catch (e) { setError(e.message); } finally { setBusy(false); }
//   };
//   const next = o.status === 'confirmed' ? 'preparing' : o.status === 'preparing' ? (o.fulfilment === 'pickup' ? 'ready' : 'out_for_delivery') : null;
//   const handover = ['ready', 'out_for_delivery'].includes(o.status);

//   return (
//     <Card>
//       <div className="flex items-start justify-between gap-3">
//         <div className="min-w-0">
//           <p className="font-mono text-sm font-medium text-navy-900">{o.orderNo}</p>
//           <p className="text-sm text-gray-600">{o.customer?.fullName} · {o.contactPhone || o.customer?.phone} · {fmtDate(o.createdAt, true)}</p>
//         </div>
//         <div className="shrink-0 text-right">
//           <p className="font-semibold text-navy-900">{money(o.total)}</p>
//           <div className="mt-1 flex justify-end gap-1"><Pill tone={o.fulfilment === 'delivery' ? 'info' : 'gray'}>{o.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}</Pill><Pill tone="pharmacy">{LABEL[o.status]}</Pill></div>
//         </div>
//       </div>
//       <ul className="mt-3 space-y-0.5 text-sm text-gray-700">{o.items.map((i) => <li key={i.drug}>{i.quantity}× {i.name}{i.strength ? ` ${i.strength}` : ''}</li>)}</ul>
//       {o.fulfilment === 'delivery' && <p className="mt-2 rounded-xl bg-gray-50 p-3 text-sm">{o.delivery.recipient}, {o.delivery.phone}<br />{o.delivery.address}{o.delivery.note ? ` (${o.delivery.note})` : ''} · {o.delivery.distanceKm} km</p>}
//       {o.delivery?.rider?.name && <p className="mt-2 text-xs text-gray-600">Rider: {o.delivery.rider.name}, {o.delivery.rider.phone}</p>}
//       <div className="mt-2"><ErrorNote>{error}</ErrorNote></div>

//       {['confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.status) && (
//         <div className="mt-3 flex flex-wrap gap-2">
//           {next && <button type="button" disabled={busy} className={primaryBtn} onClick={() => (next === 'out_for_delivery' ? setMode('rider') : run('status', 'PUT', { status: next }))}>
//             {{ preparing: 'Start preparing', ready: 'Mark ready for pickup', out_for_delivery: 'Send out for delivery' }[next]}
//           </button>}
//           {handover && <button type="button" className={primaryBtn} onClick={() => setMode('verify')}>{o.fulfilment === 'pickup' ? 'Verify pickup code' : 'Verify delivery code'}</button>}
//           {['confirmed', 'preparing'].includes(o.status) && <button type="button" className={ghostBtn} onClick={() => setMode('reject')}>Reject</button>}
//         </div>
//       )}

//       {mode === 'verify' && (
//         <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); run('verify', 'POST', { code }); }}>
//           <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" autoFocus placeholder="4-digit code" aria-label="Order code" className={`${field} h-11 w-40 text-center font-mono text-lg tracking-widest`} />
//           <button type="submit" disabled={busy || code.length !== 4} className={primaryBtn}>Confirm</button>
//           <button type="button" className={ghostBtn} onClick={() => setMode(null)}>Cancel</button>
//         </form>
//       )}
//       {mode === 'rider' && (
//         <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); run('status', 'PUT', { status: 'out_for_delivery', rider }); }}>
//           <div className="grid gap-2 sm:grid-cols-2">
//             <Field label="Rider name"><input required value={rider.name} onChange={(e) => setRider({ ...rider, name: e.target.value })} className={`${field} h-11`} /></Field>
//             <Field label="Rider phone"><input required value={rider.phone} onChange={(e) => setRider({ ...rider, phone: e.target.value })} inputMode="tel" className={`${field} h-11`} /></Field>
//           </div>
//           <div className="flex gap-2"><button type="submit" disabled={busy} className={primaryBtn}>Send out</button><button type="button" className={ghostBtn} onClick={() => setMode(null)}>Cancel</button></div>
//         </form>
//       )}
//       {mode === 'reject' && (
//         <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); run('reject', 'POST', { reason }); }}>
//           <p className="text-xs text-gray-600">The customer is refunded in full and stock goes back on the shelf.</p>
//           <input required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (e.g. item damaged)" className={`${field} h-11`} />
//           <div className="flex gap-2"><button type="submit" disabled={busy} className={primaryBtn}>Reject and refund</button><button type="button" className={ghostBtn} onClick={() => setMode(null)}>Cancel</button></div>
//         </form>
//       )}
//     </Card>
//   );
// }

// export default function PharmacyOrdersPage() {
//   const [tab, setTab] = useState('active');
//   const [rows, setRows] = useState(null);
//   const [error, setError] = useState('');

//   const load = useCallback(() => {
//     api('/pharmacy/orders', { params: { status: tab, limit: 50 } })
//       .then((r) => { setRows(body(r).data); setError(''); }).catch((e) => { setError(e.message); setRows([]); });
//   }, [tab]);
//   useEffect(() => { setRows(null); load(); }, [load]);
//   useEffect(() => { if (tab !== 'active') return undefined; const t = setInterval(load, 20000); return () => clearInterval(t); }, [tab, load]);

//   return (
//     <PageShell className="max-w-4xl">
//       <PageHeader title="Online orders" subtitle="Orders paid for on the shop. Walk-in customers are handled on the Sales page." />
//       <PharmacyNav />
//       <div className="mb-4 flex gap-2">
//         {TABS.map(([id, label]) => <button key={id} type="button" onClick={() => setTab(id)} className={`h-10 rounded-full px-4 text-sm font-medium ${tab === id ? 'bg-navy-800 text-white' : 'bg-white text-navy-700 ring-1 ring-gray-200'}`}>{label}</button>)}
//       </div>
//       <ErrorNote>{error}</ErrorNote>
//       {!rows ? <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
//         : rows.length === 0 ? <EmptyState icon="search" title="No orders here" body="New paid orders appear automatically." />
//         : <ul className="space-y-3">{rows.map((o) => <li key={o._id}><OrderCard o={o} onChanged={load} /></li>)}</ul>}
//     </PageShell>
//   );
// }








import { useCallback, useEffect, useState } from 'react';
import api from './api';
import { Card, EmptyState, ErrorNote, PageHeader, PageShell, Skeleton } from '../appointments/ui';
import { Field, PharmacyNav, Pill, field, fmtDate, ghostBtn, money, primaryBtn } from './PharmacyShared';
import { body } from './shop/cart'; // keep this exact lowercase path everywhere

const TABS = [['active', 'Active'], ['completed', 'Completed'], ['cancelled', 'Cancelled']];
const LABEL = { confirmed: 'New', preparing: 'Preparing', ready: 'Ready for pickup', out_for_delivery: 'Out for delivery', completed: 'Completed', cancelled: 'Cancelled' };
const NEXT_LABEL = { preparing: 'Start preparing', ready: 'Mark ready for pickup', out_for_delivery: 'Send out for delivery' };

function OrderCard({ o, onChanged }) {
  const [mode, setMode] = useState(null); // 'verify' | 'rider' | 'reject'
  const [code, setCode] = useState('');
  const [rider, setRider] = useState({ name: '', phone: '' });
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Every action is a POST with a JSON body, the same call shape the Sales return form already uses.
  // `params` repeats the data in the query string as a safety net: the controller accepts either.
  const run = async (path, payload, params) => {
    setBusy(true); setError('');
    try {
      await api(`/pharmacy/orders/${o._id}/${path}`, { method: 'POST', body: payload, ...(params && { params }) });
      setMode(null); setCode(''); setReason(''); onChanged();
    } catch (e) { setError(e.message || 'Something went wrong. Try again.'); }
    finally { setBusy(false); }
  };

  const changeStatus = (status, riderInfo) => run(
    'status',
    { status, ...(riderInfo && { rider: riderInfo }) },
    { status, ...(riderInfo && { riderName: riderInfo.name, riderPhone: riderInfo.phone }) }
  );

  const next = o.status === 'confirmed' ? 'preparing'
    : o.status === 'preparing' ? (o.fulfilment === 'pickup' ? 'ready' : 'out_for_delivery') : null;
  const handover = ['ready', 'out_for_delivery'].includes(o.status);
  const live = ['confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.status);
  const isDelivery = o.fulfilment === 'delivery';

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm font-medium text-navy-900">{o.orderNo}</p>
          <p className="text-sm text-gray-600">{o.customer?.fullName} · {o.contactPhone || o.customer?.phone} · {fmtDate(o.createdAt, true)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold text-navy-900">{money(o.total)}</p>
          <div className="mt-1 flex justify-end gap-1">
            <Pill tone={isDelivery ? 'info' : 'gray'}>{isDelivery ? 'Delivery' : 'Pickup'}</Pill>
            <Pill tone="pharmacy">{LABEL[o.status]}</Pill>
          </div>
        </div>
      </div>

      <ul className="mt-3 space-y-0.5 text-sm text-gray-700">
        {o.items.map((i) => <li key={i.drug}>{i.quantity}× {i.name}{i.strength ? ` ${i.strength}` : ''}</li>)}
      </ul>
      {isDelivery && (
        <p className="mt-2 rounded-xl bg-gray-50 p-3 text-sm">
          {o.delivery?.recipient}, {o.delivery?.phone}<br />
          {o.delivery?.address}{o.delivery?.note ? ` (${o.delivery.note})` : ''} · {o.delivery?.distanceKm} km
        </p>
      )}
      {o.delivery?.rider?.name && <p className="mt-2 text-xs text-gray-600">Rider: {o.delivery.rider.name}, {o.delivery.rider.phone}</p>}
      <div className="mt-2"><ErrorNote>{error}</ErrorNote></div>

      {live && !mode && (
        <div className="mt-3 flex flex-wrap gap-2">
          {next && (
            <button type="button" disabled={busy} className={primaryBtn}
              onClick={() => (next === 'out_for_delivery' ? setMode('rider') : changeStatus(next))}>
              {busy ? 'Updating…' : NEXT_LABEL[next]}
            </button>
          )}
          {handover && (
            <button type="button" disabled={busy} className={primaryBtn} onClick={() => setMode('verify')}>
              {isDelivery ? 'Verify delivery code' : 'Verify pickup code'}
            </button>
          )}
          {['confirmed', 'preparing'].includes(o.status) && (
            <button type="button" disabled={busy} className={ghostBtn} onClick={() => setMode('reject')}>Reject</button>
          )}
        </div>
      )}

      {mode === 'verify' && (
        <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); run('verify', { code }, { code }); }}>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric" autoFocus placeholder="4-digit code" aria-label="Order code"
            className={`${field} h-11 w-40 text-center font-mono text-lg tracking-widest`} />
          <button type="submit" disabled={busy || code.length !== 4} className={primaryBtn}>{busy ? 'Checking…' : 'Confirm'}</button>
          <button type="button" className={ghostBtn} onClick={() => { setMode(null); setError(''); }}>Cancel</button>
        </form>
      )}

      {mode === 'rider' && (
        <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); changeStatus('out_for_delivery', { name: rider.name.trim(), phone: rider.phone.trim() }); }}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Rider name"><input required value={rider.name} onChange={(e) => setRider({ ...rider, name: e.target.value })} className={`${field} h-11`} /></Field>
            <Field label="Rider phone"><input required value={rider.phone} onChange={(e) => setRider({ ...rider, phone: e.target.value })} inputMode="tel" className={`${field} h-11`} /></Field>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'Sending…' : 'Send out'}</button>
            <button type="button" className={ghostBtn} onClick={() => { setMode(null); setError(''); }}>Cancel</button>
          </div>
        </form>
      )}

      {mode === 'reject' && (
        <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); run('reject', { reason: reason.trim() }, { reason: reason.trim() }); }}>
          <p className="text-xs text-gray-600">The customer is refunded in full and stock goes back on the shelf.</p>
          <input required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (e.g. item damaged)" className={`${field} h-11`} />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={primaryBtn}>{busy ? 'Working…' : 'Reject and refund'}</button>
            <button type="button" className={ghostBtn} onClick={() => { setMode(null); setError(''); }}>Cancel</button>
          </div>
        </form>
      )}
    </Card>
  );
}

export default function PharmacyOrdersPage() {
  const [tab, setTab] = useState('active');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/pharmacy/orders', { params: { status: tab, limit: 50 } })
      .then((r) => { setRows(body(r).data); setError(''); })
      .catch((e) => { setError(e.message); setRows([]); });
  }, [tab]);

  useEffect(() => { setRows(null); load(); }, [load]);
  // New paid orders show up on their own
  useEffect(() => {
    if (tab !== 'active') return undefined;
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [tab, load]);

  return (
    <PageShell className="max-w-4xl">
      <PageHeader title="Online orders" subtitle="Orders paid for on the shop. Walk-in customers are handled on the Sales page." />
      <PharmacyNav />
      <div className="mb-4 flex gap-2">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={`h-10 rounded-full px-4 text-sm font-medium ${tab === id ? 'bg-navy-800 text-white' : 'bg-white text-navy-700 ring-1 ring-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>
      <ErrorNote>{error}</ErrorNote>
      {!rows ? <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        : rows.length === 0 ? <EmptyState icon="search" title="No orders here" body="New paid orders appear automatically." />
        : <ul className="space-y-3">{rows.map((o) => <li key={o._id}><OrderCard o={o} onChanged={load} /></li>)}</ul>}
    </PageShell>
  );
}