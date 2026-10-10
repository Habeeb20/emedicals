import { useEffect, useState } from 'react';
import api  from './api';
import { Card, EmptyState, ErrorNote, PageHeader, PageShell, Skeleton } from '../appointments/ui';
import { PharmacyNav, StatCard, field, fmtDate, money, usePharmacyMe } from './PharmacyShared';

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

const Bars = ({ rows, valueKey = 'revenue', labelKey = '_id', format = money }) => {
  const max = Math.max(...rows.map((r) => r[valueKey]), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r[labelKey]} className="text-sm">
          <div className="mb-1 flex justify-between gap-3"><span className="truncate capitalize text-navy-800">{String(r[labelKey]).replace('_', ' ')}</span><span className="shrink-0 font-medium text-navy-900">{format(r[valueKey])}</span></div>
          <div className="h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-pharmacy-500" style={{ width: `${Math.max((r[valueKey] / max) * 100, 2)}%` }} /></div>
        </li>
      ))}
    </ul>
  );
};

export default function PharmacyReportsPage() {
  const me = usePharmacyMe();
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(today());
  const [sum, setSum] = useState(null);
  const [val, setVal] = useState(null);
  const [reg, setReg] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (me && !me.isManager) return;
    setSum(null);
    Promise.all([
      api('/pharmacy/reports/summary', { params: { from, to } }),
      api('/pharmacy/reports/valuation'),
      api('/pharmacy/reports/controlled', { params: { from, to } }),
    ]).then(([s, v, c]) => { setSum(s.data); setVal(v.data); setReg(c.data); setError(''); }).catch((e) => setError(e.message));
  }, [from, to, me]);

  if (me && !me.isManager) {
    return (
      <PageShell className="max-w-3xl">
        <PageHeader title="Reports" />
        <PharmacyNav />
        <EmptyState icon="search" title="Managers only" body="Ask your pharmacy manager for sales and stock reports." />
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-5xl">
      <PageHeader title="Reports" subtitle="Sales, margins, stock value and the controlled drug register." />
      <PharmacyNav />
      <div className="mb-5 grid max-w-md grid-cols-2 gap-3">
        <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-label="From date" className={`${field} h-11`} />
        <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} aria-label="To date" className={`${field} h-11`} />
      </div>
      <div className="mb-4"><ErrorNote>{error}</ErrorNote></div>

      {!sum ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Net sales" value={money(sum.totals.revenue)} hint={`${sum.totals.count} transactions`} />
            <StatCard label="Gross margin" value={money(sum.grossMargin)} hint="Before discounts and refunds" />
            <StatCard label="Discounts given" value={money(sum.totals.discounts)} />
            <StatCard label="Unpaid balances" value={money(sum.totals.outstanding)} tone={sum.totals.outstanding > 0 ? 'warning' : 'navy'} hint="Credit and HMO claims" />
          </div>

          {val && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Units on hand" value={val.units.toLocaleString('en-NG')} />
              <StatCard label="Stock value (cost)" value={money(val.costValue)} />
              <StatCard label="Stock value (retail)" value={money(val.retailValue)} />
              <StatCard label="Expired stock (cost)" value={money(val.expiredCostValue)} tone={val.expiredCostValue > 0 ? 'danger' : 'navy'} />
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card><h2 className="mb-3 font-semibold text-navy-900">Sales by day</h2>{sum.byDay.length ? <Bars rows={sum.byDay} /> : <p className="text-sm text-gray-600">No sales in this period.</p>}</Card>
            <Card><h2 className="mb-3 font-semibold text-navy-900">How customers paid</h2>{sum.byMethod.length ? <Bars rows={sum.byMethod} /> : <p className="text-sm text-gray-600">No sales in this period.</p>}</Card>
          </div>

          <Card>
            <h2 className="mb-3 font-semibold text-navy-900">Top selling drugs</h2>
            {sum.topDrugs.length === 0 ? <p className="text-sm text-gray-600">No sales in this period.</p> : (
              <ul className="divide-y divide-gray-100">
                {sum.topDrugs.map((d) => (
                  <li key={d._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0"><span className="block truncate text-navy-900">{d.name}</span><span className="text-xs text-gray-500">{d.qty} units sold</span></span>
                    <span className="shrink-0 text-right"><span className="block font-medium">{money(d.revenue)}</span><span className="text-xs text-pharmacy-700">margin {money(d.margin)}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-1 font-semibold text-navy-900">Controlled drug register</h2>
            <p className="mb-3 text-sm text-gray-600">Every controlled drug dispensed in this period, with the batch, patient and pharmacist.</p>
            {!reg || reg.length === 0 ? <p className="text-sm text-gray-600">No controlled drugs were dispensed in this period.</p> : (
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs text-gray-500"><tr><th className="px-2 py-2 font-medium">Date</th><th className="px-2 py-2 font-medium">Drug</th><th className="px-2 py-2 font-medium">Qty</th><th className="px-2 py-2 font-medium">Batch</th><th className="px-2 py-2 font-medium">Patient</th><th className="px-2 py-2 font-medium">Rx</th><th className="px-2 py-2 font-medium">By</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {reg.map((r, i) => (
                      <tr key={i}><td className="px-2 py-2">{fmtDate(r.date)}</td><td className="px-2 py-2">{r.drug}</td><td className="px-2 py-2">{r.quantity}</td><td className="px-2 py-2">{r.batches}</td><td className="px-2 py-2">{r.patient || 'n/a'}</td><td className="px-2 py-2 font-mono text-xs">{r.rxCode || 'n/a'}</td><td className="px-2 py-2">{r.dispensedBy}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </PageShell>
  );
}