import { useEffect, useState } from 'react';
import { Plus, Pencil, X } from 'lucide-react';
import { labApi, errMsg, naira, inputCls } from './labApi';
import {
  TEST_PRESETS, CATEGORIES, SAMPLE_TYPES, TURNAROUNDS, PRICES, RANGES,
} from './labPresets';

const EMPTY = { name: '', code: '', category: '', price: '', sampleType: '', turnaroundHours: '', referenceRange: '' };
const OTHER = '__other';

// Dropdown with an "Other" option that reveals a text input
function SelectField({ value, onChange, options, placeholder, type = 'text', required, className = '' }) {
  const [forceCustom, setForceCustom] = useState(false);
  const str = value === undefined || value === null ? '' : String(value);
  const inList = options.some((o) => String(o.value) === str);

  // if the value later matches a listed option (e.g. preset autofill), go back to the dropdown
  useEffect(() => { if (inList) setForceCustom(false); }, [inList]);

  const showInput = forceCustom || (str !== '' && !inList);

  const handleSelect = (e) => {
    const v = e.target.value;
    if (v === OTHER) { setForceCustom(true); onChange(''); }
    else { setForceCustom(false); onChange(v); }
  };

  return (
    <div className={className}>
      <select required={required} value={showInput ? OTHER : str} onChange={handleSelect} className={`${inputCls} capitalize`}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        <option value={OTHER}>Other (type your own)</option>
      </select>
      {showInput && (
        <input
          required={required}
          type={type}
          min={type === 'number' ? 0 : undefined}
          placeholder={`Enter ${placeholder.toLowerCase()}`}
          value={str}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} mt-2`}
        />
      )}
    </div>
  );
}

const plain = (arr) => arr.map((v) => ({ value: v, label: v }));

const categoryOpts = plain(CATEGORIES);
const sampleOpts = plain(SAMPLE_TYPES);
const rangeOpts = plain(RANGES);
const turnaroundOpts = TURNAROUNDS.map((h) => ({
  value: String(h),
  label: h < 24 ? `${h} hour${h > 1 ? 's' : ''}` : `${h / 24} day${h / 24 > 1 ? 's' : ''} (${h} hrs)`,
}));
const priceOpts = PRICES.map((p) => ({ value: String(p), label: naira(p) }));
const nameOpts = TEST_PRESETS.map((t) => ({ value: t.name, label: t.name, category: t.category }));

export default function LabCatalogManager() {
  const [tests, setTests] = useState(null);
  const [form, setForm] = useState(null); // null = closed, object = open
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => labApi.staffTests().then((d) => setTests(d.tests)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);

  const openForm = (t) => { setError(''); setEditId(t?._id || null); setForm(t ? { ...EMPTY, ...t } : EMPTY); };
  const setField = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  // choosing a known test fills in the other fields
  const pickName = (name) => {
    const p = TEST_PRESETS.find((t) => t.name === name);
    setForm((f) => p
      ? { ...f, name: p.name, code: p.code, category: p.category, sampleType: p.sampleType,
          turnaroundHours: String(p.turnaroundHours), referenceRange: p.referenceRange }
      : { ...f, name });
  };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    const body = { ...form, price: Number(form.price), turnaroundHours: form.turnaroundHours ? Number(form.turnaroundHours) : undefined };
    try {
      editId ? await labApi.updateTest(editId, body) : await labApi.createTest(body);
      setForm(null); await load();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  const toggle = (t) =>
    labApi.updateTest(t._id, { isActive: !t.isActive }).then(load).catch((e) => setError(errMsg(e)));

  // code options follow the selected test, otherwise list all codes
  const codeOpts = plain([...new Set(TEST_PRESETS.map((t) => t.code))]);

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
              <SelectField required className="sm:col-span-2" placeholder="Test name"
                value={form.name} onChange={pickName} options={nameOpts} />
              <SelectField placeholder="Code" value={form.code} onChange={setField('code')} options={codeOpts} />
              <SelectField placeholder="Category" value={form.category} onChange={setField('category')} options={categoryOpts} />
              <SelectField required type="number" placeholder="Price (₦)" value={form.price} onChange={setField('price')} options={priceOpts} />
              <SelectField placeholder="Sample type" value={form.sampleType} onChange={setField('sampleType')} options={sampleOpts} />
              <SelectField type="number" placeholder="Turnaround time" value={form.turnaroundHours} onChange={setField('turnaroundHours')} options={turnaroundOpts} />
              <SelectField placeholder="Reference range" value={form.referenceRange} onChange={setField('referenceRange')} options={rangeOpts} />
            </div>
            {error && <p className="mt-4 text-sm text-danger">{error}</p>}
            <button disabled={busy} className="btn-primary mt-6 w-full disabled:opacity-50">{busy ? 'Saving…' : 'Save test'}</button>
          </form>
        </div>
      )}
    </div>
  );
}