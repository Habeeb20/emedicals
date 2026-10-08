import { useState } from 'react';
import { api } from './api';
import { useFetch } from './hooks';
import { Badge, Button, Card, EmptyState, ErrorNote, Icon, PageHeader, PageShell, Skeleton, Toggle } from './ui';

const STATUS = { issued: ['Not collected', 'warning'], dispensed: ['Dispensed', 'success'], partially_dispensed: ['Partly dispensed', 'info'], cancelled: ['Cancelled', 'neutral'] };

export function PrescriptionItems({ items }) {
  return (
    <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
      {items.map((it, i) => (
        <li key={i} className="px-3.5 py-3">
          <p className="font-medium text-navy-900">{it.medicine}{it.dosage && <span className="font-normal text-gray-600">, {it.dosage}</span>}</p>
          <p className="mt-0.5 text-sm text-gray-600">{[it.frequency, it.duration, it.quantity && `qty ${it.quantity}`].filter(Boolean).join(', ')}</p>
          {it.purpose && <p className="mt-1 text-sm text-pharmacy-700">For: {it.purpose}</p>}
          {it.instructions && <p className="mt-0.5 text-sm text-gray-500">{it.instructions}</p>}
        </li>
      ))}
    </ul>
  );
}

export default function PrescriptionsPage() {
  const list = useFetch(() => api('/prescriptions/mine'), []);
  const [isPublic, setIsPublic] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const pub = isPublic ?? list.meta?.isPublic ?? false;

  const toggle = async (v) => {
    setIsPublic(v); setError('');
    try { await api('/prescriptions/visibility', { method: 'PATCH', body: { isPublic: v } }); }
    catch (e) { setIsPublic(!v); setError(e.message); }
  };
  const copy = (code) => { navigator.clipboard?.writeText(code); setCopied(code); setTimeout(() => setCopied(''), 1800); };

  return (
    <PageShell className="max-w-3xl">
      <PageHeader title="My prescriptions" subtitle="Everything your doctors have prescribed, in one place." />

      <Card className="mb-6 border-pharmacy-200 bg-pharmacy-50/50">
        <Toggle accent="pharmacy" checked={pub} onChange={toggle} label="Let pharmacies find my prescriptions"
          description={pub ? 'On. A pharmacist can search your name or a drug and see what you were prescribed, by whom, and why.'
            : 'Off. Pharmacies can only open a prescription if you give them its code.'} />
      </Card>
      <div className="mb-4"><ErrorNote>{error || list.error}</ErrorNote></div>

      {list.loading ? <div className="space-y-4"><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-48 rounded-2xl" /></div>
        : !list.data?.length ? <EmptyState icon="pill" title="No prescriptions yet" body="When a doctor prescribes drugs after your visit, they appear here." />
        : (
          <ul className="space-y-4">
            {list.data.map((p) => (
              <li key={p._id}>
                <Card className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-navy-900">{p.doctor?.fullName}</p>
                      <p className="text-sm text-gray-600">{[p.organization?.name, new Date(p.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })].filter(Boolean).join(', ')}</p>
                      {p.purpose && <p className="mt-1 text-sm text-gray-700">For: {p.purpose}</p>}
                    </div>
                    <Badge tone={STATUS[p.status]?.[1]}>{STATUS[p.status]?.[0] || p.status}</Badge>
                  </div>
                  <PrescriptionItems items={p.items} />
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3.5 py-2.5">
                    <div><p className="text-xs text-gray-500">Pharmacy code</p><p className="font-mono text-lg font-semibold tracking-wider text-navy-900">{p.code}</p></div>
                    <Button size="sm" variant="secondary" icon={copied === p.code ? 'check' : 'copy'} onClick={() => copy(p.code)}>{copied === p.code ? 'Copied' : 'Copy'}</Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
    </PageShell>
  );
}
