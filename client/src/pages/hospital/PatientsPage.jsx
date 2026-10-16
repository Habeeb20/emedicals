import { useState } from 'react';
import { Plus } from 'lucide-react';
import api from '@/lib/api.js';
import {
  useApi, useAction, useFields, useDebounced, Modal, Field, Badge, StatusBadge, Spinner, Empty, ErrorNote,
  btn, inputCls, ageOf, fmtDate, money, balanceOf,
} from './hospitalShared.jsx';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENOTYPES = ['AA', 'AS', 'SS', 'AC', 'SC'];

/* ---------------- Register a new patient ---------------- */
function RegisterModal({ onClose, onDone }) {
  const [form, bind] = useFields({ gender: '' });
  const [run, busy] = useAction();

  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      nextOfKin: { name: form.kinName, phone: form.kinPhone, relationship: form.kinRelation },
    };
    if (await run(() => api.post('/hospital/patients', payload), 'Patient registered')) onDone();
  };

  return (
    <Modal title="Register patient" onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name"><input className={inputCls} required {...bind('fullName')} /></Field>
          <Field label="Gender">
            <select className={inputCls} required {...bind('gender')}>
              <option value="">Choose</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Date of birth"><input className={inputCls} type="date" max={new Date().toISOString().slice(0, 10)} {...bind('dateOfBirth')} /></Field>
          <Field label="Phone"><input className={inputCls} type="tel" {...bind('phone')} /></Field>
          <Field label="Email" hint="If they already have an eMedicals account, their records link to it automatically.">
            <input className={inputCls} type="email" {...bind('email')} />
          </Field>
          <Field label="Address"><input className={inputCls} {...bind('address')} /></Field>
          <Field label="Blood group">
            <select className={inputCls} {...bind('bloodGroup')}>
              <option value="">Unknown</option>
              {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Genotype">
            <select className={inputCls} {...bind('genotype')}>
              <option value="">Unknown</option>
              {GENOTYPES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Allergies" hint="Separate with commas"><input className={inputCls} placeholder="Penicillin, peanuts" {...bind('allergies')} /></Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Next of kin"><input className={inputCls} {...bind('kinName')} /></Field>
          <Field label="Kin phone"><input className={inputCls} type="tel" {...bind('kinPhone')} /></Field>
          <Field label="Relationship"><input className={inputCls} {...bind('kinRelation')} /></Field>
        </div>
        <button className={btn.primary} disabled={busy}>{busy ? 'Saving…' : 'Register patient'}</button>
      </form>
    </Modal>
  );
}

/* ---------------- Put a patient in the queue ---------------- */
function StartVisitModal({ patient, onClose, onDone }) {
  const [form, bind] = useFields({ complaint: '', priority: 'normal', type: 'opd' });
  const [run, busy] = useAction();

  const submit = async (event) => {
    event.preventDefault();
    if (await run(() => api.post('/hospital/visits', { patientId: patient._id, ...form }), 'Patient added to the queue')) onDone();
  };

  return (
    <Modal title={`New visit: ${patient.fullName}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Reason for visit"><textarea className={inputCls} rows={3} required {...bind('complaint')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority">
            <select className={inputCls} {...bind('priority')}>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
              <option value="emergency">Emergency</option>
            </select>
          </Field>
          <Field label="Visit type">
            <select className={inputCls} {...bind('type')}>
              <option value="opd">Outpatient</option>
              <option value="follow_up">Follow-up</option>
              <option value="emergency">Emergency</option>
            </select>
          </Field>
        </div>
        <button className={btn.primary} disabled={busy}>{busy ? 'Adding…' : 'Add to queue'}</button>
      </form>
    </Modal>
  );
}

/* ---------------- One patient's file ---------------- */
function PatientDetail({ id, onClose, onNavigate }) {
  const { data, loading, error } = useApi(`/hospital/patients/${id}`, {
    live: ['hospital:visit', 'hospital:admission', 'hospital:invoice', 'hospital:patient'],
  });
  const [starting, setStarting] = useState(false);

  return (
    <Modal title="Patient file" onClose={onClose} wide>
      {loading && <Spinner />}
      <ErrorNote message={error} />
      {data && (() => {
        const { patient, visits, admissions, invoices } = data;
        const age = ageOf(patient.dateOfBirth);
        return (
          <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-navy-900">{patient.fullName}</h3>
                <p className="text-sm text-gray-600">
                  {patient.mrn} · {patient.gender}{age !== null ? ` · ${age} yrs` : ''}{patient.phone ? ` · ${patient.phone}` : ''}
                </p>
              </div>
              <button className={btn.primary} onClick={() => setStarting(true)}>Start visit</button>
            </div>

            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div><dt className="text-xs text-gray-500">Blood group</dt><dd className="text-sm font-semibold">{patient.bloodGroup || '—'}</dd></div>
              <div><dt className="text-xs text-gray-500">Genotype</dt><dd className="text-sm font-semibold">{patient.genotype || '—'}</dd></div>
              <div><dt className="text-xs text-gray-500">Address</dt><dd className="text-sm font-semibold">{patient.address || '—'}</dd></div>
              <div><dt className="text-xs text-gray-500">Next of kin</dt><dd className="text-sm font-semibold">{patient.nextOfKin?.name || '—'}</dd></div>
            </dl>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-navy-900">Allergies</h4>
              {patient.allergies?.length
                ? <div className="flex flex-wrap gap-2">{patient.allergies.map((a) => <Badge key={a} tone="danger">{a}</Badge>)}</div>
                : <p className="text-sm text-gray-500">None recorded</p>}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-navy-900">Recent visits</h4>
              {visits.length === 0 && <p className="text-sm text-gray-500">No visits yet</p>}
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {visits.map((v) => (
                  <li key={v._id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-navy-900">{v.diagnosis || v.complaint}</p>
                      <p className="text-xs text-gray-500">{fmtDate(v.createdAt)}{v.doctor ? ` · Dr ${v.doctor.fullName}` : ''}</p>
                    </div>
                    <StatusBadge value={v.status} />
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-navy-900">Admissions</h4>
                {admissions.length === 0 && <p className="text-sm text-gray-500">None</p>}
                <ul className="space-y-2">
                  {admissions.map((a) => (
                    <li key={a._id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                      <span className="text-sm">{a.ward?.name} · {fmtDate(a.admittedAt)}</span>
                      <StatusBadge value={a.status} />
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-navy-900">Bills</h4>
                {invoices.length === 0 && <p className="text-sm text-gray-500">None</p>}
                <ul className="space-y-2">
                  {invoices.map((inv) => (
                    <li key={inv._id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                      <span className="text-sm">{inv.invoiceNumber} · {money(balanceOf(inv))} due</span>
                      <StatusBadge value={inv.status} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {starting && (
              <StartVisitModal
                patient={patient}
                onClose={() => setStarting(false)}
                onDone={() => { setStarting(false); onClose(); onNavigate('visits'); }}
              />
            )}
          </div>
        );
      })()}
    </Modal>
  );
}

/* ---------------- The page ---------------- */
export default function PatientsPage({ onNavigate }) {
  const [q, setQ] = useState('');
  const search = useDebounced(q);
  const { data: patients, loading, error, reload } = useApi('/hospital/patients', { params: { q: search }, live: ['hospital:patient'] });
  const [registering, setRegistering] = useState(false);
  const [openId, setOpenId] = useState(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          className={`${inputCls} max-w-sm flex-1`}
          placeholder="Search by name, MRN or phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search patients"
        />
        <button className={`${btn.primary} ml-auto`} onClick={() => setRegistering(true)}>
          <Plus className="h-4 w-4" /> Register patient
        </button>
      </div>

      <ErrorNote message={error} />
      {loading && <Spinner />}
      {!loading && patients?.length === 0 && (
        <Empty title={search ? 'No patient matches that search' : 'No patients yet'} hint="Register a patient to give them a medical record number." />
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {patients?.map((p) => (
          <li key={p._id}>
            <button onClick={() => setOpenId(p._id)} className="card w-full p-4 text-left hover:border-primary-300">
              <p className="font-semibold text-navy-900">{p.fullName}</p>
              <p className="mt-0.5 text-sm text-gray-600">
                {p.mrn} · {p.gender}{ageOf(p.dateOfBirth) !== null ? ` · ${ageOf(p.dateOfBirth)} yrs` : ''}
              </p>
              {p.phone && <p className="mt-1 text-xs text-gray-500">{p.phone}</p>}
              {p.allergies?.length > 0 && <div className="mt-2"><Badge tone="danger">Allergies: {p.allergies.length}</Badge></div>}
            </button>
          </li>
        ))}
      </ul>

      {registering && <RegisterModal onClose={() => setRegistering(false)} onDone={() => { setRegistering(false); reload(); }} />}
      {openId && <PatientDetail id={openId} onClose={() => setOpenId(null)} onNavigate={onNavigate} />}
    </div>
  );
}