import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dash } from './links';
import { useAuth } from '@/context/AuthContext';
import { api } from './api';
import { useFetch, useSocketEvent } from './hooks';
import { Avatar, Badge, Button, Card, ConfirmSheet, EmptyState, ErrorNote, Field, Icon, inputCls, PageHeader, PageShell, Skeleton, StatusBadge, Tabs } from './ui';
import VisitCompleteSheet from './VisitCompleteSheet';
import { addDays, ageFrom, formatDay, naira, paymentLine, todayISO } from './format';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'done', label: 'Done' },
];
const GROUP = { waiting: ['pending', 'awaiting_payment'], confirmed: ['confirmed', 'in_progress'], done: ['completed', 'rejected', 'cancelled', 'no_show'] };

export default function ProviderAppointmentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [date, setDate] = useState(todayISO());
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [completing, setCompleting] = useState(null);

  const list = useFetch(() => api('/appointments/provider', { params: { date } }), [date]);
  useSocketEvent('notification:new', (n) => { if (/^(appointment|payment)/.test(n.type)) list.reload(); });

  const rows = list.data || [];
  const counts = useMemo(() => ({
    waiting: rows.filter((a) => GROUP.waiting.includes(a.status)).length,
    confirmed: rows.filter((a) => GROUP.confirmed.includes(a.status)).length,
    done: rows.filter((a) => a.status === 'completed').length,
  }), [rows]);
  const shown = filter === 'all' ? rows : rows.filter((a) => GROUP[filter].includes(a.status));

  const act = async (id, path, body, method = 'POST') => {
    setBusyId(id + path); setError('');
    try { await api(`/appointments/${id}/${path}`, { method, body }); await list.reload(); }
    catch (e) { setError(e.message); } finally { setBusyId(null); }
  };
  const busy = (id, path) => busyId === id + path;

  const reject = async () => { await act(rejecting, 'reject', { reason }); setRejecting(null); setReason(''); };

  return (
    <PageShell>
      <PageHeader title="Appointments" subtitle="Patients appear in queue order. Accept, skip or decline, then run the visit."
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day"><Icon name="back" className="h-4 w-4" /></Button>
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Date" className={`${inputCls} !w-auto`} />
            <Button variant="secondary" size="sm" onClick={() => setDate(addDays(date, 1))} aria-label="Next day"><Icon name="back" className="h-4 w-4 rotate-180" /></Button>
          </div>
        } />

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[['Waiting', counts.waiting, 'text-warning-dark'], ['Confirmed', counts.confirmed, 'text-primary-700'], ['Completed', counts.done, 'text-navy-700']].map(([l, n, c]) => (
          <Card key={l} className="!p-3 text-center sm:!p-4"><p className={`text-2xl font-semibold tabular-nums sm:text-3xl ${c}`}>{n}</p><p className="text-xs text-gray-600 sm:text-sm">{l}</p></Card>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onChange={setFilter} options={FILTERS} />
        <p className="text-sm text-gray-600">{formatDay(date)}</p>
      </div>
      <div className="mb-4"><ErrorNote>{error || list.error}</ErrorNote></div>

      {list.loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
      ) : shown.length === 0 ? (
        <EmptyState icon="calendar" title="No appointments here" body="New requests show up instantly and you'll get a notification." />
      ) : (
        <ul className="space-y-3">
          {shown.map((a) => {
            const age = ageFrom(a.patient?.dateOfBirth);
            const balance = (a.payment?.totalAmount || 0) - (a.payment?.amountPaid || 0);
            const s = a.status;
            return (
              <li key={a._id}>
                <Card className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex items-start gap-3 sm:w-72 sm:shrink-0">
                    <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-navy-900 text-primary-300" title="Queue number">
                      <span className="text-lg font-semibold leading-none tabular-nums">{a.queueNumber}</span>
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-navy-900">{a.patient?.fullName}</h3>
                      <p className="text-sm text-gray-600">{[age && `${age} yrs`, a.patient?.gender].filter(Boolean).join(', ') || 'No details'}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5"><StatusBadge status={s} />{a.skipCount > 0 && <Badge>Skipped {a.skipCount}x</Badge>}</div>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 space-y-2 text-sm">
                    {a.time && <p className="flex items-center gap-1.5 text-gray-700"><Icon name="clock" className="h-4 w-4 text-gray-500" />{a.time}</p>}
                    <p className="text-gray-700">{a.reason || <span className="text-gray-500">No reason given</span>}</p>
                    <p className="flex items-center gap-1.5 text-gray-700"><Icon name="wallet" className="h-4 w-4 text-gray-500" />{paymentLine(a)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:w-52 sm:shrink-0 sm:justify-end">
                    {s === 'pending' && (<>
                      <Button size="sm" icon="check" loading={busy(a._id, 'accept')} onClick={() => act(a._id, 'accept')}>Accept</Button>
                      <Button size="sm" variant="secondary" icon="skip" loading={busy(a._id, 'skip')} onClick={() => act(a._id, 'skip')}>Skip</Button>
                      <Button size="sm" variant="dangerSoft" onClick={() => setRejecting(a._id)}>Decline</Button>
                    </>)}
                    {s === 'awaiting_payment' && (<>
                      <p className="w-full text-sm text-info-dark">Waiting for the patient to pay.</p>
                      <Button size="sm" variant="dangerSoft" onClick={() => setRejecting(a._id)}>Decline</Button>
                    </>)}
                    {s === 'confirmed' && (<>
                      <Button size="sm" loading={busy(a._id, 'status')} onClick={() => act(a._id, 'status', { status: 'in_progress' }, 'PATCH')}>Start visit</Button>
                      <Button size="sm" variant="secondary" icon="skip" loading={busy(a._id, 'skip')} onClick={() => act(a._id, 'skip')}>Skip</Button>
                      <Button size="sm" variant="ghost" onClick={() => act(a._id, 'status', { status: 'no_show' }, 'PATCH')}>Mark missed</Button>
                    </>)}
                    {s === 'in_progress' && <Button size="sm" icon="check" onClick={() => setCompleting(a)}>Complete visit</Button>}
                    {['confirmed', 'in_progress', 'completed'].includes(s) && balance > 0 && (
                      <Button size="sm" variant="secondary" icon="wallet" loading={busy(a._id, 'collect-payment')} onClick={() => act(a._id, 'collect-payment', { amount: balance })}>Collect {naira(balance)}</Button>
                    )}
                    {a.chatRoom && ['confirmed', 'in_progress', 'completed'].includes(s) && <Button size="sm" variant="ghost" icon="chat" onClick={() => navigate(dash('messages', { room: a.chatRoom }))}>Chat</Button>}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmSheet open={!!rejecting} title="Decline this request?" confirmLabel="Decline" onClose={() => setRejecting(null)} onConfirm={reject} busy={!!busyId}>
        <Field label="Reason (the patient will see this)" className="mt-1">
          <textarea rows={3} className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Not available that day. Please pick another date." />
        </Field>
      </ConfirmSheet>

      {completing && <VisitCompleteSheet appointment={completing} canPrescribe={user?.role === 'doctor'} onClose={() => setCompleting(null)} onDone={() => { setCompleting(null); list.reload(); }} />}
    </PageShell>
  );
}
