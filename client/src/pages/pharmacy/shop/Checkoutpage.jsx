// import { useEffect, useMemo, useState } from 'react';
// import { Link, Navigate, useNavigate } from 'react-router-dom';
// import api from '../api';
// import { useAuth } from '../../../context/AuthContext';

// import { useDebounced } from '../../appointments/hooks';
// import { Card, ErrorNote, PageHeader, PageShell } from '../../appointments/ui';
// import { Field, field, primaryBtn } from '../PharmacyShared';
// import { body, money, useCart } from './cart';

// const Choice = ({ active, onClick, title, sub }) => (
//   <button type="button" onClick={onClick} aria-pressed={active}
//     className={`flex-1 rounded-2xl border-2 p-4 text-left transition ${active ? 'border-pharmacy-600 bg-pharmacy-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
//     <span className="block font-semibold text-navy-900">{title}</span>
//     <span className="block text-xs text-gray-600">{sub}</span>
//   </button>
// );

// const Line = ({ label, value, strong, green }) => (
//   <div className={`flex justify-between text-sm ${strong ? 'text-base font-bold text-navy-900' : 'text-gray-700'}`}>
//     <span>{label}</span><span className={green ? 'text-green-700' : ''}>{value}</span>
//   </div>
// );

// export default function CheckoutPage() {
//   const { user } = useAuth();
//   const cart = useCart();
//   const navigate = useNavigate();

//   const [fulfilment, setFulfilment] = useState('pickup');
//   const [recipient, setRecipient] = useState('');
//   const [phone, setPhone] = useState('');
//   const [rewards, setRewards] = useState(null);
//   const [usePoints, setUsePoints] = useState(false);
//   const [voucherInput, setVoucherInput] = useState('');
//   const [voucherCode, setVoucherCode] = useState('');

//   // delivery address (picked from geocode suggestions so we have coordinates)
//   const [addrText, setAddrText] = useState('');
//   const [place, setPlace] = useState(null); // { label, lat, lng }
//   const [suggestions, setSuggestions] = useState([]);
//   const [note, setNote] = useState('');
//   const dAddr = useDebounced(addrText, 400);

//   const [quote, setQuote] = useState(null);
//   const [quoting, setQuoting] = useState(false);
//   const [error, setError] = useState('');
//   const [busy, setBusy] = useState(false);

//   useEffect(() => {
//     if (!cart.pharmacy?.id || needsPlace) { setQuote(null); return; }
//     api('/shop/rewards').then((r) => {
//       const d = body(r).data;
//       setRewards(d); setRecipient((v) => v || d.fullName || ''); setPhone((v) => v || d.phone || '');
//     }).catch(() => { });
//   }, []);

//   useEffect(() => {
//     if (fulfilment !== 'delivery' || place || dAddr.trim().length < 3) { setSuggestions([]); return; }
//     api('/shop/geocode', { params: { q: dAddr.trim() } }).then((r) => setSuggestions(body(r).data || [])).catch(() => setSuggestions([]));
//   }, [dAddr, fulfilment, place]);

//   const payload = useMemo(() => ({
//     pharmacyId: cart.pharmacy?.id,
//     items: cart.items.map((i) => ({ drugId: i.drugId, quantity: i.quantity })),
//     fulfilment, usePoints, voucherCode,
//     phone,
//     delivery: fulfilment === 'delivery' ? { address: place?.label || addrText, lat: place?.lat, lng: place?.lng, recipient, phone, note } : undefined,
//   }), [cart.pharmacy, cart.items, fulfilment, usePoints, voucherCode, phone, place, addrText, recipient, note]);

//   // The server prices everything. We only display what it returns.
//   const needsPlace = fulfilment === 'delivery' && !place;
//   const key = JSON.stringify({ ...payload, delivery: payload.delivery && { lat: place?.lat, lng: place?.lng }, phone: undefined });
//   const dKey = useDebounced(key, 250);
//   useEffect(() => {
//     if (!cart.pharmacy || needsPlace) { setQuote(null); return; }
//     setQuoting(true);
//     const r = body(await api('/shop/checkout', { method: 'POST', data: payload })).data

//       .then((r) => {
//         const q = body(r).data;
//         setQuote(q); setError('');
//         if (q.voucherError) { setError(q.voucherError); setVoucherCode(''); }
//       })
//       .catch((e) => { setQuote(null); setError(e.message); })
//       .finally(() => setQuoting(false));
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [dKey, needsPlace]);

//   if (!user) return <Navigate to={`/login?next=${encodeURIComponent('/shop/checkout')}`} replace />;
//   if (!cart.items.length) return <Navigate to="/shop/cart" replace />;

