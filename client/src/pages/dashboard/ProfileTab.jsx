import { BadgeCheck, Clock } from 'lucide-react';
import { ROLE_LABELS } from '@/config/dashboardNav.js';

const Field = ({ label, value }) =>
  value ? (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-navy-900">{value}</dd>
    </div>
  ) : null;

export default function ProfileTab({ user, accent }) {
  const initials = user.fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="card max-w-2xl p-6 sm:p-8">
      <div className="flex items-center gap-4">
        <span className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold text-white ${accent.avatar}`}>
          {initials}
        </span>
        <div>
          <h2 className="text-xl font-bold text-navy-900">{user.fullName}</h2>
          <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${accent.badge}`}>
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
        </div>
      </div>

      <dl className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label="Email" value={user.email} />
        <Field label="Phone" value={user.phone} />
        <Field label="Gender" value={user.gender && user.gender[0].toUpperCase() + user.gender.slice(1)} />
        <Field
          label="Date of birth"
          value={user.dateOfBirth && new Date(user.dateOfBirth).toLocaleDateString()}
        />
        <Field
          label="Member since"
          value={user.createdAt && new Date(user.createdAt).toLocaleDateString()}
        />
      </dl>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-200 pt-5">
        {user.isVerified && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-light px-3 py-1 text-xs font-semibold text-success-dark">
            <BadgeCheck className="h-3.5 w-3.5" /> Verified
          </span>
        )}
        {!user.isApproved && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-light px-3 py-1 text-xs font-semibold text-warning-dark">
            <Clock className="h-3.5 w-3.5" /> Awaiting approval
          </span>
        )}
      </div>
    </div>
  );
}