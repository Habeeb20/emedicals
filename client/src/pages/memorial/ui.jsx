import { useEffect, useState } from 'react';
import { Star, X, Loader2, Building2, Flower2, Inbox } from 'lucide-react';

export const cx = (...a) => a.filter(Boolean).join(' ');
export const naira = (n) => (n == null ? '' : '₦' + Number(n).toLocaleString('en-NG', { maximumFractionDigits: 2 }));
export const fmtDate = (d, withTime) =>
  d ? new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}) }) : '';
export const compact = (n = 0) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

export const KIND = {
  mortuary: { label: 'Mortuary', plural: 'Mortuaries', Icon: Building2 },
  cemetery: { label: 'Cemetery', plural: 'Cemeteries', Icon: Flower2 },
};

export const inputCls =
  'w-full rounded-xl border border-memorial-200 bg-white px-3.5 py-2.5 text-sm text-navy-900 placeholder:text-memorial-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:bg-memorial-50';
const btn =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
export const btnPrimary = `${btn} bg-primary-600 text-white hover:bg-primary-700`;
export const btnGhost = `${btn} border border-memorial-200 bg-white text-memorial-700 hover:bg-memorial-50`;
export const btnDanger = `${btn} border border-danger/30 bg-white text-danger hover:bg-danger-light`;
export const btnDark = `${btn} bg-memorial-800 text-white hover:bg-memorial-900`;

const STATUS = {
  pending: 'bg-warning-light text-warning-dark',
  confirmed: 'bg-info-light text-info-dark',
  admitted: 'bg-memorial-100 text-memorial-800',
  completed: 'bg-success-light text-success-dark',
  rejected: 'bg-danger-light text-danger-dark',
  cancelled: 'bg-gray-100 text-gray-600',
  unpaid: 'bg-gray-100 text-gray-600',
  part_paid: 'bg-warning-light text-warning-dark',
  paid: 'bg-success-light text-success-dark',
  refunded: 'bg-info-light text-info-dark',
  available: 'bg-success-light text-success-dark',
  reserved: 'bg-warning-light text-warning-dark',
  occupied: 'bg-memorial-200 text-memorial-800',
  embalmed: 'bg-info-light text-info-dark',
  released: 'bg-success-light text-success-dark',
  buried: 'bg-memorial-200 text-memorial-800',
};
export const StatusBadge = ({ status }) => (
  <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', STATUS[status] || 'bg-gray-100 text-gray-600')}>
    {String(status || '').replace('_', ' ')}
  </span>
);

export function Stars({ value = 0, size = 16 }) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? 'fill-warning text-warning' : 'text-memorial-300'} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} onClick={() => onChange(i)} className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
          <Star size={28} className={i <= value ? 'fill-warning text-warning' : 'text-memorial-300 hover:text-warning'} />
        </button>
      ))}
    </div>
  );
}

export const Spinner = ({ className }) => <Loader2 className={cx('animate-spin text-primary-600', className)} size={20} />;

export function EmptyState({ title, hint, action, Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-memorial-300 bg-white px-6 py-12 text-center">
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-memorial-100 text-memorial-500"><Icon size={22} /></span>
      <p className="font-serif text-lg text-navy-900">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-memorial-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({ label, hint, error, children, className }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-sm font-medium text-memorial-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-memorial-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-navy-950/60" onClick={onClose} />
      <div className={cx('relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white sm:rounded-3xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between border-b border-memorial-100 px-5 py-4">
          <h2 className="font-serif text-xl text-navy-900">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-memorial-500 hover:bg-memorial-100" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="border-t border-memorial-100 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export const useDebounce = (value, ms = 350) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
};

/* tiny toast: call toast('Saved') from anywhere, mount <ToastHost /> once per page */
const listeners = new Set();
export const toast = (message, tone = 'ok') => listeners.forEach((l) => l({ id: Math.random(), message, tone }));
export function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const l = (t) => {
      setItems((x) => [...x, t]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== t.id)), 3600);
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-[92%] max-w-sm -translate-x-1/2 flex-col gap-2" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={cx('rounded-xl px-4 py-3 text-sm text-white', t.tone === 'error' ? 'bg-danger' : 'bg-navy-800')}>{t.message}</div>
      ))}
    </div>
  );
}

// Logo shown in a soft arch, the one recurring motif of the module
export function ArchLogo({ org, size = 72 }) {
  const Icon = KIND[org.type]?.Icon || Building2;
  return (
    <div style={{ width: size, height: size * 1.15 }} className="grid shrink-0 place-items-center overflow-hidden rounded-t-full rounded-b-xl border border-memorial-200 bg-memorial-100 text-memorial-500">
      {org.logo?.url ? <img src={org.logo.url} alt="" className="h-full w-full object-cover" /> : <Icon size={size * 0.4} />}
    </div>
  );
}

export const placeLine = (a = {}) => [a.city, a.state].filter(Boolean).join(', ');
