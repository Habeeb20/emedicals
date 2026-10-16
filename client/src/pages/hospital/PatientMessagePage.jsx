import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi, Spinner, Empty, ErrorNote, Badge, btn } from './hospitalShared.jsx';
import MessageThread from './MessageThread.jsx';

const timeOf = (at) => (at ? new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');

// Patient: message any hospital you are registered at. Replies arrive live.
export default function PatientMessagesPage({ onNavigate }) {
  const [searchParams] = useSearchParams();
  const [openId, setOpenId] = useState(searchParams.get('record') || null); // ?record=<recordId> opens one directly
  const { data: threads, loading, error } = useApi('/hospital/messages/mine', { live: ['hospital:message'] });

  if (loading && !threads) return <Spinner />;
  if (error) return <ErrorNote message={error} />;

  if (!threads.length) {
    return (
      <div className="space-y-4">
        <Empty title="No hospitals to message yet" hint="Register at a hospital first, then you can message them here." />
        <button className={btn.primary} onClick={() => onNavigate('find-hospital')}>Find a hospital</button>
      </div>
    );
  }

  const current = threads.find((t) => String(t.recordId) === String(openId));

  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
      {/* On a phone, show either the list or the open conversation */}
      <ul className={`card divide-y divide-gray-100 overflow-hidden ${current ? 'hidden lg:block' : ''}`}>
        {threads.map((t) => (
          <li key={t.recordId}>
            <button
              onClick={() => setOpenId(t.recordId)}
              aria-current={String(t.recordId) === String(openId) ? 'true' : undefined}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${String(t.recordId) === String(openId) ? 'bg-primary-50' : ''}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold text-navy-900">{t.hospital.name}</span>
                <span className="shrink-0 text-xs text-gray-500">{timeOf(t.last?.at)}</span>
              </span>
              <span className="mt-0.5 flex items-center justify-between gap-2">
                <span className="truncate text-sm text-gray-600">{t.last ? `${t.last.sender === 'patient' ? 'You: ' : ''}${t.last.text}` : 'No messages yet'}</span>
                {t.unread > 0 && <Badge tone="danger">{t.unread}</Badge>}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <section className={`card overflow-hidden ${current ? '' : 'hidden lg:block'}`}>
        {current ? (
          <>
            <button className="px-4 pt-3 text-sm font-semibold text-primary-700 hover:underline lg:hidden" onClick={() => setOpenId(null)}>Back to hospitals</button>
            <MessageThread
              key={current.recordId}
              loadPath={`/hospital/messages/mine/${current.recordId}`}
              sendPath={`/hospital/messages/mine/${current.recordId}`}
              mySide="patient"
              title={(data) => data.hospital.name}
            />
          </>
        ) : (
          <p className="flex h-[32rem] items-center justify-center text-sm text-gray-500">Choose a hospital to see your conversation.</p>
        )}
      </section>
    </div>
  );
}