import { PageIntro } from '../../components/superadmin/UI';
import UsersTab from './UsersTab';
import OrganizationsTab from './OrganizationsTab';

/** Approval queue: reuses the Users and Organizations tabs, locked to status=pending. */
export default function PendingTab(props) {
  return (
    <>
      <PageIntro title="Pending approvals" subtitle="New accounts and organizations waiting for your decision." />
      <h3 className="mb-3 text-sm font-semibold text-navy-900">Accounts</h3>
      <UsersTab {...props} lockedStatus="pending" />
      <h3 className="mb-3 mt-10 text-sm font-semibold text-navy-900">Organizations</h3>
      <OrganizationsTab {...props} lockedStatus="pending" />
    </>
  );
}