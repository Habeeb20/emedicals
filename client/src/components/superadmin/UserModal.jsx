import { useState } from 'react';
import { Avatar, Button, Modal, RoleBadge, UserStatusBadge, inputCls } from './UI';
import UserActions from './UserActions';
import { ROLES, fmtDate, label } from '../../lib/constants';

export default function UserModal({ user: u, run, onClose }) {
  const [role, setRole] = useState(u.role);
  const isSuper = u.role === 'super_admin';

  const details = [
    ['Email', u.email],
    ['Phone', u.phone || '—'],
    ['Organization', u.organization?.name || '—'],
    ['Verified', u.isVerified ? 'Yes' : 'No'],
    ['Joined', fmtDate(u.createdAt)],
    ['Last login', fmtDate(u.lastLoginAt)],
  ];

  return (
    <Modal title="User details" onClose={onClose}>
      <div className="flex items-center gap-3">
        <Avatar name={u.fullName} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy-900">{u.fullName}</p>
          <div className="mt-1 flex gap-2"><RoleBadge role={u.role} /><UserStatusBadge user={u} /></div>
        </div>
      </div>

      <dl className="mt-5 divide-y divide-gray-100 rounded-xl border border-gray-200 text-sm">
        {details.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
            <dt className="text-gray-500">{k}</dt>
            <dd className="break-all text-right text-navy-800">{v}</dd>
          </div>
        ))}
      </dl>

      {!isSuper && (
        <div className="mt-5">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">Change role</label>
          <div className="flex gap-2">
            <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r} className="capitalize">{label(r)}</option>)}
            </select>
            <Button
              variant="primary"
              className="px-4"
              disabled={role === u.role}
              onClick={async () => (await run(`/users/${u._id}/role`, { method: 'PUT', body: { role } }, `Change role to ${label(role)}?`)) && onClose()}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
        <UserActions user={u} run={async (...a) => (await run(...a)) && onClose()} />
      </div>
    </Modal>
  );
}