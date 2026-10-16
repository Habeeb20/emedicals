import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Clock, Droplet, Check, ArrowLeft } from 'lucide-react';
import { labApi, errMsg, naira, inputCls } from './labApi';

// Works as a routed page (/labs/:labId/book) or embedded: <LabBooking labId initialPicked onBack onPlaced />
export default function LabBooking({ labId: labIdProp, initialPicked = [], onBack, onPlaced }) {

  const params = useParams();
  const navigate = useNavigate();
  const labId = labIdProp || params.labId || params.id;

  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(() => new Set(initialPicked));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Load the lab's active tests. Never calls the API without an id.
  useEffect(() => {
    if (!labId) { setError('No lab selected.'); return; }
    let cancelled = false;
    setData(null);
    setError('');
    labApi.labTests(labId)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        // drop any preselected tests that are no longer offered
        const valid = new Set(d.tests.map((t) => t._id));
        setPicked((p) => new Set([...p].filter((id) => valid.has(id))));
      })
      .catch((e) => { if (!cancelled) setError(errMsg(e)); });
    return () => { cancelled = true; };
  }, [labId]);

  const groups = useMemo(() => {
    const list = (data?.tests || []).filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
    return list.reduce((acc, t) => ((acc[t.category || 'Other tests'] ||= []).push(t), acc), {});
  }, [data, q]);

  const total = (data?.tests || []).filter((t) => picked.has(t._id)).reduce((s, t) => s + t.price, 0);

  const toggle = (id) => setPicked((p) => {
    const n = new Set(p);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const place = async () => {
    if (!labId || picked.size === 0) return;
    setBusy(true); setError('');
    try {
      const { order } = await labApi.placeOrder({ labId, testIds: [...picked] });
      if (onPlaced) onPlaced(order);
      else navigate(`/labs/orders/${order._id}`);
    } catch (e) {
      setError(errMsg(e));
      setBusy(false);
    }
  };

  const backBtn = onBack && (
    <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-navy-900">
      <ArrowLeft size={16} /> Back to lab details
    </button>
  );

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        {backBtn}
        <p className={error ? 'text-danger' : 'text-gray-500'}>{error || 'Loading tests…'}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8">
      {backBtn}
      <h1 className="text-3xl font-bold text-navy-900">{data.lab.name}</h1>
      <p className="mt-1 text-gray-600">Review your tests, then place your order. You'll pay the lab when you give your sample.</p>

      <div className="relative mt-6">
        <Search size={18} className="absolute left-4 top-3.5 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tests" className={`${inputCls} pl-11`} />
      </div>

      {data.tests.length === 0 && <p className="mt-8 text-gray-500">This lab has no tests available right now.</p>}
      {data.tests.length > 0 && Object.keys(groups).length === 0 && (
        <p className="mt-8 text-gray-500">No tests match your search.</p>
      )}

      {Object.entries(groups).map(([cat, tests]) => (
        <section key={cat} className="mt-8">
          <h2 className="mb-3 font-semibold capitalize text-lab-700">{cat}</h2>
          <div className="space-y-3">
            {tests.map((t) => {
              const on = picked.has(t._id);
              return (
                <button
                  key={t._id}
                  onClick={() => toggle(t._id)}
                  aria-pressed={on}
                  className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${on ? 'border-lab-500 bg-lab-50' : 'border-gray-200 bg-white hover:border-lab-300'}`}
                >
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${on ? 'border-lab-600 bg-lab-600 text-white' : 'border-gray-300'}`}>
                    {on && <Check size={14} strokeWidth={3} />}
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold text-navy-900">{t.name}</span>
                    <span className="mt-1 flex flex-wrap gap-x-4 text-sm text-gray-500">
                      {t.sampleType && <span className="flex items-center gap-1 capitalize"><Droplet size={14} />{t.sampleType}</span>}
                      {t.turnaroundHours && <span className="flex items-center gap-1"><Clock size={14} />Results in {t.turnaroundHours}h</span>}
                    </span>
                  </span>
                  <span className="font-semibold text-navy-900">{naira(t.price)}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {/* sticky (not fixed) so it stays inside the dashboard and doesn't cover the sidebar */}
      <div className="sticky bottom-0 -mx-4 mt-8 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-sm text-gray-500">{picked.size} test{picked.size === 1 ? '' : 's'} selected</p>
            <p className="text-xl font-bold text-navy-900">{naira(total)}</p>
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
          <button onClick={place} disabled={!picked.size || busy} className="btn-primary disabled:opacity-50">
            {busy ? 'Placing order…' : 'Place order'}
          </button>
        </div>
      </div>
    </div>
  );
}