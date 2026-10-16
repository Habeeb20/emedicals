import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Phone, FlaskConical, Clock, Truck } from 'lucide-react';
import { labApi, inputCls } from './labApi';
import { RatingLine, StatRow } from './LabEngagement';

export default function LabDirectory() {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('name');
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      labApi.listLabs({ q, sort }).then((d) => setLabs(d.labs)).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q, sort]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">Find a laboratory</h1>
          <p className="mt-1 text-gray-600">Pick a lab, choose your tests and get results online.</p>
        </div>
        <Link to="/labs/orders" className="btn-outline">My lab orders</Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative max-w-md flex-1">
          <Search size={18} className="absolute left-4 top-3.5 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search labs by name" className={`${inputCls} pl-11`} />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={`${inputCls} max-w-[12rem]`}>
          <option value="name">Name (A-Z)</option>
          <option value="top">Top rated</option>
          <option value="views">Most viewed</option>
          <option value="likes">Most liked</option>
        </select>
      </div>

      {loading ? (
        <p className="mt-10 text-gray-500">Loading labs…</p>
      ) : labs.length === 0 ? (
        <p className="mt-10 text-gray-500">No labs found. Try a different name.</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {labs.map((lab) => (
            <Link key={lab._id} to={`/labs/${lab._id}`} className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-lab-300 hover:shadow-lg">
              <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-lab-50 text-lab-700">
                {lab.logo?.url ? <img src={lab.logo.url} alt="" className="h-full w-full object-cover" /> : <FlaskConical size={24} />}
              </span>
              <h2 className="mt-4 text-lg font-semibold text-navy-900">{lab.name}</h2>
              <RatingLine average={lab.ratingAverage} count={lab.ratingCount} />

              {lab.about && <p className="mt-2 line-clamp-2 text-sm text-gray-600">{lab.about}</p>}

              <p className="mt-2 flex items-start gap-2 text-sm text-gray-600">
                <MapPin size={16} className="mt-0.5 shrink-0" />
                {[lab.address?.street, lab.address?.city, lab.address?.state].filter(Boolean).join(', ') || 'Address not provided'}
              </p>
              {lab.phone && <p className="mt-1 flex items-center gap-2 text-sm text-gray-600"><Phone size={16} />{lab.phone}</p>}
              {(lab.is24Hours || lab.openingHours) && (
                <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                  <Clock size={16} />{lab.is24Hours ? 'Open 24 hours' : lab.openingHours}
                </p>
              )}
              {lab.offersDelivery && <p className="mt-1 flex items-center gap-2 text-sm text-gray-600"><Truck size={16} />Sample pickup / delivery</p>}

              <StatRow lab={lab} />

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-lab-700 group-hover:underline">View details</span>
                <span className="rounded-full bg-lab-50 px-2.5 py-0.5 text-xs font-medium text-lab-700">{lab.testsCount} tests</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}