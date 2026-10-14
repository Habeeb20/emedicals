import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { memorialApi, errMsg } from './memorialApi';
import { Modal, Field, inputCls, btnPrimary, btnGhost, naira, cx } from './ui';

const STEPS = ['The deceased', 'Your details', 'Arrangements', 'Review'];

export default function BookingWizard({ org, plot, open, onClose }) {
  const { user } = useAuth();
  const isMortuary = org.type === 'mortuary';
  const catalog = org.memorial?.services || [];

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [agree, setAgree] = useState(false);
  const [f, setF] = useState({
    deceased: { fullName: '', gender: '', age: '', dateOfDeath: '', placeOfDeath: '', causeOfDeath: '' },
    contact: { name: user?.fullName || '', phone: user?.phone || '', email: user?.email || '', relationship: '', address: '' },
    mortuary: { expectedAdmission: '', expectedDays: 3, transportRequired: false, pickupAddress: '' },
    cemetery: { burialDate: '', burialTime: '' },
    serviceIds: [],
    notes: '',
  });
  const set = (group, key, val) => setF((s) => ({ ...s, [group]: { ...s[group], [key]: val } }));

  // Estimate only. The server recomputes the price from the facility's own list.
  const lines = useMemo(() => {
    const out = [];
    if (isMortuary && org.memorial?.storageRatePerDay) {
      const d = Math.max(+f.mortuary.expectedDays || 1, 1);
      out.push({ label: `Storage for ${d} day${d > 1 ? 's' : ''}`, amount: org.memorial.storageRatePerDay * d });
    }
    if (!isMortuary && plot) out.push({ label: `Plot ${plot.plotNumber}${plot.section ? ` (${plot.section})` : ''}`, amount: plot.price || 0 });
    catalog.filter((s) => f.serviceIds.includes(s._id)).forEach((s) => out.push({ label: s.name, amount: s.price || 0 }));
    return out;
  }, [f, catalog, isMortuary, plot, org]);
  const total = lines.reduce((a, l) => a + l.amount, 0);

  const validate = () => {
    if (step === 0) {
      if (!f.deceased.fullName.trim()) return "Enter the deceased person's full name.";
      if (isMortuary && !f.deceased.dateOfDeath) return 'Enter the date of death.';
    }
    if (step === 1 && (!f.contact.name.trim() || !f.contact.phone.trim())) return 'We need a contact name and phone number.';
    if (step === 3 && !agree) return 'Please confirm the details are correct.';
    return '';
  };
  const next = () => {
    const e = validate();
    setError(e);
    if (!e) setStep((s) => s + 1);
  };

  const submit = async () => {
    const e = validate();
    if (e) return setError(e);
    setBusy(true);
    setError('');
    try {
      const r = await memorialApi.book({
        organizationId: org._id,
        plotId: plot?._id,
        deceased: f.deceased,
        contact: f.contact,
        mortuary: f.mortuary,
        cemetery: f.cemetery,
        serviceIds: f.serviceIds,
        notes: f.notes,
      });
      setDone(r.booking);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleService = (id) => setF((s) => ({ ...s, serviceIds: s.serviceIds.includes(id) ? s.serviceIds.filter((x) => x !== id) : [...s.serviceIds, id] }));

  if (done)
    return (
      <Modal open={open} onClose={onClose} title="Request sent">
        <div className="py-4 text-center">
          <CheckCircle2 className="mx-auto text-success" size={48} />
          <p className="mt-4 font-serif text-2xl text-navy-900">We are sorry for your loss.</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-memorial-600">
            {org.name} has your request and will confirm shortly. You will see every update, and every payment, in your bookings.
          </p>
          <p className="mt-5 inline-block rounded-xl bg-memorial-100 px-4 py-2 font-mono text-sm text-memorial-800">{done.reference}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Link to="/memorial/bookings" className={btnPrimary}>View my bookings</Link>
            <button onClick={onClose} className={btnGhost}>Close</button>
          </div>
        </div>
      </Modal>
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isMortuary ? `Book space at ${org.name}` : `Reserve a plot at ${org.name}`}
      wide
      footer={
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => (setError(''), setStep((s) => s - 1))} className={cx(btnGhost, step === 0 && 'invisible')}><ChevronLeft size={16} /> Back</button>
          {step < STEPS.length - 1 ? (
            <button onClick={next} className={btnPrimary}>Continue</button>
          ) : (
            <button onClick={submit} disabled={busy} className={btnPrimary}>{busy ? 'Sending' : 'Send booking request'}</button>
          )}
        </div>
      }
    >
      <ol className="mb-6 flex gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <div className={cx('h-1.5 rounded-full', i <= step ? 'bg-primary-600' : 'bg-memorial-200')} />
            <p className={cx('mt-1.5 hidden text-xs sm:block', i === step ? 'font-medium text-navy-900' : 'text-memorial-500')}>{s}</p>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" className="sm:col-span-2"><input className={inputCls} value={f.deceased.fullName} onChange={(e) => set('deceased', 'fullName', e.target.value)} /></Field>
          <Field label="Gender">
            <select className={inputCls} value={f.deceased.gender} onChange={(e) => set('deceased', 'gender', e.target.value)}>
              <option value="">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </Field>
          <Field label="Age"><input type="number" min="0" className={inputCls} value={f.deceased.age} onChange={(e) => set('deceased', 'age', e.target.value)} /></Field>
          <Field label={isMortuary ? 'Date of death' : 'Date of death (if applicable)'}><input type="date" className={inputCls} value={f.deceased.dateOfDeath} onChange={(e) => set('deceased', 'dateOfDeath', e.target.value)} /></Field>
          <Field label="Place of death"><input className={inputCls} value={f.deceased.placeOfDeath} onChange={(e) => set('deceased', 'placeOfDeath', e.target.value)} placeholder="Hospital or home" /></Field>
          {isMortuary && <Field label="Cause of death (optional)" className="sm:col-span-2"><input className={inputCls} value={f.deceased.causeOfDeath} onChange={(e) => set('deceased', 'causeOfDeath', e.target.value)} /></Field>}
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your full name"><input className={inputCls} value={f.contact.name} onChange={(e) => set('contact', 'name', e.target.value)} /></Field>
          <Field label="Phone number"><input type="tel" className={inputCls} value={f.contact.phone} onChange={(e) => set('contact', 'phone', e.target.value)} /></Field>
          <Field label="Email (optional)"><input type="email" className={inputCls} value={f.contact.email} onChange={(e) => set('contact', 'email', e.target.value)} /></Field>
          <Field label="Relationship to the deceased"><input className={inputCls} value={f.contact.relationship} onChange={(e) => set('contact', 'relationship', e.target.value)} placeholder="Daughter, husband, friend" /></Field>
          <Field label="Home address (optional)" className="sm:col-span-2"><input className={inputCls} value={f.contact.address} onChange={(e) => set('contact', 'address', e.target.value)} /></Field>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          {isMortuary ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Expected arrival"><input type="datetime-local" className={inputCls} value={f.mortuary.expectedAdmission} onChange={(e) => set('mortuary', 'expectedAdmission', e.target.value)} /></Field>
              <Field label="Days of storage" hint={org.memorial?.storageRatePerDay ? `${naira(org.memorial.storageRatePerDay)} per day` : undefined}>
                <input type="number" min="1" max="90" className={inputCls} value={f.mortuary.expectedDays} onChange={(e) => set('mortuary', 'expectedDays', e.target.value)} />
              </Field>
              <label className="flex items-center gap-2 text-sm text-memorial-700 sm:col-span-2">
                <input type="checkbox" className="accent-primary-600" checked={f.mortuary.transportRequired} onChange={(e) => set('mortuary', 'transportRequired', e.target.checked)} /> We need the mortuary to collect the body
              </label>
              {f.mortuary.transportRequired && <Field label="Pick-up address" className="sm:col-span-2"><input className={inputCls} value={f.mortuary.pickupAddress} onChange={(e) => set('mortuary', 'pickupAddress', e.target.value)} /></Field>}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Preferred burial date"><input type="date" className={inputCls} value={f.cemetery.burialDate} onChange={(e) => set('cemetery', 'burialDate', e.target.value)} /></Field>
              <Field label="Preferred time"><input type="time" className={inputCls} value={f.cemetery.burialTime} onChange={(e) => set('cemetery', 'burialTime', e.target.value)} /></Field>
            </div>
          )}

          {catalog.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-memorial-700">Add services</legend>
              <div className="space-y-2">
                {catalog.map((s) => (
                  <label key={s._id} className={cx('flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition', f.serviceIds.includes(s._id) ? 'border-primary-500 bg-primary-50' : 'border-memorial-200 hover:bg-memorial-50')}>
                    <input type="checkbox" className="mt-0.5 accent-primary-600" checked={f.serviceIds.includes(s._id)} onChange={() => toggleService(s._id)} />
                    <span className="flex-1"><span className="font-medium text-navy-900">{s.name}</span>{s.description && <span className="block text-xs text-memorial-500">{s.description}</span>}</span>
                    <span className="font-medium text-navy-900">{naira(s.price)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <Field label="Anything else the team should know? (optional)"><textarea rows={3} maxLength={1000} className={inputCls} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-memorial-50 p-4 text-sm text-memorial-700">
            <p className="font-serif text-lg text-navy-900">{f.deceased.fullName}</p>
            <p className="mt-1">Contact: {f.contact.name}, {f.contact.phone}</p>
            {isMortuary ? <p>Storage for {f.mortuary.expectedDays} day(s){f.mortuary.transportRequired ? ', with collection' : ''}</p> : <p>Plot {plot?.plotNumber}{plot?.section ? `, ${plot.section}` : ''}</p>}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-memorial-700">Estimated cost</p>
            {lines.length === 0 ? <p className="text-sm text-memorial-500">The facility will send you a quote when it confirms.</p> : (
              <ul className="divide-y divide-memorial-100 rounded-2xl border border-memorial-200 text-sm">
                {lines.map((l, i) => <li key={i} className="flex justify-between px-4 py-2.5"><span>{l.label}</span><span>{naira(l.amount)}</span></li>)}
                <li className="flex justify-between bg-memorial-50 px-4 py-3 font-medium text-navy-900"><span>Total</span><span className="font-serif text-lg">{naira(total)}</span></li>
              </ul>
            )}
            <p className="mt-2 text-xs text-memorial-500">You pay nothing now. The facility confirms first, then records payments against your booking.</p>
          </div>
          {org.memorial?.cancellationPolicy && <p className="rounded-xl border border-memorial-200 p-3 text-xs text-memorial-600"><strong>Cancellation:</strong> {org.memorial.cancellationPolicy}</p>}
          <label className="flex items-start gap-2 text-sm text-memorial-700">
            <input type="checkbox" className="mt-0.5 accent-primary-600" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> The details above are correct to the best of my knowledge.
          </label>
        </div>
      )}

      {error && <p role="alert" className="mt-4 rounded-xl bg-danger-light px-4 py-3 text-sm text-danger-dark">{error}</p>}
    </Modal>
  );
}
