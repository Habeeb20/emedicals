import { useState } from 'react';
import { api } from './api';
import { Avatar, Button, ErrorNote, Field, inputCls, Sheet } from './ui';
import QueueTicket from './QueueTicket';
import { addDays, formatDay, naira, PAYMENT_MODES, todayISO } from './format';

const payNote = (p) => {
  if (!p.fee) return 'This consultation is free.';
  if (p.paymentMode === 'booking') return `After it's accepted, you pay ${naira(p.fee)} online to confirm your place.`;
  if (p.paymentMode === 'deposit') return `After it's accepted, you pay a deposit online to confirm. The rest (of ${naira(p.fee)}) is due on arrival.`;
  return `You pay ${naira(p.fee)} when you arrive.`;
};

export default function BookingSheet({ provider: p, onClose, onBooked }) {
  const isDoctor = p.kind === 'doctor';
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [department, setDepartment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const body = { date, time: time || undefined, reason: reason.trim() || undefined };
      if (isDoctor) body.doctorId = p.id; else { body.organizationId = p.id; body.department = department; }
      const r = await api('/appointments', { method: 'POST', body });
      setResult(r);
    } catch (e) { setError("please login to perform this action"); } finally { setBusy(false); }
  };

  if (result) {
    return (
      <Sheet open onClose={onBooked} title="Request sent"
        footer={<div className="flex gap-3"><Button variant="secondary" className="flex-1" onClick={onClose}>Close</Button><Button className="flex-1" onClick={onBooked}>View my appointments</Button></div>}>
        <QueueTicket position={result.meta.position} status="pending" />
        <p className="mt-4 text-sm text-gray-700">
          {p.name} will review your request for {formatDay(date)}. We'll notify you here and by email as soon as they respond.
        </p>
      </Sheet>
    );
  }

  return (
    <Sheet open onClose={onClose} title={`Book ${p.name}`}
      footer={<Button size="lg" className="w-full" loading={busy} disabled={!isDoctor && !department} onClick={submit}>Request appointment</Button>}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
          <Avatar name={p.name} src={(isDoctor ? p.avatar : p.logo)?.url} rounded={isDoctor ? 'rounded-full' : 'rounded-xl'} />
          <div className="min-w-0">
            <p className="truncate font-medium text-navy-900">{p.name}</p>
            <p className="truncate text-sm text-gray-600">{isDoctor ? p.department : 'Hospital'}</p>
          </div>
        </div>

        {!isDoctor && (
          <Field label="Department">
            <select className={inputCls} value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">Choose a department</option>
              {(p.departments || []).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
        )}

        <div>
          <span className="mb-1.5 block text-sm font-medium text-navy-800">Day</span>
          <div className="mb-2 flex flex-wrap gap-2">
            {[0, 1, 2].map((n) => {
              const d = addDays(today, n);
              return (
                <button key={d} type="button" onClick={() => setDate(d)} aria-pressed={date === d}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${date === d ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  {n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : formatDay(d)}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" className={inputCls} />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Preferred time (optional)" className={inputCls} />
          </div>
        </div>

        <Field label="What's it about?" hint="Optional. A short note helps the doctor prepare.">
          <textarea rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} />
        </Field>

        <div className="rounded-xl border border-primary-200 bg-primary-50 p-3.5 text-sm text-primary-900">
          <p className="font-medium">{PAYMENT_MODES[p.paymentMode]?.label}</p>
          <p className="mt-0.5 text-primary-800">{payNote(p)}</p>
        </div>
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Sheet>
  );
}
