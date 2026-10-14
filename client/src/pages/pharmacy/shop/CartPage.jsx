import  { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

import { Card, EmptyState, PageHeader, PageShell } from '../../appointments/ui';
import { ghostBtn, primaryBtn } from '../PharmacyShared';
import { DrugImage, QtyStepper, money, useCart } from './cart';

export default function CartPage() {
  const cart = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (cart.items.length === 0) {
    return (
      <PageShell className="max-w-3xl">
        <PageHeader title="Your cart" />
        <EmptyState icon="search" title="Your cart is empty" body="Browse medicines and add what you need." />
        <div className="mt-4 text-center"><Link to="/shop" className={primaryBtn}>Browse medicines</Link></div>
      </PageShell>
    );
  }

  // Guests can fill a cart; login is only required here
  const proceed = () => navigate(user ? '/shop/checkout' : `/login?next=${encodeURIComponent('/shop/checkout')}`);

  return (
    <PageShell className="max-w-3xl">
      <PageHeader title="Your cart" subtitle={`Sold by ${cart.pharmacy.name}`} />
      <ul className="space-y-3">
        {cart.items.map((i) => (
          <li key={i.drugId}>
            <Card>
              <div className="flex gap-3">
                <Link to={`/shop/drugs/${i.drugId}`}><DrugImage src={i.image} alt="" className="h-20 w-20 rounded-xl" /></Link>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy-900">{i.name}</p>
                  {i.strength && <p className="text-xs text-gray-500">{i.strength}</p>}
                  <p className="mt-1 text-sm text-gray-700">{money(i.price)} each</p>
                  <div className="mt-2 flex items-center justify-between">
                    <QtyStepper size="sm" value={i.quantity} max={i.max} onChange={(q) => cart.setQty(i.drugId, q)} />
                    <p className="font-semibold text-navy-900">{money(i.price * i.quantity)}</p>
                  </div>
                </div>
                <button type="button" onClick={() => cart.setQty(i.drugId, 0)} aria-label={`Remove ${i.name}`} className="self-start rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600">✕</button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Card className="mt-5">
        <div className="flex items-center justify-between text-sm"><span className="text-gray-600">Subtotal</span><span className="text-lg font-bold text-navy-900">{money(cart.subtotal)}</span></div>
        <p className="mt-1 text-xs text-gray-500">Delivery fee, vouchers and points are applied at checkout. Final prices are confirmed there.</p>
        <button type="button" onClick={proceed} className={`${primaryBtn} mt-4 w-full`}>{user ? 'Proceed to checkout' : 'Log in to checkout'}</button>
        <div className="mt-3 flex justify-between">
          <Link to="/shop" className={ghostBtn}>Keep shopping</Link>
          <button type="button" onClick={cart.clear} className="text-sm text-gray-500 underline">Clear cart</button>
        </div>
      </Card>
    </PageShell>
  );
}