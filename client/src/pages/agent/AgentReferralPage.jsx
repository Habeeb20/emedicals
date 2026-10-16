/* ----------------------------- referral link -------------------------- */

export function AgentReferralPage() {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let off = false;
    api.get('/users/me/referral')
      .then((res) => { if (!off) setInfo(unwrap(res)); })
      .catch((err) => { if (!off) setError(getErrorMessage(err)); });
    return () => { off = true; };
  }, []);

  if (error) {
    return (
      <div className="flex items-start gap-2.5 rounded-lg bg-red-50 px-3.5 py-3 text-sm text-red-700" role="alert">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
      </div>
    );
  }
  if (!info) return <div className="h-48 animate-pulse rounded-2xl bg-gray-200/70" />;

  const link = `${window.location.origin}/signup?ref=${info.code}`;
  const message = `Join me on eMedicals: ${link}`;

  const copy = async () => {
    await copyText(link);
    setCopied(true);
    toast.success('Referral link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-navy-900">Your referral link</h2>
        <p className="mt-1 text-sm text-gray-600">
          Anyone who signs up through this link earns you 2 loyalty points.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Your referral link" className="input flex-1 text-sm" />
          <button type="button" onClick={copy} className="btn-primary inline-flex items-center justify-center gap-2 px-4">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          {typeof navigator !== 'undefined' && navigator.share && (
            <button type="button" onClick={() => navigator.share({ title: 'Join me on eMedicals', url: link }).catch(() => {})}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Share2 className="h-4 w-4" /> Share
            </button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xl font-bold text-navy-900">{fmt(info.referredCount)}</p>
            <p className="text-xs text-gray-500">Signed up</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xl font-bold text-navy-900">{fmt(info.pointsEarned)}</p>
            <p className="text-xs text-gray-500">Points earned</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xl font-bold tracking-wider text-navy-900">{info.code}</p>
            <p className="text-xs text-gray-500">Your code</p>
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-navy-900">Two ways to earn</h3>
        <ul className="mt-3 space-y-2 text-sm text-gray-600">
          <li><strong className="text-navy-900">Share your link:</strong> 2 points each time someone signs up with it.</li>
          <li><strong className="text-navy-900">Register someone yourself:</strong> 10 points for every user or organization you sign up from the Register someone page.</li>
        </ul>
      </section>
    </div>
  );
}