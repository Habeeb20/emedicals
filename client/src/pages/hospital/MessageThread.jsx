import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import api from '@/lib/api.js';
import { useApi, useAction, Spinner, ErrorNote, btn, inputCls } from './hospitalShared.jsx';

const timeOf = (at) => new Date(at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/*
 * One conversation. Used by both sides:
 *   loadPath: GET that returns { messages, ...header }
 *   sendPath: POST that takes { text }
 *   mySide:   'patient' or 'staff': my messages go on the right
 *   title:    (header) => text shown at the top
 */
export default function MessageThread({ loadPath, sendPath, mySide, title }) {
  const { data, loading, error } = useApi(loadPath, { live: ['hospital:message'] });
  const [text, setText] = useState('');
  const [run, busy] = useAction();
  const bottom = useRef(null);

  // Keep the newest message in view
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [data?.messages?.length]);

  const send = async (event) => {
    event?.preventDefault();
    if (!text.trim()) return;
    if (await run(() => api.post(sendPath, { text }))) setText('');
  };

  // Enter sends, Shift+Enter makes a new line
  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) send(event);
  };

  if (loading && !data) return <Spinner />;
  if (error && !data) return <ErrorNote message={error} />;

  return (
    <div className="flex h-[32rem] flex-col">
      <div className="border-b border-gray-200 px-4 py-3">
        <p className="font-semibold text-navy-900">{title(data)}</p>
        {data.patient && data.patient.hasAccount === false && (
          <p className="text-xs text-warning-dark">This patient has no eMedicals account, so they cannot read messages yet.</p>
        )}
      </div>

      <ul className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4" aria-live="polite">
        {data.messages.length === 0 && <li className="py-10 text-center text-sm text-gray-500">No messages yet. Say hello below.</li>}
        {data.messages.map((m) => {
          const mine = m.sender === mySide;
          return (
            <li key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${mine ? 'rounded-br-sm bg-primary-600 text-white' : 'rounded-bl-sm border border-gray-200 bg-white text-navy-800'}`}>
                {!mine && <p className="mb-0.5 text-xs font-semibold text-primary-700">{m.senderUser?.fullName}</p>}
                <p className="whitespace-pre-wrap break-words text-sm">{m.text}</p>
                <p className={`mt-1 text-[11px] ${mine ? 'text-primary-100' : 'text-gray-500'}`}>{timeOf(m.createdAt)}</p>
              </div>
            </li>
          );
        })}
        <li ref={bottom} aria-hidden="true" />
      </ul>

      <form onSubmit={send} className="flex items-end gap-2 border-t border-gray-200 p-3">
        <textarea
          className={`${inputCls} resize-none`}
          rows={2}
          maxLength={2000}
          placeholder="Write a message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Message"
        />
        <button className={btn.primary} disabled={busy || !text.trim()} aria-label="Send message"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}