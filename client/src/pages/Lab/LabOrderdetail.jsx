import { useEffect, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import StatusBadge, { FlagBadge, PaymentBadge } from './StatusBadge';
import { labApi, errMsg, naira, dateFmt } from './labApi';

const small = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-lab-500 focus:ring-2 focus:ring-lab-200';

/**
 * One screen for both sides, driven entirely by props (no router):
 *   <LabOrderDetail mode="lab" orderId={id} onBack={() => ...} />
 *   <LabOrderDetail mode="patient" orderId={id} onBack={() => ...} />
 */
export default function LabOrderDetail({ mode = 'patient', orderId, onBack }) {
  const id = orderId;
  const isLab = mode === 'lab';
  const [order, setOrder] = useState(null);
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    labApi.getOrder(id).then(({ order }) => {
      setOrder(order);
      setDraft(Object.fromEntries(order.items.map((i) => [i._id, {
        result: i.result || '', unit: i.unit || '', referenceRange: i.referenceRange || '', flag: i.flag || '',
      }])));
    }).catch((e) => setError(errMsg(e)));

  useEffect(() => {
    if (!id) { setError('No order selected.'); return; }
    setOrder(null);
    setError('');
    load();
  }, [id]);

  const run = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); await load(); } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };
  const setField = (itemId, k, v) => setDraft((d) => ({ ...d, [itemId]: { ...d[itemId], [k]: v } }));
  const payload = () => Object.entries(draft).map(([itemId, v]) => ({ itemId, ...v }));
  const save = () => run(() => labApi.saveResults(id, payload()));

  const backBtn = onBack && (
    <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-medium text-lab-700 hover:underline">
      <ArrowLeft size={16} /> Back to orders
    </button>
  );

  if (!order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        {backBtn}
        <p className={`mt-4 ${error ? 'text-danger' : 'text-gray-500'}`}>{error || 'Loading…'}</p>
      </div>
    );
  }

  const editable = isLab && ['sample_collected', 'processing'].includes(order.status);
  const open = !['completed', 'cancelled'].includes(order.status);
  const canCancel = isLab ? open : order.status === 'ordered';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {backBtn}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">{order.orderNumber}</h1>
          <p className="mt-1 text-gray-600">Ordered {dateFmt(order.createdAt)}{order.orderedBy && ` by Dr. ${order.orderedBy.fullName}`}</p>
        </div>
        <div className="flex items-center gap-2"><StatusBadge status={order.status} /><PaymentBadge status={order.paymentStatus} /></div>
      </div>

      <div className="mt-6 grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 text-sm sm:grid-cols-2">
        {isLab ? (
          <div>
            <p className="font-semibold text-navy-900">Patient</p>
            <p className="text-gray-600">{order.patient?.fullName}</p>
            <p className="text-gray-600">{[order.patient?.phone, order.patient?.gender, order.patient?.dateOfBirth && dateFmt(order.patient.dateOfBirth)].filter(Boolean).join(' · ')}</p>
            {order.patient?.email && <p className="text-gray-600">{order.patient.email}</p>}
          </div>
        ) : (
          <div>
            <p className="font-semibold text-navy-900">{order.lab?.name}</p>
            <p className="text-gray-600">{[order.lab?.address?.street, order.lab?.address?.city].filter(Boolean).join(', ')}</p>
            {order.lab?.phone && <p className="text-gray-600">{order.lab.phone}</p>}
          </div>
        )}
        <div>
          <p className="font-semibold text-navy-900">Timeline</p>
          <p className="text-gray-600">Sample collected: {order.collectedAt ? dateFmt(order.collectedAt) : 'Not yet'}</p>
          <p className="text-gray-600">Completed: {order.completedAt ? dateFmt(order.completedAt) : 'Not yet'}</p>
        </div>
      </div>

      {!isLab && order.status === 'ordered' && (
        <p className="mt-4 rounded-xl bg-info-light p-4 text-sm text-info-dark">Take this order number to the lab to give your sample. Your results will appear here when they are ready.</p>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold text-navy-900">Tests and results</h2>
      <div className="space-y-3">
        {order.items.map((i) => (
          <div key={i._id} className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-navy-900">{i.testName}</p>
              <p className="text-sm font-medium text-gray-600">{naira(i.price)}</p>
            </div>

            {editable ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <input className={small} placeholder="Result" value={draft[i._id]?.result ?? ''} onChange={(e) => setField(i._id, 'result', e.target.value)} />
                <input className={small} placeholder="Unit" value={draft[i._id]?.unit ?? ''} onChange={(e) => setField(i._id, 'unit', e.target.value)} />
                <input className={small} placeholder="Reference range" value={draft[i._id]?.referenceRange ?? ''} onChange={(e) => setField(i._id, 'referenceRange', e.target.value)} />
                <select className={small} value={draft[i._id]?.flag ?? ''} onChange={(e) => setField(i._id, 'flag', e.target.value)}>
                  <option value="">Flag</option>
                  {['normal', 'low', 'high', 'critical'].map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            ) : i.result || i.resultAttachment?.url ? (
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                {i.result && <span className="text-lg font-bold text-navy-900">{i.result} <span className="text-sm font-normal text-gray-500">{i.unit}</span></span>}
                {i.referenceRange && <span className="text-gray-500">Reference: {i.referenceRange}</span>}
                <FlagBadge flag={i.flag} />
                {i.resultAttachment?.url && <a href={i.resultAttachment.url} target="_blank" rel="noreferrer" className="font-semibold text-lab-700 hover:underline">View attachment</a>}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">{order.status === 'cancelled' ? 'No result' : 'Result pending'}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-lab-50 p-5">
        <span className="font-semibold text-lab-800">Total</span>
        <span className="text-xl font-bold text-lab-800">{naira(order.totalAmount)}</span>
      </div>

      {error && <p className="mt-4 rounded-xl bg-danger-light p-3 text-sm text-danger-dark">{error}</p>}

      <div className="mt-6 flex flex-wrap gap-3 print:hidden">
        {isLab && order.status === 'ordered' && <button disabled={busy} onClick={() => run(() => labApi.collect(id))} className="btn-primary">Mark sample collected</button>}
        {editable && <button disabled={busy} onClick={save} className="btn-outline">Save results</button>}
        {editable && order.status === 'processing' && <button disabled={busy} onClick={() => run(async () => { await labApi.saveResults(id, payload()); await labApi.complete(id); })} className="btn-primary">Save and complete</button>}
        {isLab && order.status !== 'cancelled' && order.paymentStatus === 'unpaid' && <button disabled={busy} onClick={() => run(() => labApi.setPayment(id, 'paid'))} className="btn-outline">Mark as paid</button>}
        {canCancel && <button disabled={busy} onClick={() => window.confirm('Cancel this order?') && run(() => labApi.cancelOrder(id))} className="rounded-full border border-danger px-5 py-2.5 text-sm font-semibold text-danger hover:bg-danger-light">Cancel order</button>}
        {order.status === 'completed' && <button onClick={() => window.print()} className="btn-outline inline-flex items-center gap-2"><Printer size={16} />Print results</button>}
      </div>
    </div>
  );
}