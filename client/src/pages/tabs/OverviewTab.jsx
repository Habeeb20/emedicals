import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/superadmin/Icon';

import { Badge, Card, PageIntro, Spinner } from '../../components/superadmin/UI';
import api from "../../lib/api"
import { ORG_TONE, ROLE_BAR, STATUS_TONE, label } from '../../lib/constants';

export default function OverviewTab() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');


  console.log(d)

  useEffect(() => {
    api('/super-admin/stats').then((r) => setD(r.data)).catch((e) => setErr(e.message));
  }, []);

  if (err) return <Card className="p-6 text-sm text-danger">{err}</Card>;
  if (!d) return <div className="flex justify-center py-24"><Spinner /></div>;

  const stats = [
    { label: 'Total users', value: d.data?.users.total, icon: 'users', chip: 'bg-primary-50 text-primary-600' },
    { label: 'Pending approval', value: d.data?.users.pending, icon: 'clock', chip: 'bg-warning-light text-warning' },
    { label: 'Blocked', value: d.data?.users.blocked, icon: 'ban', chip: 'bg-danger-light text-danger' },
    { label: 'New this week', value: d.data?.users.newThisWeek, icon: 'trend', chip: 'bg-info-light text-info' },
  ];
  const roles = Object.entries(d.data?.byRole).filter(([r]) => ROLE_BAR[r]).sort((a, b) => b[1] - a[1]);
  const roleMax = Math.max(1, ...roles.map(([, n]) => n));

  return (
    <>
      <PageIntro title="Overview" subtitle="A snapshot of everything happening on eMedicals." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 sm:p-5">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${s.chip}`}><Icon name={s.icon} /></div>
            <p className="text-2xl font-semibold tabular-nums text-navy-900">{s.value}</p>
            <p className="text-xs text-gray-500 sm:text-sm">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:mt-6 lg:grid-cols-2 lg:gap-6">
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-navy-900">Users by role</h3>
          {roles.length === 0 && <p className="text-sm text-gray-400">No users yet.</p>}
          <ul className="space-y-3">
            {roles.map(([r, n]) => (
              <li key={r}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="capitalize text-gray-600">{label(r)}</span>
                  <span className="font-medium tabular-nums text-navy-800">{n}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full rounded-full ${ROLE_BAR[r]}`} style={{ width: `${(n / roleMax) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-navy-900">Organizations</h3>
          <div className="grid grid-cols-3 gap-3">
            {['approved', 'pending', 'suspended'].map((s) => (
              <div key={s} className="rounded-xl bg-gray-50 p-3 text-center">
                <p className="text-xl font-semibold tabular-nums text-navy-900">{d.data?.organizations[s] || 0}</p>
                <Badge tone={STATUS_TONE[s]}>{s}</Badge>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500">Awaiting approval</h4>
            <Link to="?tab=pending" className="text-xs font-medium text-primary-600 hover:text-primary-700">View all</Link>
          </div>
          {d.data?.pendingOrganizations.length === 0 && <p className="mt-3 text-sm text-gray-400">Nothing pending. You're all caught up.</p>}
          <ul className="mt-2 divide-y divide-gray-100">
            {d.data?.pendingOrganizations.map((o) => (
              <li key={o._id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="truncate pr-3 text-navy-800">{o.name}</span>
                <Badge tone={ORG_TONE[o.type]}>{o.type}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}