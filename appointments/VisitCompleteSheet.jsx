import { useState } from 'react';
import { api } from './api';
import { Button, ErrorNote, Field, Icon, inputCls, Sheet, Toggle } from './ui';

const CONDITIONS = ['Stable', 'Improving', 'Needs follow-up', 'Referred', 'Admitted'];
const blank = () => ({ medicine: '', dosage: '', frequency: '', duration: '', quantity: '', purpose: '', instructions: '' });

export default function VisitCompleteSheet({ appointment, canPrescribe, onClose, onDone }) {
  const [condition, setCondition] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [prescribe, setPrescribe] = useState(false);
  const [items, setItems] = useState([blank()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const setItem = (i, k, v) => setItems((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  const submit = async () => {
    setBusy(true); setError('');
    try {
      const drugs = items.filter((i) => i.medicine.trim()).map((i) => ({ ...i, quantity: i.quantity ? Number(i.quantity) : undefined }));
      if (prescribe && !drugs.length) throw new Error('Add at least one drug, or turn off prescribing.');
      await api(`/appointments/${appointment._id}/status`, {
        method: 'PATCH',
        body: { status: 'completed', condition, diagnosis, notes, followUpDate: followUpDate || undefined,
          ...(prescribe && { prescription: { items: drugs, purpose: diagnosis } }) },
      });
      onDone();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <Sheet open onClose={onClose} title="Complete visit" size="lg"
      footer={<Button size="lg" className="w-full" loading={busy} onClick={submit}>Save and complete</Button>}>
      <div className="space-y-5">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-navy-800">Patient's condition</span>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <button key={c} type="button" aria-pressed={condition === c} onClick={() => setCondition(c)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${condition === c ? 'border-primary-600 bg-primary-50 text-primary-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{c}</button>
            ))}
          </div>
          <input className={`${inputCls} mt-2`} placeholder="Or describe it" value={CONDITIONS.includes(condition) ? '' : condition} onChange={(e) => setCondition(e.target.value)} aria-label="Custom condition" />
        </div>

        <Field label="Diagnosis"><input className={inputCls} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} /></Field>
        <Field label="Notes for the record"><textarea rows={3} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <Field label="Follow-up date" hint="Optional."><input type="date" className={inputCls} value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} /></Field>

        {canPrescribe && (
          <div className="rounded-2xl border border-pharmacy-200 bg-pharmacy-50/60 p-4">
            <Toggle accent="pharmacy" checked={prescribe} onChange={setPrescribe} label="Prescribe drugs" description="The patient is notified and can show the code at any pharmacy." />
            {prescribe && (
              <div className="mt-4 space-y-4">
                {items.map((it, i) => (
                  <fieldset key={i} className="space-y-3 rounded-xl border border-pharmacy-200 bg-white p-3.5">
                    <div className="flex items-center justify-between">
                      <legend className="text-sm font-medium text-navy-800">Drug {i + 1}</legend>
                      {items.length > 1 && <button type="button" aria-label={`Remove drug ${i + 1}`} onClick={() => setItems((r) => r.filter((_, x) => x !== i))} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"><Icon name="x" className="h-4 w-4" /></button>}
                    </div>
                    <input className={inputCls} placeholder="Medicine name" value={it.medicine} onChange={(e) => setItem(i, 'medicine', e.target.value)} />
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <input className={inputCls} placeholder="Dosage" value={it.dosage} onChange={(e) => setItem(i, 'dosage', e.target.value)} />
                      <input className={inputCls} placeholder="How often" value={it.frequency} onChange={(e) => setItem(i, 'frequency', e.target.value)} />
                      <input className={inputCls} placeholder="For how long" value={it.duration} onChange={(e) => setItem(i, 'duration', e.target.value)} />
                      <input className={inputCls} type="number" min="1" placeholder="Quantity" value={it.quantity} onChange={(e) => setItem(i, 'quantity', e.target.value)} />
                    </div>
                    <input className={inputCls} placeholder="What it's for" value={it.purpose} onChange={(e) => setItem(i, 'purpose', e.target.value)} />
                    <input className={inputCls} placeholder="Instructions, e.g. take after meals" value={it.instructions} onChange={(e) => setItem(i, 'instructions', e.target.value)} />
                  </fieldset>
                ))}
                <Button variant="secondary" size="sm" icon="plus" onClick={() => setItems((r) => [...r, blank()])}>Add another drug</Button>
              </div>
            )}
          </div>
        )}
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Sheet>
  );
}
