import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { memorialApi, errMsg } from '../memorialApi';
import { Field, Spinner, btnGhost, btnPrimary, inputCls, toast } from '../ui';

export default function SettingsTab({ org }) {
  const isMortuary = org.type === 'mortuary';
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    memorialApi.settings().then(({ org: o }) => setF({
      about: o.about || '', openingHours: o.openingHours || '', is24Hours: !!o.is24Hours, phone: o.phone || '', email: o.email || '',
      capacity: o.memorial?.capacity || '', storageRatePerDay: o.memorial?.storageRatePerDay || '', bookingsOpen: o.memorial?.bookingsOpen !== false,
      cancellationPolicy: o.memorial?.cancellationPolicy || '', amenities: (o.memorial?.amenities || []).join(', '),
      services: (o.memorial?.services || []).map((s) => ({ _id: s._id, name: s.name, description: s.description || '', price: s.price || 0 })),
    })).catch((e) => toast(errMsg(e), 'error'));
  }, []);
  if (!f) return <Spinner className="mx-auto my-12" />;

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const setSvc = (i, k, v) => set('services', f.services.map((s, j) => (j === i ? { ...s, [k]: v } : s)));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await memorialApi.saveSettings({
        about: f.about, openingHours: f.openingHours, is24Hours: f.is24Hours, phone: f.phone, email: f.email,
        memorial: {
          capacity: f.capacity, storageRatePerDay: f.storageRatePerDay, bookingsOpen: f.bookingsOpen, cancellationPolicy: f.cancellationPolicy,
          amenities: f.amenities.split(',').map((a) => a.trim()).filter(Boolean), services: f.services,
        },
      });
      toast('Settings saved');
    } catch (err) { toast(errMsg(err), 'error'); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="max-w-3xl space-y-6">
      <Section title="Public profile">
        <Field label="About your facility" hint={`${f.about.length}/1000`}><textarea rows={4} maxLength={1000} className={inputCls} value={f.about} onChange={(e) => set('about', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone"><input className={inputCls} value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Email"><input type="email" className={inputCls} value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Opening hours"><input className={inputCls} value={f.openingHours} onChange={(e) => set('openingHours', e.target.value)} placeholder="Mon to Sat, 8am to 6pm" /></Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm text-memorial-700"><input type="checkbox" className="accent-primary-600" checked={f.is24Hours} onChange={(e) => set('is24Hours', e.target.checked)} /> Open 24 hours</label>
        </div>
        <Field label="Amenities" hint="Separate with commas, for example: Chapel, Parking, Viewing room"><input className={inputCls} value={f.amenities} onChange={(e) => set('amenities', e.target.value)} /></Field>
      </Section>

      <Section title="Bookings">
        <label className="flex items-center gap-2 text-sm text-memorial-700"><input type="checkbox" className="accent-primary-600" checked={f.bookingsOpen} onChange={(e) => set('bookingsOpen', e.target.checked)} /> Accept new online bookings</label>
        {isMortuary && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Total storage capacity" hint="Families see free space based on this."><input type="number" min="0" className={inputCls} value={f.capacity} onChange={(e) => set('capacity', e.target.value)} /></Field>
            <Field label="Storage price per day (₦)"><input type="number" min="0" className={inputCls} value={f.storageRatePerDay} onChange={(e) => set('storageRatePerDay', e.target.value)} /></Field>
          </div>
        )}
        <Field label="Cancellation policy" hint="Shown to families before they book."><textarea rows={2} maxLength={600} className={inputCls} value={f.cancellationPolicy} onChange={(e) => set('cancellationPolicy', e.target.value)} /></Field>
      </Section>

      <Section title="Services and prices" action={<button type="button" className={`${btnGhost} !py-2`} onClick={() => set('services', [...f.services, { name: '', description: '', price: '' }])}><Plus size={14} /> Add service</button>}>
        {f.services.length === 0 && <p className="text-sm text-memorial-500">{isMortuary ? 'Embalming, viewing room, dressing, collection.' : 'Grave digging, headstone, grounds care.'} List what you offer and families can add it to their booking.</p>}
        {f.services.map((s, i) => (
          <div key={s._id || i} className="grid gap-3 rounded-2xl bg-memorial-50 p-3 sm:grid-cols-[1fr_130px_auto]">
            <input aria-label="Service name" className={inputCls} placeholder="Service name" value={s.name} onChange={(e) => setSvc(i, 'name', e.target.value)} />
            <input aria-label="Price" type="number" min="0" className={inputCls} placeholder="Price (₦)" value={s.price} onChange={(e) => setSvc(i, 'price', e.target.value)} />
            <button type="button" onClick={() => set('services', f.services.filter((_, j) => j !== i))} className="grid h-11 w-11 place-items-center rounded-xl text-memorial-400 hover:bg-white hover:text-danger" aria-label="Remove service"><Trash2 size={16} /></button>
            <input aria-label="Description" className={`${inputCls} sm:col-span-3`} placeholder="Short description (optional)" value={s.description} onChange={(e) => setSvc(i, 'description', e.target.value)} />
          </div>
        ))}
      </Section>

      <button className={btnPrimary} disabled={busy}>{busy ? 'Saving' : 'Save changes'}</button>
    </form>
  );
}

const Section = ({ title, action, children }) => (
  <section className="space-y-4 rounded-3xl border border-memorial-200 bg-white p-6">
    <div className="flex items-center justify-between"><h2 className="font-serif text-xl text-navy-900">{title}</h2>{action}</div>
    {children}
  </section>
);
