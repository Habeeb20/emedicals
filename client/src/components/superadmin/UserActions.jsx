import { Button } from "./UI"

export default function UserActions({ user: u, run, onView }) {
  if (u.role === 'super_admin') return <span className="text-xs text-gray-400">Protected</span>;
  const p = `/super-admin/users/${u._id}`;
  const put = (action, confirm) => () => run(`${p}/${action}`, { method: 'PUT' }, confirm);

  return (
    <>
      {onView && <Button onClick={() => onView(u)}>View</Button>}
      {!u.isApproved ? (
        <Button variant="success" onClick={put('approve')}>Approve</Button>
      ) : (
        <Button variant="outline" onClick={put('reject', `Revoke approval for ${u.fullName}?`)}>Revoke</Button>
      )}
      {u.isActive ? (
        <Button variant="warning" onClick={put('block', `Block ${u.fullName}? They will not be able to log in.`)}>Block</Button>
      ) : (
        <Button variant="success" onClick={put('unblock')}>Unblock</Button>
      )}
      <Button variant="danger" onClick={() => run(p, { method: 'DELETE' }, `Permanently delete ${u.fullName}? This cannot be undone.`)}>
        Delete
      </Button>
    </>
  );
}