//   const pickPlace = (s) => { setPlace(s); setAddrText(s.label); setSuggestions([]); };
//   const validPhone = /^\+?\d{10,14}$/.test(phone.trim());
//   const canPay = quote && !quoting && validPhone && (fulfilment === 'pickup' || (place && recipient.trim()));

//   const submit = async (e) => {
//     e.preventDefault();
//     if (!canPay) return;
//     setBusy(true); setError('');
//     try {
//       const r = body(await api('/shop/checkout', { method: 'POST', body: payload })).data;
//       cart.clear();
//       if (r.authorizationUrl) window.location.href = r.authorizationUrl; // Paystack
//       else navigate(`/shop/orders/${r.orderId}`, { replace: true });
//     } catch (err) { setError(err.message); setBusy(false); }
//   };

//   const maxPointsValue = rewards ? rewards.points * rewards.pointValue : 0;

//   return (
//     <PageShell className="max-w-4xl">
//       <PageHeader title="Checkout" subtitle={`Order from ${cart.pharmacy.name}`} />
//       <form onSubmit={submit} className="grid gap-5 md:grid-cols-5">
//         <div className="space-y-5 md:col-span-3">
//           <Card>
//             <h2 className="mb-3 font-semibold text-navy-900">How do you want it?</h2>
//             <div className="flex gap-3">
//               <Choice active={fulfilment === 'pickup'} onClick={() => setFulfilment('pickup')} title="Pickup" sub="Collect from the pharmacy. Free." />
//               <Choice active={fulfilment === 'delivery'} onClick={() => setFulfilment('delivery')} title="Delivery" sub="Brought to your address." />
//             </div>
//             <div className="mt-4">
//               <Field label="Phone number">
//                 <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="08012345678" className={`${field} h-11`} required />
//               </Field>
//               {phone && !validPhone && <p className="mt-1 text-xs text-red-600">Enter a valid phone number.</p>}
//             </div>
//           </Card>

//           {fulfilment === 'delivery' && (
//             <Card>
//               <h2 className="mb-3 font-semibold text-navy-900">Delivery address</h2>
//               <div className="space-y-3">
//                 <Field label="Recipient name"><input value={recipient} onChange={(e) => setRecipient(e.target.value)} className={`${field} h-11`} required /></Field>
//                 <div className="relative">
//                   <Field label="Street, area or landmark">
//                     <input value={addrText} onChange={(e) => { setAddrText(e.target.value); setPlace(null); }} placeholder="Start typing, then pick your address" autoComplete="off" className={`${field} h-11`} required />
//                   </Field>
//                   {suggestions.length > 0 && (
//                     <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-gray-200">
//                       {suggestions.map((s) => (
//                         <li key={`${s.lat},${s.lng}`}><button type="button" onClick={() => pickPlace(s)} className="block w-full px-4 py-3 text-left text-sm hover:bg-pharmacy-50">{s.label}</button></li>
//                       ))}
//                     </ul>
//                   )}
//                   {!place && addrText.trim().length >= 3 && suggestions.length === 0 && <p className="mt-1 text-xs text-gray-500">Pick a suggestion so we can work out the delivery fee.</p>}
//                   {place && <p className="mt-1 text-xs text-green-700">✓ Address found</p>}
//                 </div>
//                 <Field label="House number or landmark for the rider (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Flat 3, opposite the blue gate" className={`${field} h-11`} /></Field>
//               </div>
//             </Card>
//           )}

//           <Card>
//             <h2 className="mb-3 font-semibold text-navy-900">Voucher and points</h2>
//             <div className="flex gap-2">
//               <input value={voucherInput} onChange={(e) => setVoucherInput(e.target.value.toUpperCase())} placeholder="Voucher code" aria-label="Voucher code" className={`${field} h-11 flex-1`} />
//               {voucherCode
//                 ? <button type="button" onClick={() => { setVoucherCode(''); setVoucherInput(''); }} className="h-11 rounded-xl px-4 text-sm font-medium text-gray-600 ring-1 ring-gray-300">Remove</button>
//                 : <button type="button" disabled={!voucherInput.trim()} onClick={() => setVoucherCode(voucherInput.trim())} className="h-11 rounded-xl bg-navy-800 px-4 text-sm font-medium text-white disabled:opacity-40">Apply</button>}
//             </div>
//             <label className={`mt-4 flex items-center gap-3 rounded-xl p-3 ring-1 ${rewards?.points ? 'ring-gray-200' : 'opacity-60 ring-gray-100'}`}>
//               <input type="checkbox" checked={usePoints} disabled={!rewards?.points} onChange={(e) => setUsePoints(e.target.checked)} className="h-5 w-5 accent-pharmacy-600" />
//               <span className="text-sm">
//                 <span className="font-medium text-navy-900">Use my loyalty points</span>
//                 <span className="block text-xs text-gray-600">{rewards ? `${rewards.points} points available (worth ${money(maxPointsValue)})` : 'Loading…'}</span>
//               </span>
//             </label>
//           </Card>
//         </div>

