import { ChevronRight, CircleAlert, HeartPulse } from 'lucide-react';
import { NAV_ITEMS, ROLE_LABELS, TINTS } from '@/config/dashboardNav.js';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

// Each stat links to a tab and is only shown if the user's role can open that tab.
const STATS = [
  { tab: 'appointments',  label: 'Appointments',    get: (d) => d?.appointments?.total },
  { tab: 'prescriptions', label: 'Prescriptions',   get: (d) => d?.prescriptions?.total },
  { tab: 'lab-orders',    label: 'Lab orders',      get: (d) => d?.labOrders?.total },
  { tab: 'messages',      label: 'Unread messages', get: (d) => d?.chat?.unread },
];

export default function OverviewTab({ user, data, loading, error, items, accent, onNavigate }) {
  const allowed = new Set(items.map((i) => i.key));
  const itemByKey = Object.fromEntries(NAV_ITEMS.map((i) => [i.key, i]));
  const stats = STATS.filter((s) => allowed.has(s.tab));
  const shortcuts = items.filter((i) => !['overview', 'messages', 'profile'].includes(i.key)).slice(0, 4);
  const patientId = data?.profile?.patient?.patientId;

  return (
    <div className="space-y-8">
      <section className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${accent.hero} p-6 text-white sm:p-8`}>
        <HeartPulse className="pointer-events-none absolute -right-6 -top-6 h-48 w-48 text-white/10" aria-hidden="true" />
        <p className="text-sm text-white/80">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
          {greeting()}, {user.fullName.split(' ')[0]}
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
          {patientId && (
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">ID: {patientId}</span>
          )}
        </div>
      </section>

      {error && (
        <div
          className="flex items-start gap-2.5 rounded-lg border border-danger/20 bg-danger-light px-3.5 py-3 text-sm text-danger-dark"
          role="alert"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {stats.length > 0 && (
        <section aria-label="Your numbers">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(({ tab, label, get }) => {
              const item = itemByKey[tab];
              const Icon = item.icon;
              const value = get(data);
              return (
                <button
                  key={tab}
                  onClick={() => onNavigate(tab)}
                  className="card p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none"
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${TINTS[item.module]}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  {loading ? (
                    <div className="mt-4 h-8 w-12 animate-pulse rounded bg-gray-200" />
                  ) : (
                    <p className="mt-4 text-3xl font-bold text-navy-900">{value ?? '–'}</p>
                  )}
                  <p className="text-sm text-gray-600">{label}</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {shortcuts.length > 0 && (
        <section aria-label="Quick access">
          <h2 className="mb-3 text-sm font-semibold text-navy-700">Quick access</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {shortcuts.map(({ key, label, icon: Icon, module }) => (
              <button
                key={key}
                onClick={() => onNavigate(key)}
                className="card flex items-center gap-4 p-4 text-left transition hover:border-gray-300 hover:shadow-md motion-reduce:transition-none"
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${TINTS[module]}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex-1 font-medium text-navy-900">{label}</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}