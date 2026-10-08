import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { dash } from './links';
import { useAuth } from '@/context/AuthContext';
import { api } from './api';
import { useFetch, useSocketEvent } from './hooks';
import { Icon, cx } from './ui';
import { timeAgo } from './format';

function targetFor(n, role) {
  const d = n.data || {};
  if (d.chatRoomId || d.roomId) return dash('messages', { room: d.chatRoomId || d.roomId });
  if (n.type?.startsWith('quickchat')) return dash('quick-chat');
  if (n.type?.startsWith('prescription')) return dash('prescriptions');
  if (d.appointmentId) return dash(role === 'patient' ? 'my-appointments' : 'manage-appointments');
  return null;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const box = useRef(null);
  const feed = useFetch(() => api('/notifications', { params: { limit: 25 } }), []);

  useSocketEvent('notification:new', (n) => {
    feed.setData((d) => [n, ...(d || [])]);
    setToasts((t) => [...t, n]);
    setTimeout(() => setToasts((t) => t.filter((x) => x._id !== n._id)), 6000);
  });

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const list = feed.data || [];
  const unread = list.filter((n) => !n.readAt).length;

  const go = async (n) => {
    setOpen(false); setToasts((t) => t.filter((x) => x._id !== n._id));
    if (!n.readAt) { feed.setData((d) => d.map((x) => (x._id === n._id ? { ...x, readAt: new Date().toISOString() } : x))); api(`/notifications/${n._id}/read`, { method: 'PATCH' }).catch(() => {}); }
    const to = targetFor(n, user?.role);
    if (to) navigate(to);
  };
  const readAll = () => { feed.setData((d) => d.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString() }))); api('/notifications/read', { method: 'PATCH' }).catch(() => {}); };

  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open}
        className="relative rounded-xl p-2.5 text-navy-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
        <Icon name="bell" className="h-6 w-6" />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-semibold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 max-h-[70dvh] w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="font-semibold text-navy-900">Notifications</h2>
            {unread > 0 && <button onClick={readAll} className="text-sm font-medium text-primary-700 hover:underline">Mark all read</button>}
          </div>
          <ul className="max-h-[calc(70dvh-3.5rem)] overflow-y-auto">
            {list.length === 0 && <li className="px-4 py-10 text-center text-sm text-gray-500">You're all caught up.</li>}
            {list.map((n) => (
              <li key={n._id}>
                <button onClick={() => go(n)} className={cx('flex w-full gap-3 border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus-visible:bg-primary-50', !n.readAt && 'bg-primary-50/60')}>
                  <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-primary-600')} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-navy-900">{n.title}</span>
                    <span className="mt-0.5 line-clamp-2 block text-sm text-gray-600">{n.body}</span>
                    <span className="mt-1 block text-xs text-gray-500">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Live toasts (portal: the sticky blurred header would otherwise trap position:fixed) */}
      {createPortal(<div className="pointer-events-none fixed inset-x-3 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:top-4 sm:bottom-auto sm:items-end" aria-live="polite">
        {toasts.slice(-3).map((n) => (
          <button key={n._id} onClick={() => go(n)} className="pointer-events-auto w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
            <span className="block text-sm font-semibold text-navy-900">{n.title}</span>
            <span className="mt-0.5 line-clamp-2 block text-sm text-gray-600">{n.body}</span>
          </button>
        ))}
      </div>, document.body)}
    </div>
  );
}
