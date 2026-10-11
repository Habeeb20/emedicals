import { useState } from 'react';
import { Badge, Button, DataTable, OrgStatusBadge, PageIntro, Pager, SearchInput, inputCls } from '../../components/superadmin/UI';
import { useAction, useList } from '../../lib/hooks';
import { ORG_TONE, ORG_TYPES, fmtDate } from '../../lib/constants';

export default function OrganizationsTab({ notify, onChanged, lockedStatus }) {
  const [f, setF] = useState({ search: '', type: '', status: '' });
  const { rows, pagination, loading, error, setPage, reload } = useList('/super-admin/organizations', { ...f, status: lockedStatus || f.status });
  const run = useAction(reload, notify, onChanged);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const columns = [
    {
      head: 'Organization',
      cell: (o) => (
        <div className="text-left">
          <p className="font-medium text-navy-900">{o.name}</p>
          <p className="text-xs text-gray-500">{o.licenseNumber ? `Licence ${o.licenseNumber}` : 'No licence number'}</p>
        </div>
      ),
    },
    { head: 'Type', cell: (o) => <Badge tone={ORG_TONE[o.type]}>{o.type}</Badge> },
    {
      head: 'Owner',
      cell: (o) => (
        <div className="text-left md:text-left">
          <p>{o.owner?.fullName || '—'}</p>
          <p className="text-xs text-gray-500">{o.owner?.email}</p>
        </div>
      ),
    },
    { head: 'Location', cell: (o) => [o.address?.city, o.address?.state].filter(Boolean).join(', ') || '—' },
    { head: 'Status', cell: (o) => <OrgStatusBadge status={o.status} /> },
    { head: 'Registered', cell: (o) => fmtDate(o.createdAt) },
  ];

  const actions = (o) => {
    const p = `super-admin/organizations/${o._id}`;
    const put = (a, c) => () => run(`${p}/${a}`, { method: 'PUT' }, c);
    if (o.status === 'pending') return <Button variant="success" onClick={put('approve')}>Approve</Button>;
    if (o.status === 'approved') return <Button variant="warning" onClick={put('suspend', `Suspend ${o.name}?`)}>Suspend</Button>;
    return <Button variant="success" onClick={put('reinstate')}>Reinstate</Button>;
  };

  return (
    <>
      {!lockedStatus && <PageIntro title="Organizations" subtitle="Hospitals, labs, pharmacies and memorial services." />}

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <SearchInput placeholder="Search organization" value={f.search} onChange={set('search')} />
        <select className={inputCls} value={f.type} onChange={set('type')}>
          <option value="">All types</option>
          {ORG_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
        {!lockedStatus && (
          <select className={inputCls} value={f.status} onChange={set('status')}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="suspended">Suspended</option>
          </select>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <DataTable rows={rows} columns={columns} loading={loading} actions={actions}
        empty={lockedStatus ? 'No organizations waiting for approval.' : 'No organizations match your filters.'} />
      <Pager p={pagination} onPage={setPage} />
    </>
  );
}