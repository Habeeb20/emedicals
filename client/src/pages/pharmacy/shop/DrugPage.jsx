import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import { Card, ErrorNote, PageShell, Skeleton } from '../../appointments/ui';
import { Pill } from '../PharmacyShared';
import { AddToCart, CartButton, DrugImage, body, money } from './cart';

const Row = ({ label, value }) => value ? (
  <div className="flex justify-between gap-4 border-b border-gray-100 py-2 text-sm last:border-0">
    <dt className="text-gray-500">{label}</dt><dd className="text-right font-medium text-navy-900">{value}</dd>
  </div>
) : null;

const SCHEDULE = { otc: 'Over the counter', prescription_only: 'Prescription only', controlled: 'Controlled drug' };

export default function DrugPage() {
  const { id } = useParams();
  const [d, setD] = useState(null);
  const [img, setImg] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    setD(null); setImg(0);
    api(`/shop/drugs/${id}`).then((r) => setD(body(r).data)).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <PageShell className="max-w-5xl"><ErrorNote>{error}</ErrorNote><Link to="/shop" className="text-sm text-pharmacy-700 underline">Back to pharmacy</Link></PageShell>;
  if (!d) return <PageShell className="max-w-5xl"><Skeleton className="h-96 rounded-2xl" /></PageShell>;

  const p = d.pharmacy;
  const addr = [p.address?.street, p.address?.city, p.address?.state].filter(Boolean).join(', ');
  const title = `${d.genericName}${d.brandName ? ` (${d.brandName})` : ''}`;

  return (
    <PageShell className="max-w-5xl  pb-24 md:pb-0">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/shop" className="text-sm font-medium text-pharmacy-700 hover:underline">← All medicines</Link>
        <CartButton />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <DrugImage src={d.images[img]} alt={title} className="h-72 w-full rounded-2xl md:h-96" />
          {d.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {d.images.map((src, i) => (
                <button key={src} type="button" onClick={() => setImg(i)} aria-label={`Photo ${i + 1}`}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-2 ${i === img ? 'ring-pharmacy-500' : 'ring-transparent'}`}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            <Pill tone={d.schedule === 'otc' ? 'pharmacy' : 'warning'}>{SCHEDULE[d.schedule] || d.schedule}</Pill>
            {d.available > 0 && d.available <= 10 && <Pill tone="info">Only {d.available} left</Pill>}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-navy-900">{title}</h1>
          <p className="text-sm text-gray-600">{[d.strength, d.form, d.packSize].filter(Boolean).join(' · ')}</p>
          <p className="mt-4 text-3xl font-bold text-navy-900">{money(d.sellingPrice)}</p>
          <p className="mt-1 text-sm text-gray-600">Sold by <strong>{p.name}</strong></p>
          <div className="mt-5 font-bold text-green-800"><AddToCart drug={d} /></div>

          <Card className="mt-6">
            <h2 className="mb-1 font-semibold text-navy-900">Product details</h2>
            <dl>
              <Row label="Generic name" value={d.genericName} />
              <Row label="Brand" value={d.brandName} />
              <Row label="Strength" value={d.strength} />
              <Row label="Form" value={d.form} />
              <Row label="Pack size" value={d.packSize} />
              <Row label="Category" value={d.category} />
              <Row label="Manufacturer" value={d.manufacturer} />
              <Row label="NAFDAC no." value={d.nafdacNumber} />
            </dl>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <div className="flex items-start gap-4">
          {p.logo ? <img src={p.logo} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-pharmacy-100 text-lg font-bold text-pharmacy-700">{p.name[0]}</div>}
          <div className="min-w-0">
            <h2 className="font-semibold text-navy-900">{p.name}</h2>
            <p className="text-sm text-gray-600">
              {p.ratingCount > 0 ? `★ ${p.ratingAverage} (${p.ratingCount} reviews)` : 'No reviews yet'}
            </p>
          </div>
        </div>
        {p.about && <p className="mt-3 text-sm text-gray-700">{p.about}</p>}
        <dl className="mt-3">
          <Row label="Address" value={addr} />
          <Row label="Phone" value={p.phone && <a className="text-pharmacy-700 underline" href={`tel:${p.phone}`}>{p.phone}</a>} />
          <Row label="Email" value={p.email} />
          <Row label="Opening hours" value={p.is24Hours ? 'Open 24 hours' : p.openingHours} />
          <Row label="Delivery" value={p.offersDelivery ? 'Available' : 'Pickup only'} />
          <Row label="Licence no." value={p.licenseNumber} />
        </dl>
      </Card>

      {d.alternatives?.length > 0 && (
        <Card className="mt-6">
          <h2 className="mb-2 font-semibold text-navy-900">Also available at</h2>
          <ul className="divide-y divide-gray-100">
            {d.alternatives.map((a) => (
              <li key={a.drugId}>
                <Link to={`/shop/drugs/${a.drugId}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:text-pharmacy-700">
                  <span>{a.pharmacy.name}{a.pharmacy.city ? `, ${a.pharmacy.city}` : ''}</span>
                  <span className="font-semibold">{money(a.price)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 p-3 backdrop-blur md:hidden">
  <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
    <div>
      <p className="text-xs text-gray-500">Price</p>
      <p className="text-lg font-bold text-navy-900">{money(d.sellingPrice)}</p>
    </div>
    <AddToCart drug={d} size="sm" />
  </div>
</div>
    </PageShell>
  );
}