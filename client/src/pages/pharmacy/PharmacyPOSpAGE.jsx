import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import  api  from './api';
import { Card, EmptyState, ErrorNote, PageHeader, PageShell } from '../appointments/ui';
import {
  DrugPicker, Field, PaymentBox, PharmacyNav, Pill, Receipt, drugLabel, emptyPayment, field, ghostBtn, money, paymentBody, primaryBtn, usePharmacyMe,
} from './PharmacyShared';

export default function PharmacyPosPage() {
  const me = usePharmacyMe();
  const [cart, setCart] = useState([]); // { drug, qty }
  const [pay, setPay] = useState(emptyPayment);
  const [customer, setCustomer] = useState({ name: '', phone: '', prescriber: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.drug.sellingPrice * (Number(l.qty) || 0), 0), [cart]);
  const needsRx = cart.some((l) => l.drug.schedule === 'prescription_only');
  const hasControlled = cart.some((l) => l.drug.schedule === 'controlled');

  const add = (drug) => setCart((c) => {
    const found = c.find((l) => l.drug._id === drug._id);
    if (found) return c.map((l) => (l.drug._id === drug._id ? { ...l, qty: Math.min(Number(l.qty) + 1, drug.sellable ?? drug.stock) } : l));
    return [...c, { drug, qty: 1 }];
  });
  const setQty = (id, qty) => setCart((c) => c.map((l) => (l.drug._id === id ? { ...l, qty } : l)));
  const remove = (id) => setCart((c) => c.filter((l) => l.drug._id !== id));

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const r = await api('/pharmacy/sales', {
        method: 'POST',
        body: {
          items: cart.map((l) => ({ drugId: l.drug._id, quantity: Number(l.qty) })),
          customerName: customer.name || undefined,
          customerPhone: customer.phone || undefined,
          externalRx: customer.prescriber ? { prescriber: customer.prescriber } : undefined,
          ...paymentBody(pay),
        },
      });
      setDone(r.data);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const reset = () => { setDone(null); setCart([]); setPay(emptyPayment); setCustomer({ name: '', phone: '', prescriber: '' }); };

  if (done) {
    return (
      <PageShell className="max-w-3xl">
        <div className="print:hidden"><PageHeader title="Sale complete" subtitle="Stock has been updated." /></div>
        <Receipt sale={done} pharmacyName={me?.pharmacy?.name} />
        <div className="mt-5 flex flex-wrap justify-center gap-2 print:hidden">
          <button type="button" onClick={() => window.print()} className={ghostBtn}>Print receipt</button>
          <button type="button" onClick={reset} className={primaryBtn}>New sale</button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-3xl">
      <PageHeader title="Sell" subtitle="Walk-in and over-the-counter sales. For a doctor's prescription from the app, use Prescriptions." />
      <PharmacyNav />
      <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>

      <div className="space-y-4">
        <Card className="space-y-3">
          <DrugPicker onPick={add} />
          {cart.length === 0 ? (
            <EmptyState icon="pill" title="Cart is empty" body="Search for a drug or scan a barcode to add it." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {cart.map((l) => (
                <li key={l.drug._id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy-900">{drugLabel(l.drug)}</p>
                    <p className="text-xs text-gray-500">{money(l.drug.sellingPrice)} each · {l.drug.sellable ?? l.drug.stock} in stock</p>
                    {l.drug.schedule !== 'otc' && <Pill tone={l.drug.schedule === 'controlled' ? 'danger' : 'warning'}>{l.drug.schedule === 'controlled' ? 'Controlled' : 'Prescription only'}</Pill>}
                  </div>
                  <input
                    type="number" min="1" max={l.drug.sellable ?? l.drug.stock} value={l.qty} aria-label={`Quantity of ${l.drug.genericName}`}
                    onChange={(e) => setQty(l.drug._id, Math.min(Number(e.target.value) || '', l.drug.sellable ?? l.drug.stock))}
                    className="h-11 w-20 rounded-xl border border-gray-300 bg-white px-2 text-center focus:border-pharmacy-500 focus:outline-none focus:ring-2 focus:ring-pharmacy-500/30"
                  />
                  <span className="w-24 text-right text-sm font-semibold text-navy-900">{money(l.drug.sellingPrice * (Number(l.qty) || 0))}</span>
                  <button type="button" onClick={() => remove(l.drug._id)} aria-label="Remove" className="h-9 w-9 rounded-full text-gray-500 hover:bg-gray-100">✕</button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {hasControlled && (
          <p className="rounded-xl bg-danger-light px-4 py-3 text-sm text-danger-dark">
            Controlled drugs can't be sold over the counter. Remove them, or attend to the patient's prescription instead.
          </p>
        )}

        {cart.length > 0 && (
          <>
            <Card className="space-y-3">
              <h2 className="font-semibold text-navy-900">Customer (optional)</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name"><input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className={`${field} h-11`} /></Field>
                <Field label="Phone"><input inputMode="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className={`${field} h-11`} /></Field>
              </div>
              {needsRx && (
                <Field label="Prescriber *" hint="Required for prescription-only drugs sold on an outside prescription.">
                  <input value={customer.prescriber} onChange={(e) => setCustomer({ ...customer, prescriber: e.target.value })} className={`${field} h-11`} placeholder="Dr. Name, hospital" />
                </Field>
              )}
            </Card>
            <Card className="space-y-4">
              <h2 className="font-semibold text-navy-900">Payment</h2>
              <PaymentBox subtotal={subtotal} value={pay} onChange={setPay} />
              <button
                type="button" onClick={submit}
                disabled={busy || hasControlled || cart.some((l) => !Number(l.qty)) || (needsRx && !customer.prescriber.trim())}
                className={`${primaryBtn} w-full`}
              >
                {busy ? 'Recording…' : `Complete sale ${money(subtotal)}`}
              </button>
            </Card>
          </>
        )}
        <p className="text-center text-sm text-gray-600">Patient brought a prescription from a doctor on the app? <Link to="/pharmacy/lookup" className="font-medium text-pharmacy-700 underline">Look it up</Link></p>
      </div>
    </PageShell>
  );
}