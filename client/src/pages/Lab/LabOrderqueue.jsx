import { useEffect, useState } from 'react';
import { Search, Phone, Mail, MapPin, Award, FlaskConical, ChevronRight } from 'lucide-react';
import StatusBadge, { PaymentBadge, StatusLabels } from './StatusBadge';
import LabOrderDetail from './LabOrderDetail';
import { labApi, naira, dateFmt, inputCls } from './labApi';

const TABS = ['', 'ordered', 'sample_collected', 'processing', 'completed', 'cancelled'];

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

const Avatar = ({ patient }) => {
  const src = patient?.avatar?.url || patient?.profilePicture;
  return src ? (
    <img src={src} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-lab-50 text-sm font-bold text-lab-700">
      {initials(patient?.fullName) || '?'}
    </span>
  );
};

export default function LabOrderQueue() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState({ orders: null, counts: {} });
  const [selectedId, setSelectedId] = useState(null); // which order is open

  // Only fetch the list while it is visible; refetch when coming back from a detail view
  useEffect(() => {
    if (selectedId) return undefined;
    const t = setTimeout(() => labApi.staffOrders({ status, q }).then(setData).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [status, q, selectedId]);

  // Full order screen (same component used by the routed page)
  if (selectedId) {
    console.log(selectedId)
    return <LabOrderDetail mode="lab" orderId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  const total = Object.values(data.counts || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-bold text-navy-900">Lab orders</h1>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setStatus(t)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${status === t ? 'bg-lab-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-lab-300'}`}>
            {t ? StatusLabels[t] : 'All'} ({t ? data.counts?.[t] || 0 : total})
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
          {data.orders.map((o) => {
            const p = o.patient || {};
            const place = [p.lga, p.state].filter(Boolean).join(', ');
            const testNames = (o.items || []).map((i) => i.testName).filter(Boolean);
            const shown = testNames.slice(0, 3).join(', ');
            const more = testNames.length > 3 ? ` +${testNames.length - 3} more` : '';

            return (
              <button key={o._id} onClick={() => setSelectedId(o._id)}
                className="flex w-full items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 text-left transition hover:border-lab-300 hover:shadow">
                <Avatar patient={p} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-navy-900">{p.fullName || 'Unknown patient'}</p>
                    {p.loyalty?.tier && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold capitalize text-gray-600">
                        <Award size={12} />{p.loyalty.tier}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                    {p.phone && <span className="flex items-center gap-1"><Phone size={13} />{p.phone}</span>}
                    {p.email && <span className="flex items-center gap-1 truncate"><Mail size={13} />{p.email}</span>}
                    {(place || p.address) && (
                      <span className="flex items-center gap-1"><MapPin size={13} />{[p.address, place].filter(Boolean).join(', ')}</span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-gray-500">
                    {o.orderNumber} · {dateFmt(o.createdAt)} · {o.items.length} test{o.items.length > 1 ? 's' : ''} · {naira(o.totalAmount)}
                  </p>
                  {shown && (
                    <p className="mt-1 flex items-start gap-1 text-sm text-gray-700">
                      <FlaskConical size={14} className="mt-0.5 shrink-0 text-lab-700" />
                      <span className="line-clamp-1">{shown}{more}</span>
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusBadge status={o.status} />
                  <PaymentBadge status={o.paymentStatus} />
                  <ChevronRight size={18} className="text-gray-400" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}