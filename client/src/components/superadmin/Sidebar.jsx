import Icon from './Icon';

export default function Sidebar({ tabs, active, onSelect, open, onClose, pending, onLogout }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-navy-950/60 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-lg">
              <Icon name="shield" />
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-white">eMedicals</p>
              <p className="text-xs text-primary-300">Super Admin</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-navy-300 hover:bg-navy-800 lg:hidden" aria-label="Close menu">
            <Icon name="x" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-navy-500">Manage</p>
          {tabs.map((t) => {
            const isActive = t.key === active;
            const count = t.key === 'pending' ? pending : 0;
            return (
              <button
                key={t.key}
                onClick={() => onSelect(t.key)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-primary-600 text-white shadow' : 'text-navy-300 hover:bg-navy-800 hover:text-white'
                }`}
              >
                <Icon name={t.icon} />
                <span className="flex-1 text-left">{t.label}</span>
                {count > 0 && (
                  <span className="rounded-full bg-warning px-2 py-0.5 text-xs font-semibold text-white">{count}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-navy-800 p-3">
          <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-navy-300 hover:bg-navy-800 hover:text-white">
            <Icon name="logout" /> Log out
          </button>
        </div>
      </aside>
    </>
  );
}