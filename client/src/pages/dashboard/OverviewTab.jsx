


import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Activity, Building2, CalendarDays, CheckCircle2, ChevronRight, CircleAlert, Clock, Eye, FlaskConical, Gift,
  Heart, HeartPulse, Inbox, Package, Pill, RefreshCw, Share2, ShieldCheck, ShoppingBag, Star, TrendingDown,
  TrendingUp, TriangleAlert, Users, Wallet,
} from 'lucide-react';
import { ROLE_LABELS } from '@/config/dashboardNav.js';
import api from '@/pages/pharmacy/api.js'; // any helper that sends the logged-in user's token works here
import { Check, Copy, UserPlus } from 'lucide-react';
/* ------------------------------- data ------------------------------- */



function useOverview() {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const load = useCallback(async (silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true }));
    try {
      const r = await api('/dashboard/overview');
      const body = r && 'success' in r ? r : r?.data;
      setState({ data: body.data, loading: false, error: '' });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message || 'Could not load your dashboard.' }));
    }
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 60000); // quiet refresh every minute
    return () => clearInterval(t);
  }, [load]);
  return { ...state, reload: () => load() };
}

/* ----------------------------- formatting ----------------------------- */

const PALETTE = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#64748B'];
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const full = new Intl.NumberFormat('en-NG');

function fmt(v, format = 'number', short = false) {
  if (v == null) return '–';
  switch (format) {
    case 'currency': return short || v >= 1e7 ? `₦${compact.format(v)}` : `₦${full.format(Math.round(v))}`;
    case 'rating': return v ? Number(v).toFixed(1) : '–';
    case 'hours': return `${Number(v).toFixed(1)}h`;
    default: return short ? compact.format(v) : full.format(v);
  }
}

const ICONS = {
  calendar: CalendarDays, pill: Pill, flask: FlaskConical, bag: ShoppingBag, wallet: Wallet, gift: Gift,
  clock: Clock, check: CheckCircle2, users: Users, activity: Activity, star: Star, trend: TrendingUp,
  alert: TriangleAlert, box: Package, eye: Eye, heart: Heart, share: Share2, building: Building2, shield: ShieldCheck,
};
const KPI_TONES = {
  default: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600',
};
const BADGE = {
  green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-700',
  blue: 'bg-blue-50 text-blue-700', gray: 'bg-gray-100 text-gray-600',
};
const SPAN = {
  3: 'lg:col-span-3', 4: 'lg:col-span-4', 5: 'lg:col-span-5', 6: 'lg:col-span-6', 7: 'lg:col-span-7',
  8: 'lg:col-span-8', 12: 'lg:col-span-12',
};

/* ------------------------------ building blocks ----------------------- */

function Panel({ title, subtitle, children, className = '' }) {
  return (
    <section className={`card flex h-full flex-col p-5 ${className}`}>
      {title && (
        <header className="mb-4">
          <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </header>
      )}
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

const Empty = ({ text = 'No data yet' }) => (
  <div className="flex h-full min-h-[8rem] flex-col items-center justify-center gap-2 text-gray-400">
    <Inbox className="h-7 w-7" aria-hidden="true" />
    <p className="text-sm">{text}</p>
  </div>
);

function ChartTip({ active, payload, label, format }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
      {label != null && <p className="mb-1 font-semibold text-navy-900">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey || p.name} className="flex items-center gap-2 text-gray-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          {p.name}: <strong className="text-navy-900">{fmt(p.value, format)}</strong>
        </p>
      ))}
    </div>
  );
}

const Legend = ({ series }) => (
  <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
    {series.map((s, i) => (
      <li key={s.key} className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />{s.label}
      </li>
    ))}
  </ul>
);

const hasValues = (data, keys) => data?.some((d) => keys.some((k) => d[k] > 0));

/* ---------------------------------- KPI ---------------------------------- */

