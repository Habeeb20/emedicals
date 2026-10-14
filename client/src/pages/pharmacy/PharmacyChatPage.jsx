

// import { useCallback, useEffect, useRef, useState } from 'react';
// import { createPortal } from 'react-dom';
// import { Link, useSearchParams } from 'react-router-dom';
// import api, { getErrorMessage } from './api';
// import { Avatar, Card, EmptyState, ErrorNote, PageHeader, PageShell, Skeleton } from '../appointments/ui';
// import { PharmacyNav, Pill, field, ghostBtn, money, primaryBtn } from './PharmacyShared';
// import { getSocket } from './pharmacySocket';

// const timeLeft = (iso) => {
//   const ms = new Date(iso).getTime() - Date.now();
//   if (ms <= 0) return null;
//   const h = Math.floor(ms / 3600000);
//   const m = Math.floor((ms % 3600000) / 60000);
//   return h ? `${h}h ${m}m` : `${m}m`;
// };

// const DESKTOP_QUERY = '(min-width: 1024px)';

// /* ------------------------------ hooks ------------------------------ */

// // True on lg+ screens (two-pane layout), false on phones/tablets (full-screen sheet)
// function useIsDesktop() {
//   const [match, setMatch] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
//   useEffect(() => {
//     const mq = window.matchMedia(DESKTOP_QUERY);
//     const handler = (e) => setMatch(e.matches);
//     setMatch(mq.matches);
//     mq.addEventListener('change', handler);
//     return () => mq.removeEventListener('change', handler);
//   }, []);
//   return match;
// }

// // Tracks the visible area so the sheet shrinks when the mobile keyboard opens
// function useVisualViewport(active) {
//   const read = () => ({
//     height: window.visualViewport?.height ?? window.innerHeight,
//     top: window.visualViewport?.offsetTop ?? 0,
//   });
//   const [vp, setVp] = useState(read);

//   useEffect(() => {
//     if (!active) return;
//     const vv = window.visualViewport;
//     const update = () => setVp(read());
//     update();
//     if (!vv) {
//       window.addEventListener('resize', update);
//       return () => window.removeEventListener('resize', update);
//     }
//     vv.addEventListener('resize', update);
//     vv.addEventListener('scroll', update);
//     return () => {
//       vv.removeEventListener('resize', update);
//       vv.removeEventListener('scroll', update);
//     };
//   }, [active]);

//   return vp;
// }

// /* ------------------------------ plans (patients) ------------------------------ */
// function PlansPanel({ plans, wallet, onBuy, buying, highlight }) {
//   return (
//     <Card className={`space-y-3 ${highlight ? 'ring-2 ring-pharmacy-500' : ''}`}>
//       <div className="flex items-center justify-between">
//         <h2 className="font-semibold text-navy-900">Chat passes</h2>
//         <Pill tone={wallet?.passes ? 'pharmacy' : 'warning'}>{wallet?.passes ?? 0} left</Pill>
//       </div>
//       <p className="text-sm text-gray-600">One pass opens a 24-hour chat with any pharmacy. Messages inside that window are free. Pay only for what you use.</p>
//       <ul className="space-y-2">
//         {plans.map((p) => (
//           <li key={p.id}>
//             <button
//               type="button"
//               disabled={!!buying}
//               onClick={() => onBuy(p.id)}
//               className="flex w-full items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-left ring-1 ring-gray-200 transition hover:bg-pharmacy-50 disabled:opacity-60"
//             >
//               <span>
//                 <span className="block text-sm font-semibold text-navy-900">{p.name} · {p.passes} passes</span>
//                 <span className="text-xs text-gray-500">{money(Math.round(p.price / p.passes))} per chat</span>
//               </span>
//               <span className="shrink-0 text-sm font-bold text-pharmacy-700">{buying === p.id ? 'Opening…' : money(p.price)}</span>
//             </button>
//           </li>
//         ))}
//       </ul>
//     </Card>
//   );
// }

// /* ------------------------------ a single conversation ------------------------------ */
// function ChatRoomView({ roomId, staff, onBack, onRenew, onActivity }) {
//   const [data, setData] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [text, setText] = useState('');
//   const [error, setError] = useState('');
//   const [typing, setTyping] = useState(false);
//   const [sending, setSending] = useState(false);
//   const [renewing, setRenewing] = useState(false);
//   const [, tick] = useState(0);

//   const bottom = useRef(null);
//   const inputRef = useRef(null);
//   const typingTimer = useRef(null);
//   const typingSent = useRef(false);
//   const firstScroll = useRef(true);

//   // Load history
//   useEffect(() => {
//     let off = false;
//     api.get(`/pharmacy-chat/rooms/${roomId}/messages`)
//       .then((r) => { if (!off) { setData(r.data.data); setMessages(r.data.messages || []); } })
//       .catch((e) => { if (!off) setError(getErrorMessage(e)); });
//     return () => { off = true; };
//   }, [roomId]);

