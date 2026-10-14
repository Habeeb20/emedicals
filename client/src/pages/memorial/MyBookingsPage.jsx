import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Receipt, Phone, Star, X } from 'lucide-react';
import { memorialApi, errMsg } from './memorialApi';
import { EmptyState, KIND, Modal, Spinner, StatusBadge, ToastHost, btnDanger, btnGhost, btnPrimary, cx, fmtDate, naira, toast } from './ui';

const FILTERS = [['', 'All'], ['pending', 'Pending'], ['confirmed', 'Confirmed'], ['admitted', 'In care'], ['completed', 'Completed'], ['cancelled', 'Cancelled']];

export default function MyBookingsPage() {
  const [status, setStatus] = useState('');
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const r = await memorialApi.myBookings({ status, page: p });
      setItems((c) => (p === 1 ? r.items : [...c, ...r.items]));
      setSummary(r.summary); setPage(r.page); setPages(r.pages);
    } catch (e) { toast(errMsg(e), 'error'); } finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(1); }, [load]);

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastHost />
      <div className="bg-memorial-900 text-white">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <h1 className="font-serif text-3xl sm:text-4xl">Your bookings</h1>
          <p className="mt-2 text-memorial-300">Every request, update and payment, kept in one place.</p>
          {summary && (
            <dl className="mt-6 grid grid-cols-3 gap-3">
              {[['Bookings', summary.bookings], ['Paid so far', naira(summary.totalPaid)], ['Balance due', naira(summary.outstanding)]].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-white/10 px-4 py-3"><dt className="text-xs text-memorial-300">{k}</dt><dd className="mt-0.5 font-serif text-xl sm:text-2xl">{v}</dd></div>
              ))}
            </dl>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(([v, l]) => <button key={v} onClick={() => setStatus(v)} className={cx('shrink-0 rounded-full border px-4 py-1.5 text-sm', status === v ? 'border-memorial-800 bg-memorial-800 text-white' : 'border-memorial-200 bg-white text-memorial-600 hover:bg-memorial-50')}>{l}</button>)}
        </div>

        {loading && !items.length ? <div className="py-16 text-center"><Spinner className="mx-auto !h-7 !w-7" /></div> : items.length === 0 ? (
          <EmptyState title="No bookings yet" hint="When you book a mortuary space or a cemetery plot, it will appear here with its full history." action={<Link to="/memorial" className={btnPrimary}>Find a facility</Link>} />
        ) : (
          <ul className="space-y-4">
            {items.map((b) => {
              const K = KIND[b.kind];
              const pct = b.charges ? Math.min((b.amountPaid / b.charges) * 100, 100) : 0;
              return (
                <li key={b._id}>
                  <button onClick={() => setOpenId(b._id)} className="w-full rounded-3xl border border-memorial-200 bg-white p-5 text-left transition hover:border-memorial-400">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-memorial-100 text-memorial-600"><K.Icon size={20} /></span>
                        <div><p className="font-serif text-lg text-navy-900">{b.deceased.fullName}</p><p className="text-sm text-memorial-500">{b.organization?.name}, {K.label.toLowerCase()}</p></div>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-memorial-600">
                      <span className="font-mono text-xs text-memorial-500">{b.reference}</span>
                      <span className="inline-flex items-center gap-1.5"><CalendarClock size={14} /> {fmtDate(b.createdAt)}</span>
                      {b.cemetery?.plot && <span>Plot {b.cemetery.plot.plotNumber}</span>}
                    </div>
                    <div className="mt-4">
                      <div className="mb-1.5 flex justify-between text-xs text-memorial-500"><span>{b.charges ? `${naira(b.amountPaid)} paid of ${naira(b.charges)}` : b.quote ? `Estimated ${naira(b.quote)}` : 'Awaiting quote'}</span>{b.charges > 0 && <StatusBadge status={b.paymentStatus} />}</div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-memorial-100"><div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} /></div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {page < pages && <div className="mt-6 text-center"><button className={btnGhost} onClick={() => load(page + 1)}>Show more</button></div>}
      </main>
      {openId && <BookingDetail id={openId} onClose={() => setOpenId(null)} onChanged={() => load(1)} />}
    </div>
  );
}

function BookingDetail({ id, onClose, onChanged }) {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => memorialApi.booking(id).then(setD).catch((e) => toast(errMsg(e), 'error')), [id]);
  useEffect(() => { load(); }, [load]);

  const cancel = async () => {
    const reason = window.prompt('Why are you cancelling? (optional)');
    if (reason === null) return;
    setBusy(true);
    try { const r = await memorialApi.cancelBooking(id, reason); toast(r.message); await load(); onChanged(); }
    catch (e) { toast(errMsg(e), 'error'); } finally { setBusy(false); }
  };

  const b = d?.booking;
  return (
    <Modal open onClose={onClose} title={b ? b.deceased.fullName : 'Booking'} wide
      footer={b && (
        <div className="flex flex-wrap justify-between gap-2">
          {b.organization?.phone ? <a href={`tel:${b.organization.phone}`} className={btnGhost}><Phone size={15} /> Call facility</a> : <span />}
          <div className="flex gap-2">
            {b.status === 'completed' && <Link to={`/memorial/${b.organization._id}#reviews`} className={btnGhost}><Star size={15} /> Leave a review</Link>}
            {['pending', 'confirmed'].includes(b.status) && <button onClick={cancel} disabled={busy} className={btnDanger}><X size={15} /> Cancel booking</button>}
          </div>
        </div>
      )}>
      {!d ? <div className="py-10 text-center"><Spinner className="mx-auto" /></div> : (
        <div className="grid gap-8 md:grid-cols-2">
          <section>
            <div className="mb-4 flex items-center gap-2"><StatusBadge status={b.status} /><span className="font-mono text-xs text-memorial-500">{b.reference}</span></div>
            <h3 className="mb-3 font-serif text-lg text-navy-900">Timeline</h3>
            <ol className="relative space-y-5 border-l border-memorial-200 pl-5">
              {[...b.history].reverse().map((h, i) => (
                <li key={i} className="relative">
                  <span className={cx('absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full', i === 0 ? 'bg-primary-600' : 'bg-memorial-300')} />
                  <p className="text-sm font-medium capitalize text-navy-900">{h.status}</p>
                  {h.note && <p className="text-sm text-memorial-600">{h.note}</p>}
                  <p className="text-xs text-memorial-400">{fmtDate(h.at, true)}{h.by?.fullName ? `, ${h.by.fullName}` : ''}</p>
                </li>
              ))}
            </ol>
          </section>
          <section>
            <h3 className="mb-3 flex items-center gap-2 font-serif text-lg text-navy-900"><Receipt size={18} /> Statement</h3>
            {d.ledger.length === 0 ? <p className="rounded-2xl bg-memorial-50 p-4 text-sm text-memorial-500">{b.quote ? `Estimated total ${naira(b.quote)}. Charges appear here once the facility confirms.` : 'Nothing charged yet.'}</p> : (
              <ul className="divide-y divide-memorial-100 rounded-2xl border border-memorial-200 text-sm">
                {d.ledger.map((l) => (
                  <li key={l._id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div><p className="capitalize text-navy-900">{l.description || l.type}</p><p className="text-xs text-memorial-500">{fmtDate(l.createdAt)}{l.method ? `, ${l.method}` : ''}</p></div>
                    <span className={cx('font-medium', l.type === 'payment' ? 'text-success-dark' : l.type === 'refund' ? 'text-info-dark' : 'text-navy-900')}>{l.type === 'charge' ? '' : l.type === 'payment' ? '+' : '-'}{naira(l.amount)}</span>
                  </li>
                ))}
                <li className="flex justify-between bg-memorial-50 px-4 py-3 font-medium text-navy-900"><span>Balance due</span><span className="font-serif text-lg">{naira(b.balance)}</span></li>
              </ul>
            )}
            <dl className="mt-5 space-y-1.5 text-sm text-memorial-600">
              <div className="flex justify-between"><dt>Facility</dt><dd>{b.organization.name}</dd></div>
              {b.cemetery?.plot && <div className="flex justify-between"><dt>Plot</dt><dd>{b.cemetery.plot.plotNumber}{b.cemetery.plot.section ? `, ${b.cemetery.plot.section}` : ''}</dd></div>}
              {b.mortuary?.expectedAdmission && <div className="flex justify-between"><dt>Expected arrival</dt><dd>{fmtDate(b.mortuary.expectedAdmission, true)}</dd></div>}
              {b.cemetery?.burialDate && <div className="flex justify-between"><dt>Burial date</dt><dd>{fmtDate(b.cemetery.burialDate)}</dd></div>}
            </dl>
          </section>
        </div>
      )}
    </Modal>
  );
}
