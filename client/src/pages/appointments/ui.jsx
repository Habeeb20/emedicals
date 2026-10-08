import { useEffect } from 'react';

export const cx = (...a) => a.filter(Boolean).join(' ');

const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  bell: '<path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  send: '<path d="M21 3 10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  skip: '<path d="M6 5l8 7-8 7z"/><path d="M18 5v14"/>',
  pill: '<path d="M10.5 20.5a5 5 0 0 1-7-7l9-9a5 5 0 0 1 7 7z"/><path d="M8.5 8.5l7 7"/>',
  hospital: '<path d="M4 21V6l8-3 8 3v15M2 21h20"/><path d="M12 8v6M9 11h6"/>',
  doctor: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  wallet: '<path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7l2-3h12M16 14h2"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  locate: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  car: '<path d="M5 16V11l2-5h10l2 5v5M3 16h18M7 19v-3M17 19v-3"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>',
};

export function Icon({ name, className = 'h-5 w-5', strokeWidth = 1.8 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] || '' }} />
  );
}

/* ---------- Buttons ---------- */
const VARIANTS = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500',
  accent: 'bg-pharmacy-600 text-white hover:bg-pharmacy-700 focus-visible:ring-pharmacy-500',
  secondary: 'border border-gray-300 bg-white text-navy-800 hover:bg-gray-50 focus-visible:ring-primary-500',
  ghost: 'text-navy-600 hover:bg-gray-100 focus-visible:ring-primary-500',
  danger: 'bg-danger text-white hover:bg-danger-dark focus-visible:ring-danger',
  dangerSoft: 'bg-danger-light text-danger-dark hover:bg-danger-light/70 focus-visible:ring-danger',
};
const SIZES = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-4 text-sm', lg: 'h-12 px-5 text-base' };

export function Button({ variant = 'primary', size = 'md', loading, icon, className, children, ...rest }) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant], SIZES[size], className
      )}
    >
      {loading ? <Spinner className="h-4 w-4" /> : icon && <Icon name={icon} className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Badges ---------- */
const TONES = {
  success: 'bg-success-light text-success-dark',
  warning: 'bg-warning-light text-warning-dark',
  danger: 'bg-danger-light text-danger-dark',
  info: 'bg-info-light text-info-dark',
  primary: 'bg-primary-100 text-primary-800',
  pharmacy: 'bg-pharmacy-100 text-pharmacy-800',
  neutral: 'bg-gray-100 text-gray-700',
};
export function Badge({ tone = 'neutral', className, children }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', TONES[tone], className)}>
      {children}
    </span>
  );
}

export const STATUS = {
  pending: { label: 'Waiting for acceptance', tone: 'warning' },
  awaiting_payment: { label: 'Payment needed', tone: 'info' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  in_progress: { label: 'In consultation', tone: 'primary' },
  completed: { label: 'Completed', tone: 'neutral' },
  rejected: { label: 'Declined', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  no_show: { label: 'Missed', tone: 'danger' },
};
export const StatusBadge = ({ status }) => <Badge tone={STATUS[status]?.tone}>{STATUS[status]?.label || status}</Badge>;

/* ---------- Form bits ---------- */
export const inputCls =
  'block w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-navy-900 placeholder:text-gray-400 ' +
  'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30 disabled:bg-gray-100';

export function Field({ label, hint, error, className, children }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="mb-1.5 block text-sm font-medium text-navy-800">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger-dark">{error}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, description, accent = 'primary', disabled }) {
  const on = accent === 'pharmacy' ? 'bg-pharmacy-600' : 'bg-primary-600';
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-navy-900">{label}</p>
        {description && <p className="mt-0.5 text-sm text-gray-600">{description}</p>}
      </div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx('relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50',
          checked ? on : 'bg-gray-300', accent === 'pharmacy' ? 'focus-visible:ring-pharmacy-500' : 'focus-visible:ring-primary-500')}>
        <span className={cx('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
    </div>
  );
}

/* ---------- Layout bits ---------- */
export function PageShell({ children, className }) {
  return <div className={cx('mx-auto w-full', className || 'max-w-6xl')}>{children}</div>;
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-xl text-sm text-gray-600 sm:text-base">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export const Card = ({ className, children, ...r }) => (
  <div {...r} className={cx('rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5', className)}>{children}</div>
);

export function Avatar({ name = '', src, size = 'h-12 w-12', tone = 'primary', rounded = 'rounded-full' }) {
  const initials = name.replace(/^(dr\.?|prof\.?)\s+/i, '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const bg = tone === 'pharmacy' ? 'bg-pharmacy-100 text-pharmacy-800' : 'bg-primary-100 text-primary-800';
  return src
    ? <img src={src} alt="" className={cx(size, rounded, 'shrink-0 object-cover')} />
    : <span className={cx(size, rounded, bg, 'flex shrink-0 items-center justify-center text-sm font-semibold')}>{initials || '?'}</span>;
}

export const Skeleton = ({ className }) => <div className={cx('animate-pulse rounded-lg bg-gray-200', className)} />;

export function EmptyState({ icon = 'calendar', title, body, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600"><Icon name={icon} className="h-6 w-6" /></span>
      <h3 className="mt-4 text-base font-semibold text-navy-900">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-gray-600">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export const ErrorNote = ({ children }) =>
  children ? <p role="alert" className="rounded-xl bg-danger-light px-3.5 py-2.5 text-sm text-danger-dark">{children}</p> : null;

export function Tabs({ value, onChange, options, className }) {
  return (
    <div role="tablist" className={cx('inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1', className)}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cx('whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            value === o.value ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-600 hover:text-navy-900')}>
          {o.label}{o.count != null && <span className="ml-1.5 text-gray-500">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- Sheet: bottom sheet on phones, centered dialog on larger screens ---------- */
export function Sheet({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-navy-950/60" onClick={onClose} />
      <div className={cx('relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-xl sm:rounded-2xl', widths[size])}>
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
            <Icon name="x" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-gray-200 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmSheet({ open, title, body, confirmLabel = 'Confirm', tone = 'danger', busy, onConfirm, onClose, children }) {
  return (
    <Sheet open={open} onClose={onClose} title={title} size="sm"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Keep it</Button>
          <Button variant={tone} className="flex-1" loading={busy} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      }>
      {body && <p className="text-sm text-gray-700">{body}</p>}
      {children}
    </Sheet>
  );
}
