import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Clock, Droplet, Check } from 'lucide-react';
import { labApi, errMsg, naira, inputCls } from './labApi';

export default function LabBooking() {
  const { labId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    labApi.labTests(labId).then(setData).catch((e) => setError(errMsg(e)));
  }, [labId]);

  const groups = useMemo(() => {
    const list = (data?.tests || []).filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
    return list.reduce((acc, t) => ((acc[t.category || 'Other tests'] ||= []).push(t), acc), {});
  }, [data, q]);

  const total = (data?.tests || []).filter((t) => picked.has(t._id)).reduce((s, t) => s + t.price, 0);
  const toggle = (id) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const place = async () => {
    setBusy(true); setError('');
    try {
      const { order } = await labApi.placeOrder({ labId, testIds: [...picked] });
      navigate(`/labs/orders/${order._id}`);
    } catch (e) { setError(errMsg(e)); setBusy(false); }
  };

  if (!data) return <p className="p-8 text-gray-500">{error || 'Loading tests…'}</p>;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-32 pt-8">
      <h1 className="text-3xl font-bold text-navy-900">{data.lab.name}</h1>
      <p className="mt-1 text-gray-600">Select the tests you need. You'll pay the lab when you give your sample.</p>

      <div className="relative mt-6">
        <Search size={18} className="absolute left-4 top-3.5 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tests" className={`${inputCls} pl-11`} />
      </div>

      {Object.keys(groups).length === 0 && <p className="mt-8 text-gray-500">No tests match your search.</p>}
      {Object.entries(groups).map(([cat, tests]) => (
        <section key={cat} className="mt-8">
          <h2 className="mb-3 font-semibold capitalize text-lab-700">{cat}</h2>
          <div className="space-y-3">
            {tests.map((t) => {
              const on = picked.has(t._id);
              return (
                <button key={t._id} onClick={() => toggle(t._id)} aria-pressed={on}
                  className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${on ? 'border-lab-500 bg-lab-50' : 'border-gray-200 bg-white hover:border-lab-300'}`}>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${on ? 'border-lab-600 bg-lab-600 text-white' : 'border-gray-300'}`}>
                    {on && <Check size={14} strokeWidth={3} />}
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold text-navy-900">{t.name}</span>
                    <span className="mt-1 flex flex-wrap gap-x-4 text-sm text-gray-500">
                      {t.sampleType && <span className="flex items-center gap-1"><Droplet size={14} />{t.sampleType}</span>}
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

      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
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