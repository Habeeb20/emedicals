export function AgentRegisterPage({ onNavigate }) {
  const [done, setDone] = useState({ count: 0, points: 0 });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {done.count > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="flex-1">
            {done.count} {done.count === 1 ? 'account' : 'accounts'} registered this session
            {done.points > 0 && <> · <strong>+{done.points} points</strong></>}
          </span>
          <button type="button" onClick={() => onNavigate('agent-signups')} className="font-semibold underline-offset-2 hover:underline">
            View my signups
          </button>
        </div>
      )}
      <Signup
        agentMode
        embedded
        onRegistered={(d) => setDone((s) => ({ count: s.count + 1, points: s.points + (d?.pointsAwarded || 0) }))}
      />
    </div>
  );
}