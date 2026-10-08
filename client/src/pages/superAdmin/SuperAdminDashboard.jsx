

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../../components/superadmin/Sidebar';
import Icon from '../../components/superadmin/Icon';
import { useToast } from '../../components/superadmin/ui';
import  api  from '../../lib/api';

import OverviewTab from '../tabs/OverviewTab';
import PendingTab from '../tabs/PendingTab';
import UsersTab from '../tabs/UsersTab';
import OrganizationsTab from '../tabs/OrganizationsTab';


// Add a page here and it appears in the sidebar and works with ?tab=<key>
const TABS = [
  { key: 'overview', label: 'Overview', icon: 'home', Component: OverviewTab },
  { key: 'pending', label: 'Pending approvals', icon: 'clock', Component: PendingTab },
  { key: 'users', label: 'Users', icon: 'users', Component: UsersTab },
  { key: 'organizations', label: 'Organizations', icon: 'building', Component: OrganizationsTab },
];

export default function SuperAdminDashboard() {
  const [params, setParams] = useSearchParams();
  const active = TABS.find((t) => t.key === params.get('tab')) || TABS[0];
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(0);
  const [toast, notify] = useToast();

  const refreshPending = useCallback(() => {
    api('/super-admin/stats')
      .then((r) => setPending(r.data.users.pending + (r.data.organizations.pending || 0)))
      .catch(() => {});
  }, []);
  useEffect(() => { refreshPending(); }, [refreshPending, active.key]);

  // Escape closes the mobile menu
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const select = (key) => {
    setParams({ tab: key });
    setOpen(false);
    window.scrollTo({ top: 0 });
  };
  const logout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const { Component } = active;
  return (
    <div className="min-h-screen bg-gray-50 text-navy-800">
      <Sidebar tabs={TABS} active={active.key} onSelect={select} open={open} onClose={() => setOpen(false)} pending={pending} onLogout={logout} />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-navy-700 hover:bg-gray-100 lg:hidden" aria-label="Open menu">
            <Icon name="menu" />
          </button>
          <h1 className="text-base font-semibold text-navy-900">{active.label}</h1>
        </header>

        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          <Component notify={notify} onChanged={refreshPending} />
        </main>
      </div>

      {toast}
    </div>
  );
}