//   // Live updates
//   useEffect(() => {
//     const socket = getSocket();
//     const join = () => socket.emit('chat:join', { roomId }, (ack) => {
//       if (!ack?.ok) setError(ack?.error || 'Could not join this chat');
//       else socket.emit('chat:read', { roomId });
//     });
//     const onMsg = (m) => {
//       if (String(m.room) !== String(roomId)) return;
//       setMessages((l) => (l.some((x) => x._id === m._id) ? l : [...l, m]));
//       setTyping(false);
//       socket.emit('chat:read', { roomId });
//     };
//     const onTyping = (t) => { if (String(t.roomId) === String(roomId)) setTyping(!!t.isTyping); };

//     // Show the real reason the socket can't connect (auth, CORS, wrong URL...)
//     const onConnectError = (err) => setError(`Chat connection failed: ${err?.message || 'unknown error'}`);
//     const onConnectOk = () => setError((e) => (e.startsWith('Chat connection failed') || e.startsWith('Not connected') ? '' : e));

//     if (!socket.connected) socket.connect();
//     join();
//     socket.on('connect', join);
//     socket.on('connect', onConnectOk);
//     socket.on('connect_error', onConnectError);
//     socket.on('chat:message', onMsg);
//     socket.on('chat:typing', onTyping);
//     return () => {
//       socket.off('connect', join);
//       socket.off('connect', onConnectOk);
//       socket.off('connect_error', onConnectError);
//       socket.off('chat:message', onMsg);
//       socket.off('chat:typing', onTyping);
//       clearTimeout(typingTimer.current);
//       if (typingSent.current) socket.emit('chat:typing', { roomId, isTyping: false });
//     };
//   }, [roomId]);

//   // Scroll to newest message (instant on first load, smooth afterwards)
//   useEffect(() => {
//     if (!data) return;
//     bottom.current?.scrollIntoView({ behavior: firstScroll.current ? 'auto' : 'smooth', block: 'end' });
//     firstScroll.current = false;
//   }, [messages, typing, data]);

//   // Keep "session ends in" fresh
//   useEffect(() => {
//     const t = setInterval(() => tick((n) => n + 1), 30000);
//     return () => clearInterval(t);
//   }, []);

//   const room = data?.room;

//   // Flip to the expired state exactly when the session ends
//   useEffect(() => {
//     if (!room?.sessionExpiresAt) return;
//     const ms = new Date(room.sessionExpiresAt).getTime() - Date.now();
//     if (ms <= 0) return;
//     const t = setTimeout(() => tick((n) => n + 1), Math.min(ms + 250, 2147483647));
//     return () => clearTimeout(t);
//   }, [room?.sessionExpiresAt]);

//   const expired = !staff && room && !(room.sessionExpiresAt && new Date(room.sessionExpiresAt) > new Date());
//   const left = room?.sessionExpiresAt ? timeLeft(room.sessionExpiresAt) : null;
//   const other = staff ? (room?.patient?.fullName || 'Patient') : room?.pharmacy?.name;

//   const stopTyping = () => {
//     clearTimeout(typingTimer.current);
//     if (typingSent.current) {
//       getSocket().emit('chat:typing', { roomId, isTyping: false });
//       typingSent.current = false;
//     }
//   };

//   const send = (e) => {
//     e.preventDefault();
//     const body = text.trim();
//     if (!body || sending) return;

//     const socket = getSocket();
//     if (!socket.connected) {
//       socket.connect();
//       setError('Not connected. Reconnecting, please try again in a moment.');
//       return;
//     }

//     setSending(true);
//     setError('');
//     stopTyping();

//     // Safety net: if the server never calls the ack, don't leave the button stuck
//     const timeout = setTimeout(() => {
//       setSending(false);
//       setError('No response from server. Please try again.');
//     }, 10000);

//     socket.emit('chat:send', { roomId, text: body }, (ack) => {
//       clearTimeout(timeout);
//       setSending(false);
//       if (ack?.ok) {
//         setText('');
//         setMessages((l) => (l.some((x) => x._id === ack.message._id) ? l : [...l, ack.message]));
//         onActivity?.();
//         // Keep the keyboard open, like WhatsApp
//         inputRef.current?.focus();
//       } else if (ack?.code === 'SESSION_EXPIRED') {
//         setData((d) => ({ ...d, room: { ...d.room, sessionExpiresAt: new Date(0).toISOString() } }));
//       } else {
//         setError(ack?.error || 'Could not send');
//       }
//     });
//   };

//   const onType = (e) => {
//     setText(e.target.value);
//     const s = getSocket();
//     if (!typingSent.current) {
//       s.emit('chat:typing', { roomId, isTyping: true });
//       typingSent.current = true;
//     }
//     clearTimeout(typingTimer.current);
//     typingTimer.current = setTimeout(() => {
//       s.emit('chat:typing', { roomId, isTyping: false });
//       typingSent.current = false;
//     }, 1500);
//   };

//   const renew = async () => {
//     if (renewing) return;
//     setRenewing(true);
//     try {
//       const r = await onRenew(room.pharmacy._id);
//       const expiresAt = r.sessionExpiresAt ?? r.data?.sessionExpiresAt ?? r.room?.sessionExpiresAt ?? r.data?.room?.sessionExpiresAt;
//       if (expiresAt) setData((d) => ({ ...d, room: { ...d.room, sessionExpiresAt: expiresAt } }));
//       setError('');
//     } catch (e) {
//       setError(getErrorMessage(e));
//     } finally {
//       setRenewing(false);
//     }
//   };

