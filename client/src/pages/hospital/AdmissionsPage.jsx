import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import api from '@/lib/api.js';
import {
  useApi, useAction, useFields, Modal, Field, Tabs, StatusBadge, Badge, Spinner, Empty, ErrorNote,
  PatientPicker, BedSelect, VitalsForm, btn, inputCls, ageOf, fmtDate, fmtDateTime, daysSince,
} from './hospitalShared.jsx';

/* ---------------- Admit a patient ---------------- */
function AdmitModal({ initialPatientId, onClose }) {
  const [patient, setPatient] = useState(null);
  const [bedId, setBedId] = useState('');
  const [reason, setReason] = useState('');
  const [run, busy] = useAction();

  // Coming from a consultation: the patient is already chosen
  useEffect(() => {
    if (!initialPatientId) return;
    api.get(`/hospital/patients/${initialPatientId}`).then((res) => setPatient(res.data.data.patient)).catch(() => {});
  }, [initialPatientId]);

  const submit = async (event) => {
    event.preventDefault();
    if (!patient) return;
    if (await run(() => api.post('/hospital/admissions', { patientId: patient._id, bedId, reason }), 'Patient admitted')) onClose();
  };

  return (
    <Modal title="Admit patient" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Patient"><PatientPicker value={patient} onChange={setPatient} /></Field>
        <Field label="Bed"><BedSelect value={bedId} onChange={setBedId} /></Field>
        <Field label="Reason for admission">
          <textarea className={inputCls} rows={3} required value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <button className={btn.primary} disabled={busy || !patient || !bedId}>{busy ? 'Admitting…' : 'Admit patient'}</button>
      </form>
    </Modal>
  );
}

