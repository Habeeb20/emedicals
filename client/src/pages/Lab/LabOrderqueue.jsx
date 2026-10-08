import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import StatusBadge, { PaymentBadge, StatusLabels } from './StatusBadge';
import { labApi, naira, dateFmt, inputCls } from './labApi';

const TABS = ['', 'ordered', 'sample_collected', 'processing', 'completed', 'cancelled'];

export default function LabOrderQueue() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState({ orders: null, counts: {} });

  useEffect(() => {
    const t = setTimeout(() => labApi.staffOrders({ status, q }).then(setData), 250);
    return () => clearTimeout(t);
  }, [status, q]);

  const total = Object.values(data.counts).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold text-navy-900">Lab orders</h1>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setStatus(t)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${status === t ? 'bg-lab-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-lab-300'}`}>
            {t ? StatusLabels[t] : 'All'} ({t ? data.counts[t] || 0 : total})
          </button>
        ))}
      </div>

      <div className="relative mt-4 max-w-sm">
        <Search size={18} className="absolute left-4 top-3.5 text-gray-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by order number" className={`${inputCls} pl-11`} />
      </div>

      {!data.orders ? <p className="mt-8 text-gray-500">Loading…</p> : data.orders.length === 0 ? (
        <p className="mt-8 text-gray-500">No orders here yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {data.orders.map((o) => (
            <Link key={o._id} to={`/lab/orders/${o._id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-5 hover:border-lab-300 hover:shadow">
              <div>
                <p className="font-semibold text-navy-900">{o.patient?.fullName}</p>
                <p className="text-sm text-gray-500">{o.orderNumber} · {dateFmt(o.createdAt)} · {o.items.length} test{o.items.length > 1 ? 's' : ''} · {naira(o.totalAmount)}</p>
              </div>
              <div className="flex items-center gap-2"><PaymentBadge status={o.paymentStatus} /><StatusBadge status={o.status} /></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}