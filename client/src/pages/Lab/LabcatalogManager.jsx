import { useEffect, useState } from 'react';
import { Plus, Pencil, X } from 'lucide-react';
import { labApi, errMsg, naira, inputCls } from './labApi';

const EMPTY = { name: '', code: '', category: '', price: '', sampleType: '', turnaroundHours: '', referenceRange: '' };

export default function LabCatalogManager() {
  const [tests, setTests] = useState(null);
  const [form, setForm] = useState(null); // null = closed, object = open
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => labApi.staffTests().then((d) => setTests(d.tests)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const openForm = (t) => { setError(''); setEditId(t?._id || null); setForm(t ? { ...EMPTY, ...t } : EMPTY); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    const body = { ...form, price: Number(form.price), turnaroundHours: form.turnaroundHours ? Number(form.turnaroundHours) : undefined };
    try {
      editId ? await labApi.updateTest(editId, body) : await labApi.createTest(body);
      setForm(null); await load();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  const toggle = (t) => labApi.updateTest(t._id, { isActive: !t.isActive }).then(load);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Test catalog</h1>
          <p className="mt-1 text-gray-600">The tests patients can order from your lab.</p>
        </div>
        <button onClick={() => openForm()} className="btn-primary inline-flex items-center gap-2"><Plus size={18} />Add test</button>
      </div>

      {error && !form && <p className="mt-4 text-danger">{error}</p>}
      {!tests ? <p className="mt-8 text-gray-500">Loading…</p> : tests.length === 0 ? (
        <p className="mt-8 text-gray-500">Your catalog is empty. Add your first test so patients can order it.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr><th className="p-4">Test</th><th className="p-4">Category</th><th className="p-4">Sample</th><th className="p-4">Price</th><th className="p-4">Status</th><th className="p-4" /></tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t._id} className="border-t border-gray-100">
                  <td className="p-4 font-medium text-navy-900">{t.name}{t.code && <span className="ml-2 text-xs text-gray-400">{t.code}</span>}</td>
                  <td className="p-4 capitalize text-gray-600">{t.category || '-'}</td>
                  <td className="p-4 capitalize text-gray-600">{t.sampleType || '-'}</td>
                  <td className="p-4 text-gray-900">{naira(t.price)}</td>
                  <td className="p-4">
                    <button onClick={() => toggle(t)} className={`rounded-full px-3 py-1 text-xs font-semibold ${t.isActive ? 'bg-success-light text-success-dark' : 'bg-gray-100 text-gray-600'}`}>
                      {t.isActive ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                  <td className="p-4 text-right"><button onClick={() => openForm(t)} aria-label={`Edit ${t.name}`} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><Pencil size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-navy-950/50 sm:place-items-center" onClick={() => setForm(null)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 sm:max-w-lg sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-navy-900">{editId ? 'Edit test' : 'Add test'}</h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Close"><X size={22} /></button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <input required placeholder="Test name" value={form.name} onChange={set('name')} className={`${inputCls} sm:col-span-2`} />
              <input placeholder="Code (optional)" value={form.code} onChange={set('code')} className={inputCls} />
              <input placeholder="Category, e.g. hematology" value={form.category} onChange={set('category')} className={inputCls} />
              <input required type="number" min="0" placeholder="Price (₦)" value={form.price} onChange={set('price')} className={inputCls} />
              <input placeholder="Sample type, e.g. blood" value={form.sampleType} onChange={set('sampleType')} className={inputCls} />
              <input type="number" min="0" placeholder="Turnaround (hours)" value={form.turnaroundHours} onChange={set('turnaroundHours')} className={inputCls} />
              <input placeholder="Reference range" value={form.referenceRange} onChange={set('referenceRange')} className={inputCls} />
            </div>
            {error && <p className="mt-4 text-sm text-danger">{error}</p>}
            <button disabled={busy} className="btn-primary mt-6 w-full disabled:opacity-50">{busy ? 'Saving…' : 'Save test'}</button>
          </form>
        </div>
      )}
    </div>
  );
}