//         <div className="md:col-span-2">
//           <Card className="md:sticky md:top-4">
//             <h2 className="mb-3 font-semibold text-navy-900">Summary</h2>
//             <ul className="mb-3 space-y-1 border-b border-gray-100 pb-3 text-sm">
//               {cart.items.map((i) => <li key={i.drugId} className="flex justify-between gap-3"><span className="truncate">{i.quantity}× {i.name}</span><span>{money(i.price * i.quantity)}</span></li>)}
//             </ul>
//             {needsPlace ? <p className="text-sm text-gray-600">Pick your delivery address to see the total.</p> : quote ? (
//               <div className={`space-y-2 ${quoting ? 'opacity-60' : ''}`}>
//                 <Line label="Items" value={money(quote.subtotal)} />
//                 {quote.fulfilment === 'delivery' && <Line label={`Delivery (${quote.distanceKm} km)`} value={money(quote.deliveryFee)} />}
//                 {quote.voucher && <Line green label={`Voucher ${quote.voucher.code}`} value={`− ${money(quote.voucher.discount)}`} />}
//                 {quote.points.used > 0 && <Line green label={`Points (${quote.points.used})`} value={`− ${money(quote.points.discount)}`} />}
//                 <div className="border-t border-gray-100 pt-2"><Line strong label="Total" value={money(quote.total)} /></div>
//               </div>
//             ) : <p className="text-sm text-gray-500">{quoting ? 'Calculating…' : 'Unable to price this order.'}</p>}
//             <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>
//             <button type="submit" disabled={!canPay || busy} className={`${primaryBtn} mt-4 w-full`}>
//               {busy ? 'Please wait…' : quote?.amountDue > 0 ? `Pay ${money(quote.amountDue)}` : 'Place order'}
//             </button>
//             <p className="mt-2 text-center text-xs text-gray-500">Secure payment by Paystack. You'll get a 4-digit code after payment to collect or receive your order.</p>
//             <Link to="/shop/cart" className="mt-2 block text-center text-sm text-pharmacy-700 underline">Edit cart</Link>
//           </Card>
//         </div>
//       </form>
//     </PageShell>
//   );
// }






import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../../../context/AuthContext';

import { useDebounced } from '../../appointments/hooks';
import { Card, ErrorNote, PageHeader, PageShell } from '../../appointments/ui';
import { Field, field, primaryBtn } from '../PharmacyShared';
import { body, money, useCart } from './cart';

