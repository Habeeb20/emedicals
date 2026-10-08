import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { dash } from './links';
import { api } from './api';
import { useFetch, useSocketEvent } from './hooks';
import { Avatar, Button, Card, ConfirmSheet, EmptyState, ErrorNote, Icon, PageHeader, PageShell, Skeleton, StatusBadge, Tabs, Badge } from './ui';
import QueueTicket from './QueueTicket';
import { formatDay, naira, paymentLine } from './format';

const ACTIVE = ['pending', 'awaiting_payment', 'confirmed', 'in_progress'];

export default function MyAppointmentsPage({ onNavigate }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('active');
  const [live, setLive] = useState({});         // appointmentId -> { position, total }
  const [busyId, setBusyId] = useState(null);
  const [cancelId, setCancelId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const list = useFetch(() => api('/appointments/mine'), []);

  useSocketEvent('queue:update', (u) => setLive((m) => ({ ...m, [u.appointmentId]: u })));
  useSocketEvent('notification:new', (n) => { if (/^(appointment|payment)/.test(n.type)) list.reload(); });

  // Back from Paystack: confirm the payment, then refresh
  useEffect(() => {
    const ref = params.get('ref');
    if (!ref) return;
    api(`/payments/verify/${ref}`)
      .then((r) => setNotice(r.data.paymentStatus === 'success' ? 'Payment received. Your appointment is confirmed.' : 'We have not received that payment yet.'))
      .catch((e) => setError(e.message))
      .finally(() => { const next = new URLSearchParams(params); next.delete('ref'); setParams(next, { replace: true }); list.reload(); });
  }, []); // eslint-disable-line

  const pay = async (id) => {
    setBusyId(id); setError('');
    try { const r = await api(`/appointments/${id}/pay`, { method: 'POST' }); window.location.href = r.data.authorization_url; }
    catch (e) { setError(e.message); setBusyId(null); }
  };
  const cancel = async () => {
    setBusyId(cancelId);
    try { await api(`/appointments/${cancelId}/cancel`, { method: 'POST' }); setCancelId(null); list.reload(); }
    catch (e) { setError(e.message); } finally { setBusyId(null); }
  };

  const all = list.data || [];
  const shown = all.filter((a) => (tab === 'active' ? ACTIVE.includes(a.status) : !ACTIVE.includes(a.status)));

  return (
    <PageShell className="max-w-3xl">
      <PageHeader title="My appointments" subtitle="Track your place in line, pay, and chat with your doctor." />
      <Tabs className="mb-5" value={tab} onChange={setTab}
        options={[{ value: 'active', label: 'Upcoming', count: all.filter((a) => ACTIVE.includes(a.status)).length }, { value: 'history', label: 'History' }]} />

      {notice && <p role="status" className="mb-4 rounded-xl bg-success-light px-3.5 py-2.5 text-sm text-success-dark">{notice}</p>}
      <div className="mb-4"><ErrorNote>{error || list.error}</ErrorNote></div>

      {list.loading ? (
        <div className="space-y-4">{[0, 1].map((i) => <Skeleton key={i} className="h-60 rounded-2xl" />)}</div>
      ) : shown.length === 0 ? (
        <EmptyState icon="calendar" title={tab === 'active' ? 'Nothing booked yet' : 'No past appointments'}
          body={tab === 'active' ? 'Find a doctor or hospital and book your first appointment.' : 'Completed and cancelled appointments show up here.'}
          action={tab === 'active' && <Button onClick={() => onNavigate?.('find-care')}>Find care</Button>} />
      ) : (
        <ul className="space-y-4">
          {shown.map((a) => {
            const name = a.doctor?.fullName || a.organization?.name || 'Appointment';
            const pos = live[a._id]?.position ?? a.position;
            const total = live[a._id]?.total;
            const canChat = a.chatRoom && ['confirmed', 'in_progress', 'completed'].includes(a.status);
            return (
              <li key={a._id}>
                <Card className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={name} src={a.doctor?.avatar?.url} />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-navy-900">{name}</h3>
                      <p className="truncate text-sm text-gray-600">{[a.department, a.doctor && a.organization?.name].filter(Boolean).join(', ')}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-700">
                        <Icon name="calendar" className="h-4 w-4 text-gray-500" />{formatDay(a.date)}{a.time ? `, ${a.time}` : ''}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>

                  {ACTIVE.includes(a.status) && pos && <QueueTicket position={pos} total={total} status={a.status} />}

                  {a.status === 'rejected' && a.rejectionReason && <p className="rounded-xl bg-danger-light px-3.5 py-2.5 text-sm text-danger-dark">Reason: {a.rejectionReason}</p>}
                  {a.status === 'completed' && (a.outcome?.condition || a.prescriptions?.length > 0) && (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      {a.outcome?.condition && <Badge tone="primary">{a.outcome.condition}</Badge>}
                      {a.prescriptions?.length > 0 && <button className="inline-flex items-center gap-1.5 font-medium text-pharmacy-700 hover:underline" onClick={() => onNavigate?.('prescriptions')}><Icon name="pill" className="h-4 w-4" />View prescription</button>}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
                    <p className="inline-flex items-center gap-1.5 text-sm text-gray-700"><Icon name="wallet" className="h-4 w-4 text-gray-500" />{paymentLine(a)}</p>
                    <div className="flex flex-wrap gap-2">
                      {a.status === 'awaiting_payment' && <Button size="sm" loading={busyId === a._id} onClick={() => pay(a._id)}>Pay {naira(a.payment.mode === 'booking' ? a.payment.totalAmount - a.payment.amountPaid : a.payment.depositAmount - a.payment.amountPaid)}</Button>}
                      {canChat && <Button size="sm" variant="secondary" icon="chat" onClick={() => navigate(dash('messages', { room: a.chatRoom }))}>Chat</Button>}
                      {['pending', 'awaiting_payment', 'confirmed'].includes(a.status) && <Button size="sm" variant="ghost" onClick={() => setCancelId(a._id)}>Cancel</Button>}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmSheet open={!!cancelId} title="Cancel this appointment?" confirmLabel="Cancel appointment" busy={!!busyId}
        body="You'll lose your place in line. If you already paid, the clinic will arrange a refund." onConfirm={cancel} onClose={() => setCancelId(null)} />
    </PageShell>
  );
}
