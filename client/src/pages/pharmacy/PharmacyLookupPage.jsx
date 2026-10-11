import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import  api  from './api';
import { useDebounced } from '../appointments/hooks';

import { Avatar, Badge, Card, EmptyState, ErrorNote, Icon, inputCls, PageHeader, PageShell, Skeleton } from '../appointments/ui';
import PrescriptionsPage from '../appointments/PrescriptionsPage';
import { ageFrom } from '../appointments/format';
import { PrescriptionItems } from '../appointments/PrescriptionsPage';
import { PharmacyNav, primaryBtn } from './PharmacyShared';

// Searching is unchanged. Dispensing now happens on the Attend page, which picks the exact
// product, deducts stock batch by batch (first-expiry-first-out), bills and notifies the patient.
export default function PharmacyLookupPage() {
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 400);
  const [results, setResults] = useState(null);
  const [via, setVia] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Opens the Attend tab inside the dashboard, carrying the id and code with it
const attendUrl = (p) => {
  const qs = new URLSearchParams({ tab: 'pharmacy-attend', id: String(p.id || p._id) });
  if (p.code) qs.set('code', p.code);
  return `/dashboard?${qs.toString()}`;
};

  useEffect(() => {
    if (dq.trim().length < 2) { setResults(null); setError(''); return undefined; }
    let off = false;
    setLoading(true);
    api('/prescriptions/search', { params: { q: dq.trim() } })
      .then((r) => { if (!off) { setResults(r.data?.data); setVia(r.meta); setError(''); } })
      .catch((e) => !off && setError(e.message))
      .finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, [dq]);

  return (
    <PageShell className="max-w-3xl">
      <PageHeader title="Prescription lookup" subtitle="Search a patient's name or a drug. You'll see prescriptions patients have chosen to share." />
      <PharmacyNav />

      <div className="relative mb-2">
        <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search prescriptions" placeholder="Patient name, drug, or code like RX-4F2A9C"
          className={`${inputCls} h-12 pl-11 focus:!border-pharmacy-500 focus:!ring-pharmacy-500/30`} />
      </div>
      <p className="mb-5 text-sm text-gray-600">Have a code from the patient? Enter it to open that one prescription, even if their sharing is off.</p>
      <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>

      {loading ? <div className="space-y-4"><Skeleton className="h-56 rounded-2xl" /><Skeleton className="h-56 rounded-2xl" /></div>
        : results === null ? <EmptyState icon="pill" title="Start typing to search" body="Results appear as you type." />
        : results.length === 0 ? <EmptyState icon="search" title="Nothing found" body="Either there's no match, or the patient has not made their prescriptions public. Ask them for the code." />
        : (
          <ul className="space-y-4">
            {results.map((p) => (
              <li key={p.id}>
                <Card className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Avatar tone="pharmacy" name={p.patient?.name} />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-navy-900">{p.patient?.name}</h3>
                      <p className="text-sm text-gray-600">{[ageFrom(p.patient?.dateOfBirth) && `${ageFrom(p.patient.dateOfBirth)} yrs`, p.patient?.gender].filter(Boolean).join(', ')}</p>
                    </div>
                    <Badge tone={p.status === 'dispensed' ? 'success' : p.status === 'issued' ? 'warning' : 'neutral'}>{p.status.replace('_', ' ')}</Badge>
                  </div>
                  <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <div><dt className="text-gray-500">Prescribed by</dt><dd className="font-medium text-navy-900">{p.prescribedBy || 'Unknown'}</dd></div>
                    <div><dt className="text-gray-500">Hospital</dt><dd className="font-medium text-navy-900">{p.hospital || 'Not recorded'}</dd></div>
                    <div><dt className="text-gray-500">Date</dt><dd className="font-medium text-navy-900">{new Date(p.issuedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
                    <div><dt className="text-gray-500">Code</dt><dd className="font-mono font-medium text-navy-900">{p.code}</dd></div>
                  </dl>
                  {p.purpose && <p className="text-sm text-gray-700">Overall reason: {p.purpose}</p>}
                  <PrescriptionItems items={p.items} />
                  {['issued', 'partially_dispensed'].includes(p.status) && (
                    <div className="flex justify-end border-t border-gray-100 pt-3">
                  <Link to={attendUrl(p)} className={primaryBtn}>Attend to this prescription</Link>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
    </PageShell>
  );
}