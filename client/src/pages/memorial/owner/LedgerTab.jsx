import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { memorialApi, errMsg } from '../memorialApi';
import { EmptyState, Spinner, btnGhost, cx, fmtDate, inputCls, naira, toast } from '../ui';

export default function LedgerTab() {
  const [f, setF] = useState({ type: '', method: '', from: '', to: '' });
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try { const r = await memorialApi.ledger({ ...f, page: p }); setItems((c) => (p === 1 ? r.items : [...c, ...r.items])); setTotals(r.totals); setPage(r.page); setPages(r.pages); }
    catch (e) { toast(errMsg(e), 'error'); } finally { setLoading(false); }
  }, [f]);
  useEffect(() => { load(1); }, [load]);

  const exportCsv = async () => {
    try {
      const blob = await memorialApi.downloadLedger(f);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ledger-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { toast(errMsg(e), 'error'); }
  };

  return (
    <div className="space-y-5">
      {totals && (
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[['Charged', totals.charges, ''], ['Received', totals.payments, 'text-success-dark'], ['Refunded', totals.refunds, 'text-info-dark'], ['Net income', totals.net, 'text-navy-900']].map(([k, v, c]) => (
            <div key={k} className="rounded-2xl border border-memorial-200 bg-white p-4"><dt className="text-xs text-memorial-500">{k}</dt><dd className={cx('mt-1 font-serif text-2xl', c || 'text-navy-900')}>{naira(v)}</dd></div>
          ))}
        </dl>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <select className={cx(inputCls, '!w-auto')} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} aria-label="Type"><option value="">All entries</option><option value="charge">Charges</option><option value="payment">Payments</option><option value="refund">Refunds</option></select>
        <select className={cx(inputCls, '!w-auto')} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} aria-label="Method"><option value="">Any method</option>{['cash', 'transfer', 'pos', 'online', 'other'].map((m) => <option key={m}>{m}</option>)}</select>
        <input type="date" className={cx(inputCls, '!w-auto')} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} aria-label="From" />
        <input type="date" className={cx(inputCls, '!w-auto')} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} aria-label="To" />
        <button onClick={exportCsv} className={`${btnGhost} ml-auto`}><Download size={16} /> Export CSV</button>
      </div>

      {loading && !items.length ? <Spinner className="mx-auto my-12" /> : items.length === 0 ? <EmptyState title="No entries for this filter" hint="Charges and payments you record against bookings are listed here." /> : (
        <div className="overflow-x-auto rounded-3xl border border-memorial-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-memorial-50 text-left text-xs text-memorial-500"><tr>{['Date', 'Booking', 'Details', 'Method', 'Amount'].map((h, i) => <th key={h} className={cx('px-4 py-3 font-medium', i === 4 && 'text-right')}>{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-memorial-100">
              {items.map((l) => (
                <tr key={l._id}>
                  <td className="px-4 py-3 text-memorial-600">{fmtDate(l.createdAt)}</td>
                  <td className="px-4 py-3"><p className="font-medium text-navy-900">{l.booking?.deceased?.fullName}</p><p className="font-mono text-xs text-memorial-500">{l.booking?.reference}</p></td>
                  <td className="px-4 py-3 capitalize text-memorial-600">{l.description || l.type}{l.reference ? ` (${l.reference})` : ''}</td>
                  <td className="px-4 py-3 capitalize text-memorial-600">{l.method || '–'}</td>
                  <td className={cx('px-4 py-3 text-right font-medium', l.type === 'payment' && 'text-success-dark', l.type === 'refund' && 'text-info-dark')}>{l.type === 'payment' ? '+' : l.type === 'refund' ? '-' : ''}{naira(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {page < pages && <div className="text-center"><button className={btnGhost} onClick={() => load(page + 1)}>Show more</button></div>}
    </div>
  );
}
