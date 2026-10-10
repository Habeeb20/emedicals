import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import api from './api';
import { Avatar, Card, EmptyState, ErrorNote, PageHeader, PageShell, Skeleton } from '../appointments/ui';
import { ageFrom } from '../../pages/appointments/format';
import {
  DrugPicker, PaymentBox, PharmacyNav, Pill, Receipt, drugLabel, emptyPayment, fmtDate, ghostBtn, money, paymentBody, primaryBtn, usePharmacyMe,
} from './PharmacyShared';

export default function PharmacyAttendPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const code = sp.get('code') || '';
  const me = usePharmacyMe();

  const [rx, setRx] = useState(null);
  const [error, setError] = useState('');
  const [lines, setLines] = useState({}); // rxItemIndex -> { drug, qty }
  const [pay, setPay] = useState(emptyPayment);
  const [finalize, setFinalize] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api(`/pharmacy/prescriptions/${id}`, { params: code ? { code } : {} })
      .then((r) => {
        setRx(r.data);
        if (r.data.patient?.id) {
          api('/pharmacy/sales', { params: { patient: r.data.patient.id, limit: 5, from: '2000-01-01' } })
            .then((h) => setHistory(h.data.filter((s) => s.prescription !== r.data.id))).catch(() => {});
        }
      })
      .catch((e) => setError(e.message));
  }, [id, code]);

  const setLine = (idx, drug, qty) => setLines((l) => ({ ...l, [idx]: { drug, qty } }));
  const clearLine = (idx) => setLines((l) => { const n = { ...l }; delete n[idx]; return n; });

  const subtotal = useMemo(
    () => Object.values(lines).reduce((s, l) => s + l.drug.sellingPrice * (Number(l.qty) || 0), 0),
    [lines]
  );
  const chosen = Object.entries(lines);
  const allCovered = rx?.items.every((it) => it.remaining === 0 || lines[it.index]);
  useEffect(() => { setFinalize(!!allCovered); }, [allCovered]);

  const maxFor = (it, drug) => Math.max(1, Math.min(it.remaining ?? 9999, drug.sellable ?? drug.stock));

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const r = await api('/pharmacy/sales', {
        method: 'POST',
        body: {
          prescriptionId: id, code: code || undefined, finalize,
          items: chosen.map(([idx, l]) => ({ drugId: l.drug._id, quantity: Number(l.qty), rxItemIndex: Number(idx) })),
          ...paymentBody(pay),
        },
      });
      setDone(r.data);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  if (done) {
    return (
      <PageShell className="max-w-3xl">
        <div className="print:hidden">
          <PageHeader title="Prescription attended to" subtitle="Stock was deducted and the patient has been notified. They can now rate your pharmacy." />
        </div>
        <Receipt sale={done} pharmacyName={me?.pharmacy?.name} />
        <div className="mt-5 flex flex-wrap justify-center gap-2 print:hidden">
          <button type="button" onClick={() => window.print()} className={ghostBtn}>Print receipt</button>
          <Link to="/pharmacy/lookup" className={primaryBtn}>Next prescription</Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-3xl">
      <PageHeader title="Attend to prescription" subtitle="Match each line to the exact product you're giving. Stock comes off the batch that expires first." />
      <PharmacyNav />
      <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>

      {!rx && !error && <div className="space-y-4"><Skeleton className="h-32 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /></div>}
      {!rx && error && <EmptyState icon="search" title="Can't open this prescription" body="Go back to the lookup and search again, or ask the patient for their code." />}

      {rx && (
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-start gap-3">
              <Avatar tone="pharmacy" name={rx.patient?.name} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold text-navy-900">{rx.patient?.name}</h2>
                <p className="text-sm text-gray-600">{[ageFrom(rx.patient?.dateOfBirth) && `${ageFrom(rx.patient.dateOfBirth)} yrs`, rx.patient?.gender].filter(Boolean).join(', ')}</p>
              </div>
              <Pill tone={rx.status === 'dispensed' ? 'success' : rx.status === 'issued' ? 'warning' : 'gray'}>{rx.status.replace('_', ' ')}</Pill>
            </div>
            <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div><dt className="text-gray-500">Prescribed by</dt><dd className="font-medium text-navy-900">{rx.prescribedBy || 'Unknown'}</dd></div>
              <div><dt className="text-gray-500">Hospital</dt><dd className="font-medium text-navy-900">{rx.hospital || 'Not recorded'}</dd></div>
              <div><dt className="text-gray-500">Date</dt><dd className="font-medium text-navy-900">{fmtDate(rx.issuedAt)}</dd></div>
              <div><dt className="text-gray-500">Code</dt><dd className="font-mono font-medium text-navy-900">{rx.code}</dd></div>
            </dl>
            {rx.purpose && <p className="text-sm text-gray-700">Overall reason: {rx.purpose}</p>}
            {rx.previous.length > 0 && (
              <p className="rounded-xl bg-info-light px-3 py-2 text-sm text-info-dark">
                You already gave part of this prescription: {rx.previous.map((p) => p.receiptNo).join(', ')}.
              </p>
            )}
          </Card>

          {['dispensed', 'cancelled'].includes(rx.status) ? (
            <EmptyState icon="check" title={`This prescription is ${rx.status}`} body="Nothing more can be dispensed against it." />
          ) : (
            <>
              <ul className="space-y-4">
                {rx.items.map((it) => {
                  const line = lines[it.index];
                  const sugg = rx.suggestions[it.index] || [];
                  return (
                    <li key={it.index}>
                      <Card className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-navy-900">{it.medicine}</h3>
                            <p className="text-sm text-gray-600">{[it.dosage, it.frequency, it.duration].filter(Boolean).join(' · ')}</p>
                            {it.instructions && <p className="text-sm text-gray-600">{it.instructions}</p>}
                            {it.purpose && <p className="text-sm text-gray-500">For: {it.purpose}</p>}
                          </div>
                          <Pill tone={it.remaining === 0 ? 'success' : 'pharmacy'}>
                            {it.remaining === 0 ? 'Fully given' : it.remaining != null ? `${it.remaining} to give` : 'Qty not stated'}
                          </Pill>
                        </div>

                        {it.remaining !== 0 && (line ? (
                          <div className="space-y-3 rounded-2xl bg-pharmacy-50 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-navy-900">{drugLabel(line.drug)}</p>
                                <p className="text-xs text-gray-600">{money(line.drug.sellingPrice)} each · {line.drug.sellable ?? line.drug.stock} in stock</p>
                              </div>
                              <button type="button" onClick={() => clearLine(it.index)} className="text-sm text-danger-dark">Remove</button>
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="text-sm text-gray-700" htmlFor={`qty-${it.index}`}>Quantity</label>
                              <input
                                id={`qty-${it.index}`} type="number" min="1" max={maxFor(it, line.drug)} value={line.qty}
                                onChange={(e) => setLine(it.index, line.drug, Math.min(Number(e.target.value) || '', maxFor(it, line.drug)))}
                                className="h-11 w-24 rounded-xl border border-gray-300 bg-white px-3 text-center focus:border-pharmacy-500 focus:outline-none focus:ring-2 focus:ring-pharmacy-500/30"
                              />
                              <span className="ml-auto font-semibold text-pharmacy-700">{money(line.drug.sellingPrice * (Number(line.qty) || 0))}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {sugg.length > 0 && (
                              <div>
                                <p className="mb-2 text-xs text-gray-600">In your stock. Check strength and form before choosing.</p>
                                <div className="flex flex-wrap gap-2">
                                  {sugg.map((d) => (
                                    <button key={d._id} type="button" onClick={() => setLine(it.index, d, Math.min(it.remaining ?? it.quantity ?? 1, d.stock) || 1)}
                                      className="rounded-xl bg-white px-3 py-2 text-left text-sm ring-1 ring-gray-200 hover:bg-pharmacy-50">
                                      <span className="block font-medium text-navy-900">{drugLabel(d)}</span>
                                      <span className="text-xs text-gray-500">{money(d.sellingPrice)} · {d.stock} in stock</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            <DrugPicker placeholder={sugg.length ? 'Or search for another product' : 'Search your stock for this drug'} onPick={(d) => setLine(it.index, d, Math.min(it.remaining ?? it.quantity ?? 1, d.sellable ?? d.stock) || 1)} />
                            {sugg.length === 0 && <p className="text-xs text-gray-500">No obvious match in stock. Search by brand or generic name.</p>}
                          </div>
                        ))}
                      </Card>
                    </li>
                  );
                })}
              </ul>

              {history.length > 0 && (
                <Card>
                  <h3 className="mb-2 font-semibold text-navy-900">Earlier visits to your pharmacy</h3>
                  <ul className="divide-y divide-gray-100 text-sm">
                    {history.map((s) => (
                      <li key={s._id} className="flex justify-between gap-3 py-2"><span className="text-gray-700">{fmtDate(s.createdAt)} · {s.items.map((i) => i.name).join(', ')}</span><span className="shrink-0 font-medium">{money(s.total)}</span></li>
                    ))}
                  </ul>
                </Card>
              )}

              {chosen.length > 0 && (
                <Card className="space-y-4">
                  <h3 className="font-semibold text-navy-900">Payment</h3>
                  <PaymentBox subtotal={subtotal} value={pay} onChange={setPay} />
                  <label className="flex items-start gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={finalize} onChange={(e) => setFinalize(e.target.checked)} className="mt-0.5 h-4 w-4 accent-pharmacy-600" />
                    <span>Mark this prescription as fully dispensed. Leave it unticked if the patient will come back for the rest.</span>
                  </label>
                  <button type="button" onClick={submit} disabled={busy || chosen.some(([, l]) => !Number(l.qty))} className={`${primaryBtn} w-full`}>
                    {busy ? 'Recording…' : `Dispense and charge ${money(subtotal)}`}
                  </button>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </PageShell>
  );
}