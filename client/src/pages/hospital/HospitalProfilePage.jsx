import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Mail, Clock, ExternalLink } from 'lucide-react';
import api from '@/lib/api.js';
import { useAuth } from '@/context/AuthContext.jsx';
import {
  useApi, useAction, useFields, useIdParam, Modal, Field, Badge, StatusBadge, Spinner, ErrorNote,
  btn, inputCls, money, fmtDate,
} from './hospitalShared.jsx';
import { placeOf } from './HospitalDirectoryPage.jsx';
import HospitalMap from './HospitalMap.jsx';

const PAYMENT_MODES = { arrival: 'Pay when you arrive', booking: 'Pay when you book', deposit: 'Deposit to book' };
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENOTYPES = ['AA', 'AS', 'SS', 'AC', 'SC'];

// function Detail({ icon: Icon, label, children }) {
//   return (
//     <div className="flex gap-3">
//       <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
//       <div>
//         <dt className="text-xs text-gray-500">{label}</dt>
//         <dd className="text-sm text-navy-900">{children}</dd>
//       </div>
//     </div>
//   );
// }

function Detail({ icon: Icon, label, children }) {
  return (
    <div className="flex min-w-0 gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
      <div className="min-w-0">
        <dt className="text-xs text-gray-500">{label}</dt>
        <dd className="break-words text-sm text-navy-900">{children}</dd>
      </div>
    </div>
  );
}

/* ---------------- Patient registers at this hospital ---------------- */
function RegisterModal({ hospital, onClose, onDone }) {
  const [form, bind] = useFields({ gender: '' });
  const [run, busy] = useAction();

  const submit = async (event) => {
    event.preventDefault();
    const payload = { ...form, nextOfKin: { name: form.kinName, phone: form.kinPhone, relationship: form.kinRelation } };
    if (await run(() => api.post(`/hospital/directory/${hospital._id}/register`, payload), `You are now registered at ${hospital.name}`)) onDone();
  };

  return (
    <Modal title={`Register at ${hospital.name}`} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-600">
          The hospital gets a medical file for you under your account name and email. Only this hospital's staff can see it.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
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
          <Field label="Home address"><input className={inputCls} {...bind('address')} /></Field>
          <Field label="Blood group">
            <select className={inputCls} {...bind('bloodGroup')}><option value="">Unknown</option>{BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}</select>
          </Field>
          <Field label="Genotype">
            <select className={inputCls} {...bind('genotype')}><option value="">Unknown</option>{GENOTYPES.map((g) => <option key={g}>{g}</option>)}</select>
          </Field>
        </div>
        <Field label="Allergies" hint="Separate with commas"><input className={inputCls} {...bind('allergies')} /></Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Next of kin"><input className={inputCls} {...bind('kinName')} /></Field>
          <Field label="Kin phone"><input className={inputCls} type="tel" {...bind('kinPhone')} /></Field>
          <Field label="Relationship"><input className={inputCls} {...bind('kinRelation')} /></Field>
        </div>
        <button className={btn.primary} disabled={busy}>{busy ? 'Registering…' : 'Register'}</button>
      </form>
    </Modal>
  );
}

/* ---------------- Patient asks to be seen ---------------- */
function RequestVisitModal({ hospital, onClose, onDone }) {
  const [complaint, setComplaint] = useState('');
  const [run, busy] = useAction();

  const submit = async (event) => {
    event.preventDefault();
    if (await run(() => api.post(`/hospital/directory/${hospital._id}/request-visit`, { complaint }), 'You are in the queue')) onDone();
  };

  return (
    <Modal title="Request a visit" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-600">This puts you in the hospital's waiting queue. Staff see it straight away. For an emergency, go to the hospital or call them.</p>
        <Field label="What are you coming for?"><textarea className={inputCls} rows={3} required value={complaint} onChange={(e) => setComplaint(e.target.value)} /></Field>
        <button className={btn.primary} disabled={busy}>{busy ? 'Sending…' : 'Join the queue'}</button>
      </form>
    </Modal>
  );
}

