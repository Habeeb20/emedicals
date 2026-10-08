import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { labApi, naira, dateFmt } from './labApi';

export default function MyLabOrders() {
  const [orders, setOrders] = useState(null);
  useEffect(() => { labApi.myOrders().then((d) => setOrders(d.orders)); }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-navy-900">My lab orders</h1>
        <Link to="/labs" className="btn-primary">New order</Link>
      </div>

      {!orders ? <p className="mt-8 text-gray-500">Loading…</p>
        : orders.length === 0 ? <p className="mt-8 text-gray-500">You have no lab orders yet. Find a lab to order your first test.</p>
        : (
          <div className="mt-6 space-y-3">
            {orders.map((o) => (
              <Link key={o._id} to={`/labs/orders/${o._id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-5 hover:border-lab-300 hover:shadow">
                <div>
                  <p className="font-semibold text-navy-900">{o.lab?.name}</p>
                  <p className="text-sm text-gray-500">{o.orderNumber} · {dateFmt(o.createdAt)} · {o.items.length} test{o.items.length > 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-navy-900">{naira(o.totalAmount)}</span>
                  <StatusBadge status={o.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}