//   if (!data && !error) return <Skeleton className="h-[70dvh] rounded-2xl" />;
//   if (!data) return <EmptyState icon="search" title="Can't open this chat" body={error} />;

//   return (
//     <div className="flex h-full flex-col overflow-hidden bg-white lg:h-[75dvh] lg:min-h-[28rem] lg:rounded-2xl lg:ring-1 lg:ring-gray-200">
//       {/* header */}
//       <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:pt-3">
//         <button type="button" onClick={onBack} aria-label="Back to chats" className="h-9 w-9 rounded-full text-lg text-gray-600 hover:bg-gray-100 lg:hidden">←</button>
//         <Avatar tone="pharmacy" name={other} />
//         <div className="min-w-0 flex-1">
//           <p className="truncate font-semibold text-navy-900">{other}</p>
//           {!staff && <p className="text-xs text-gray-500">{left ? `Session ends in ${left}` : 'Session ended'}</p>}
//         </div>
//       </div>

//       {/* messages */}
//       <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-gray-50 px-3 py-4" aria-live="polite">
//         {messages.length === 0 && (
//           <p className="py-10 text-center text-sm text-gray-500">
//             {staff ? 'No messages yet.' : 'Say hello and describe what you need. Mention the drug name and any allergies.'}
//           </p>
//         )}
//         {messages.map((m) => {
//           const mine = String(m.sender?._id ?? m.sender) === String(data.me);
//           return (
//             <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
//               <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${mine ? 'rounded-br-md bg-pharmacy-600 text-white' : 'rounded-bl-md bg-white text-navy-900 ring-1 ring-gray-200'}`}>
//                 {!mine && m.sender?.role === 'pharmacist' && !staff && <span className="mb-0.5 block text-xs font-medium text-pharmacy-700">Pharmacist</span>}
//                 {m.text}
//                 <span className={`mt-1 block text-[10px] ${mine ? 'text-pharmacy-100' : 'text-gray-400'}`}>
//                   {new Date(m.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
//                 </span>
//               </div>
//             </div>
//           );
//         })}
//         {typing && <p className="text-xs text-gray-500">Typing…</p>}
//         <div ref={bottom} />
//       </div>

//       {/* composer */}
//       <div className="shrink-0 border-t border-gray-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-3">
//         {error && <p role="alert" className="mb-2 text-sm text-danger-dark">{error}</p>}
//         {expired ? (
//           <div className="flex flex-col items-center gap-2 text-center">
//             <p className="text-sm text-gray-700">This session has ended. Start a new 24-hour session to keep chatting. It uses one chat pass.</p>
//             <button type="button" onClick={renew} disabled={renewing} className={`${primaryBtn} disabled:opacity-60`}>
//               {renewing ? 'Starting…' : 'Start new session'}
//             </button>
//           </div>
//         ) : (
//           <form onSubmit={send} className="flex gap-2">
//             <input
//               ref={inputRef}
//               value={text}
//               onChange={onType}
//               maxLength={4000}
//               enterKeyHint="send"
//               autoComplete="off"
//               placeholder="Type a message"
//               aria-label="Message"
//               className={`${field} h-11 flex-1 !text-base`}
//             />
//             <button type="submit" disabled={!text.trim() || sending} className={primaryBtn}>Send</button>
//           </form>
//         )}
//         {!staff && <p className="mt-2 text-center text-[11px] text-gray-500">For emergencies, go to the nearest hospital. Pharmacists can't diagnose over chat.</p>}
//       </div>
//     </div>
//   );
// }

// /* ------------------------------ page ------------------------------ */
// export default function PharmacyChatPage({ staff = false }) {
//   // The dashboard routes by ?tab=..., so the open chat lives in ?roomId=... (not a path param)
//   const [sp, setSp] = useSearchParams();
//   const roomId = sp.get('roomId');
//   const tabKey = staff ? 'pharmacy-chats' : 'pharmacy-chat';

//   const openRoom = useCallback((id) => {
//     setSp((prev) => {
//       const next = new URLSearchParams(prev);
//       next.set('tab', tabKey);
//       next.set('roomId', id);
//       next.delete('need');
//       return next;
//     });
//   }, [setSp, tabKey]);

//   const closeRoom = useCallback(() => {
//     setSp((prev) => {
//       const next = new URLSearchParams(prev);
//       next.delete('roomId');
//       return next;
//     });
//   }, [setSp]);

//   const [rooms, setRooms] = useState(null);
//   const [plans, setPlans] = useState([]);
//   const [wallet, setWallet] = useState(null);
//   const [buying, setBuying] = useState('');
//   const [error, setError] = useState('');
//   const [notice, setNotice] = useState('');

//   const isDesktop = useIsDesktop();
//   const sheetOpen = !!roomId && !isDesktop;
//   const vp = useVisualViewport(sheetOpen);
//   const verified = useRef(false);