const Choice = ({ active, onClick, title, sub }) => (
  <button type="button" onClick={onClick} aria-pressed={active}
    className={`flex-1 rounded-2xl border-2 p-4 text-left transition ${active ? 'border-pharmacy-600 bg-pharmacy-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
    <span className="block font-semibold text-navy-900">{title}</span>
    <span className="block text-xs text-gray-600">{sub}</span>
  </button>
);

const Line = ({ label, value, strong, green }) => (
  <div className={`flex justify-between text-sm ${strong ? 'text-base font-bold text-navy-900' : 'text-gray-700'}`}>
    <span>{label}</span><span className={green ? 'text-green-700' : ''}>{value}</span>
  </div>
);

// Pull a readable message out of whatever the api wrapper throws
const errMsg = (e, fallback = 'Something went wrong. Please try again.') =>
  e?.response?.data?.message || e?.message || fallback;

export default function CheckoutPage() {
  const { user } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();

  const [fulfilment, setFulfilment] = useState('pickup');
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [rewards, setRewards] = useState(null);
  const [usePoints, setUsePoints] = useState(false);
  const [voucherInput, setVoucherInput] = useState('');
  const [voucherCode, setVoucherCode] = useState('');

  // delivery address (picked from geocode suggestions so we have coordinates)
  const [addrText, setAddrText] = useState('');
  const [place, setPlace] = useState(null); // { label, lat, lng }
  const [suggestions, setSuggestions] = useState([]);
  const [note, setNote] = useState('');
  const dAddr = useDebounced(addrText, 400);

  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const needsPlace = fulfilment === 'delivery' && !place;

  /* ---------- rewards (points, saved name and phone) ---------- */
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const r = await api('/shop/rewards');
        const d = body(r)?.data;
        if (cancelled || !d) return;
        setRewards(d);
        setRecipient((v) => v || d.fullName || '');
        setPhone((v) => v || d.phone || '');
      } catch {
        /* rewards are optional, checkout still works without them */
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  /* ---------- address suggestions ---------- */
  useEffect(() => {
    if (fulfilment !== 'delivery' || place || dAddr.trim().length < 3) { setSuggestions([]); return undefined; }
    let cancelled = false;
    (async () => {
      try {
        const r = await api('/shop/geocode', { params: { q: dAddr.trim() } });
        if (!cancelled) setSuggestions(body(r)?.data || []);
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    })();
    return () => { cancelled = true; };
  }, [dAddr, fulfilment, place]);

  const payload = useMemo(() => ({
    pharmacyId: cart.pharmacy?.id,
    items: cart.items.map((i) => ({ drugId: i.drugId, quantity: i.quantity })),
    fulfilment, usePoints, voucherCode,
    phone,
    delivery: fulfilment === 'delivery'
      ? { address: place?.label || addrText, lat: place?.lat, lng: place?.lng, recipient, phone, note }
      : undefined,
  }), [cart.pharmacy, cart.items, fulfilment, usePoints, voucherCode, phone, place, addrText, recipient, note]);

  /* ---------- price preview (the server prices everything) ---------- */
  const key = JSON.stringify({ ...payload, delivery: payload.delivery && { lat: place?.lat, lng: place?.lng }, phone: undefined });
  const dKey = useDebounced(key, 250);

  useEffect(() => {
    if (!cart.pharmacy?.id || !cart.items.length || needsPlace) { setQuote(null); return undefined; }
    let cancelled = false;
    (async () => {
      setQuoting(true);
      try {
        const r = await api('/shop/checkout/preview', { method: 'POST', data: payload });
        if (cancelled) return;
        const q = body(r)?.data;
        if (!q) throw new Error('Unable to price this order.');
        setQuote(q);
        setError('');
        if (q.voucherError) { setError(q.voucherError); setVoucherCode(''); }
      } catch (e) {
        if (cancelled) return;
        setQuote(null);
        setError(errMsg(e));
      } finally {
        if (!cancelled) setQuoting(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dKey, needsPlace]);

  if (!user) return <Navigate to={`/login?next=${encodeURIComponent('/shop/checkout')}`} replace />;
  if (!cart.items.length || !cart.pharmacy) return <Navigate to="/shop/cart" replace />;

  const pickPlace = (s) => { setPlace(s); setAddrText(s.label); setSuggestions([]); };
  const validPhone = /^\+?\d{10,14}$/.test(phone.trim());
  const canPay = quote && !quoting && validPhone && (fulfilment === 'pickup' || (place && recipient.trim()));

  const submit = async (e) => {
    e.preventDefault();
    if (!canPay || busy) return;
    setBusy(true);
    setError('');
    try {
      const r = body(await api('/shop/checkout', { method: 'POST', data: payload }))?.data;
      if (!r) throw new Error('Unexpected response from the server.');
      cart.clear();
      if (r.authorizationUrl) window.location.href = r.authorizationUrl; // Paystack
      else navigate(`/shop/orders/${r.orderId}`, { replace: true });
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  const maxPointsValue = rewards ? rewards.points * rewards.pointValue : 0;

  return (
    <PageShell className="max-w-4xl">
      <PageHeader title="Checkout" subtitle={`Order from ${cart.pharmacy?.name}`} />
      <form onSubmit={submit} className="grid gap-5 md:grid-cols-5">
        <div className="space-y-5 md:col-span-3">
          <Card>
            <h2 className="mb-3 font-semibold text-navy-900">How do you want it?</h2>
            <div className="flex gap-3">
              <Choice active={fulfilment === 'pickup'} onClick={() => setFulfilment('pickup')} title="Pickup" sub="Collect from the pharmacy. Free." />
              <Choice active={fulfilment === 'delivery'} onClick={() => setFulfilment('delivery')} title="Delivery" sub="Brought to your address." />
            </div>
            <div className="mt-4">
              <Field label="Phone number">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="08012345678" className={`${field} h-11`} required />
              </Field>
              {phone && !validPhone && <p className="mt-1 text-xs text-red-600">Enter a valid phone number.</p>}
            </div>
          </Card>

          {fulfilment === 'delivery' && (
            <Card>
              <h2 className="mb-3 font-semibold text-navy-900">Delivery address</h2>
              <div className="space-y-3">
                <Field label="Recipient name"><input value={recipient} onChange={(e) => setRecipient(e.target.value)} className={`${field} h-11`} required /></Field>
                <div className="relative">
                  <Field label="Street, area or landmark">
                    <input value={addrText} onChange={(e) => { setAddrText(e.target.value); setPlace(null); }} placeholder="Start typing, then pick your address" autoComplete="off" className={`${field} h-11`} required />
                  </Field>
                  {suggestions.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-gray-200">
                      {suggestions.map((s) => (
                        <li key={`${s.lat},${s.lng}`}><button type="button" onClick={() => pickPlace(s)} className="block w-full px-4 py-3 text-left text-sm hover:bg-pharmacy-50">{s.label}</button></li>
                      ))}
                    </ul>
                  )}
                  {!place && addrText.trim().length >= 3 && suggestions.length === 0 && <p className="mt-1 text-xs text-gray-500">Pick a suggestion so we can work out the delivery fee.</p>}
                  {place && <p className="mt-1 text-xs text-green-700">✓ Address found</p>}
                </div>
                <Field label="House number or landmark for the rider (optional)"><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Flat 3, opposite the blue gate" className={`${field} h-11`} /></Field>
              </div>
            </Card>
          )}

          <Card>
            <h2 className="mb-3 font-semibold text-navy-900">Voucher and points</h2>
            <div className="flex gap-2">
              <input value={voucherInput} onChange={(e) => setVoucherInput(e.target.value.toUpperCase())} placeholder="Voucher code" aria-label="Voucher code" className={`${field} h-11 flex-1`} />
              {voucherCode
                ? <button type="button" onClick={() => { setVoucherCode(''); setVoucherInput(''); }} className="h-11 rounded-xl px-4 text-sm font-medium text-gray-600 ring-1 ring-gray-300">Remove</button>
                : <button type="button" disabled={!voucherInput.trim()} onClick={() => setVoucherCode(voucherInput.trim())} className="h-11 rounded-xl bg-navy-800 px-4 text-sm font-medium text-white disabled:opacity-40">Apply</button>}
            </div>
            <label className={`mt-4 flex items-center gap-3 rounded-xl p-3 ring-1 ${rewards?.points ? 'ring-gray-200' : 'opacity-60 ring-gray-100'}`}>
              <input type="checkbox" checked={usePoints} disabled={!rewards?.points} onChange={(e) => setUsePoints(e.target.checked)} className="h-5 w-5 accent-pharmacy-600" />
              <span className="text-sm">
                <span className="font-medium text-navy-900">Use my loyalty points</span>
                <span className="block text-xs text-gray-600">{rewards ? `${rewards.points} points available (worth ${money(maxPointsValue)})` : 'Loading…'}</span>
              </span>
            </label>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="md:sticky md:top-4">
            <h2 className="mb-3 font-semibold text-navy-900">Summary</h2>
            <ul className="mb-3 space-y-1 border-b border-gray-100 pb-3 text-sm">
              {cart.items.map((i) => <li key={i.drugId} className="flex justify-between gap-3"><span className="truncate">{i.quantity}× {i.name}</span><span>{money(i.price * i.quantity)}</span></li>)}
            </ul>
            {needsPlace ? <p className="text-sm text-gray-600">Pick your delivery address to see the total.</p> : quote ? (
              <div className={`space-y-2 ${quoting ? 'opacity-60' : ''}`}>
                <Line label="Items" value={money(quote.subtotal)} />
                {quote.fulfilment === 'delivery' && <Line label={`Delivery (${quote.distanceKm} km)`} value={money(quote.deliveryFee)} />}
                {quote.voucher && <Line green label={`Voucher ${quote.voucher.code}`} value={`− ${money(quote.voucher.discount)}`} />}
                {quote.points?.used > 0 && <Line green label={`Points (${quote.points.used})`} value={`− ${money(quote.points.discount)}`} />}
                <div className="border-t border-gray-100 pt-2"><Line strong label="Total" value={money(quote.total)} /></div>
              </div>
            ) : <p className="text-sm text-gray-500">{quoting ? 'Calculating…' : 'Unable to price this order.'}</p>}
            <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>
            <button type="submit" disabled={!canPay || busy} className={`${primaryBtn} mt-4 w-full`}>
              {busy ? 'Please wait…' : quote?.amountDue > 0 ? `Pay ${money(quote.amountDue)}` : 'Place order'}
            </button>
            <p className="mt-2 text-center text-xs text-gray-500">Secure payment by Paystack. You'll get a 4-digit code after payment to collect or receive your order.</p>
            <Link to="/shop/cart" className="mt-2 block text-center text-sm text-pharmacy-700 underline">Edit cart</Link>
          </Card>
        </div>
      </form>
    </PageShell>
  );
}