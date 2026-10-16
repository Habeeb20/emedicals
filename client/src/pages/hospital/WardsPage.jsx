import { useState } from 'react';
import { Plus } from 'lucide-react';
import api from '@/lib/api.js';
import {
  useApi, useAction, useFields, Modal, Field, Badge, StatusBadge, Spinner, Empty, ErrorNote, btn, inputCls, money,
} from './hospitalShared.jsx';

const WARD_TYPES = ['general', 'private', 'icu', 'maternity', 'pediatric', 'emergency'];

// Bed colours come from the status colours in colors.js
const BED_STYLE = {
  available: 'border-success bg-success-light text-success-dark',
  occupied: 'border-danger bg-danger-light text-danger-dark',
  maintenance: 'border-warning bg-warning-light text-warning-dark',
};

/* ---------------- Create or edit a ward ---------------- */
function WardForm({ ward, onClose }) {
  const [form, bind] = useFields({
    name: ward?.name || '',
    type: ward?.type || 'general',
    dailyRate: ward?.dailyRate ?? 0,
    bedCount: 0,
  });
  const [run, busy] = useAction();

  const submit = async (event) => {
    event.preventDefault();
    const task = ward ? () => api.patch(`/hospital/wards/${ward._id}`, form) : () => api.post('/hospital/wards', form);
    if (await run(task, ward ? 'Ward updated' : 'Ward created')) onClose();
  };

  return (
    <Modal title={ward ? 'Edit ward' : 'New ward'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Ward name"><input className={inputCls} required {...bind('name')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <select className={inputCls} {...bind('type')}>{WARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          </Field>
          <Field label="Bed charge per day (₦)"><input className={inputCls} type="number" min="0" {...bind('dailyRate')} /></Field>
        </div>
        {!ward && <Field label="Number of beds"><input className={inputCls} type="number" min="0" max="100" {...bind('bedCount')} /></Field>}
        <button className={btn.primary} disabled={busy}>{busy ? 'Saving…' : 'Save ward'}</button>
      </form>
    </Modal>
  );
}

function AddBedsModal({ ward, onClose }) {
  const [count, setCount] = useState(1);
  const [run, busy] = useAction();
  const submit = async (event) => {
    event.preventDefault();
    if (await run(() => api.post(`/hospital/wards/${ward._id}/beds`, { count }), 'Beds added')) onClose();
  };
  return (
    <Modal title={`Add beds to ${ward.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="How many beds?"><input className={inputCls} type="number" min="1" max="50" value={count} onChange={(e) => setCount(e.target.value)} /></Field>
        <button className={btn.primary} disabled={busy}>Add beds</button>
      </form>
    </Modal>
  );
}

function BedModal({ bed, onClose }) {
  const [run, busy] = useAction();
  const act = async (task, message) => { if (await run(task, message)) onClose(); };
  return (
    <Modal title={`Bed ${bed.label}`} onClose={onClose}>
      <div className="space-y-4">
        <StatusBadge value={bed.status} />
        {bed.status === 'occupied' && (
          <p className="text-sm text-navy-800">{bed.admission?.patient?.fullName ?? 'A patient'} is in this bed. Move or discharge them from Admissions first.</p>
        )}
        {bed.status === 'available' && (
          <div className="flex flex-wrap gap-3">
            <button className={btn.ghost} disabled={busy} onClick={() => act(() => api.patch(`/hospital/beds/${bed._id}`, { status: 'maintenance' }), 'Bed marked for maintenance')}>Mark for maintenance</button>
            <button className={btn.danger} disabled={busy} onClick={() => act(() => api.delete(`/hospital/beds/${bed._id}`), 'Bed removed')}>Remove bed</button>
          </div>
        )}
        {bed.status === 'maintenance' && (
          <button className={btn.primary} disabled={busy} onClick={() => act(() => api.patch(`/hospital/beds/${bed._id}`, { status: 'available' }), 'Bed is available')}>Mark available</button>
        )}
      </div>
    </Modal>
  );
}

/* ---------------- The page ---------------- */
export default function WardsPage() {
  const { data: wards, loading, error } = useApi('/hospital/wards', { live: ['hospital:bed'] });
  const [editing, setEditing] = useState(null); // 'new' or a ward
  const [addingTo, setAddingTo] = useState(null);
  const [bed, setBed] = useState(null);
  const [run] = useAction();

  const removeWard = async (ward) => {
    if (window.confirm(`Delete ${ward.name} and all its beds?`)) await run(() => api.delete(`/hospital/wards/${ward._id}`), 'Ward deleted');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge tone="success">Available</Badge><Badge tone="danger">Occupied</Badge><Badge tone="warning">Maintenance</Badge>
        </div>
        <button className={btn.primary} onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> New ward</button>
      </div>

      <ErrorNote message={error} />
      {loading && <Spinner />}
      {!loading && wards?.length === 0 && <Empty title="No wards yet" hint="Create a ward and its beds so patients can be admitted." />}

      <div className="space-y-4">
        {wards?.map((ward) => {
          const usable = ward.beds.filter((b) => b.status !== 'maintenance').length;
          const taken = ward.beds.filter((b) => b.status === 'occupied').length;
          return (
            <section key={ward._id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-navy-900">{ward.name}</h3>
                  <p className="text-sm text-gray-600">{ward.type} · {money(ward.dailyRate)} per day · {taken} of {usable} beds in use</p>
                </div>
                <div className="flex gap-2">
                  <button className={`${btn.ghost} ${btn.small}`} onClick={() => setAddingTo(ward)}>Add beds</button>
                  <button className={`${btn.ghost} ${btn.small}`} onClick={() => setEditing(ward)}>Edit</button>
                  <button className={`${btn.ghost} ${btn.small}`} onClick={() => removeWard(ward)}>Delete</button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
                {ward.beds.map((b) => (
                  <button
                    key={b._id}
                    onClick={() => setBed(b)}
                    title={b.admission?.patient?.fullName}
                    className={`rounded-lg border px-2 py-2 text-center text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${BED_STYLE[b.status]}`}
                  >
                    {b.label}
                    {b.status === 'occupied' && b.admission?.patient && <span className="mt-0.5 block truncate font-normal">{b.admission.patient.fullName}</span>}
                  </button>
                ))}
                {ward.beds.length === 0 && <p className="col-span-full text-sm text-gray-500">No beds in this ward yet.</p>}
              </div>
            </section>
          );
        })}
      </div>

      {editing && <WardForm ward={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {addingTo && <AddBedsModal ward={addingTo} onClose={() => setAddingTo(null)} />}
      {bed && <BedModal bed={bed} onClose={() => setBed(null)} />}
    </div>
  );
}