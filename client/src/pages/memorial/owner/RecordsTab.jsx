import { useCallback, useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { memorialApi, errMsg } from '../memorialApi';
import { EmptyState, Field, Modal, Spinner, StatusBadge, btnGhost, btnPrimary, cx, fmtDate, inputCls, naira, toast, useDebounce } from '../ui';

const STATUSES = ['admitted', 'embalmed', 'released', 'buried'];

// The mortuary register: every body in care, online bookings and walk-ins together.
export default function RecordsTab() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems((await memorialApi.records({ status, q })).items); } catch (e) { toast(errMsg(e), 'error'); } finally { setLoading(false); }
  }, [status, q]);
  useEffect(() => { load(); }, [load]);

  const setRecordStatus = async (r, next) => {
    try { await memorialApi.updateRecord(r._id, { status: next }); load(); } catch (e) { toast(errMsg(e), 'error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-memorial-400" /><input className={cx(inputCls, 'pl-10')} placeholder="Search name, tag or next of kin" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className={cx(inputCls, '!w-auto')} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
        <button className={btnPrimary} onClick={() => setAdding(true)}><Plus size={16} /> Walk-in admission</button>
      </div>

      {loading ? <Spinner className="mx-auto my-12" /> : items.length === 0 ? <EmptyState title="The register is empty" hint="Bookings you admit, and walk-in admissions you add, are kept here." /> : (
        <div className="overflow-x-auto rounded-3xl border border-memorial-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-memorial-50 text-left text-xs text-memorial-500"><tr>{['Tag', 'Name', 'Admitted', 'Storage', 'Next of kin', 'Charges', 'Status'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-memorial-100">
              {items.map((r) => (
                <tr key={r._id}>
                  <td className="px-4 py-3 font-mono text-xs">{r.tagNumber}</td>
                  <td className="px-4 py-3 font-medium text-navy-900">{r.deceased.fullName}<p className="text-xs font-normal text-memorial-500">Died {fmtDate(r.dateOfDeath)}</p></td>
                  <td className="px-4 py-3 text-memorial-600">{fmtDate(r.admittedAt)}</td>
                  <td className="px-4 py-3 text-memorial-600">{[r.storage?.unit, r.storage?.slot].filter(Boolean).join(' / ') || '–'}</td>
                  <td className="px-4 py-3 text-memorial-600">{r.nextOfKin?.name}<p className="text-xs">{r.nextOfKin?.phone}</p></td>
                  <td className="px-4 py-3">{naira(r.charges || 0)} <StatusBadge status={r.paymentStatus} /></td>
                  <td className="px-4 py-3">
                    <select value={r.status} onChange={(e) => setRecordStatus(r, e.target.value)} className="rounded-lg border border-memorial-200 bg-white px-2 py-1 text-xs capitalize" aria-label="Status">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {adding && <WalkIn onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </div>
  );
}

function WalkIn({ onClose, onSaved }) {
  const [f, setF] = useState({ fullName: '', gender: '', age: '', dateOfDeath: '', causeOfDeath: '', kinName: '', kinPhone: '', kinRel: '', unit: '', slot: '', charges: '' });
  const [busy, setBusy] = useState(false);
  const s = (k) => ({ value: f[k], onChange: (e) => setF({ ...f, [k]: e.target.value }), className: inputCls });
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await memorialApi.createRecord({
        deceased: { fullName: f.fullName, gender: f.gender || undefined, age: f.age || undefined },
        dateOfDeath: f.dateOfDeath, causeOfDeath: f.causeOfDeath,
        nextOfKin: { name: f.kinName, phone: f.kinPhone, relationship: f.kinRel },
        storage: { unit: f.unit, slot: f.slot }, charges: Number(f.charges) || 0,
      });
      toast('Admission recorded');
      onSaved();
    } catch (err) { toast(errMsg(err), 'error'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Walk-in admission" wide>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" className="sm:col-span-2"><input required {...s('fullName')} /></Field>
        <Field label="Gender"><select {...s('gender')}><option value="">Not stated</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></Field>
        <Field label="Age"><input type="number" min="0" {...s('age')} /></Field>
        <Field label="Date of death"><input type="date" required {...s('dateOfDeath')} /></Field>
        <Field label="Cause of death"><input {...s('causeOfDeath')} /></Field>
        <Field label="Next of kin"><input {...s('kinName')} /></Field>
        <Field label="Next of kin phone"><input type="tel" {...s('kinPhone')} /></Field>
        <Field label="Relationship"><input {...s('kinRel')} /></Field>
        <Field label="Charges (₦)"><input type="number" min="0" {...s('charges')} /></Field>
        <Field label="Storage unit"><input {...s('unit')} /></Field>
        <Field label="Slot"><input {...s('slot')} /></Field>
        <div className="flex gap-2 sm:col-span-2"><button className={btnPrimary} disabled={busy}>{busy ? 'Saving' : 'Add to register'}</button><button type="button" className={btnGhost} onClick={onClose}>Cancel</button></div>
      </form>
    </Modal>
  );
}