//   const loadRooms = useCallback(
//     () => api.get('/pharmacy-chat/rooms').then((r) => setRooms(r.data?.data || [])).catch((e) => { setRooms([]); setError(getErrorMessage(e)); }),
//     []
//   );
//   const loadWallet = useCallback(
//     () => api.get('/chat-plans/me').then((r) => setWallet(r.data?.data)).catch(() => {}),
//     []
//   );

//   useEffect(() => {
//     loadRooms();
//     if (!staff) {
//       api.get('/chat-plans').then((r) => setPlans(r.data?.data || [])).catch(() => {});
//       loadWallet();
//     }
//   }, [staff, loadRooms, loadWallet]);

//   // Returning from the payment page: confirm the payment and credit the passes (runs once)
//   useEffect(() => {
//     const ref = sp.get('reference') || sp.get('trxref');
//     if (!ref || staff || verified.current) return;
//     verified.current = true;
//     api.get(`/chat-plans/verify/${ref}`)
//       .then((r) => { setNotice(r.data.message); loadWallet(); })
//       .catch((e) => setError(getErrorMessage(e)))
//       .finally(() => setSp((prev) => {
//         // keep ?tab= so the dashboard doesn't fall back to the first page
//         const next = new URLSearchParams(prev);
//         next.delete('reference');
//         next.delete('trxref');
//         return next;
//       }, { replace: true }));
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // Refresh the list when something new arrives
//   useEffect(() => {
//     const s = getSocket();
//     s.on('chat:unread', loadRooms);
//     return () => s.off('chat:unread', loadRooms);
//   }, [loadRooms]);

//   // Lock background scroll while the mobile sheet is open
//   useEffect(() => {
//     if (!sheetOpen) return;
//     const prev = document.body.style.overflow;
//     document.body.style.overflow = 'hidden';
//     return () => { document.body.style.overflow = prev; };
//   }, [sheetOpen]);

//   // Escape closes the conversation
//   useEffect(() => {
//     if (!roomId) return;
//     const onKey = (e) => { if (e.key === 'Escape') closeRoom(); };
//     window.addEventListener('keydown', onKey);
//     return () => window.removeEventListener('keydown', onKey);
//   }, [roomId, closeRoom]);

//   const buy = async (planId) => {
//     setBuying(planId);
//     setError('');
//     try {
//       // axios sends the payload from `data`, not `body`
//       const r = await api.post('/chat-plans/checkout', { planId });
//       const url = r.data?.authorizationUrl ?? r.data?.data?.authorizationUrl;
//       if (!url) throw new Error('No payment link returned. Please try again.');
//       window.location.href = url;
//     } catch (e) {
//       setError(getErrorMessage(e));
//       setBuying('');
//     }
//   };

//   const renew = async (pharmacyId) => {
//     const r = await api.post('/pharmacy-chat/rooms', { pharmacyId });
//     loadWallet();
//     loadRooms();
//     return r.data;
//   };

//   const needPass = sp.get('need') === 'pass';

//   const chat = roomId ? (
//     <ChatRoomView key={roomId} roomId={roomId} staff={staff} onBack={closeRoom} onRenew={renew} onActivity={loadRooms} />
//   ) : null;

//   return (
//     <PageShell className="max-w-5xl">
//       <PageHeader
//         title={staff ? 'Patient chats' : 'Chat with a pharmacist'}
//         subtitle={staff ? 'Messages from patients to your pharmacy.' : 'Ask about a drug, dosage or availability.'}
//       />
//       {staff && <PharmacyNav />}
//       <div className="mb-4 space-y-2">
//         <ErrorNote>{error}</ErrorNote>
//         {notice && <p role="status" className="rounded-xl bg-success-light px-4 py-3 text-sm text-success-dark">{notice}</p>}
//         {needPass && !wallet?.passes && (
//           <p role="status" className="rounded-xl bg-warning-light px-4 py-3 text-sm text-warning-dark">
//             You need a chat pass first. Pick a plan below, then return to the pharmacy and tap Chat.
//           </p>
//         )}
//       </div>

//       <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
//         {/* list stays mounted under the mobile sheet so it keeps its scroll position */}
//         <div className="space-y-4">
//           {!staff && <PlansPanel plans={plans} wallet={wallet} onBuy={buy} buying={buying} highlight={needPass} />}
//           <Card className="!p-0">
//             <h2 className="border-b border-gray-100 px-4 py-3 font-semibold text-navy-900">{staff ? 'Conversations' : 'Your chats'}</h2>
//             {!rooms ? (
//               <div className="p-4"><Skeleton className="h-16 rounded-xl" /></div>
//             ) : rooms.length === 0 ? (
//               <p className="px-4 py-6 text-sm text-gray-600">
//                 {staff
//                   ? 'No patient has messaged your pharmacy yet.'
//                   : <>No chats yet. <Link to="/pharmacies" className="font-medium text-pharmacy-700">Find a pharmacy</Link> to start one.</>}
//               </p>
//             ) : (
//               <ul className="divide-y divide-gray-100">
//                 {rooms.map((r) => {
//                   const name = staff ? (r.patient?.fullName || 'Patient') : r.pharmacy?.name;
//                   return (
//                     <li key={r._id}>
//                       <button
//                         type="button"
//                         onClick={() => openRoom(r._id)}
//                         className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-pharmacy-50 ${r._id === roomId ? 'bg-pharmacy-50' : ''}`}
//                       >
//                         <Avatar tone="pharmacy" name={name} />
//                         <span className="min-w-0 flex-1">
//                           <span className="block truncate text-sm font-medium text-navy-900">{name}</span>
//                           <span className="block truncate text-xs text-gray-500">{r.lastMessage?.text || 'No messages yet'}</span>
//                         </span>
//                         {!staff && r.sessionActive && <Pill tone="success">Open</Pill>}
//                       </button>
//                     </li>
//                   );
//                 })}
//               </ul>
//             )}
//           </Card>
//         </div>