function Sparkline({ values, color }) {
  const data = values.map((v, i) => ({ i, v }));
  return (
    <div className="h-10 w-24" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} /><stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill="url(#spark)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Kpi({ w, onClick }) {
  const Icon = ICONS[w.icon] || Activity;
  const tone = KPI_TONES[w.tone] || KPI_TONES.default;
  const Wrapper = onClick ? 'button' : 'div';
  const up = w.delta > 0;
  return (
    <Wrapper
      onClick={onClick}
      className={`card relative overflow-hidden p-5 text-left ${onClick ? 'transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none' : ''}`}
    >
      <div className="flex items-start justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
        {w.spark?.some((v) => v > 0) && <Sparkline values={w.spark} color={w.tone === 'red' ? '#EF4444' : '#2563EB'} />}
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-navy-900">{fmt(w.value, w.format)}</p>
      <p className="text-sm text-gray-600">{w.label}</p>
      <div className="mt-2 flex min-h-[1.25rem] items-center gap-2 text-xs">
        {w.delta != null && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${w.delta > 0 ? 'bg-emerald-50 text-emerald-700' : w.delta < 0 ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
            {up ? <TrendingUp className="h-3 w-3" /> : w.delta < 0 ? <TrendingDown className="h-3 w-3" /> : null}
            {w.delta > 0 ? '+' : ''}{w.delta}%
          </span>
        )}
        <span className="truncate text-gray-500">{w.delta != null ? w.deltaLabel : w.hint}</span>
      </div>
    </Wrapper>
  );
}

/* --------------------------------- charts -------------------------------- */

