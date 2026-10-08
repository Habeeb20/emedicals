import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from './api';
import { useFetch, useSocket, useSocketEvent } from './hooks';
import { Avatar, Badge, cx, EmptyState, Icon, Skeleton, Spinner } from './ui';
import { timeAgo } from './format';

const me = (user) => String(user?._id || user?.id);

export default function ChatPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const roomId = params.get('room');
  const [unread, setUnread] = useState({});
  const rooms = useFetch(() => api('/chat/rooms'), []);

  useSocketEvent('chat:unread', (e) => { if (e.roomId !== roomId) setUnread((u) => ({ ...u, [e.roomId]: true })); });

  const select = (id) => { setUnread((u) => ({ ...u, [id]: false })); const next = new URLSearchParams(params); next.set('room', id); setParams(next); };
  const back = () => { const next = new URLSearchParams(params); next.delete('room'); setParams(next); };
  const active = (rooms.data || []).find((r) => r._id === roomId);

  return (
    <div className="mx-auto flex h-[calc(100dvh-9.5rem)] w-full overflow-hidden rounded-2xl bg-white sm:h-[calc(100dvh-10.5rem)] border border-gray-200 shadow-sm">
      {/* Room list: full width on phones until a room is picked */}
      <aside className={cx('w-full flex-col border-r border-gray-200 md:flex md:w-80 md:shrink-0', roomId ? 'hidden' : 'flex')}>
        <div className="border-b border-gray-200 px-4 py-4"><h1 className="text-lg font-semibold text-navy-900">Messages</h1></div>
        <div className="flex-1 overflow-y-auto">
          {rooms.loading ? <div className="space-y-3 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
            : !rooms.data?.length ? <div className="p-4"><EmptyState icon="chat" title="No chats yet" body="Chat opens once a doctor accepts your appointment." /></div>
            : rooms.data.map((r) => {
              const other = r.participants.find((p) => String(p._id) !== me(user)) || {};
              return (
                <button key={r._id} onClick={() => select(r._id)} aria-current={r._id === roomId}
                  className={cx('flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus-visible:bg-primary-50', r._id === roomId && 'bg-primary-50')}>
                  <Avatar name={other.fullName} src={other.avatar?.url} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-navy-900">{other.fullName || 'Chat'}</span>
                      {r.lastMessageAt && <span className="shrink-0 text-xs text-gray-500">{timeAgo(r.lastMessageAt)}</span>}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-gray-600">
                      {r.type === 'quick' ? 'Quick chat' : 'Appointment'}{r.isClosed && <Badge>Closed</Badge>}
                      {unread[r._id] && <span className="ml-auto h-2.5 w-2.5 rounded-full bg-primary-600" aria-label="Unread messages" />}
                    </span>
                  </span>
                </button>
              );
            })}
        </div>
      </aside>

      <section className={cx('min-w-0 flex-1 flex-col md:flex', roomId ? 'flex' : 'hidden')}>
        {roomId ? <ChatWindow key={roomId} roomId={roomId} room={active} user={user} onBack={back} />
          : <div className="m-auto text-center text-gray-500"><Icon name="chat" className="mx-auto mb-2 h-8 w-8" />Pick a conversation</div>}
      </section>
    </div>
  );
}

function ChatWindow({ roomId, room, user, onBack }) {
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const [closed, setClosed] = useState(!!room?.isClosed);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState('');
  const bottom = useRef(null);
  const typingTimer = useRef(null);
  const other = room?.participants?.find((p) => String(p._id) !== me(user));

  useEffect(() => {
    let off = false;
    api(`/chat/rooms/${roomId}/messages`).then((r) => { if (!off) { setMessages(r.data); setClosed(!!r.meta?.isClosed); } })
      .catch((e) => setError(e.message)).finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, [roomId]);

  useEffect(() => {
    if (!socket) return undefined;
    const join = () => socket.emit('chat:join', { roomId }, (res) => { if (!res?.ok) setError(res?.error || 'Could not join chat'); else socket.emit('chat:read', { roomId }); });
    const onMsg = (m) => { if (m.room !== roomId) return; setMessages((l) => (l.some((x) => x._id === m._id) ? l : [...l, m])); socket.emit('chat:read', { roomId }); };
    const onTyping = (e) => { if (e.roomId === roomId && e.userId !== me(user)) setTyping(e.isTyping); };
    join();
    socket.on('connect', join); socket.on('chat:message', onMsg); socket.on('chat:typing', onTyping);
    return () => { socket.off('connect', join); socket.off('chat:message', onMsg); socket.off('chat:typing', onTyping); };
  }, [socket, roomId]); // eslint-disable-line

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages.length, typing]);

  const send = () => {
    const body = text.trim();
    if (!body || !socket) return;
    setText('');
    socket.emit('chat:typing', { roomId, isTyping: false });
    socket.emit('chat:send', { roomId, text: body }, (res) => {
      if (!res?.ok) { setError(res?.error || 'Message not sent'); setText(body); return; }
      setMessages((l) => (l.some((x) => x._id === res.message._id) ? l : [...l, res.message]));
    });
  };
  const onType = (v) => {
    setText(v);
    socket?.emit('chat:typing', { roomId, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket?.emit('chat:typing', { roomId, isTyping: false }), 1500);
  };

  const grouped = useMemo(() => messages, [messages]);

  return (
    <>
      <header className="flex items-center gap-3 border-b border-gray-200 px-3 py-3 sm:px-4">
        <button onClick={onBack} aria-label="Back to messages" className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"><Icon name="back" /></button>
        <Avatar name={other?.fullName} src={other?.avatar?.url} size="h-10 w-10" />
        <div className="min-w-0">
          <p className="truncate font-medium text-navy-900">{other?.fullName || 'Chat'}</p>
          <p className="text-xs text-gray-500">{typing ? 'typing...' : room?.type === 'quick' ? 'Quick chat' : 'Appointment chat'}</p>
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 px-3 py-4 sm:px-5" role="log" aria-live="polite">
        {loading ? <div className="flex justify-center py-8 text-primary-600"><Spinner /></div> : grouped.map((m) => {
          const mine = String(m.sender?._id || m.sender) === me(user);
          return (
            <div key={m._id} className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cx('max-w-[82%] rounded-2xl px-3.5 py-2 text-sm sm:max-w-[70%]', mine ? 'rounded-br-md bg-primary-600 text-white' : 'rounded-bl-md border border-gray-200 bg-white text-navy-900')}>
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className={cx('mt-1 text-[11px]', mine ? 'text-primary-100' : 'text-gray-500')}>{new Date(m.createdAt).toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' })}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {error && <p role="alert" className="bg-danger-light px-4 py-2 text-sm text-danger-dark">{error}</p>}
      {closed ? (
        <p className="border-t border-gray-200 bg-gray-50 px-4 py-4 text-center text-sm text-gray-600">This chat is closed.</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2 border-t border-gray-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <textarea rows={1} value={text} onChange={(e) => onType(e.target.value)} maxLength={4000} aria-label="Message"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Write a message" className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
          <button type="submit" disabled={!text.trim()} aria-label="Send" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-40"><Icon name="send" /></button>
        </form>
      )}
    </>
  );
}
