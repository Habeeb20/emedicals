import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import api  from './api';
import { useDebounced } from '../appointments/hooks';

import { inputCls } from '../appointments/ui';

/* ------------------------------ helpers ------------------------------ */
export const field = `${inputCls} focus:!border-pharmacy-500 focus:!ring-pharmacy-500/30`;
export const money = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
export const fmtDate = (d, time = false) =>
  d
    ? new Date(d).toLocaleString('en-NG', time
      ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: 'numeric', month: 'short', year: 'numeric' })
    : 'n/a';
export const daysUntil = (d) => Math.ceil((new Date(d).getTime() - Date.now()) / 864e5);
export const drugLabel = (d) => [d.genericName, d.brandName && `(${d.brandName})`, d.strength].filter(Boolean).join(' ');
export const primaryBtn = 'inline-flex h-11 items-center justify-center rounded-xl bg-pharmacy-600 px-5 text-sm font-semibold text-white transition hover:bg-pharmacy-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pharmacy-600 disabled:cursor-not-allowed disabled:opacity-50';
export const ghostBtn = 'inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-navy-800 ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';

/* ------------------------- who am I (pharmacy) ------------------------ */
let mePromise;
export function usePharmacyMe() {
  const [me, setMe] = useState(null);
  useEffect(() => {
    if (!mePromise) mePromise = api('/pharmacy/me').then((r) => r.data).catch((e) => { mePromise = null; throw e; });
    mePromise.then(setMe).catch(() => {});
  }, []);
  return me;
}

/* ------------------------------ small UI ------------------------------ */
const PILL = {
  gray: 'bg-gray-100 text-gray-700',
  success: 'bg-success-light text-success-dark',
  warning: 'bg-warning-light text-warning-dark',
  danger: 'bg-danger-light text-danger-dark',
  info: 'bg-info-light text-info-dark',
  pharmacy: 'bg-pharmacy-100 text-pharmacy-800',
};
export const Pill = ({ tone = 'gray', children }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${PILL[tone]}`}>{children}</span>
);

export const StatCard = ({ label, value, hint, tone = 'navy' }) => (
  <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
    <p className="text-sm text-gray-600">{label}</p>
    <p className={`mt-1 text-2xl font-bold ${tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning-dark' : 'text-navy-900'}`}>{value}</p>
    {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
  </div>
);

export const Field = ({ label, hint, children }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-navy-800">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
  </label>
);

export const Stars = ({ value = 0, size = 'text-base' }) => (
  <span className={`${size} tracking-tight text-warning`} aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= Math.round(value) ? '' : 'text-gray-300'}>★</span>)}
  </span>
);

