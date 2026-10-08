import { useCallback, useEffect, useState } from 'react';
import Icon from './Icon';
import { ROLE_TONE, STATUS_TONE, label } from '../../lib/constants';

const BADGE = {
  gray: 'bg-gray-100 text-gray-700',
  navy: 'bg-navy-100 text-navy-800',
  primary: 'bg-primary-50 text-primary-700',
  lab: 'bg-lab-50 text-lab-700',
  pharmacy: 'bg-pharmacy-50 text-pharmacy-700',
  memorial: 'bg-memorial-100 text-memorial-700',
  success: 'bg-success-light text-success-dark',
  warning: 'bg-warning-light text-warning-dark',
  danger: 'bg-danger-light text-danger-dark',
  info: 'bg-info-light text-info-dark',
};
export const Badge = ({ tone = 'gray', children }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${BADGE[tone]}`}>{children}</span>
);
export const RoleBadge = ({ role }) => <Badge tone={ROLE_TONE[role]}>{label(role)}</Badge>;
export const OrgStatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status]}>{status}</Badge>;
export const UserStatusBadge = ({ user: u }) =>
  !u.isActive ? <Badge tone="danger">blocked</Badge> : !u.isApproved ? <Badge tone="warning">pending</Badge> : <Badge tone="success">active</Badge>;

const BTN = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700',
  success: 'bg-success text-white hover:bg-success-dark',
  warning: 'bg-warning text-white hover:bg-warning-dark',
  danger: 'bg-danger text-white hover:bg-danger-dark',
  soft: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
};
export const Button = ({ variant = 'soft', className = '', ...p }) => (
  <button
    {...p}
    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${BTN[variant]} ${className}`}
  />
);

export const Card = ({ className = '', ...p }) => (
  <div {...p} className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`} />
);

export const inputCls =
  'w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-navy-800 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';

export const SearchInput = (p) => (
  <div className="relative">
    <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    <input {...p} className={`${inputCls} pl-9`} />
  </div>
);

export const Spinner = () => (
  <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-primary-600" />
);

export const Avatar = ({ name = '?' }) => (
  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
    {name.trim().charAt(0).toUpperCase()}
  </div>
);

export function Pager({ p, onPage }) {
  if (!p || p.total === 0) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
      <span>{p.total} total</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" disabled={p.page <= 1} onClick={() => onPage(p.page - 1)}>Prev</Button>
        <span className="tabular-nums">{p.page} / {p.pages}</span>
        <Button variant="outline" disabled={p.page >= p.pages} onClick={() => onPage(p.page + 1)}>Next</Button>
      </div>
    </div>
  );
}

/** Table on md+, stacked cards on mobile. The first column is used as the card title. */
export function DataTable({ rows, columns, actions, loading, empty }) {
  if (loading && !rows.length)
    return <Card className="flex justify-center p-14"><Spinner /></Card>;
  if (!rows.length)
    return <Card className="p-14 text-center text-sm text-gray-500">{empty}</Card>;

  const [first, ...rest] = columns;
  return (
    <>
      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                {columns.map((c) => <th key={c.head} className="px-4 py-3 font-medium">{c.head}</th>)}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50/60">
                  {columns.map((c) => <td key={c.head} className="px-4 py-3 align-middle">{c.cell(r)}</td>)}
                  <td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-1.5">{actions(r)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="space-y-3 md:hidden">
        {rows.map((r) => (
          <Card key={r._id} className="p-4">
            {first.cell(r)}
            <dl className="mt-3 space-y-1.5">
              {rest.map((c) => (
                <div key={c.head} className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-gray-500">{c.head}</dt>
                  <dd className="text-right text-navy-800">{c.cell(r)}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">{actions(r)}</div>
          </Card>
        ))}
      </div>
    </>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-navy-950/50" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <h3 className="font-semibold text-navy-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/** const [toast, notify] = useToast();  render {toast} once, call notify('Saved') / notify('Oops','error') */
export function useToast() {
  const [t, setT] = useState(null);
  useEffect(() => {
    if (!t) return;
    const id = setTimeout(() => setT(null), 3500);
    return () => clearTimeout(id);
  }, [t]);
  const notify = useCallback((message, type = 'success') => setT({ message, type, id: Date.now() }), []);
  const node = t && (
    <div className={`fixed bottom-4 left-4 right-4 z-[60] rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg sm:left-auto sm:max-w-sm ${t.type === 'error' ? 'bg-danger' : 'bg-navy-900'}`}>
      {t.message}
    </div>
  );
  return [node, notify];
}

export const PageIntro = ({ title, subtitle }) => (
  <div className="mb-5">
    <h2 className="text-xl font-semibold text-navy-900">{title}</h2>
    {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
  </div>
);