/* ---------------- The patient's box on the right ---------------- */
function PatientPanel({ hospital }) {
  const { data: status, loading, reload } = useApi(`/hospital/directory/${hospital._id}/me`, {
    live: ['hospital:visit', 'hospital:admission', 'hospital:patient'], // updates the moment the hospital changes something
  });
  const [modal, setModal] = useState(null); // 'register' | 'visit'
  const [run, busy] = useAction();

  if (loading) return <Spinner />;

  const cancel = (visit) => run(() => api.post(`/hospital/my-visits/${visit._id}/cancel`), 'Request cancelled');

  return (
    <div className="space-y-4">
      {!status.registered ? (
        <>
          <p className="text-sm text-gray-600">Register once to be seen here, request visits, and keep your records and bills in one place.</p>
          <button className={`${btn.primary} w-full`} onClick={() => setModal('register')}>Register with this hospital</button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600">You are registered here. Your medical record number is <span className="font-semibold text-navy-900">{status.mrn}</span>.</p>

          {status.admission && (
            <div className="rounded-lg bg-primary-50 p-3 text-sm text-primary-700">
              You are admitted: {status.admission.ward?.name}, bed {status.admission.bed?.label}.
            </div>
          )}

          {status.openVisit ? (
            <div className="space-y-2 rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-navy-900">{status.openVisit.visitNumber}</p>
                <StatusBadge value={status.openVisit.status} />
              </div>
              <p className="text-sm text-gray-600">{status.openVisit.complaint}</p>
              {status.queuePosition && <p className="text-sm text-navy-800">Your place in the queue: <span className="font-semibold">{status.queuePosition}</span></p>}
              {status.openVisit.status === 'in_consultation' && <p className="text-sm text-success-dark">The doctor is seeing you now.</p>}
              {status.openVisit.source === 'patient' && status.openVisit.status === 'waiting' && (
                <button className={`${btn.ghost} ${btn.small}`} disabled={busy} onClick={() => cancel(status.openVisit)}>Cancel my request</button>
              )}
            </div>
          ) : (
            !status.admission && <button className={`${btn.primary} w-full`} onClick={() => setModal('visit')}>Request a visit</button>
          )}
        </>
      )}

      {modal === 'register' && <RegisterModal hospital={hospital} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
      {modal === 'visit' && <RequestVisitModal hospital={hospital} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
    </div>
  );
}

/* ---------------- The page ---------------- */
export default function HospitalProfilePage({ onNavigate }) {
  const id = useIdParam();
  const navigate = useNavigate();
  const { user } = useAuth() ?? {};
  const { data: hospital, loading, error } = useApi(`/hospital/directory/${id}`, { enabled: !!id });

  const back = () => (onNavigate ? onNavigate('find-hospital') : navigate('/hospitals'));

  if (loading) return <Spinner />;
  if (error || !hospital) return <div className="space-y-4"><ErrorNote message={error || 'Hospital not found'} /><button className={btn.ghost} onClick={back}>Back to hospitals</button></div>;

  const { address = {}, staffCounts = {}, doctors = [] } = hospital;
  const mapsUrl = hospital.coordinates?.lat != null ? `https://www.google.com/maps?q=${hospital.coordinates.lat},${hospital.coordinates.lng}` : null;

  return (
    <div className="space-y-6">
      <button onClick={back} className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> All hospitals
      </button>

      <header className="card flex flex-wrap items-center gap-4 p-5">
        {hospital.logo?.url ? (
          <img src={hospital.logo.url} alt="" className="h-16 w-16 rounded-xl object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-50 text-2xl font-semibold text-primary-700">{hospital.name.charAt(0).toUpperCase()}</span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-navy-900">{hospital.name}</h1>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge tone="primary">{hospital.type}</Badge>
            <Badge tone="success">Verified</Badge>
            {hospital.is24Hours && <Badge tone="info">Open 24 hours</Badge>}
            {hospital.offersDelivery && <Badge tone="neutral">Delivers medicines</Badge>}
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {hospital.about && (
            <section className="card p-5">
              <h2 className="mb-2 text-sm font-semibold text-navy-900">About</h2>
              <p className="whitespace-pre-wrap text-sm text-navy-800">{hospital.about}</p>
            </section>
          )}

          <section className="card p-5">
            <h2 className="mb-4 text-sm font-semibold text-navy-900">Contact and location</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail icon={MapPin} label="Address">
                {placeOf(address) || '—'}{address.country ? `, ${address.country}` : ''}
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline">
                    Open in maps <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </Detail>
              <Detail icon={Phone} label="Phone">{hospital.phone ? <a className="text-primary-700 hover:underline" href={`tel:${hospital.phone}`}>{hospital.phone}</a> : '—'}</Detail>
              <Detail icon={Mail} label="Email">{hospital.email ? <a className="text-primary-700 hover:underline" href={`mailto:${hospital.email}`}>{hospital.email}</a> : '—'}</Detail>
              <Detail icon={Clock} label="Opening hours">{hospital.is24Hours ? 'Open 24 hours, every day' : hospital.openingHours || '—'}</Detail>
            </dl>
          </section>

{hospital.coordinates?.lat != null && hospital.coordinates?.lng != null && (
  <section className="card p-5">
    <h2 className="mb-3 text-sm font-semibold text-navy-900">Find us on the map</h2>
    <HospitalMap hospital={hospital} />
  </section>
)}
          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-navy-900">Departments</h2>
            {hospital.departments?.length
              ? <div className="flex flex-wrap gap-2">{hospital.departments.map((d) => <Badge key={d} tone="primary">{d}</Badge>)}</div>
              : <p className="text-sm text-gray-500">This hospital has not listed its departments yet.</p>}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-navy-900">Team</h2>
            <p className="mb-3 text-sm text-gray-600">
              {[
                staffCounts.doctor && `${staffCounts.doctor} doctor${staffCounts.doctor > 1 ? 's' : ''}`,
                staffCounts.nurse && `${staffCounts.nurse} nurse${staffCounts.nurse > 1 ? 's' : ''}`,
                staffCounts.lab_tech && `${staffCounts.lab_tech} lab technician${staffCounts.lab_tech > 1 ? 's' : ''}`,
                staffCounts.pharmacist && `${staffCounts.pharmacist} pharmacist${staffCounts.pharmacist > 1 ? 's' : ''}`,
              ].filter(Boolean).join(' · ') || 'No staff listed yet'}
            </p>
            {doctors.length > 0 && (
              <ul className="grid gap-2 sm:grid-cols-2">
                {doctors.map((d) => (
                  <li key={d._id} className="rounded-lg border border-gray-200 px-3 py-2">
                    <p className="text-sm font-medium text-navy-900">Dr {d.fullName}</p>
                    <p className="text-xs text-gray-500">
                      {d.specialization || 'General practice'}{d.consultationFee > 0 ? ` · ${money(d.consultationFee)}` : ''}{d.isAvailableOnline ? ' · online' : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-navy-900">Fees and credentials</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div><dt className="text-xs text-gray-500">Consultation fee</dt><dd className="text-sm text-navy-900">{hospital.paymentSettings?.appointmentFee > 0 ? money(hospital.paymentSettings.appointmentFee) : 'Not listed'}</dd></div>
              <div><dt className="text-xs text-gray-500">Payment</dt><dd className="text-sm text-navy-900">{PAYMENT_MODES[hospital.paymentSettings?.mode] || '—'}</dd></div>
              <div><dt className="text-xs text-gray-500">Licence number</dt><dd className="text-sm text-navy-900">{hospital.licenseNumber || '—'}</dd></div>
              <div><dt className="text-xs text-gray-500">On eMedicals since</dt><dd className="text-sm text-navy-900">{fmtDate(hospital.createdAt)}</dd></div>
            </dl>
          </section>
        </div>

        <aside className="card h-fit p-5">
          <h2 className="mb-3 text-sm font-semibold text-navy-900">Your care here</h2>
          {!user && (
            <>
              <p className="mb-3 text-sm text-gray-600">Log in to register with this hospital and request visits.</p>
              <Link to={`/login?redirect=/hospitals/${hospital._id}`} className={`${btn.primary} w-full`}>Log in</Link>
            </>
          )}
          {user?.role === 'patient' && <PatientPanel hospital={hospital} />}
          {user && user.role !== 'patient' && <p className="text-sm text-gray-600">Registering and visit requests are for patient accounts.</p>}
        </aside>
      </div>
    </div>
  );
}