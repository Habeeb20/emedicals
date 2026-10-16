import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Building2, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Copy,
  Inbox, MessageCircle, RefreshCw, Share2, Users,
} from 'lucide-react';
import api, { getErrorMessage } from '@/lib/api.js';
import Signup from '../auth/Signup';
import SignupUsers from './SignupUsers';

/* ------------------------------ helpers ------------------------------ */

const unwrap = (res) => res.data?.data;
const num = new Intl.NumberFormat('en-NG');
const fmt = (v) => (v == null ? '–' : num.format(v));
const when = (d) =>
  new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const ROLE_LABELS = {
  patient: 'Patient', doctor: 'Doctor', nurse: 'Nurse', lab_tech: 'Lab technician', pharmacist: 'Pharmacist',
  hospital_admin: 'Hospital admin', mortuary_officer: 'Mortuary officer', cemetery_officer: 'Cemetery officer',
};

const BADGE = {
  green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700',
  blue: 'bg-blue-50 text-blue-700', gray: 'bg-gray-100 text-gray-600',
};
const ORG_STATUS_TONE = { pending: 'amber', approved: 'green', suspended: 'red' };

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: '3d', label: '3 days' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'all', label: 'All time' },
];
const KINDS = [
  { key: '', label: 'All' },
  { key: 'user', label: 'Users' },
  { key: 'organization', label: 'Organizations' },
];

