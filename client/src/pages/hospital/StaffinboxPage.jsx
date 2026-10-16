import { useState } from 'react';
import { useApi, Spinner, Empty, ErrorNote, Badge, PatientPicker, Modal, Field, btn } from './hospitalShared.jsx';
import MessageThread from './MessageThread.jsx';

const timeOf = (at) => new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// Hospital staff: every conversation with patients. New patient messages appear instantly.
export default function StaffInboxPage() {
  const [openId, setOpenId] = useState(null);
  const [starting, setStarting] = useState(false);
  const [picked, setPicked] = useState(null);
  const { data: threads, loading, error } = useApi('/hospital/messages/inbox', { live: ['hospital:message'] });

  if (loading && !threads) return <Spinner />;
  if (error) return <ErrorNote message={error} />;

  const open = (id) => { setOpenId(id); setStarting(false); setPicked(null); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className={btn.primary} onClick={() => setStarting(true)}>New message</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <ul className={`card divide-y divide-gray-100 overflow-hidden ${openId ? 'hidden lg:block' : ''}`}>
          {threads.length === 0 && <li className="p-4 text-sm text-gray-500">No conversations yet.</li>}
          {threads.map((t) => (
            <li key={t.patient._id}>
              <button
                onClick={() => open(t.patient._id)}
                aria-current={openId === t.patient._id ? 'true' : undefined}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${openId === t.patient._id ? 'bg-primary-50' : ''}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-navy-900">{t.patient.fullName}</span>
                  <span className="shrink-0 text-xs text-gray-500">{timeOf(t.last.at)}</span>
                </span>
                <span className="text-xs text-gray-500">{t.patient.mrn}</span>
                <span className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-gray-600">{t.last.sender === 'staff' ? 'You: ' : ''}{t.last.text}</span>
                  {t.unread > 0 && <Badge tone="danger">{t.unread}</Badge>}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <section className={`card overflow-hidden ${openId ? '' : 'hidden lg:block'}`}>
          {openId ? (
            <>
              <button className="px-4 pt-3 text-sm font-semibold text-primary-700 hover:underline lg:hidden" onClick={() => setOpenId(null)}>Back to inbox</button>
              <MessageThread
                key={openId}
                loadPath={`/hospital/messages/inbox/${openId}`}
                sendPath={`/hospital/messages/inbox/${openId}`}
                mySide="staff"
                title={(data) => `${data.patient.fullName} (${data.patient.mrn})`}
              />
            </>
          ) : threads.length === 0 ? (
            <div className="p-6"><Empty title="Your inbox is empty" hint="When a patient messages the hospital it appears here straight away." /></div>
          ) : (
            <p className="flex h-[32rem] items-center justify-center text-sm text-gray-500">Choose a conversation.</p>
          )}
        </section>
      </div>

      {starting && (
        <Modal title="New message" onClose={() => setStarting(false)}>
          <div className="space-y-4">
            <Field label="Patient"><PatientPicker value={picked} onChange={setPicked} /></Field>
            <button className={btn.primary} disabled={!picked} onClick={() => open(picked._id)}>Open conversation</button>
          </div>
        </Modal>
      )}
    </div>
  );
}