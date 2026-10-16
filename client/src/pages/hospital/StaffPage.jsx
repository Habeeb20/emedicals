import api from '@/lib/api.js';
import { useApi, useAction, StatusBadge, Badge, Spinner, Empty, ErrorNote, btn, fmtDate } from './hospitalShared.jsx';

const ROLE_LABELS = {
  doctor: 'Doctor', nurse: 'Nurse', lab_tech: 'Lab technician', pharmacist: 'Pharmacist', hospital_admin: 'Hospital admin',
};

export default function StaffPage({ user }) {
  const { data: staff, loading, error } = useApi('/hospital/staff', { live: ['hospital:staff'] });
  const [run, busy] = useAction();
  const myId = user._id ?? user.id;

  const update = (person, changes, message) => run(() => api.patch(`/hospital/staff/${person._id}`, changes), message);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <ErrorNote message={error} />
      {staff?.length === 0 && <Empty title="No staff accounts yet" hint="Staff who sign up for your hospital appear here, waiting for your approval." />}

      <ul className="space-y-3">
        {staff?.map((person) => {
          const isMe = person._id === myId;
          return (
            <li key={person._id} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-navy-900">{person.fullName}</p>
                  <Badge tone="primary">{ROLE_LABELS[person.role] ?? person.role}</Badge>
                  {!person.isApproved && <StatusBadge value="pending" />}
                  {person.isApproved && <StatusBadge value={person.isActive === false ? 'inactive' : 'active'} />}
                </div>
                <p className="truncate text-sm text-gray-600">{person.email}{person.phone ? ` · ${person.phone}` : ''}</p>
                <p className="text-xs text-gray-500">Last login: {person.lastLoginAt ? fmtDate(person.lastLoginAt) : 'never'}</p>
              </div>

              {!isMe && (
                <div className="flex gap-2">
                  {!person.isApproved && (
                    <button className={`${btn.primary} ${btn.small}`} disabled={busy} onClick={() => update(person, { isApproved: true }, 'Account approved')}>Approve</button>
                  )}
                  {person.isApproved && person.isActive !== false && (
                    <button className={`${btn.ghost} ${btn.small}`} disabled={busy} onClick={() => update(person, { isActive: false }, 'Account switched off')}>Switch off</button>
                  )}
                  {person.isApproved && person.isActive === false && (
                    <button className={`${btn.primary} ${btn.small}`} disabled={busy} onClick={() => update(person, { isActive: true }, 'Account switched on')}>Switch on</button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}