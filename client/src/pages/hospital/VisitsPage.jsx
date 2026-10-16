import { useState } from 'react';
import api from '@/lib/api.js';
import {
  useApi, useAction, useFields, Modal, Field, Badge, StatusBadge, Tabs, Spinner, Empty, ErrorNote,
  VitalsForm, VitalsSummary, btn, inputCls, ageOf, fmtDateTime,
} from './hospitalShared.jsx';

/* ---------------- Triage: nurse records vitals ---------------- */
function VitalsModal({ visit, onClose }) {
  const [run, busy] = useAction();
  const save = async (values) => {
    if (await run(() => api.post(`/hospital/visits/${visit._id}/vitals`, values), 'Vitals saved')) onClose();
  };
  return (
    <Modal title={`Vitals: ${visit.patient.fullName}`} onClose={onClose}>
      <VitalsForm onSubmit={save} busy={busy} />
    </Modal>
  );
}

/* ---------------- Consultation: doctor writes the notes ---------------- */
function ConsultationModal({ visit, canEdit, onClose }) {
  const [form, bind] = useFields({
    history: visit.history || '',
    examination: visit.examination || '',
    diagnosis: visit.diagnosis || '',
    treatmentPlan: visit.treatmentPlan || '',
    notes: visit.notes || '',
    followUpDate: visit.followUpDate ? visit.followUpDate.slice(0, 10) : '',
    fee: '',
  });
  const [run, busy] = useAction();
  const { patient } = visit;

  const save = async (complete) => {
    const done = await run(
      () => api.patch(`/hospital/visits/${visit._id}`, { ...form, complete }),
      complete ? 'Visit completed and billed' : 'Draft saved'
    );
    if (done && complete) onClose();
  };

  const area = (key, label, rows = 3) => (
    <Field label={label}>
      <textarea className={inputCls} rows={rows} disabled={!canEdit} {...bind(key)} />
    </Field>
  );

  return (
    <Modal title={`Consultation: ${patient.fullName}`} onClose={onClose} wide>
      <div className="space-y-5">
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            {patient.mrn} · {patient.gender}{ageOf(patient.dateOfBirth) !== null ? ` · ${ageOf(patient.dateOfBirth)} yrs` : ''}
            {patient.bloodGroup ? ` · ${patient.bloodGroup}` : ''}
          </p>
          <p className="mt-1 text-sm"><span className="font-semibold text-navy-900">Reason for visit:</span> {visit.complaint}</p>
          {patient.allergies?.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-danger-dark">Allergies</span>
              {patient.allergies.map((a) => <Badge key={a} tone="danger">{a}</Badge>)}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-navy-900">Vitals</h3>
          <VitalsSummary vitals={visit.vitals} />
        </div>

        {area('history', 'History of the complaint')}
        {area('examination', 'Examination findings')}
        {area('diagnosis', 'Diagnosis', 2)}
        {area('treatmentPlan', 'Treatment plan')}
        {area('notes', 'Other notes', 2)}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Follow-up date"><input className={inputCls} type="date" disabled={!canEdit} {...bind('followUpDate')} /></Field>
          {canEdit && (
            <Field label="Consultation fee" hint="Leave blank to use the hospital's default fee">
              <input className={inputCls} type="number" min="0" {...bind('fee')} />
            </Field>
          )}
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-3">
            <button className={btn.ghost} disabled={busy} onClick={() => save(false)}>Save draft</button>
            <button className={btn.primary} disabled={busy} onClick={() => save(true)}>Complete visit</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ---------------- The page ---------------- */
export default function VisitsPage({ user, onNavigate }) {
  const { data: visits, loading, error } = useApi('/hospital/visits', { live: ['hospital:visit'] });
  const [tab, setTab] = useState('queue');
  const [vitalsFor, setVitalsFor] = useState(null);
  const [opened, setOpened] = useState(null);
  const [run, busy] = useAction();

  const myId = user._id ?? user.id;
  const isDoctor = user.role === 'doctor';
  const canVitals = isDoctor || user.role === 'nurse';

  const all = visits || [];
  const groups = {
    queue: all.filter((v) => ['waiting', 'triaged'].includes(v.status)),
    consult: all.filter((v) => v.status === 'in_consultation'),
    done: all.filter((v) => ['completed', 'cancelled'].includes(v.status)),
  };
  const shown = groups[tab];

  const start = async (visit) => {
    const res = await run(() => api.post(`/hospital/visits/${visit._id}/start`), 'Consultation started');
    if (res) setOpened({ ...visit, status: 'in_consultation', doctor: { _id: myId, fullName: user.fullName } });
  };

  const cancel = async (visit) => {
    if (window.confirm(`Cancel the visit for ${visit.patient.fullName}?`)) {
      await run(() => api.post(`/hospital/visits/${visit._id}/cancel`), 'Visit cancelled');
    }
  };

  // The modal always shows the freshest copy of the visit (it changes live while it is open)
  const current = opened && all.find((v) => v._id === opened._id) || opened;
  const canEdit = current && isDoctor && current.status === 'in_consultation' && (current.doctor?._id ?? current.doctor) === myId;

  return (
    <div className="space-y-5">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'queue', label: 'Queue', count: groups.queue.length },
          { key: 'consult', label: 'In consultation', count: groups.consult.length },
          { key: 'done', label: 'Done today', count: groups.done.length },
        ]}
      />

      <ErrorNote message={error} />
      {loading && <Spinner />}
      {!loading && shown.length === 0 && (
        <Empty
          title={tab === 'queue' ? 'Nobody is waiting' : tab === 'consult' ? 'No consultations in progress' : 'Nothing finished yet today'}
          hint={tab === 'queue' ? 'Start a visit from the Patients page and it will appear here for everyone, instantly.' : undefined}
        />
      )}

      <ul className="space-y-3">
        {shown.map((visit, index) => {
          const { patient } = visit;
          const mine = (visit.doctor?._id ?? visit.doctor) === myId;
          return (
            <li key={visit._id} className="card flex flex-wrap items-center gap-4 p-4">
              {tab === 'queue' && (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700" title="Place in the queue">
                  {index + 1}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-navy-900">{patient.fullName}</p>
                  <StatusBadge value={visit.status} />
                  {visit.priority !== 'normal' && <StatusBadge value={visit.priority} />}
                </div>
                <p className="text-sm text-gray-600">
                  {patient.mrn}{ageOf(patient.dateOfBirth) !== null ? ` · ${ageOf(patient.dateOfBirth)} yrs` : ''} · {visit.visitNumber}
                </p>
                <p className="mt-1 truncate text-sm text-navy-800">{visit.complaint}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Arrived {fmtDateTime(visit.createdAt)}{visit.doctor ? ` · Dr ${visit.doctor.fullName}` : ''}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {canVitals && ['waiting', 'triaged', 'in_consultation'].includes(visit.status) && (
                  <button className={`${btn.ghost} ${btn.small}`} onClick={() => setVitalsFor(visit)}>
                    {visit.vitals ? 'Update vitals' : 'Record vitals'}
                  </button>
                )}
                {isDoctor && ['waiting', 'triaged'].includes(visit.status) && (
                  <button className={`${btn.primary} ${btn.small}`} disabled={busy} onClick={() => start(visit)}>Start consultation</button>
                )}
                {visit.status === 'in_consultation' && (
                  <button className={`${btn.primary} ${btn.small}`} onClick={() => setOpened(visit)}>{mine && isDoctor ? 'Open consultation' : 'View notes'}</button>
                )}
                {isDoctor && mine && visit.status === 'in_consultation' && (
                  <button className={`${btn.ghost} ${btn.small}`} onClick={() => onNavigate('admissions', { admit: patient._id })}>Admit</button>
                )}
                {visit.status === 'completed' && (
                  <button className={`${btn.ghost} ${btn.small}`} onClick={() => setOpened(visit)}>View notes</button>
                )}
                {['waiting', 'triaged'].includes(visit.status) && (
                  <button className={`${btn.ghost} ${btn.small}`} onClick={() => cancel(visit)}>Cancel</button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {vitalsFor && <VitalsModal visit={vitalsFor} onClose={() => setVitalsFor(null)} />}
      {current && <ConsultationModal key={current._id} visit={current} canEdit={canEdit} onClose={() => setOpened(null)} />}
    </div>
  );
}