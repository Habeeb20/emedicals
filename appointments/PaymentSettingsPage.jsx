import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from './api';
import { fetchStates } from './location';
import { useFetch } from './hooks';
import { Badge, Button, Card, cx, ErrorNote, Field, Icon, inputCls, PageHeader, PageShell, Skeleton } from './ui';
import { naira, PAYMENT_MODES } from './format';

export default function PaymentSettingsPage() {
  const { user } = useAuth();
  const isOrg = user?.role === 'hospital_admin';
  const id = isOrg ? user.organization?._id || user.organization : user?._id || user?.id;

  const current = useFetch(() => api(isOrg ? `/providers/hospitals/${id}` : `/providers/doctors/${id}`), [id]);
  const states = useFetch(async () => ({ data: await fetchStates() }), []);

  const [mode, setMode] = useState('arrival');
  const [fee, setFee] = useState('');
  const [deposit, setDeposit] = useState('');
  const [departments, setDepartments] = useState([]);
  const [dept, setDept] = useState('');
  const [address, setAddress] = useState({ street: '', city: '', state: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const d = current.data; if (!d) return;
    const ps = d.paymentSettings || {};
    setMode(ps.mode || 'arrival');
    setFee(String(ps.appointmentFee ?? d.consultationFee ?? ''));
    setDeposit(String(ps.depositAmount || ''));
    if (isOrg) { setDepartments(d.departments || []); setAddress({ street: d.address?.street || '', city: d.address?.city || '', state: d.address?.state || '' }); }
  }, [current.data, isOrg]);

  const addDept = () => { const v = dept.trim(); if (v && !departments.includes(v)) setDepartments([...departments, v]); setDept(''); };

  const save = async () => {
    setBusy(true); setError(''); setSaved(false);
    try {
      await api('/providers/me/settings', { method: 'PATCH', body: {
        mode, appointmentFee: Number(fee || 0), depositAmount: mode === 'deposit' ? Number(deposit || 0) : 0,
        ...(isOrg && { departments, address }),
      } });
      setSaved(true);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const summary = {
    arrival: `Patients pay ${naira(fee)} at the desk. Chat opens as soon as you accept.`,
    booking: `After you accept, patients pay ${naira(fee)} online. Chat opens when payment lands.`,
    deposit: `After you accept, patients pay a ${naira(deposit)} deposit online. The remaining ${naira(Math.max(0, Number(fee || 0) - Number(deposit || 0)))} is due on arrival.`,
  }[mode];

  if (current.loading) return <PageShell className="max-w-3xl"><Skeleton className="h-96 rounded-2xl" /></PageShell>;

  return (
    <PageShell className="max-w-3xl">
      <PageHeader title="Appointment settings" subtitle={isOrg ? 'Set how your hospital charges, which departments you run, and where you are.' : 'Set your fee and how patients pay you.'} />
      <div className="space-y-5">
        <Card>
          <h2 className="mb-3 font-semibold text-navy-900">How patients pay</h2>
          <div role="radiogroup" aria-label="Payment mode" className="grid gap-3 sm:grid-cols-3">
            {Object.entries(PAYMENT_MODES).map(([key, m]) => (
              <button key={key} type="button" role="radio" aria-checked={mode === key} onClick={() => setMode(key)}
                className={cx('rounded-xl border p-3.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                  mode === key ? 'border-primary-600 bg-primary-50' : 'border-gray-300 bg-white hover:bg-gray-50')}>
                <span className="flex items-center justify-between gap-2 text-sm font-medium text-navy-900">{m.label}{mode === key && <Icon name="check" className="h-4 w-4 text-primary-600" />}</span>
                <span className="mt-1 block text-xs leading-relaxed text-gray-600">{m.help}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Appointment fee (₦)" hint="Enter 0 for free consultations."><input type="number" min="0" className={inputCls} value={fee} onChange={(e) => setFee(e.target.value)} /></Field>
            {mode === 'deposit' && <Field label="Deposit (₦)" hint="Must not exceed the fee."><input type="number" min="1" className={inputCls} value={deposit} onChange={(e) => setDeposit(e.target.value)} /></Field>}
          </div>
          <p className="mt-4 rounded-xl bg-gray-50 px-3.5 py-3 text-sm text-gray-700">{summary}</p>
        </Card>

        {isOrg && (<>
          <Card>
            <h2 className="mb-3 font-semibold text-navy-900">Departments</h2>
            <div className="flex gap-2">
              <input className={inputCls} value={dept} onChange={(e) => setDept(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDept(); } }} placeholder="e.g. Cardiology" aria-label="New department" />
              <Button variant="secondary" onClick={addDept} icon="plus">Add</Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {departments.length === 0 && <p className="text-sm text-gray-500">No departments yet. Patients pick one when they book.</p>}
              {departments.map((d) => (
                <Badge key={d} tone="primary" className="!py-1.5 !pl-3 !pr-1.5">{d}
                  <button type="button" aria-label={`Remove ${d}`} onClick={() => setDepartments(departments.filter((x) => x !== d))} className="rounded-full p-0.5 hover:bg-primary-200"><Icon name="x" className="h-3.5 w-3.5" /></button>
                </Badge>
              ))}
            </div>
          </Card>
          <Card>
            <h2 className="mb-1 font-semibold text-navy-900">Location</h2>
            <p className="mb-3 text-sm text-gray-600">Patients see their distance and drive time from this address.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Street" className="sm:col-span-2"><input className={inputCls} value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} /></Field>
              <Field label="City or LGA"><input className={inputCls} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} /></Field>
              <Field label="State">
                <select className={inputCls} value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })}>
                  <option value="">Choose a state</option>
                  {(states.data || []).map((s) => <option key={s.slug} value={s.name}>{s.name}</option>)}
                </select>
              </Field>
            </div>
          </Card>
        </>)}

        <ErrorNote>{error}</ErrorNote>
        {saved && <p role="status" className="rounded-xl bg-success-light px-3.5 py-2.5 text-sm text-success-dark">Settings saved.</p>}
        <div className="sticky bottom-0 -mx-4 border-t border-gray-200 bg-gray-50/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <Button size="lg" className="w-full sm:w-auto" loading={busy} onClick={save}>Save settings</Button>
        </div>
      </div>
    </PageShell>
  );
}
