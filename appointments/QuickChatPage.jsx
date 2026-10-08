import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { dash } from './links';
import { useAuth } from '@/context/AuthContext';
import { api } from './api';
import { useFetch, useSocketEvent } from './hooks';
import { Avatar, Badge, Button, Card, EmptyState, ErrorNote, Field, Icon, inputCls, PageHeader, PageShell, Skeleton } from './ui';
import { naira, timeAgo } from './format';

export default function QuickChatPage() {
  const { user } = useAuth();
  return user?.role === 'patient' ? <PatientQuickChat /> : <ProviderQuickChat />;
}

const REQ_STATUS = { open: ['Waiting for a provider', 'warning'], accepted: ['Connected', 'success'], closed: ['Closed', 'neutral'], expired: ['No one answered', 'danger'] };

function PatientQuickChat() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const plans = useFetch(() => api('/quickchat/plans'), []);
  const mine = useFetch(() => api('/quickchat/requests/mine'), []);
  const depts = useFetch(() => api('/providers/departments'), []);
  const [department, setDepartment] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const credits = plans.meta?.credits ?? 0;
  useSocketEvent('notification:new', (n) => { if (n.type.startsWith('quickchat')) { mine.reload(); plans.reload(); } });

  useEffect(() => {
    const ref = params.get('ref'); if (!ref) return;
    api(`/payments/verify/${ref}`).then((r) => setNotice(r.data.paymentStatus === 'success' ? 'Credits added to your account.' : 'Payment not received yet.'))
      .catch((e) => setError(e.message)).finally(() => { const next = new URLSearchParams(params); next.delete('ref'); setParams(next, { replace: true }); plans.reload(); });
  }, []); // eslint-disable-line

  const buy = async (planId) => {
    setBusy(planId); setError('');
    try { const r = await api('/quickchat/subscribe', { method: 'POST', body: { planId } }); window.location.href = r.data.authorization_url; }
    catch (e) { setError(e.message); setBusy(''); }
  };
  const send = async () => {
    setBusy('send'); setError('');
    try { await api('/quickchat/requests', { method: 'POST', body: { department, message } }); setMessage(''); setNotice('Request sent to every available provider in that department.'); plans.reload(); mine.reload(); }
    catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  return (
    <PageShell className="max-w-3xl">
      <PageHeader title="Quick chat" subtitle="Pick a department and the first available provider chats with you. Pay as you go." />
      {notice && <p role="status" className="mb-4 rounded-xl bg-success-light px-3.5 py-2.5 text-sm text-success-dark">{notice}</p>}
      <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>

      <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
        <Card className="flex flex-col justify-between bg-navy-900 !border-navy-900 text-white">
          <p className="text-sm text-navy-300">Quick chats left</p>
          {plans.loading ? <Skeleton className="mt-2 h-14 bg-navy-700" /> : <p className="mt-1 text-6xl font-semibold tabular-nums text-primary-300">{credits}</p>}
          <p className="mt-3 text-xs text-navy-300">Unanswered requests are refunded.</p>
        </Card>
        <div className="grid gap-3">
          {(plans.data || []).map((p) => (
            <Card key={p.id} className="flex items-center justify-between gap-3 !p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600"><Icon name="bolt" /></span>
                <div><p className="font-semibold text-navy-900">{p.label}</p><p className="text-sm text-gray-600">{naira(p.price)}, {naira(Math.round(p.price / p.credits))} each</p></div>
              </div>
              <Button size="sm" loading={busy === p.id} onClick={() => buy(p.id)}>Buy</Button>
            </Card>
          ))}
        </div>
      </div>

      <Card className="mt-6 space-y-4">
        <h2 className="font-semibold text-navy-900">Start a quick chat</h2>
        <Field label="Department">
          <select className={inputCls} value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">Choose a department</option>
            {(depts.data || []).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="What do you need help with?"><textarea rows={3} maxLength={1000} className={inputCls} value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
        <Button size="lg" className="w-full" loading={busy === 'send'} disabled={!department || credits < 1} onClick={send} icon="send">
          {credits < 1 ? 'Buy credits to continue' : 'Send request (1 credit)'}
        </Button>
      </Card>

      <h2 className="mb-3 mt-8 font-semibold text-navy-900">Recent requests</h2>
      {mine.loading ? <Skeleton className="h-24 rounded-2xl" /> : !mine.data?.length ? <p className="text-sm text-gray-600">Nothing yet.</p> : (
        <ul className="space-y-3">
          {mine.data.map((r) => (
            <li key={r._id}>
              <Card className="flex items-center justify-between gap-3 !p-4">
                <div className="min-w-0"><p className="font-medium text-navy-900">{r.department}</p><p className="truncate text-sm text-gray-600">{r.acceptedBy ? `With ${r.acceptedBy.fullName}` : r.message || 'No message'}</p><p className="text-xs text-gray-500">{timeAgo(r.createdAt)}</p></div>
                <div className="flex flex-col items-end gap-2">
                  <Badge tone={REQ_STATUS[r.status][1]}>{REQ_STATUS[r.status][0]}</Badge>
                  {r.chatRoom && r.status === 'accepted' && <Button size="sm" variant="secondary" icon="chat" onClick={() => navigate(dash('messages', { room: r.chatRoom }))}>Open chat</Button>}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}

function ProviderQuickChat() {
  const navigate = useNavigate();
  const open = useFetch(() => api('/quickchat/requests/open'), []);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useSocketEvent('notification:new', (n) => { if (n.type === 'quickchat:new') open.reload(); });
  useSocketEvent('quickchat:taken', () => open.reload());

  const accept = async (id) => {
    setBusy(id); setError('');
    try { const r = await api(`/quickchat/requests/${id}/accept`, { method: 'POST' }); navigate(dash('messages', { room: r.meta.chatRoomId })); }
    catch (e) { setError(e.message); open.reload(); } finally { setBusy(''); }
  };

  return (
    <PageShell className="max-w-3xl">
      <PageHeader title="Quick chat requests" subtitle="Patients waiting in your departments. The first to accept starts the chat." />
      <div className="mb-4"><ErrorNote>{error || open.error}</ErrorNote></div>
      {open.loading ? <Skeleton className="h-32 rounded-2xl" /> : !open.data?.length ? (
        <EmptyState icon="bolt" title="No one is waiting" body="New requests appear here instantly and you'll get a notification." />
      ) : (
        <ul className="space-y-3">
          {open.data.map((r) => (
            <li key={r._id}>
              <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Avatar name={r.patient?.fullName} src={r.patient?.avatar?.url} />
                  <div className="min-w-0"><p className="font-semibold text-navy-900">{r.patient?.fullName}</p><Badge tone="primary" className="mt-1">{r.department}</Badge>
                    <p className="mt-2 text-sm text-gray-700">{r.message || 'No message'}</p><p className="mt-1 text-xs text-gray-500">{timeAgo(r.createdAt)}</p></div>
                </div>
                <Button loading={busy === r._id} onClick={() => accept(r._id)} icon="chat" className="sm:w-auto">Accept and chat</Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
