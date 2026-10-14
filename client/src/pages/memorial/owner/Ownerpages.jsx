import { useEffect, useState } from 'react';
import { Eye, Heart, Share2, Star, Wallet, Clock3, Inbox, Users } from 'lucide-react';
import { memorialApi, errMsg } from '../memorialApi';
import { ArchLogo, EmptyState, KIND, Spinner, StatusBadge, ToastHost, compact, cx, fmtDate, naira } from '../ui';
import BookingsTab from './BookingsTab';
import RecordsTab from './RecordsTab';
import PlotsTab from './PlotsTab';
import LedgerTab from './LedgerTab';
import ReviewsTab from './ReviewsTab';
import SettingsTab from './SettingsTab';

/* One exported page per sidebar item. The main Dashboard owns ?tab=, so these have no tab bar of their own. */
const Shell = ({ children }) => (<><ToastHost />{children}</>);

export function MemorialOverviewPage({ onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { memorialApi.overview().then(setData).catch((e) => setError(errMsg(e))); }, []);
  if (error) return <EmptyState title="We couldn't open this page" hint={error} />;
  if (!data) return <div className="py-20 text-center"><Spinner className="mx-auto !h-8 !w-8" /></div>;
  const { org } = data;
  const prefix = org.type === 'mortuary' ? 'mortuary' : 'cemetery';
  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <ArchLogo org={org} size={52} />
          <div className="min-w-0">
            <h2 className="truncate font-serif text-2xl text-navy-900">{org.name}</h2>
            <p className="text-sm text-memorial-500">{KIND[org.type].label}{org.status !== 'approved' && <span className="ml-2 rounded-full bg-warning-light px-2 py-0.5 text-xs text-warning-dark">Awaiting approval, not public yet</span>}</p>
          </div>
        </div>
        <Overview data={data} go={() => onNavigate(`${prefix}-bookings`)} />
      </div>
    </Shell>
  );
}
export const MemorialBookingsPage = () => <Shell><BookingsTab /></Shell>;
export const MemorialRegisterPage = () => <Shell><RecordsTab /></Shell>;
export const MemorialPlotsPage = () => <Shell><PlotsTab /></Shell>;
export const MemorialAccountsPage = () => <Shell><LedgerTab /></Shell>;
export const MemorialReviewsPage = () => <Shell><ReviewsTab /></Shell>;
export function MemorialSettingsPage() {
  const [org, setOrg] = useState(null);
  useEffect(() => { memorialApi.settings().then((r) => setOrg(r.org)).catch(() => {}); }, []);
  if (!org) return <Spinner className="mx-auto my-12" />;
  return <Shell><SettingsTab org={org} /></Shell>;
}

