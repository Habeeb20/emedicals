import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import  api  from './api';
import {Card, ErrorNote, PageHeader, PageShell, Skeleton} from '../appointments/ui';

import { PharmacyNav, Pill, StatCard, daysUntil, drugLabel, fmtDate, money, primaryBtn, ghostBtn, usePharmacyMe } from './PharmacyShared';

export default function PharmacyDashboardPage() {
  const me = usePharmacyMe();
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/pharmacy/dashboard'), api('/pharmacy/alerts')])
      .then(([s, a]) => { setStats(s.data); setAlerts(a.data); })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <PageShell className="max-w-5xl">
      <PageHeader title={me?.pharmacy?.name || 'Pharmacy'} subtitle="Today at a glance. Attend to patients, sell, and keep stock healthy." />
      <PharmacyNav />
      <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link to="/pharmacy/lookup" className={primaryBtn}>Attend to a prescription</Link>
        <Link to="/pharmacy/pos" className={ghostBtn}>New sale</Link>
        {me?.isManager && <Link to="/pharmacy/inventory" className={ghostBtn}>Manage stock</Link>}
      </div>

      {!stats ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Sales today" value={money(stats.todayRevenue)} hint={`${stats.todaySales} transactions`} />
          <StatCard label="Prescriptions today" value={stats.prescriptionsToday} />
          <StatCard label="Low or out of stock" value={stats.lowStock} tone={stats.lowStock ? 'warning' : 'navy'} hint="Drugs at or below reorder level" />
          <StatCard label="Expired batches" value={stats.expired} tone={stats.expired ? 'danger' : 'navy'} hint={`${stats.expiring} expire within 90 days`} />
        </div>
      )}

      {alerts && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-semibold text-navy-900">Running low</h2>
            {alerts.lowStock.length === 0 ? <p className="text-sm text-gray-600">Everything is above its reorder level.</p> : (
              <ul className="divide-y divide-gray-100">
                {alerts.lowStock.slice(0, 8).map((d) => (
                  <li key={d._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0 truncate text-navy-900">{drugLabel(d)}</span>
                    <Pill tone={d.stock === 0 ? 'danger' : 'warning'}>{d.stock === 0 ? 'Out of stock' : `${d.stock} left`}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold text-navy-900">Expiry watch</h2>
            {alerts.expired.length + alerts.expiring.length === 0 ? <p className="text-sm text-gray-600">No batches are expired or close to expiry.</p> : (
              <ul className="divide-y divide-gray-100">
                {[...alerts.expired, ...alerts.expiring].slice(0, 8).map((b) => {
                  const d = daysUntil(b.expiryDate);
                  return (
                    <li key={b._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate text-navy-900">{b.drug ? drugLabel(b.drug) : 'Drug'}</span>
                        <span className="text-xs text-gray-500">Batch {b.batchNo} · {b.quantity} units · {fmtDate(b.expiryDate)}</span>
                      </span>
                      <Pill tone={d <= 0 ? 'danger' : d <= 30 ? 'warning' : 'info'}>{d <= 0 ? 'Expired' : `${d} days`}</Pill>
                    </li>
                  );
                })}
              </ul>
            )}
            {alerts.expired.length > 0 && me?.isManager && <p className="mt-3 text-xs text-gray-600">Expired stock cannot be sold. Write it off from Inventory so your records stay accurate.</p>}
          </Card>
        </div>
      )}
    </PageShell>
  );
}