//         {/* desktop right pane */}
//         <div className={roomId ? '' : 'hidden lg:block'}>
//           {!roomId ? (
//             <EmptyState
//               icon="pill"
//               title="Pick a conversation"
//               body={staff ? 'Choose a patient on the left to reply.' : 'Choose a chat on the left, or find a pharmacy to start a new one.'}
//             />
//           ) : isDesktop ? (
//             chat
//           ) : null}
//         </div>
//       </div>

//       {!staff && <p className="mt-4 text-center"><Link to="/pharmacies" className={ghostBtn}>Find a pharmacy</Link></p>}

//       {/* mobile: full-screen conversation sheet, portaled so no parent can clip it */}
//       {sheetOpen && createPortal(
//         <div
//           className="chat-sheet fixed left-0 z-50 w-full bg-white"
//           style={{ top: vp.top, height: vp.height }}
//           role="dialog"
//           aria-modal="true"
//           aria-label="Conversation"
//         >
//           <style>{`
//             @keyframes chatSheetIn { from { transform: translateX(100%); } to { transform: none; } }
//             .chat-sheet { animation: chatSheetIn .2s ease-out; }
//             @media (prefers-reduced-motion: reduce) { .chat-sheet { animation: none; } }
//           `}</style>
//           {chat}
//         </div>,
//         document.body
//       )}
//     </PageShell>
//   );
// }





import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import api, { getErrorMessage } from './api';
import { Avatar, Card, EmptyState, ErrorNote, PageHeader, PageShell, Skeleton } from '../appointments/ui';
import { PharmacyNav, Pill, field, ghostBtn, money, primaryBtn } from './PharmacyShared';
import { getSocket } from './pharmacySocket';

const timeLeft = (iso) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h ? `${h}h ${m}m` : `${m}m`;
};

const DESKTOP_QUERY = '(min-width: 1024px)';

/* ------------------------------ hooks ------------------------------ */