function Overview({ data, go }) {
  const { bookings = {}, revenue, revenueByMonth, engagement, recent, occupancy, plots } = data;
  const active = (bookings.confirmed || 0) + (bookings.admitted || 0);
  const max = Math.max(...revenueByMonth.map((m) => m.total), 1);

  const stats = [
    { Icon: Inbox, label: 'Waiting for you', value: bookings.pending || 0, tone: 'bg-warning-light text-warning-dark', onClick: () => go('bookings') },
    { Icon: Users, label: 'In progress', value: active, tone: 'bg-info-light text-info-dark' },
    { Icon: Wallet, label: 'Received this month', value: naira(revenue.thisMonth), tone: 'bg-success-light text-success-dark' },
    { Icon: Clock3, label: 'Still owed to you', value: naira(revenue.outstanding), tone: 'bg-memorial-100 text-memorial-700' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <button key={s.label} onClick={s.onClick} disabled={!s.onClick} className="rounded-2xl border border-memorial-200 bg-white p-4 text-left disabled:cursor-default">
            <span className={cx('grid h-9 w-9 place-items-center rounded-xl', s.tone)}><s.Icon size={18} /></span>
            <p className="mt-3 font-serif text-2xl text-navy-900">{s.value}</p>
            <p className="text-xs text-memorial-500">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border border-memorial-200 bg-white p-5 lg:col-span-2">
          <div className="flex items-baseline justify-between"><h2 className="font-serif text-lg text-navy-900">Money received, last 6 months</h2><p className="text-sm text-memorial-500">Total {naira(revenue.allTime)}</p></div>
          {revenueByMonth.length === 0 ? <p className="py-10 text-center text-sm text-memorial-500">Payments you record will chart here.</p> : (
            <div className="mt-5 flex h-44 items-end gap-3">
              {revenueByMonth.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-[11px] text-memorial-500">{compact(m.total)}</span>
                  <div className="w-full rounded-t-xl bg-primary-500" style={{ height: `${Math.max((m.total / max) * 100, 4)}%` }} title={naira(m.total)} />
                  <span className="text-xs text-memorial-500">{new Date(`${m.month}-01`).toLocaleString('en', { month: 'short' })}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-memorial-200 bg-white p-5">
          <h2 className="font-serif text-lg text-navy-900">{occupancy ? 'Mortuary space' : 'Plots'}</h2>
          {occupancy ? (
            occupancy.capacity ? (<>
              <p className="mt-3 font-serif text-4xl text-navy-900">{occupancy.available}<span className="font-sans text-sm text-memorial-500"> free of {occupancy.capacity}</span></p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-memorial-100"><div className="h-full bg-primary-600" style={{ width: `${Math.min((occupancy.used / occupancy.capacity) * 100, 100)}%` }} /></div>
              <p className="mt-3 text-sm text-memorial-500">{occupancy.inCare} in care, {occupancy.reserved} arriving</p>
            </>) : <p className="mt-3 text-sm text-memorial-500">Set your capacity in Settings so families can see free space.</p>
          ) : (() => {
            const t = plots.available + plots.reserved + plots.occupied;
            return t === 0 ? <p className="mt-3 text-sm text-memorial-500">Add plots to start taking reservations.</p> : (<>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-memorial-100">
                <div className="bg-success" style={{ width: `${(plots.available / t) * 100}%` }} /><div className="bg-warning" style={{ width: `${(plots.reserved / t) * 100}%` }} /><div className="bg-memorial-500" style={{ width: `${(plots.occupied / t) * 100}%` }} />
              </div>
              <ul className="mt-4 space-y-1.5 text-sm text-memorial-600">
                <li className="flex justify-between"><span>Open</span><b>{plots.available}</b></li><li className="flex justify-between"><span>Reserved</span><b>{plots.reserved}</b></li><li className="flex justify-between"><span>Taken</span><b>{plots.occupied}</b></li>
              </ul>
            </>);
          })()}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border border-memorial-200 bg-white p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-serif text-lg text-navy-900">Latest requests</h2><button onClick={() => go('bookings')} className="text-sm text-primary-700 hover:underline">See all</button></div>
          {recent.length === 0 ? <p className="py-6 text-center text-sm text-memorial-500">New booking requests will show up here.</p> : (
            <ul className="divide-y divide-memorial-100">
              {recent.map((b) => (
                <li key={b._id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0"><p className="truncate text-sm font-medium text-navy-900">{b.deceased.fullName}</p><p className="text-xs text-memorial-500">{b.contact.name}, {fmtDate(b.createdAt)}</p></div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-3xl border border-memorial-200 bg-white p-5">
          <h2 className="font-serif text-lg text-navy-900">How families see you</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {[[Eye, 'Views', compact(engagement.views)], [Heart, 'Likes', compact(engagement.likes)], [Share2, 'Shares', compact(engagement.shares)], [Star, 'Rating', engagement.reviews ? `${engagement.rating} (${engagement.reviews})` : 'None yet']].map(([I, k, v]) => (
              <div key={k} className="rounded-2xl bg-memorial-50 p-3"><dt className="flex items-center gap-1.5 text-xs text-memorial-500"><I size={13} /> {k}</dt><dd className="mt-1 font-serif text-xl text-navy-900">{v}</dd></div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}