/* Bottom sheet on phones, centred dialog on larger screens */
export function Sheet({ open, title, onClose, children, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-navy-900/50 print:hidden" onClick={onClose} />
      <div className={`relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-xl sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 print:hidden">
          <h2 className="font-semibold text-navy-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 rounded-full text-gray-500 hover:bg-gray-100">✕</button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

/* Sub-navigation for all pharmacy back-office pages. Scrolls sideways on phones. */
export function PharmacyNav() {
  const me = usePharmacyMe();
  const links = [
    { to: '/pharmacy', label: 'Dashboard' },
    { to: '/pharmacy/lookup', label: 'Prescriptions' },
    { to: '/pharmacy/pos', label: 'Sell' },
    { to: '/pharmacy/inventory', label: 'Inventory' },
    { to: '/pharmacy/sales', label: 'Sales' },
    { to: '/pharmacy/chats', label: 'Chats' },
    { to: '/pharmacy/reports', label: 'Reports', manager: true },
  ].filter((l) => !l.manager || me?.isManager);
  return (
    <nav aria-label="Pharmacy sections" className="-mx-4 mb-5 overflow-x-auto px-4 print:hidden sm:mx-0 sm:px-0">
      <ul className="flex gap-2 whitespace-nowrap pb-1">
        {links.map((l) => (
          <li key={l.to}>
            <NavLink
              to={l.to}
              end={l.to === '/pharmacy'}
              className={({ isActive }) =>
                `inline-flex h-10 items-center rounded-full px-4 text-sm font-medium transition ${isActive ? 'bg-pharmacy-600 text-white' : 'bg-white text-navy-700 ring-1 ring-gray-200 hover:bg-pharmacy-50'}`}
            >
              {l.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/* Search the pharmacy's own catalog. Press Enter to take an exact barcode match straight away. */
export function DrugPicker({ onPick, inStock = true, placeholder = 'Search drug name or scan barcode' }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const dq = useDebounced(q, 250);
  const params = (term) => ({ q: term, limit: 8, ...(inStock ? { inStock: 1 } : {}) });

  useEffect(() => {
    if (dq.trim().length < 2) { setResults([]); return undefined; }
    let off = false;
    setBusy(true);
    api('/pharmacy/drugs', { params: params(dq.trim()) })
      .then((r) => !off && setResults(r.data))
      .catch(() => {})
      .finally(() => !off && setBusy(false));
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, inStock]);

  const pick = (d) => { onPick(d); setQ(''); setResults([]); };
  const onKeyDown = async (e) => {
    if (e.key !== 'Enter' || !q.trim()) return;
    e.preventDefault();
    try {
      const r = await api('/pharmacy/drugs', { params: params(q.trim()) });
      if (r.data.length === 1) pick(r.data[0]); else setResults(r.data);
    } catch { /* ignore */ }
  };

  return (
    <div className="relative">
      <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown} placeholder={placeholder} aria-label="Search drugs" className={`${field} h-11`} />
      {q.trim().length >= 2 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {busy && <li className="px-4 py-3 text-sm text-gray-500">Searching…</li>}
          {!busy && results.length === 0 && <li className="px-4 py-3 text-sm text-gray-600">{inStock ? 'No drug in stock matches.' : 'No drug matches.'}</li>}
          {results.map((d) => (
            <li key={d._id}>
              <button type="button" onClick={() => pick(d)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-pharmacy-50">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-navy-900">{drugLabel(d)}</span>
                  <span className="block text-xs text-gray-500">{d.form} · {d.sellable ?? d.stock} in stock</span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-pharmacy-700">{money(d.sellingPrice)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* Payment method, discount, insurance details. `value` = { method, discount, amountPaid, insurer, authCode } */
export const PAY_METHODS = [
  { id: 'cash', label: 'Cash' }, { id: 'card', label: 'Card' }, { id: 'transfer', label: 'Transfer' },
  { id: 'insurance', label: 'HMO' }, { id: 'credit', label: 'Credit' },
];
export const emptyPayment = { method: 'cash', discount: '', amountPaid: '', insurer: '', authCode: '' };

export function PaymentBox({ subtotal, value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  const discount = Math.min(Number(value.discount) || 0, subtotal);
  const total = Math.max(subtotal - discount, 0);
  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {PAY_METHODS.map((m) => (
          <button
            key={m.id} type="button" role="radio" aria-checked={value.method === m.id} onClick={() => set('method', m.id)}
            className={`h-11 rounded-xl text-sm font-medium transition ${value.method === m.id ? 'bg-pharmacy-600 text-white' : 'bg-white text-navy-700 ring-1 ring-gray-200 hover:bg-pharmacy-50'}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Discount (₦)"><input inputMode="decimal" value={value.discount} onChange={(e) => set('discount', e.target.value)} className={`${field} h-11`} placeholder="0" /></Field>
        {['credit', 'insurance'].includes(value.method) && (
          <Field label={value.method === 'insurance' ? 'Patient co-pay (₦)' : 'Paid now (₦)'}>
            <input inputMode="decimal" value={value.amountPaid} onChange={(e) => set('amountPaid', e.target.value)} className={`${field} h-11`} placeholder="0" />
          </Field>
        )}
        {value.method === 'insurance' && (
          <>
            <Field label="HMO / insurer"><input value={value.insurer} onChange={(e) => set('insurer', e.target.value)} className={`${field} h-11`} /></Field>
            <Field label="Authorization code"><input value={value.authCode} onChange={(e) => set('authCode', e.target.value)} className={`${field} h-11`} /></Field>
          </>
        )}
      </div>
      <dl className="space-y-1 rounded-xl bg-gray-50 p-4 text-sm">
        <div className="flex justify-between"><dt className="text-gray-600">Subtotal</dt><dd className="font-medium">{money(subtotal)}</dd></div>
        {discount > 0 && <div className="flex justify-between"><dt className="text-gray-600">Discount</dt><dd className="font-medium">-{money(discount)}</dd></div>}
        <div className="flex justify-between border-t border-gray-200 pt-2 text-base"><dt className="font-semibold text-navy-900">Total</dt><dd className="font-bold text-pharmacy-700">{money(total)}</dd></div>
      </dl>
    </div>
  );
}

export const paymentBody = (p) => ({
  paymentMethod: p.method,
  discount: Number(p.discount) || 0,
  amountPaid: p.amountPaid === '' ? undefined : Number(p.amountPaid),
  insurer: p.insurer || undefined,
  authCode: p.authCode || undefined,
});

/* Printable receipt */
export function Receipt({ sale, pharmacyName }) {
  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl bg-white p-5 text-sm ring-1 ring-gray-200 print:ring-0">
      <div className="text-center">
        <h3 className="text-base font-bold text-navy-900">{pharmacyName || 'Pharmacy'}</h3>
        <p className="font-mono text-xs text-gray-600">{sale.receiptNo}</p>
        <p className="text-xs text-gray-500">{fmtDate(sale.createdAt, true)}</p>
      </div>
      <ul className="my-4 divide-y divide-gray-100 border-y border-gray-100">
        {sale.items.map((i, n) => (
          <li key={n} className="flex justify-between gap-3 py-2">
            <span className="min-w-0"><span className="block">{i.name}</span><span className="text-xs text-gray-500">{i.quantity} × {money(i.unitPrice)}</span></span>
            <span className="shrink-0 font-medium">{money(i.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <dl className="space-y-1">
        <div className="flex justify-between"><dt className="text-gray-600">Subtotal</dt><dd>{money(sale.subtotal)}</dd></div>
        {sale.discount > 0 && <div className="flex justify-between"><dt className="text-gray-600">Discount</dt><dd>-{money(sale.discount)}</dd></div>}
        {sale.refundedTotal > 0 && <div className="flex justify-between"><dt className="text-gray-600">Refunded</dt><dd>-{money(sale.refundedTotal)}</dd></div>}
        <div className="flex justify-between text-base font-bold text-navy-900"><dt>Total</dt><dd>{money(sale.total)}</dd></div>
        <div className="flex justify-between"><dt className="text-gray-600">Paid ({sale.paymentMethod})</dt><dd>{money(sale.amountPaid)}</dd></div>
        {sale.total - sale.amountPaid > 0 && <div className="flex justify-between text-danger-dark"><dt>Balance</dt><dd>{money(sale.total - sale.amountPaid)}</dd></div>}
      </dl>
      {sale.soldBy?.fullName && <p className="mt-4 text-center text-xs text-gray-500">Served by {sale.soldBy.fullName}</p>}
    </div>
  );
}