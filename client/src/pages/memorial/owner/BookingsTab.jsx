import { useCallback, useEffect, useState } from 'react';
import { Search, Phone, Plus } from 'lucide-react';
import { memorialApi, errMsg } from '../memorialApi';
import { EmptyState, Field, KIND, Modal, Spinner, StatusBadge, btnDanger, btnDark, btnGhost, btnPrimary, cx, fmtDate, inputCls, naira, toast, useDebounce } from '../ui';

const FILTERS = [['', 'All'], ['pending', 'Pending'], ['confirmed', 'Confirmed'], ['admitted', 'In care'], ['completed', 'Completed'], ['rejected', 'Rejected'], ['cancelled', 'Cancelled']];

export default function BookingsTab({ onChanged }) {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounce(search);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try { const r = await memorialApi.bookings({ status, q, page: p }); setItems((c) => (p === 1 ? r.items : [...c, ...r.items])); setPage(r.page); setPages(r.pages); }
    catch (e) { toast(errMsg(e), 'error'); } finally { setLoading(false); }
  }, [status, q]);
  useEffect(() => { load(1); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-memorial-400" /><input className={cx(inputCls, 'pl-10')} placeholder="Search name, phone or reference" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(([v, l]) => <button key={v} onClick={() => setStatus(v)} className={cx('shrink-0 rounded-full border px-4 py-1.5 text-sm', status === v ? 'border-memorial-800 bg-memorial-800 text-white' : 'border-memorial-200 bg-white text-memorial-600')}>{l}</button>)}
      </div>

      {loading && !items.length ? <Spinner className="mx-auto my-12" /> : items.length === 0 ? <EmptyState title="No bookings here" hint="Requests from families will appear in this list." /> : (
        <div className="overflow-hidden rounded-3xl border border-memorial-200 bg-white">
          <ul className="divide-y divide-memorial-100">
            {items.map((b) => (
              <li key={b._id}>
                <button onClick={() => setOpenId(b._id)} className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left hover:bg-memorial-50">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-navy-900">{b.deceased.fullName}</p>
                    <p className="text-sm text-memorial-500">{b.contact.name}, {b.contact.phone}{b.cemetery?.plot ? `, Plot ${b.cemetery.plot.plotNumber}` : ''}</p>
                    <p className="font-mono text-xs text-memorial-400">{b.reference}, {fmtDate(b.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3"><span className="text-sm text-memorial-600">{b.charges ? naira(b.charges) : naira(b.quote)}</span>{b.chargesPosted && <StatusBadge status={b.paymentStatus} />}<StatusBadge status={b.status} /></div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {page < pages && <div className="text-center"><button className={btnGhost} onClick={() => load(page + 1)}>Show more</button></div>}
      {openId && <Detail id={openId} onClose={() => setOpenId(null)} onChanged={() => { load(1); onChanged?.(); }} />}
    </div>
  );
}

function Detail({ id, onClose, onChanged }) {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null); // {action, title, fields}
  const [form, setForm] = useState({});
  const [ledger, setLedger] = useState({ type: 'payment', amount: '', method: 'cash', reference: '', description: '' });
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => memorialApi.managedBooking(id).then(setD).catch((e) => toast(errMsg(e), 'error')), [id]);
  useEffect(() => { load(); }, [load]);

  const run = async (action, extra = {}) => {
    setBusy(true);
    try { await memorialApi.setStatus(id, { action, ...extra }); toast('Updated'); setDialog(null); setForm({}); await load(); onChanged(); }
    catch (e) {
      if (e?.response?.status === 409 && ['release', 'complete'].includes(action) && !extra.override && window.confirm(`${errMsg(e)}\n\nProceed anyway?`)) return run(action, { ...extra, override: true });
      toast(errMsg(e), 'error');
    } finally { setBusy(false); }
  };

  const addEntry = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await memorialApi.addLedger(id, ledger); toast('Entry recorded'); setLedger({ ...ledger, amount: '', reference: '', description: '' }); setAdding(false); await load(); onChanged(); }
    catch (err) { toast(errMsg(err), 'error'); } finally { setBusy(false); }
  };

  const b = d?.booking;
  const act = {
    pending: [['confirm', 'Confirm booking', 'primary'], ['reject', 'Decline', 'danger']],
    confirmed: [b?.kind === 'mortuary' ? ['admit', 'Admit body', 'primary'] : ['complete', 'Mark burial done', 'primary'], ['cancel', 'Cancel booking', 'danger']],
    admitted: [['embalm', 'Embalming done', 'ghost'], ['release', 'Release body', 'primary']],
  }[b?.status] || [];

  const startAction = (a) => {
    if (a === 'confirm' || a === 'embalm') return run(a);
    if (a === 'complete') return setDialog({ action: a, title: 'Mark burial as done', fields: [['burialDate', 'Burial date', 'date'], ['note', 'Note (optional)']] });
    if (a === 'admit') return setDialog({ action: a, title: 'Admit body', fields: [['tagNumber', 'Tag number (blank = auto)'], ['unit', 'Storage unit'], ['slot', 'Slot'], ['note', 'Note (optional)']] });
    if (a === 'release') return setDialog({ action: a, title: 'Release body', fields: [['releasedTo', 'Released to'], ['idPresented', 'ID presented'], ['note', 'Note (optional)']] });
    setDialog({ action: a, title: a === 'reject' ? 'Decline this booking' : 'Cancel this booking', fields: [['note', a === 'reject' ? 'Reason for the family' : 'Reason']] });
  };
  const submitDialog = (e) => {
    e.preventDefault();
    const { unit, slot, ...rest } = form;
    run(dialog.action, { ...rest, ...(dialog.action === 'admit' ? { storage: { unit, slot } } : {}) });
  };
  const btnFor = (t) => (t === 'danger' ? btnDanger : t === 'ghost' ? btnGhost : btnPrimary);

  return (
    <Modal open onClose={onClose} wide title={b ? b.deceased.fullName : 'Booking'}>
      {!d ? <Spinner className="mx-auto my-10" /> : (
        <div className="space-y-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2"><StatusBadge status={b.status} /><span className="font-mono text-xs text-memorial-500">{b.reference}</span></div>
            <div className="flex flex-wrap gap-2">{act.map(([a, label, t]) => <button key={a} disabled={busy} onClick={() => startAction(a)} className={btnFor(t)}>{label}</button>)}</div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <Info title="Deceased" rows={[['Name', b.deceased.fullName], ['Gender, age', [b.deceased.gender, b.deceased.age].filter(Boolean).join(', ')], ['Date of death', fmtDate(b.deceased.dateOfDeath)], ['Place', b.deceased.placeOfDeath], ['Cause', b.deceased.causeOfDeath]]} />
            <Info title="Family contact" rows={[['Name', b.contact.name], ['Relationship', b.contact.relationship], ['Phone', b.contact.phone], ['Email', b.contact.email], ['Address', b.contact.address]]} extra={<a href={`tel:${b.contact.phone}`} className={`${btnGhost} mt-3 !py-2`}><Phone size={14} /> Call</a>} />
            {b.kind === 'mortuary' ? (
              <Info title="Arrangements" rows={[['Expected arrival', fmtDate(b.mortuary?.expectedAdmission, true)], ['Days', b.mortuary?.expectedDays], ['Collection', b.mortuary?.transportRequired ? `Yes, ${b.mortuary.pickupAddress || ''}` : 'No'], ['Services', b.services.map((s) => s.name).join(', ')]]} />
            ) : (
              <Info title="Arrangements" rows={[['Plot', b.cemetery?.plot ? `${b.cemetery.plot.plotNumber}${b.cemetery.plot.section ? `, ${b.cemetery.plot.section}` : ''}` : ''], ['Burial date', fmtDate(b.cemetery?.burialDate)], ['Time', b.cemetery?.burialTime], ['Services', b.services.map((s) => s.name).join(', ')]]} />
            )}
            {b.notes && <Info title="Family notes" rows={[['', b.notes]]} />}
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-serif text-lg text-navy-900">Accounts</h3>
              {['confirmed', 'admitted', 'completed', 'cancelled'].includes(b.status) && <button onClick={() => setAdding((a) => !a)} className={`${btnGhost} !py-2`}><Plus size={14} /> Record entry</button>}
            </div>
            {adding && (
              <form onSubmit={addEntry} className="mb-4 grid gap-3 rounded-2xl bg-memorial-50 p-4 sm:grid-cols-4">
                <Field label="Type"><select className={inputCls} value={ledger.type} onChange={(e) => setLedger({ ...ledger, type: e.target.value })}><option value="payment">Payment received</option><option value="charge">Extra charge</option><option value="refund">Refund given</option></select></Field>
                <Field label="Amount (₦)"><input type="number" min="1" step="any" required className={inputCls} value={ledger.amount} onChange={(e) => setLedger({ ...ledger, amount: e.target.value })} /></Field>
                {ledger.type === 'charge' ? <Field label="What for" className="sm:col-span-2"><input required className={inputCls} value={ledger.description} onChange={(e) => setLedger({ ...ledger, description: e.target.value })} /></Field> : (<>
                  <Field label="Method"><select className={inputCls} value={ledger.method} onChange={(e) => setLedger({ ...ledger, method: e.target.value })}>{['cash', 'transfer', 'pos', 'online', 'other'].map((m) => <option key={m}>{m}</option>)}</select></Field>
                  <Field label="Reference"><input className={inputCls} value={ledger.reference} onChange={(e) => setLedger({ ...ledger, reference: e.target.value })} placeholder="Receipt or transfer ref" /></Field>
                </>)}
                <div className="sm:col-span-4"><button disabled={busy} className={btnDark}>Save entry</button></div>
              </form>
            )}
            {d.ledger.length === 0 ? <p className="rounded-2xl bg-memorial-50 p-4 text-sm text-memorial-500">No entries yet. Confirming the booking posts the quoted charges ({naira(b.quote)}).</p> : (
              <ul className="divide-y divide-memorial-100 rounded-2xl border border-memorial-200 text-sm">
                {d.ledger.map((l) => (
                  <li key={l._id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div><p className="capitalize text-navy-900">{l.description || l.type}{l.reference ? ` (${l.reference})` : ''}</p><p className="text-xs text-memorial-500">{fmtDate(l.createdAt, true)}{l.method ? `, ${l.method}` : ''}{l.recordedBy?.fullName ? `, by ${l.recordedBy.fullName}` : ''}</p></div>
                    <span className={cx('font-medium', l.type === 'payment' && 'text-success-dark', l.type === 'refund' && 'text-info-dark')}>{l.type === 'payment' ? '+' : l.type === 'refund' ? '-' : ''}{naira(l.amount)}</span>
                  </li>
                ))}
                <li className="grid grid-cols-3 gap-2 bg-memorial-50 px-4 py-3 text-center text-xs text-memorial-500">
                  <span>Charged<b className="block font-serif text-base text-navy-900">{naira(b.charges)}</b></span><span>Paid<b className="block font-serif text-base text-success-dark">{naira(b.amountPaid)}</b></span><span>Balance<b className="block font-serif text-base text-navy-900">{naira(b.balance)}</b></span>
                </li>
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-3 font-serif text-lg text-navy-900">History</h3>
            <ol className="space-y-3 border-l border-memorial-200 pl-5">
              {[...b.history].reverse().map((h, i) => <li key={i} className="relative text-sm"><span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-memorial-400" /><b className="capitalize text-navy-900">{h.status}</b> <span className="text-memorial-600">{h.note}</span><p className="text-xs text-memorial-400">{fmtDate(h.at, true)}{h.by?.fullName ? `, ${h.by.fullName}` : ''}</p></li>)}
            </ol>
          </section>
        </div>
      )}

      {dialog && (
        <Modal open onClose={() => setDialog(null)} title={dialog.title}>
          <form onSubmit={submitDialog} className="space-y-4">
            {dialog.fields.map(([k, label, type]) => <Field key={k} label={label}><input type={type || 'text'} required={['releasedTo', 'idPresented'].includes(k) || (k === 'note' && dialog.action === 'reject')} className={inputCls} value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></Field>)}
            <button disabled={busy} className={btnPrimary}>{busy ? 'Saving' : 'Confirm'}</button>
          </form>
        </Modal>
      )}
    </Modal>
  );
}

const Info = ({ title, rows, extra }) => (
  <div className="rounded-2xl border border-memorial-200 p-4">
    <h3 className="mb-2 font-serif text-base text-navy-900">{title}</h3>
    <dl className="space-y-1.5 text-sm">{rows.filter(([, v]) => v).map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-memorial-500">{k}</dt><dd className="text-right text-navy-900">{v}</dd></div>)}</dl>
    {extra}
  </div>
);