/* ---------------- One admission: chart, notes, transfer, discharge ---------------- */
function AdmissionModal({ id, user, onClose }) {
  const { data: admission, loading, error } = useApi(`/hospital/admissions/${id}`, { live: ['hospital:admission'] });
  const [section, setSection] = useState('vitals');
  const [run, busy] = useAction();
  const [note, setNote] = useState('');
  const [bedId, setBedId] = useState('');
  const [discharge, bindDischarge] = useFields({ dischargeSummary: '', dischargeInstructions: '', followUpDate: '' });

  const isOpen = admission?.status === 'admitted';
  const clinical = ['doctor', 'nurse'].includes(user.role);
  const canDischarge = ['doctor', 'hospital_admin'].includes(user.role);

  const sections = [
    { key: 'vitals', label: 'Vitals' },
    { key: 'notes', label: 'Notes' },
    ...(isOpen ? [{ key: 'transfer', label: 'Move bed' }] : []),
    ...(isOpen && canDischarge ? [{ key: 'discharge', label: 'Discharge' }] : []),
    ...(!isOpen && admission ? [{ key: 'summary', label: 'Discharge summary' }] : []),
  ];

  const postVitals = (values) => run(() => api.post(`/hospital/admissions/${id}/vitals`, values), 'Vitals saved');

  const postNote = async (event) => {
    event.preventDefault();
    if (await run(() => api.post(`/hospital/admissions/${id}/notes`, { text: note }), 'Note saved')) setNote('');
  };

  const transfer = async (event) => {
    event.preventDefault();
    if (await run(() => api.post(`/hospital/admissions/${id}/transfer`, { bedId }), 'Patient moved')) {
      setBedId('');
      setSection('vitals');
    }
  };

  const doDischarge = async (event) => {
    event.preventDefault();
    if (!window.confirm('Discharge this patient? The bed is released and the stay is billed.')) return;
    if (await run(() => api.post(`/hospital/admissions/${id}/discharge`, discharge), 'Patient discharged and billed')) onClose();
  };

  return (
    <Modal title={admission ? admission.patient.fullName : 'Admission'} onClose={onClose} wide>
      {loading && <Spinner />}
      <ErrorNote message={error} />
      {admission && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <StatusBadge value={admission.status} />
            <span>{admission.patient.mrn}</span>
            <span>· {admission.ward?.name}, bed {admission.bed?.label}</span>
            <span>· since {fmtDateTime(admission.admittedAt)}</span>
            {admission.doctor && <span>· Dr {admission.doctor.fullName}</span>}
          </div>
          <p className="text-sm"><span className="font-semibold text-navy-900">Reason:</span> {admission.reason}</p>
          {admission.patient.allergies?.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-danger-dark">Allergies</span>
              {admission.patient.allergies.map((a) => <Badge key={a} tone="danger">{a}</Badge>)}
            </div>
          )}

          <Tabs tabs={sections} value={section} onChange={setSection} />

          {section === 'vitals' && (
            <div className="space-y-5">
              {isOpen && clinical && <VitalsForm onSubmit={postVitals} busy={busy} />}
              {admission.vitals.length === 0 && <p className="text-sm text-gray-500">No readings yet.</p>}
              <div className="overflow-x-auto">
                {admission.vitals.length > 0 && (
                  <table className="w-full min-w-[34rem] text-left text-sm">
                    <thead className="text-xs text-gray-500">
                      <tr><th className="py-2 pr-3">Time</th><th className="pr-3">BP</th><th className="pr-3">Temp</th><th className="pr-3">Pulse</th><th className="pr-3">Resp</th><th className="pr-3">SpO₂</th><th>By</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[...admission.vitals].reverse().map((v, i) => (
                        <tr key={i}>
                          <td className="py-2 pr-3 whitespace-nowrap">{fmtDateTime(v.recordedAt)}</td>
                          <td className="pr-3">{v.bloodPressure ?? '—'}</td>
                          <td className="pr-3">{v.temperature ?? '—'}</td>
                          <td className="pr-3">{v.pulse ?? '—'}</td>
                          <td className="pr-3">{v.respiratoryRate ?? '—'}</td>
                          <td className="pr-3">{v.oxygenSaturation ?? '—'}</td>
                          <td>{v.recordedBy?.fullName ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {section === 'notes' && (
            <div className="space-y-4">
              {isOpen && clinical && (
                <form onSubmit={postNote} className="space-y-3">
                  <textarea className={inputCls} rows={3} required placeholder="Write a nursing or doctor's note" value={note} onChange={(e) => setNote(e.target.value)} />
                  <button className={btn.primary} disabled={busy}>Add note</button>
                </form>
              )}
              {admission.notes.length === 0 && <p className="text-sm text-gray-500">No notes yet.</p>}
              <ul className="space-y-3">
                {[...admission.notes].reverse().map((n, i) => (
                  <li key={i} className="rounded-lg border border-gray-200 p-3">
                    <p className="text-sm text-navy-800">{n.text}</p>
                    <p className="mt-1 text-xs text-gray-500">{n.author?.fullName} · {n.kind} · {fmtDateTime(n.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {section === 'transfer' && (
            <form onSubmit={transfer} className="space-y-4">
              <Field label="Move to"><BedSelect value={bedId} onChange={setBedId} /></Field>
              <button className={btn.primary} disabled={busy || !bedId}>Move patient</button>
            </form>
          )}

          {section === 'discharge' && (
            <form onSubmit={doDischarge} className="space-y-4">
              <Field label="Discharge summary"><textarea className={inputCls} rows={4} required {...bindDischarge('dischargeSummary')} /></Field>
              <Field label="Instructions for home"><textarea className={inputCls} rows={3} {...bindDischarge('dischargeInstructions')} /></Field>
              <Field label="Follow-up date"><input className={inputCls} type="date" {...bindDischarge('followUpDate')} /></Field>
              <button className={btn.danger} disabled={busy}>Discharge patient</button>
            </form>
          )}

          {section === 'summary' && (
            <div className="space-y-3 text-sm">
              <p className="text-gray-600">Discharged {fmtDateTime(admission.dischargedAt)}</p>
              <p className="whitespace-pre-wrap text-navy-800">{admission.dischargeSummary}</p>
              {admission.dischargeInstructions && <p className="whitespace-pre-wrap text-navy-800"><span className="font-semibold">At home: </span>{admission.dischargeInstructions}</p>}
              {admission.followUpDate && <p className="text-gray-600">Follow-up: {fmtDate(admission.followUpDate)}</p>}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ---------------- The page ---------------- */
export default function AdmissionsPage({ user }) {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState('admitted');
  const { data: admissions, loading, error } = useApi('/hospital/admissions', { params: { status }, live: ['hospital:admission'] });
  const [admitting, setAdmitting] = useState(params.get('admit') ? params.get('admit') : false);
  const [openId, setOpenId] = useState(null);
  const canAdmit = ['doctor', 'hospital_admin'].includes(user.role);

  const closeAdmit = () => {
    setAdmitting(false);
    if (params.get('admit')) setParams({ tab: 'admissions' }, { replace: true }); // forget the ?admit= link
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={status}
          onChange={setStatus}
          tabs={[{ key: 'admitted', label: 'Admitted now' }, { key: 'discharged', label: 'Discharged' }]}
        />
        {canAdmit && (
          <button className={btn.primary} onClick={() => setAdmitting(true)}><Plus className="h-4 w-4" /> Admit patient</button>
        )}
      </div>

      <ErrorNote message={error} />
      {loading && <Spinner />}
      {!loading && admissions?.length === 0 && (
        <Empty title={status === 'admitted' ? 'No patients are admitted' : 'No discharges yet'} hint={status === 'admitted' && canAdmit ? 'Admit a patient to give them a bed.' : undefined} />
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {admissions?.map((a) => (
          <li key={a._id}>
            <button onClick={() => setOpenId(a._id)} className="card w-full p-4 text-left hover:border-primary-300">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-navy-900">{a.patient.fullName}</p>
                <StatusBadge value={a.status} />
              </div>
              <p className="mt-0.5 text-sm text-gray-600">
                {a.patient.mrn}{ageOf(a.patient.dateOfBirth) !== null ? ` · ${ageOf(a.patient.dateOfBirth)} yrs` : ''}
              </p>
              <p className="mt-2 text-sm text-navy-800">{a.ward?.name} · bed {a.bed?.label}</p>
              <p className="mt-1 truncate text-xs text-gray-500">{a.reason}</p>
              <p className="mt-2 text-xs text-gray-500">
                {a.status === 'admitted' ? `Day ${daysSince(a.admittedAt)}` : `Discharged ${fmtDate(a.dischargedAt)}`}
                {a.doctor ? ` · Dr ${a.doctor.fullName}` : ''}
              </p>
            </button>
          </li>
        ))}
      </ul>

      {admitting && <AdmitModal initialPatientId={typeof admitting === 'string' ? admitting : null} onClose={closeAdmit} />}
      {openId && <AdmissionModal id={openId} user={user} onClose={() => setOpenId(null)} />}
    </div>
  );
}