function AreaWidget({ w }) {
  const keys = w.series.map((s) => s.key);
  return (
    <Panel title={w.title} subtitle={w.subtitle}>
      {!hasValues(w.data, keys) ? <Empty /> : (
        <>
          {w.series.length > 1 && <Legend series={w.series} />}
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={w.data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <defs>
                  {w.series.map((s, i) => (
                    <linearGradient key={s.key} id={`${w.id}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={PALETTE[i % PALETTE.length]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} interval="preserveStartEnd" minTickGap={28} />
                <YAxis tickLine={false} axisLine={false} width={52} allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={(v) => fmt(v, w.format, true)} />
                <Tooltip content={<ChartTip format={w.format} />} />
                {w.series.map((s, i) => (
                  <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={PALETTE[i % PALETTE.length]}
                    strokeWidth={2} fill={`url(#${w.id}-${s.key})`} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Panel>
  );
}

function BarWidget({ w }) {
  const keys = w.series.map((s) => s.key);
  const horizontal = !!w.horizontal;
  const height = horizontal ? Math.max(200, w.data.length * 36 + 20) : 240;
  return (
    <Panel title={w.title} subtitle={w.subtitle}>
      {!hasValues(w.data, keys) ? <Empty /> : (
        <>
          {w.series.length > 1 && <Legend series={w.series} />}
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={w.data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 4, right: 12, bottom: 0, left: horizontal ? 0 : -12 }} barCategoryGap="22%">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={!horizontal} vertical={horizontal} />
                {horizontal ? (
                  <>
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis type="category" dataKey="label" width={96} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#4B5563' }}
                      tickFormatter={(v) => (String(v).length > 14 ? `${String(v).slice(0, 13)}…` : v)} />
                  </>
                ) : (
                  <>
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} interval={w.data.length > 12 ? 2 : 0} />
                    <YAxis tickLine={false} axisLine={false} width={52} allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={(v) => fmt(v, w.format, true)} />
                  </>
                )}
                <Tooltip content={<ChartTip format={w.format} />} cursor={{ fill: 'rgba(37,99,235,0.06)' }} />
                {w.series.map((s, i) => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} fill={PALETTE[i % PALETTE.length]} stackId={w.stacked ? 'a' : undefined}
                    radius={w.stacked ? 0 : horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={28}>
                    {w.series.length === 1 && w.data.map((_, j) => <Cell key={j} fill={PALETTE[horizontal ? j % PALETTE.length : 0]} />)}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Panel>
  );
}

function DonutWidget({ w }) {
  const total = w.data.reduce((s, d) => s + d.value, 0);
  return (
    <Panel title={w.title} subtitle={w.subtitle}>
      {total === 0 ? <Empty text={w.empty} /> : (
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-44 w-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={w.data} dataKey="value" nameKey="label" innerRadius={56} outerRadius={80} paddingAngle={2} stroke="none">
                  {w.data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip content={<ChartTip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-navy-900">{fmt(total)}</span>
              <span className="text-[11px] uppercase tracking-wide text-gray-500">Total</span>
            </div>
          </div>
          <ul className="w-full space-y-1.5 text-sm">
            {w.data.map((d, i) => (
              <li key={d.label} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                <span className="flex-1 truncate text-gray-600">{d.label}</span>
                <span className="font-semibold text-navy-900">{fmt(d.value)}</span>
                <span className="w-10 text-right text-xs text-gray-400">{Math.round((d.value / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

function GaugeWidget({ w }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const pct = w.max > 0 ? Math.min(1, w.value / w.max) : 0;
  return (
    <Panel title={w.title} subtitle={w.subtitle}>
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="relative h-36 w-36">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`${w.title}: ${w.sub || ''}`}>
            <circle cx="60" cy="60" r={R} fill="none" stroke="#E5E7EB" strokeWidth="10" />
            <circle cx="60" cy="60" r={R} fill="none" stroke="#2563EB" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: 'stroke-dashoffset .8s ease' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-navy-900">{w.display === 'rating' ? fmt(w.value, 'rating') : w.label || Math.round(pct * 100) + '%'}</span>
            {w.display === 'rating' && <span className="text-xs text-gray-500">out of 5</span>}
          </div>
        </div>
        {w.sub && <p className="text-center text-sm text-gray-600">{w.sub}</p>}
      </div>
    </Panel>
  );
}

function ListWidget({ w, go, clickable }) {
  return (
    <Panel title={w.title} subtitle={w.subtitle}>
      {w.items.length === 0 ? <Empty text={w.empty} /> : (
        <ul className="-my-2 divide-y divide-gray-100">
          {w.items.map((it, i) => {
            const can = clickable(it);
            const Row = can ? 'button' : 'div';
            return (
              <li key={i}>
                <Row onClick={can ? () => go(it) : undefined} className={`flex w-full items-center gap-3 py-3 text-left ${can ? 'rounded-lg transition hover:bg-gray-50' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy-900">{it.title}</p>
                    {it.subtitle && <p className="truncate text-xs text-gray-500">{it.subtitle}</p>}
                  </div>
                  {it.meta && <span className="shrink-0 text-xs font-medium text-gray-600">{it.meta}</span>}
                  {it.badge && <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${BADGE[it.badge.tone] || BADGE.gray}`}>{it.badge.text}</span>}
                  {can && <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />}
                </Row>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ------------------------------ loading state ----------------------------- */

const Shimmer = ({ className = '' }) => <div className={`animate-pulse rounded-2xl bg-gray-200/70 ${className}`} />;

function LoadingGrid() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading your dashboard">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-6">{Array.from({ length: 6 }, (_, i) => <Shimmer key={i} className="h-36" />)}</div>
      <div className="grid gap-5 lg:grid-cols-12"><Shimmer className="h-80 lg:col-span-8" /><Shimmer className="h-80 lg:col-span-4" /></div>
    </div>
  );
}

/* --------------------------------- main ---------------------------------- */

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};




const unwrap = (r) => (r && 'success' in r ? r : r?.data)?.data;

/* ------------------------------ referral card ----------------------------- */

function ReferralCard() {
  const [info, setInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let off = false;
    api('/users/me/referral').then((r) => { if (!off) setInfo(unwrap(r)); }).catch(() => {});
    return () => { off = true; };
  }, []);

  if (!info?.code) return null;
  const link = `${window.location.origin}/signup?ref=${info.code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const el = document.createElement('textarea');
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = () => navigator.share?.({ title: 'Join me on eMedicals', url: link }).catch(() => {});

  return (
    <Panel title="Invite and earn" subtitle="You get 2 loyalty points every time someone signs up with your link">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Your referral link"
          className="input flex-1 text-sm" />
        <div className="flex gap-2">
          <button onClick={copy} className="btn-primary inline-flex items-center gap-2 px-4">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
          {typeof navigator !== 'undefined' && navigator.share && (
            <button onClick={share} aria-label="Share link"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Share2 className="h-4 w-4" /> Share
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 flex gap-6 text-sm text-gray-600">
        <span><strong className="text-navy-900">{fmt(info.referredCount)}</strong> signed up</span>
        <span><strong className="text-navy-900">{fmt(info.pointsEarned)}</strong> points earned</span>
        <span className="text-gray-400">Code: {info.code}</span>
      </div>
    </Panel>
  );
}

/* ------------------------------- agent panel ------------------------------ */

const AGENT_RANGES = [
  { key: 'today', label: 'Today' },
  { key: '3d', label: '3 days' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'all', label: 'All time' },
];

const when = (d) =>
  new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function AgentPanel() {
  const navigate = useNavigate();
  const [range, setRange] = useState('7d');
  const [stats, setStats] = useState(null);
  const [list, setList] = useState({ items: [], total: 0, loading: true, error: '' });

  useEffect(() => {
    api('/users/agent/stats').then((r) => setStats(unwrap(r))).catch(() => {});
  }, []);

  useEffect(() => {
    let off = false;
    setList((l) => ({ ...l, loading: true, error: '' }));
    api(`/users/agent/signups?range=${range}&limit=50`)
      .then((r) => { if (!off) setList({ ...unwrap(r), loading: false, error: '' }); })
      .catch((e) => { if (!off) setList((l) => ({ ...l, loading: false, error: e.message || 'Could not load signups.' })); });
    return () => { off = true; };
  }, [range]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        
        <div>
          <h3 className="text-base font-semibold text-navy-900">Your signups</h3>
          <p className="text-xs text-gray-500">
            {stats ? `${fmt(stats.pointsEarned)} points earned from registrations` : 'Accounts and organizations you registered'}
          </p>
        </div>
        <button onClick={() => navigate('/agent/register')} className="btn-primary inline-flex items-center gap-2 px-4">
          <UserPlus className="h-4 w-4" /> Register someone
        </button>
      </div>







      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {AGENT_RANGES.map(({ key, label }) => {
          const s = stats?.ranges?.[key];
          const active = range === key;
          return (
            <button key={key} onClick={() => setRange(key)} aria-pressed={active}
              className={`card p-4 text-left transition ${active ? 'ring-2 ring-primary-500/40' : 'hover:-translate-y-0.5 hover:shadow-md'}`}>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-navy-900">{fmt(s?.total ?? 0)}</p>
              <p className="text-[11px] text-gray-500">{s ? `${s.users} users · ${s.organizations} orgs` : ' '}</p>
            </button>
          );
        })}
      </div>

      <Panel title="Registered by you" subtitle={`${fmt(list.total || 0)} in this period`}>
        {list.error ? (
          <p className="text-sm text-red-600">{list.error}</p>
        ) : list.loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }, (_, i) => <Shimmer key={i} className="h-14" />)}</div>
        ) : list.items.length === 0 ? (
          <Empty text="No signups in this period" />
        ) : (
          <ul className="-my-2 divide-y divide-gray-100">
            {list.items.map((s) => (
              <li key={s._id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy-900">
                    {s.user?.fullName}
                    {s.organization && <span className="font-normal text-gray-500"> · {s.organization.name}</span>}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {[s.user?.email, s.user?.phone].filter(Boolean).join(' · ')}
                  </p>
                  {s.organization && (
                    <p className="truncate text-xs text-gray-500">
                      {s.organization.type}
                      {s.organization.address?.city && ` · ${s.organization.address.city}`}
                      {s.organization.address?.state && `, ${s.organization.address.state}`}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-500">{when(s.createdAt)}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${BADGE.blue}`}>
                  {ROLE_LABELS[s.role] ?? s.role}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  !s.user?.isApproved ? BADGE.amber : s.user?.isVerified ? BADGE.green : BADGE.gray}`}>
                  {!s.user?.isApproved ? 'Awaiting approval' : s.user?.isVerified ? 'Verified' : 'Not verified'}
                </span>
                <span className="text-xs font-semibold text-emerald-700">+{s.pointsAwarded}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}


export default function OverviewTab({ user, data: legacy, items = [], accent, onNavigate }) {
  const { data, loading, error, reload } = useOverview();
  const navigate = useNavigate();
  const allowed = useMemo(() => new Set(items.map((i) => i.key)), [items]);

  const clickable = (x) => (x.tab && allowed.has(x.tab)) || !!x.to;
  const go = (x) => { if (x.tab && allowed.has(x.tab)) onNavigate(x.tab); else if (x.to) navigate(x.to); };

  const widgets = data?.widgets || [];
  const kpis = widgets.filter((w) => w.type === 'kpi');
  const rest = widgets.filter((w) => w.type !== 'kpi');
  const stripCols = kpis.length >= 6 ? 'xl:grid-cols-6' : kpis.length === 5 ? 'xl:grid-cols-5' : 'xl:grid-cols-4';
  const patientId = legacy?.profile?.patient?.patientId;

  const render = (w) => {
    switch (w.type) {
      case 'area': return <AreaWidget w={w} />;
      case 'bar': return <BarWidget w={w} />;
      case 'donut': return <DonutWidget w={w} />;
      case 'gauge': return <GaugeWidget w={w} />;
      case 'list': return <ListWidget w={w} go={go} clickable={clickable} />;
      case 'notice': return (
        <div className="card flex items-start gap-3 border-amber-200 bg-amber-50 p-5 text-sm text-amber-800" role="status">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /> {w.text}
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <section className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${accent.hero} p-6 text-white sm:p-8`}>
        <HeartPulse className="pointer-events-none absolute -right-6 -top-6 h-48 w-48 text-white/10" aria-hidden="true" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-white/80">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{greeting()}, {user.fullName.split(' ')[0]}</h2>
            {data?.headline && <p className="mt-2 max-w-xl text-sm text-white/90">{data.headline}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{ROLE_LABELS[user.role] ?? user.role}</span>
              {patientId && <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">ID: {patientId}</span>}
            </div>
          </div>
          <button onClick={reload} disabled={loading} aria-label="Refresh dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold backdrop-blur transition hover:bg-white/25 disabled:opacity-60">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </section>

            {/* {user.role === 'agent' && <AgentPanel />} */}

            {user.role === 'agent' && (
  <div className="flex flex-wrap gap-3">
    <button onClick={() => onNavigate('agent-register')} className="btn-primary inline-flex items-center gap-2 px-4">
      <UserPlus className="h-4 w-4" /> Register someone
    </button>
    <button onClick={() => onNavigate('agent-signups')}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
      View my signups
    </button>
  </div>
)}
<ReferralCard />
      {/* <ReferralCard /> */}


      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-danger/20 bg-danger-light px-3.5 py-3 text-sm text-danger-dark" role="alert">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {loading && !data ? <LoadingGrid /> : (
        <>
          {kpis.length > 0 && (
            <section aria-label="Key numbers" className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${stripCols}`}>
              {kpis.map((w) => <Kpi key={w.id} w={w} onClick={clickable(w) ? () => go(w) : undefined} />)}
            </section>
          )}
          <div className="grid grid-cols-12 gap-5">
            {rest.map((w) => (
              <div key={w.id} className={`col-span-12 ${(w.span || 6) >= 8 || w.span === 12 ? 'md:col-span-12' : 'md:col-span-6'} ${SPAN[w.span || 6]}`}>
                {render(w)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


