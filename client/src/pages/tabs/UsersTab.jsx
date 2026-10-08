import { useState } from 'react';
import { Avatar, DataTable, Pager, RoleBadge, SearchInput, UserStatusBadge, PageIntro, inputCls } from '../../components/superadmin/UI';
import UserActions from '../../components/superadmin/UserActions';
import UserModal from '../../components/superadmin/UserModal';
import { useAction, useList } from '../../lib/hooks';
import { ROLES, fmtDate, label } from '../../lib/constants';

/** lockedStatus="pending" turns this into the approvals queue (no status filter, no page intro). */
export default function UsersTab({ notify, onChanged, lockedStatus }) {
  const [f, setF] = useState({ search: '', role: '', status: '' });
  const [selected, setSelected] = useState(null);
  const { rows, pagination, loading, error, setPage, reload } = useList('/super-admin/users', { ...f, status: lockedStatus || f.status });
  const run = useAction(reload, notify, onChanged);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const columns = [
    {
      head: 'User',
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.fullName} />
          <div className="min-w-0 text-left">
            <p className="truncate font-medium text-navy-900">{u.fullName}</p>
            <p className="truncate text-xs text-gray-500">{u.email}</p>
          </div>
        </div>
      ),
    },
    { head: 'Role', cell: (u) => <RoleBadge role={u.role} /> },
    { head: 'Organization', cell: (u) => u.organization?.name || '—' },
    { head: 'Status', cell: (u) => <UserStatusBadge user={u} /> },
    { head: 'Joined', cell: (u) => fmtDate(u.createdAt) },
  ];

  return (
    <>
      {!lockedStatus && <PageIntro title="Users" subtitle="Approve, block, review and manage every account." />}

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <SearchInput placeholder="Search name, email or phone" value={f.search} onChange={set('search')} />
        <select className={inputCls} value={f.role} onChange={set('role')}>
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{label(r)}</option>)}
        </select>
        {!lockedStatus && (
          <select className={inputCls} value={f.status} onChange={set('status')}>
            <option value="">All statuses</option>
            <option value="pending">Pending approval</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <DataTable
        rows={rows}
        columns={columns}
        loading={loading}
        empty={lockedStatus ? 'No accounts waiting for approval.' : 'No users match your filters.'}
        actions={(u) => <UserActions user={u} run={run} onView={setSelected} />}
      />
      <Pager p={pagination} onPage={setPage} />

      {selected && (
        <UserModal user={selected} onClose={() => setSelected(null)} run={run} />
      )}
    </>
  );
}