const Pill = ({ tone = 'gray', children }) => (
  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${BADGE[tone]}`}>{children}</span>
);

const statusOf = (u) => {
  if (!u?._id) return ['gray', 'Removed'];
  if (!u.isApproved) return ['amber', 'Awaiting approval'];
  if (!u.isVerified) return ['gray', 'Not verified'];
  return ['green', 'Verified'];
};

const Field = ({ label, children }) =>
  children ? (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-navy-900">{children}</dd>
    </div>
  ) : null;

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    el.remove();
  }
}

/* --------------------------- register someone ------------------------- */

export function AgentRegisterPage({ onNavigate }) {
  const [done, setDone] = useState({ count: 0, points: 0 });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {done.count > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="flex-1">
            {done.count} {done.count === 1 ? 'account' : 'accounts'} registered this session
            {done.points > 0 && <> · <strong>+{done.points} points</strong></>}
          </span>
          <button type="button" onClick={() => onNavigate('agent-signups')} className="font-semibold underline-offset-2 hover:underline">
            View my signups
          </button>
        </div>
      )}
      <SignupUsers
        agentMode
        embedded
        onRegistered={(d) => setDone((s) => ({ count: s.count + 1, points: s.points + (d?.pointsAwarded || 0) }))}
      />
    </div>
  );
}

/* ------------------------------ my signups ---------------------------- */

function SignupRow({ s, open, onToggle }) {
  const u = s.user || {};
  const o = s.organization;
  const [tone, statusText] = statusOf(s.user);

  return (
    <li>
      <button
        type="button" onClick={onToggle} aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-3 rounded-lg px-1 py-3 text-left transition hover:bg-gray-50"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${o ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
          {o ? <Building2 className="h-4 w-4" /> : <Users className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-navy-900">{o ? o.name : u.fullName || 'Removed account'}</p>
          <p className="truncate text-xs text-gray-500">
            {o ? `Owner: ${u.fullName || '–'}` : [u.email, u.phone].filter(Boolean).join(' · ')}
          </p>
        </div>
        <Pill tone="blue">{ROLE_LABELS[s.role] ?? s.role}</Pill>
        <Pill tone={tone}>{statusText}</Pill>
        <span className="hidden text-xs text-gray-500 sm:inline">{when(s.createdAt)}</span>
        <span className="text-xs font-semibold text-emerald-700">+{s.pointsAwarded}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <dl className="mb-3 grid gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Full name">{u.fullName}</Field>
          <Field label="Email">
            {u.email && <a href={`mailto:${u.email}`} className="text-primary-700 hover:underline">{u.email}</a>}
          </Field>
          <Field label="Phone">
            {u.phone && <a href={`tel:${u.phone}`} className="text-primary-700 hover:underline">{u.phone}</a>}
          </Field>
          <Field label="Role">{ROLE_LABELS[s.role] ?? s.role}</Field>
          <Field label="Registered on">{when(s.createdAt)}</Field>
          <Field label="Points earned">+{s.pointsAwarded}</Field>
          <Field label="Account status">
            <span className="flex flex-wrap gap-1.5">
              <Pill tone={tone}>{statusText}</Pill>
              {u._id && !u.isActive && <Pill tone="red">Deactivated</Pill>}
            </span>
          </Field>
          {o && (
            <>
              <Field label="Organization">{o.name}</Field>
              <Field label="Type"><span className="capitalize">{o.type}</span></Field>
              <Field label="Organization status">
                <Pill tone={ORG_STATUS_TONE[o.status] || 'gray'}>{o.status}</Pill>
              </Field>
              <Field label="Organization phone">
                {o.phone && <a href={`tel:${o.phone}`} className="text-primary-700 hover:underline">{o.phone}</a>}
              </Field>
              <Field label="Organization email">{o.email}</Field>
              <Field label="Location">{[o.address?.city, o.address?.state].filter(Boolean).join(', ')}</Field>
            </>
          )}
        </dl>
      )}
    </li>
  );
}

export function AgentSignupsPage({ onNavigate }) {
  const [range, setRange] = useState('7d');
  const [kind, setKind] = useState('');
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [openId, setOpenId] = useState(null);
  const [stats, setStats] = useState(null);
  const [list, setList] = useState({ items: [], total: 0, pages: 1, loading: true, error: '' });

  useEffect(() => {
    let off = false;
    api.get('/users/agent/stats').then((res) => { if (!off) setStats(unwrap(res)); }).catch(() => {});
    return () => { off = true; };
  }, [tick]);

  useEffect(() => {
    let off = false;
    setList((l) => ({ ...l, loading: true, error: '' }));
    api.get('/users/agent/signups', { params: { range, kind: kind || undefined, page, limit: 20 } })
      .then((res) => { if (!off) setList({ ...unwrap(res), loading: false, error: '' }); })
      .catch((err) => { if (!off) setList((l) => ({ ...l, loading: false, error: getErrorMessage(err) })); });
    return () => { off = true; };
  }, [range, kind, page, tick]);

  const pickRange = (k) => { setRange(k); setPage(1); setOpenId(null); };
  const pickKind = (k) => { setKind(k); setPage(1); setOpenId(null); };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-navy-900">My signups</h2>
          <p className="text-xs text-gray-500">
            {stats ? `${fmt(stats.pointsEarned)} points earned from registrations` : 'Accounts and organizations you registered'}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setTick((t) => t + 1)} aria-label="Refresh"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCw className={`h-4 w-4 ${list.loading ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" onClick={() => onNavigate('agent-register')} className="btn-primary inline-flex items-center gap-2 px-4">
            Register someone
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {RANGES.map(({ key, label }) => {
          const s = stats?.ranges?.[key];
          const active = range === key;
          return (
            <button key={key} type="button" onClick={() => pickRange(key)} aria-pressed={active}
              className={`card p-4 text-left transition ${active ? 'ring-2 ring-primary-500/40' : 'hover:-translate-y-0.5 hover:shadow-md'}`}>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-navy-900">{fmt(s?.total ?? 0)}</p>
              <p className="text-[11px] text-gray-500">{s ? `${s.users} users · ${s.organizations} orgs` : '\u00A0'}</p>
            </button>
          );
        })}
      </div>

      <section className="card p-5">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            <strong className="text-navy-900">{fmt(list.total)}</strong> in this period
          </p>
          <div role="group" aria-label="Filter by type" className="inline-flex rounded-lg border border-gray-200 p-0.5">
            {KINDS.map(({ key, label }) => (
              <button key={key || 'all'} type="button" onClick={() => pickKind(key)} aria-pressed={kind === key}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${kind === key ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:text-navy-900'}`}>
                {label}
              </button>
            ))}
          </div>
        </header>

        {list.error ? (
          <div className="flex items-start gap-2.5 rounded-lg bg-red-50 px-3.5 py-3 text-sm text-red-700" role="alert">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {list.error}
          </div>
        ) : list.loading && list.items.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-200/70" />)}
          </div>
        ) : list.items.length === 0 ? (
          <div className="flex min-h-[10rem] flex-col items-center justify-center gap-2 text-gray-400">
            <Inbox className="h-7 w-7" aria-hidden="true" />
            <p className="text-sm">No signups in this period</p>
          </div>
        ) : (
          <ul className={`divide-y divide-gray-100 ${list.loading ? 'opacity-60' : ''}`}>
            {list.items.map((s) => (
              <SignupRow key={s._id} s={s} open={openId === s._id} onToggle={() => setOpenId(openId === s._id ? null : s._id)} />
            ))}
          </ul>
        )}

        {list.pages > 1 && (
          <footer className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-sm text-gray-600">
            <button type="button" disabled={page <= 1 || list.loading} onClick={() => { setPage((p) => p - 1); setOpenId(null); }}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 font-medium hover:bg-gray-50 disabled:opacity-50">
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span>Page {page} of {list.pages}</span>
            <button type="button" disabled={page >= list.pages || list.loading} onClick={() => { setPage((p) => p + 1); setOpenId(null); }}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 font-medium hover:bg-gray-50 disabled:opacity-50">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </footer>
        )}
      </section>
    </div>
  );
}