// True on lg+ screens (two-pane layout), false on phones/tablets (full-screen sheet)
function useIsDesktop() {
  const [match, setMatch] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const handler = (e) => setMatch(e.matches);
    setMatch(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return match;
}

// Tracks the visible area so the sheet shrinks when the mobile keyboard opens
function useVisualViewport(active) {
  const read = () => ({
    height: window.visualViewport?.height ?? window.innerHeight,
    top: window.visualViewport?.offsetTop ?? 0,
  });
  const [vp, setVp] = useState(read);

  useEffect(() => {
    if (!active) return;
    const vv = window.visualViewport;
    const update = () => setVp(read());
    update();
    if (!vv) {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [active]);

  return vp;
}

/* ------------------------------ plans (patients) ------------------------------ */
function PlansPanel({ plans, wallet, onBuy, buying, highlight }) {
  return (
    <Card className={`space-y-3 ${highlight ? 'ring-2 ring-pharmacy-500' : ''}`}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-navy-900">Chat passes</h2>
        <Pill tone={wallet?.passes ? 'pharmacy' : 'warning'}>{wallet?.passes ?? 0} left</Pill>
      </div>
      <p className="text-sm text-gray-600">One pass opens a 24-hour chat with any pharmacy. Messages inside that window are free. Pay only for what you use.</p>
      <ul className="space-y-2">
        {plans.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              disabled={!!buying}
              onClick={() => onBuy(p.id)}
              className="flex w-full items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-left ring-1 ring-gray-200 transition hover:bg-pharmacy-50 disabled:opacity-60"
            >
              <span>
                <span className="block text-sm font-semibold text-navy-900">{p.name} · {p.passes} passes</span>
                <span className="text-xs text-gray-500">{money(Math.round(p.price / p.passes))} per chat</span>
              </span>
              <span className="shrink-0 text-sm font-bold text-pharmacy-700">{buying === p.id ? 'Opening…' : money(p.price)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ------------------------------ a single conversation ------------------------------ */
function ChatRoomView({ roomId, staff, onBack, onRenew, onActivity }) {
  const [data, setData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [, tick] = useState(0);

  const bottom = useRef(null);
  const inputRef = useRef(null);
  const typingTimer = useRef(null);
  const typingSent = useRef(false);
  const firstScroll = useRef(true);

  // Load history
  useEffect(() => {
    let off = false;
    api.get(`/pharmacy-chat/rooms/${roomId}/messages`)
      .then((r) => { if (!off) { setData(r.data.data); setMessages(r.data.data?.messages ?? r.data.messages ?? []); } })
      .catch((e) => { if (!off) setError(getErrorMessage(e)); });
    return () => { off = true; };
  }, [roomId]);

  // Live updates
  useEffect(() => {
    const socket = getSocket();
    const join = () => socket.emit('chat:join', { roomId }, (ack) => {
      if (!ack?.ok) setError(ack?.error || 'Could not join this chat');
      else socket.emit('chat:read', { roomId });
    });
    const onMsg = (m) => {
      if (String(m.room) !== String(roomId)) return;
      setMessages((l) => (l.some((x) => x._id === m._id) ? l : [...l, m]));
      setTyping(false);
      socket.emit('chat:read', { roomId });
    };
    const onTyping = (t) => { if (String(t.roomId) === String(roomId)) setTyping(!!t.isTyping); };

    // Show the real reason the socket can't connect (auth, CORS, wrong URL...)
    const onConnectError = (err) => setError(`Chat connection failed: ${err?.message || 'unknown error'}`);
    const onConnectOk = () => setError((e) => (e.startsWith('Chat connection failed') || e.startsWith('Not connected') ? '' : e));

    if (!socket.connected) socket.connect();
    join();
    socket.on('connect', join);
    socket.on('connect', onConnectOk);
    socket.on('connect_error', onConnectError);
    socket.on('chat:message', onMsg);
    socket.on('chat:typing', onTyping);
    return () => {
      socket.off('connect', join);
      socket.off('connect', onConnectOk);
      socket.off('connect_error', onConnectError);
      socket.off('chat:message', onMsg);
      socket.off('chat:typing', onTyping);
      clearTimeout(typingTimer.current);
      if (typingSent.current) socket.emit('chat:typing', { roomId, isTyping: false });
    };
  }, [roomId]);

  // Scroll to newest message (instant on first load, smooth afterwards)
  useEffect(() => {
    if (!data) return;
    bottom.current?.scrollIntoView({ behavior: firstScroll.current ? 'auto' : 'smooth', block: 'end' });
    firstScroll.current = false;
  }, [messages, typing, data]);

  // Keep "session ends in" fresh
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const room = data?.room;

  // Flip to the expired state exactly when the session ends
  useEffect(() => {
    if (!room?.sessionExpiresAt) return;
    const ms = new Date(room.sessionExpiresAt).getTime() - Date.now();
    if (ms <= 0) return;
    const t = setTimeout(() => tick((n) => n + 1), Math.min(ms + 250, 2147483647));
    return () => clearTimeout(t);
  }, [room?.sessionExpiresAt]);

  const expired = !staff && room && !(room.sessionExpiresAt && new Date(room.sessionExpiresAt) > new Date());
  const left = room?.sessionExpiresAt ? timeLeft(room.sessionExpiresAt) : null;
  const other = staff ? (room?.patient?.fullName || 'Patient') : room?.pharmacy?.name;

  const stopTyping = () => {
    clearTimeout(typingTimer.current);
    if (typingSent.current) {
      getSocket().emit('chat:typing', { roomId, isTyping: false });
      typingSent.current = false;
    }
  };

  const send = (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;

    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
      setError('Not connected. Reconnecting, please try again in a moment.');
      return;
    }

    setSending(true);
    setError('');
    stopTyping();

    // Safety net: if the server never calls the ack, don't leave the button stuck
    const timeout = setTimeout(() => {
      setSending(false);
      setError('No response from server. Please try again.');
    }, 10000);

    socket.emit('chat:send', { roomId, text: body }, (ack) => {
      clearTimeout(timeout);
      setSending(false);
      if (ack?.ok) {
        setText('');
        setMessages((l) => (l.some((x) => x._id === ack.message._id) ? l : [...l, ack.message]));
        onActivity?.();
        // Keep the keyboard open, like WhatsApp
        inputRef.current?.focus();
      } else if (ack?.code === 'SESSION_EXPIRED') {
        setData((d) => ({ ...d, room: { ...d.room, sessionExpiresAt: new Date(0).toISOString() } }));
      } else {
        setError(ack?.error || 'Could not send');
      }
    });
  };

  const onType = (e) => {
    setText(e.target.value);
    const s = getSocket();
    if (!typingSent.current) {
      s.emit('chat:typing', { roomId, isTyping: true });
      typingSent.current = true;
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      s.emit('chat:typing', { roomId, isTyping: false });
      typingSent.current = false;
    }, 1500);
  };

  const renew = async () => {
    if (renewing) return;
    setRenewing(true);
    try {
      const r = await onRenew(room.pharmacy._id);
      const expiresAt = r.sessionExpiresAt ?? r.data?.sessionExpiresAt ?? r.room?.sessionExpiresAt ?? r.data?.room?.sessionExpiresAt;
      if (expiresAt) setData((d) => ({ ...d, room: { ...d.room, sessionExpiresAt: expiresAt } }));
      setError('');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setRenewing(false);
    }
  };

  if (!data && !error) return <Skeleton className="h-[70dvh] rounded-2xl" />;
  if (!data) return <EmptyState icon="search" title="Can't open this chat" body={error} />;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white lg:h-[calc(90dvh-13rem)] lg:min-h-[16rem] lg:rounded-2xl lg:ring-1 lg:ring-gray-200">
    {/* // <div className="flex h-full flex-col overflow-hidden bg-white lg:h-[75dvh] lg:min-h-[28rem] lg:rounded-2xl lg:ring-1 lg:ring-gray-200"> */}
      {/* header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:pt-3">
        <button type="button" onClick={onBack} aria-label="Back to chats" className="h-9 w-9 rounded-full text-lg text-gray-600 hover:bg-gray-100 lg:hidden">←</button>
        <Avatar tone="pharmacy" name={other} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-navy-900">{other}</p>
          {!staff && <p className="text-xs text-gray-500">{left ? `Session ends in ${left}` : 'Session ended'}</p>}
        </div>
      </div>

      {/* messages */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-gray-50 px-3 py-4" aria-live="polite">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-500">
            {staff ? 'No messages yet.' : 'Say hello and describe what you need. Mention the drug name and any allergies.'}
          </p>
        )}
        {messages.map((m) => {
          const mine = String(m.sender?._id ?? m.sender) === String(data.me);
          return (
            <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${mine ? 'rounded-br-md bg-pharmacy-600 text-white' : 'rounded-bl-md bg-white text-navy-900 ring-1 ring-gray-200'}`}>
                {!mine && m.sender?.role === 'pharmacist' && !staff && <span className="mb-0.5 block text-xs font-medium text-pharmacy-700">Pharmacist</span>}
                {m.text}
                <span className={`mt-1 block text-[10px] ${mine ? 'text-pharmacy-100' : 'text-gray-400'}`}>
                  {new Date(m.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        {typing && <p className="text-xs text-gray-500">Typing…</p>}
        <div ref={bottom} />
      </div>

      {/* composer */}
      <div className="shrink-0 border-t border-gray-100 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-3">
        {error && <p role="alert" className="mb-2 text-sm text-danger-dark">{error}</p>}
        {expired ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-gray-700">This session has ended. Start a new 24-hour session to keep chatting. It uses one chat pass.</p>
            <button type="button" onClick={renew} disabled={renewing} className={`${primaryBtn} disabled:opacity-60`}>
              {renewing ? 'Starting…' : 'Start new session'}
            </button>
          </div>
        ) : (
          <form onSubmit={send} className="flex gap-2">
            <input
              ref={inputRef}
              value={text}
              onChange={onType}
              maxLength={4000}
              enterKeyHint="send"
              autoComplete="off"
              placeholder="Type a message"
              aria-label="Message"
              className={`${field} h-11 flex-1 !text-base`}
            />
            <button type="submit" disabled={!text.trim() || sending} className={primaryBtn}>Send</button>
          </form>
        )}
        {!staff && <p className="mt-2 text-center text-[11px] text-gray-500">For emergencies, go to the nearest hospital. Pharmacists can't diagnose over chat.</p>}
      </div>
    </div>
  );
}

/* ------------------------------ page ------------------------------ */
export default function PharmacyChatPage({ staff = false }) {
  // The dashboard routes by ?tab=..., so the open chat lives in ?roomId=... (not a path param)
  const [sp, setSp] = useSearchParams();
  const roomId = sp.get('roomId');
  const tabKey = staff ? 'pharmacy-chats' : 'pharmacy-chat';

  const openRoom = useCallback((id) => {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabKey);
      next.set('roomId', id);
      next.delete('need');
      return next;
    });
  }, [setSp, tabKey]);

  const closeRoom = useCallback(() => {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('roomId');
      return next;
    });
  }, [setSp]);

  const [rooms, setRooms] = useState(null);
  const [plans, setPlans] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [buying, setBuying] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isDesktop = useIsDesktop();
  const sheetOpen = !!roomId && !isDesktop;
  const vp = useVisualViewport(sheetOpen);
  const verified = useRef(false);

  const loadRooms = useCallback(
    () => api.get('/pharmacy-chat/rooms').then((r) => setRooms(r.data?.data || [])).catch((e) => { setRooms([]); setError(getErrorMessage(e)); }),
    []
  );
  const loadWallet = useCallback(
    () => api.get('/chat-plans/me').then((r) => setWallet(r.data?.data)).catch(() => {}),
    []
  );

  useEffect(() => {
    loadRooms();
    if (!staff) {
      api.get('/chat-plans').then((r) => setPlans(r.data?.data || [])).catch(() => {});
      loadWallet();
    }
  }, [staff, loadRooms, loadWallet]);

  // Returning from the payment page: confirm the payment and credit the passes (runs once)
  useEffect(() => {
    const ref = sp.get('reference') || sp.get('trxref');
    if (!ref || staff || verified.current) return;
    verified.current = true;
    api.get(`/chat-plans/verify/${ref}`)
      .then((r) => { setNotice(r.data.message); loadWallet(); })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setSp((prev) => {
        // keep ?tab= so the dashboard doesn't fall back to the first page
        const next = new URLSearchParams(prev);
        next.delete('reference');
        next.delete('trxref');
        return next;
      }, { replace: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh the list when something new arrives
  useEffect(() => {
    const s = getSocket();
    s.on('chat:unread', loadRooms);
    return () => s.off('chat:unread', loadRooms);
  }, [loadRooms]);

  // Lock background scroll while the mobile sheet is open
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [sheetOpen]);

  // Escape closes the conversation
  useEffect(() => {
    if (!roomId) return;
    const onKey = (e) => { if (e.key === 'Escape') closeRoom(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [roomId, closeRoom]);

  const buy = async (planId) => {
    setBuying(planId);
    setError('');
    try {
      // axios sends the payload from `data`, not `body`
      const r = await api.post('/chat-plans/checkout', { planId });
      const url = r.data?.authorizationUrl ?? r.data?.data?.authorizationUrl;
      if (!url) throw new Error('No payment link returned. Please try again.');
      window.location.href = url;
    } catch (e) {
      setError(getErrorMessage(e));
      setBuying('');
    }
  };

  const renew = async (pharmacyId) => {
    const r = await api.post('/pharmacy-chat/rooms', { pharmacyId });
    loadWallet();
    loadRooms();
    return r.data;
  };

  const needPass = sp.get('need') === 'pass';

  const chat = roomId ? (
    <ChatRoomView key={roomId} roomId={roomId} staff={staff} onBack={closeRoom} onRenew={renew} onActivity={loadRooms} />
  ) : null;

  return (
    <PageShell className="max-w-5xl">
      <PageHeader
        title={staff ? 'Patient chats' : 'Chat with a pharmacist'}
        subtitle={staff ? 'Messages from patients to your pharmacy.' : 'Ask about a drug, dosage or availability.'}
      />
      {staff && <PharmacyNav />}
      <div className="mb-4 space-y-2">
        <ErrorNote>{error}</ErrorNote>
        {notice && <p role="status" className="rounded-xl bg-success-light px-4 py-3 text-sm text-success-dark">{notice}</p>}
        {needPass && !wallet?.passes && (
          <p role="status" className="rounded-xl bg-warning-light px-4 py-3 text-sm text-warning-dark">
            You need a chat pass first. Pick a plan below, then return to the pharmacy and tap Chat.
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* list stays mounted under the mobile sheet so it keeps its scroll position */}
        <div className="space-y-4">
          {!staff && <PlansPanel plans={plans} wallet={wallet} onBuy={buy} buying={buying} highlight={needPass} />}
          <Card className="!p-0">
            <h2 className="border-b border-gray-100 px-4 py-3 font-semibold text-navy-900">{staff ? 'Conversations' : 'Your chats'}</h2>
            {!rooms ? (
              <div className="p-4"><Skeleton className="h-16 rounded-xl" /></div>
            ) : rooms.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-600">
                {staff
                  ? 'No patient has messaged your pharmacy yet.'
                  : <>No chats yet. <Link to="/pharmacies" className="font-medium text-pharmacy-700">Find a pharmacy</Link> to start one.</>}
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {rooms.map((r) => {
                  const name = staff ? (r.patient?.fullName || 'Patient') : r.pharmacy?.name;
                  return (
                    <li key={r._id}>
                      <button
                        type="button"
                        onClick={() => openRoom(r._id)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-pharmacy-50 ${r._id === roomId ? 'bg-pharmacy-50' : ''}`}
                      >
                        <Avatar tone="pharmacy" name={name} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-navy-900">{name}</span>
                          <span className="block truncate text-xs text-gray-500">{r.lastMessage?.text || 'No messages yet'}</span>
                        </span>
                        {!staff && r.sessionActive && <Pill tone="success">Open</Pill>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* desktop right pane */}
        <div className={roomId ? '' : 'hidden lg:block'}>
          {!roomId ? (
            <EmptyState
              icon="pill"
              title="Pick a conversation"
              body={staff ? 'Choose a patient on the left to reply.' : 'Choose a chat on the left, or find a pharmacy to start a new one.'}
            />
          ) : isDesktop ? (
            chat
          ) : null}
        </div>
      </div>

      {!staff && <p className="mt-4 text-center"><Link to="/pharmacies" className={ghostBtn}>Find a pharmacy</Link></p>}

      {/* mobile: full-screen conversation sheet, portaled so no parent can clip it */}
      {sheetOpen && createPortal(
        <div
          className="chat-sheet fixed left-0 z-50 w-full bg-white"
          style={{ top: vp.top, height: vp.height }}
          role="dialog"
          aria-modal="true"
          aria-label="Conversation"
        >
          <style>{`
            @keyframes chatSheetIn { from { transform: translateX(100%); } to { transform: none; } }
            .chat-sheet { animation: chatSheetIn .2s ease-out; }
            @media (prefers-reduced-motion: reduce) { .chat-sheet { animation: none; } }
          `}</style>
          {chat}
        </div>,
        document.body
      )}
    </PageShell>
  );
}