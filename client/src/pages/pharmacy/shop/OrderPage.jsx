import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api';
import { Card, EmptyState, ErrorNote, PageHeader, PageShell, Skeleton } from '../../appointments/ui';
import { Pill, fmtDate, ghostBtn, primaryBtn } from '../PharmacyShared';
import { body, money } from './cart';

const LABEL = {
  awaiting_payment: 'Awaiting payment', confirmed: 'Confirmed', preparing: 'Preparing', ready: 'Ready for pickup',
  out_for_delivery: 'Out for delivery', completed: 'Completed', cancelled: 'Cancelled',
};
const TONE = { completed: 'pharmacy', cancelled: 'gray', awaiting_payment: 'warning' };
const steps = (f) => f === 'pickup'
  ? [['confirmed', 'Order confirmed'], ['preparing', 'Being prepared'], ['ready', 'Ready for pickup'], ['completed', 'Collected']]
  : [['confirmed', 'Order confirmed'], ['preparing', 'Being prepared'], ['out_for_delivery', 'Out for delivery'], ['completed', 'Delivered']];

/* ------------------------------ LIST ------------------------------ */
export function ShopOrdersPage() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/shop/orders').then((r) => setRows(body(r).data)).catch((e) => { setError(e.message); setRows([]); }); }, []);

  return (
    <PageShell className="max-w-3xl">
      <PageHeader title="My orders" subtitle="Track your medicine orders." />
      <ErrorNote>{error}</ErrorNote>
      {!rows ? <Skeleton className="h-24 rounded-2xl" />
        : rows.length === 0 ? <><EmptyState icon="search" title="No orders yet" body="Your orders will show up here." /><div className="mt-4 text-center"><Link to="/shop" className={primaryBtn}>Browse medicines</Link></div></>
          : (
            <ul className="space-y-3">
              {rows.map((o) => (
                <li key={o._id}>
                  <Link to={`/shop/orders/${o._id}`} className="block">
                    <Card className="transition hover:ring-2 hover:ring-pharmacy-200">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-medium text-navy-900">{o.orderNo}</p>
                          <p className="truncate text-sm text-gray-600">{o.pharmacy?.name} · {fmtDate(o.createdAt, true)}</p>
                          <p className="mt-1 truncate text-xs text-gray-500">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-semibold text-navy-900">{money(o.total)}</p>
                          <Pill tone={TONE[o.status] || 'info'}>{LABEL[o.status]}</Pill>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
    </PageShell>
  );
}

/* ----------------------------- TRACKING --------------------------- */
export function ShopOrderPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const [o, setO] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api(`/shop/orders/${id}`).then((r) => { setO(body(r).data); setError(''); }).catch((e) => setError(e.message)), [id]);

  // Back from Paystack (?reference=...): confirm payment, then drop the query string
  useEffect(() => {
    const returning = sp.get('reference') || sp.get('trxref');
    if (!returning) { load(); return; }
    api(`/shop/orders/${id}/verify`, { method: 'POST' }).catch(() => { }).finally(() => { navigate(`/shop/orders/${id}`, { replace: true }); load(); });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live orders refresh themselves
  useEffect(() => {
    if (!o || ['completed', 'cancelled'].includes(o.status)) return undefined;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [o?.status, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (path, after) => {
    setBusy(true); setError('');
    try { const r = body(await api(`/shop/orders/${id}/${path}`, { method: 'POST' })).data; after?.(r); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  if (!o) return <PageShell className="max-w-3xl">{error ? <ErrorNote>{error}</ErrorNote> : <Skeleton className="h-64 rounded-2xl" />}</PageShell>;

  const flow = steps(o.fulfilment);
  const at = Object.fromEntries((o.timeline || []).map((t) => [t.status, t.at]));
  const current = flow.findIndex(([s]) => s === o.status);
  const p = o.pharmacy;
  const live = ['confirmed', 'preparing', 'ready', 'out_for_delivery'].includes(o.status);

  return (
    <PageShell className="max-w-3xl">
      <Link to="/shop/orders" className="mb-3 inline-block text-sm font-medium text-pharmacy-700 hover:underline">← My orders</Link>
      <PageHeader title={o.orderNo} subtitle={`${p.name} · ${fmtDate(o.createdAt, true)}`} />
      <ErrorNote>{error}</ErrorNote>

      {o.status === 'awaiting_payment' && (
        <Card className="mb-4 border border-amber-200 bg-amber-50">
          <p className="font-semibold text-navy-900">Payment not completed</p>
          <p className="text-sm text-gray-700">Finish paying within 30 minutes of placing the order, or it will be cancelled.</p>
          <div className="mt-3 flex gap-3">
            <button type="button" disabled={busy} className={primaryBtn} onClick={() => act('pay', (r) => { window.location.href = r.authorizationUrl; })}>Pay {money(o.amountDue)}</button>
            <button type="button" disabled={busy} className={ghostBtn} onClick={() => act('cancel')}>Cancel order</button>
          </div>
        </Card>
      )}

      {o.status === 'cancelled' && <Card className="mb-4"><Pill tone="gray">Cancelled</Pill><p className="mt-2 text-sm text-gray-700">{o.timeline?.at(-1)?.note}</p>{o.paymentStatus === 'refunded' && <p className="mt-1 text-sm text-gray-600">Your payment is being refunded.</p>}</Card>}

      {live && o.code && (
        <Card className="mb-4 bg-navy-900 text-center text-black">
          <p className="text-sm text-black/70">Your order code</p>
          <p className="my-1 font-mono text-5xl font-bold tracking-[0.3em]" aria-label={`Order code ${o.code.split('').join(' ')}`}>{o.code}</p>
          <p className="text-sm text-black/80">{o.fulfilment === 'pickup' ? 'Show this code to the pharmacist when you collect.' : 'Give this code to the rider only when your order arrives.'}</p>
        </Card>
      )}

      {o.status !== 'cancelled' && o.status !== 'awaiting_payment' && (
        <Card className="mb-4">
          <ol className="space-y-4">
            {flow.map(([s, label], i) => {
              const done = i <= current;
              return (
                <li key={s} className="flex items-start gap-3">
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-pharmacy-600 text-black' : 'bg-gray-200 text-gray-500'}`}>{done ? '✓' : i + 1}</span>
                  <div><p className={`text-sm font-medium ${done ? 'text-navy-900' : 'text-gray-500'}`}>{label}</p>{at[s] && <p className="text-xs text-gray-500">{fmtDate(at[s], true)}</p>}</div>
                </li>
              );
            })}
          </ol>
          {o.status === 'out_for_delivery' && o.delivery?.rider?.name && (
            <p className="mt-4 rounded-xl bg-gray-50 p-3 text-sm">Rider: <strong>{o.delivery.rider.name}</strong> · <a className="text-pharmacy-700 underline" href={`tel:${o.delivery.rider.phone}`}>{o.delivery.rider.phone}</a></p>
          )}
        </Card>
      )}

      <Card className="mb-4">
        <h2 className="mb-2 font-semibold text-navy-900">Items</h2>
        <ul className="space-y-1 text-sm">{o.items.map((i) => <li key={i.drug} className="flex justify-between gap-3"><span>{i.quantity}× {i.name}</span><span>{money(i.lineTotal)}</span></li>)}</ul>
        <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm text-gray-700">
          <div className="flex justify-between"><span>Items</span><span>{money(o.subtotal)}</span></div>
          {o.fulfilment === 'delivery' && <div className="flex justify-between"><span>Delivery</span><span>{money(o.deliveryFee)}</span></div>}
          {o.voucher?.discount > 0 && <div className="flex justify-between text-green-700"><span>Voucher {o.voucher.code}</span><span>− {money(o.voucher.discount)}</span></div>}
          {o.points?.used > 0 && <div className="flex justify-between text-green-700"><span>Points ({o.points.used})</span><span>− {money(o.points.discount)}</span></div>}
          <div className="flex justify-between text-base font-bold text-navy-900"><span>Total</span><span>{money(o.total)}</span></div>
        </div>
      </Card>

      <Card className="mb-4">
        <h2 className="mb-2 font-semibold text-navy-900">{o.fulfilment === 'pickup' ? 'Pickup from' : 'Delivering to'}</h2>
        {o.fulfilment === 'delivery' && <p className="mb-3 text-sm text-gray-700">{o.delivery.recipient}, {o.delivery.phone}<br />{o.delivery.address}{o.delivery.note ? ` (${o.delivery.note})` : ''}</p>}
        <p className="text-sm font-medium text-navy-900">{p.name}</p>
        <p className="text-sm text-gray-600">{[p.address?.street, p.address?.city, p.address?.state].filter(Boolean).join(', ')}</p>
        {p.phone && <p className="text-sm"><a className="text-pharmacy-700 underline" href={`tel:${p.phone}`}>{p.phone}</a></p>}
        {(p.is24Hours || p.openingHours) && <p className="text-sm text-gray-600">{p.is24Hours ? 'Open 24 hours' : p.openingHours}</p>}
      </Card>
    </PageShell>
  );
}