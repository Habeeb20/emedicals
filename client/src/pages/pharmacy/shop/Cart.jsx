// import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
// import { Link } from 'react-router-dom';
// import { Sheet, ghostBtn, money, primaryBtn } from '../PharmacyShared';

// /* api() may return the raw body or { data: body } depending on your wrapper: normalise it */
// export const body = (r) => (r && 'success' in r ? r : r?.data);

// const KEY = 'emedicals_cart_v1';
// const EMPTY = { pharmacy: null, items: [] };
// const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || EMPTY; } catch { return EMPTY; } };
// const Ctx = createContext(null);

// /**
//  * Guest-friendly cart (localStorage). One pharmacy per cart, like most delivery apps,
//  * so delivery and stock are always for a single seller.
//  */
// export function CartProvider({ children }) {
//   const [cart, setCart] = useState(read);

//   useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch { /* private mode */ } }, [cart]);
//   useEffect(() => {
//     const sync = (e) => { if (e.key === KEY) setCart(read()); };
//     window.addEventListener('storage', sync);
//     return () => window.removeEventListener('storage', sync);
//   }, []);

//   // drug = item from /shop/drugs. Returns 'ok' | 'conflict' (cart holds another pharmacy's items)
//   const add = useCallback((drug, qty = 1, { replace = false } = {}) => {
//     let result = 'ok';
//     setCart((c) => {
//       const other = c.pharmacy && String(c.pharmacy.id) !== String(drug.pharmacy.id);
//       if (other && !replace) { result = 'conflict'; return c; }
//       const base = other ? EMPTY : c;
//       const max = drug.available || 1;
//       const existing = base.items.find((i) => i.drugId === drug.id);
//       const items = existing
//         ? base.items.map((i) => (i.drugId === drug.id ? { ...i, quantity: Math.min(max, i.quantity + qty), max } : i))
//         : [...base.items, {
//           drugId: drug.id, name: [drug.genericName, drug.brandName && `(${drug.brandName})`].filter(Boolean).join(' '),
//           strength: drug.strength, price: drug.sellingPrice, image: drug.images?.[0], quantity: Math.min(max, qty), max,
//         }];
//       return { pharmacy: { id: drug.pharmacy.id, name: drug.pharmacy.name }, items };
//     });
//     return result;
//   }, []);

//   const setQty = useCallback((drugId, q) => setCart((c) => {
//     const items = c.items
//       .map((i) => (i.drugId === drugId ? { ...i, quantity: Math.min(q, i.max || q) } : i))
//       .filter((i) => i.quantity > 0);
//     return items.length ? { ...c, items } : EMPTY;
//   }), []);

//   const clear = useCallback(() => setCart(EMPTY), []);

//   const value = useMemo(() => ({
//     ...cart, add, setQty, clear,
//     count: cart.items.reduce((n, i) => n + i.quantity, 0),
//     subtotal: cart.items.reduce((s, i) => s + i.price * i.quantity, 0),
//   }), [cart, add, setQty, clear]);

//   return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
// }

// export const useCart = () => useContext(Ctx);

// /* Header cart icon with badge */
// export function CartButton() {
//   const { count } = useCart();
//   return (
//     <Link to="/shop/cart" aria-label={`Cart, ${count} items`} className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-white ring-1 ring-gray-200 hover:ring-pharmacy-300">
//       <svg viewBox="0 0 24 24" className="h-5 w-5 text-navy-800" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6" /><circle cx="9.5" cy="20" r="1.2" /><circle cx="17" cy="20" r="1.2" /></svg>
//       {count > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-pharmacy-600 px-1 text-[11px] font-semibold text-white">{count}</span>}
//     </Link>
//   );
// }

// export function QtyStepper({ value, max, onChange, size = 'md' }) {
//   const h = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
//   return (
//     <div className="inline-flex items-center rounded-full bg-gray-100">
//       <button type="button" onClick={() => onChange(value - 1)} aria-label="Decrease quantity" className={`${h} rounded-full text-lg font-semibold text-navy-800 hover:bg-gray-200`}>−</button>
//       <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">{value}</span>
//       <button type="button" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="Increase quantity" className={`${h} rounded-full text-lg font-semibold text-navy-800 hover:bg-gray-200 disabled:opacity-40`}>+</button>
//     </div>
//   );
// }

// /* Add-to-cart button that turns into a stepper once the item is in the cart */
// export function AddToCart({ drug, size }) {
//   const cart = useCart();
//   const [conflict, setConflict] = useState(false);
//   const inCart = cart.items.find((i) => i.drugId === drug.id);


//   if (!drug.orderable) {
//   return (
//     <div>
//       <button type="button" disabled className={`${primaryBtn} cursor-not-allowed opacity-50 ${size === 'sm' ? 'h-10 px-4 text-sm' : ''}`}>
//         Add to cart
//       </button>
//       <p className="mt-2  text-green-800 font-bolder">
//         {drug.available <= 0
//           ? 'Out of stock'
//           : "This medicine needs a prescription, so it can't be ordered online. Visit the pharmacy."}
//       </p>
//     </div>
//   );
// }
//   return (
//     <>
//       {inCart
//         ? <QtyStepper size={size} value={inCart.quantity} max={drug.available} onChange={(q) => cart.setQty(drug.id, q)} />
//         : <button type="button" onClick={() => cart.add(drug) === 'conflict' && setConflict(true)} className={`${primaryBtn} ${size === 'sm' ? 'h-10 px-4 text-sm' : ''}`}>Add to cart</button>}
//       <Sheet open={conflict} title="Start a new cart?" onClose={() => setConflict(false)}>
//         <p className="text-sm text-gray-700">
//           Your cart has items from <strong>{cart.pharmacy?.name}</strong>. You can only order from one pharmacy at a time. Replace your cart with this item from <strong>{drug.pharmacy.name}</strong>?
//         </p>
//         <div className="mt-4 flex gap-3">
//           <button type="button" className={`${ghostBtn} flex-1`} onClick={() => setConflict(false)}>Keep my cart</button>
//           <button type="button" className={`${primaryBtn} flex-1`} onClick={() => { cart.add(drug, 1, { replace: true }); setConflict(false); }}>Replace</button>
//         </div>
//       </Sheet>
//     </>
//   );
// }

// export function DrugImage({ src, alt, className = '' }) {
//   return src
//     ? <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />
//     : <div className={`flex items-center justify-center bg-pharmacy-50 text-pharmacy-300 ${className}`} aria-hidden="true">
//       <svg viewBox="0 0 24 24" className="h-1/3 w-1/3" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-35 12 12)" /><path d="M10 7.5l4 6" transform="rotate(-35 12 12)" /></svg>
//     </div>;
// }

// export { money };













import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sheet, ghostBtn, money, primaryBtn } from '../PharmacyShared';

/* api() may return the raw body or { data: body } depending on your wrapper: normalise it */
export const body = (r) => (r && 'success' in r ? r : r?.data);

const KEY = 'emedicals_cart_v2'; // bumped: v1 carts could have a missing pharmacy id
const EMPTY = { pharmacy: null, items: [] };
const OBJECT_ID = /^[a-f\d]{24}$/i;

const read = () => {
  try {
    const c = JSON.parse(localStorage.getItem(KEY));
    // discard carts that don't carry a usable pharmacy id
    if (!c || !Array.isArray(c.items) || !c.items.length) return EMPTY;
    if (!c.pharmacy?.id || !OBJECT_ID.test(String(c.pharmacy.id))) return EMPTY;
    return c;
  } catch {
    return EMPTY;
  }
};

const Ctx = createContext(null);

/**
 * Guest-friendly cart (localStorage). One pharmacy per cart, like most delivery apps,
 * so delivery and stock are always for a single seller.
 */
export function CartProvider({ children }) {
  const [cart, setCart] = useState(read);

  // Always holds the latest cart so add() can decide synchronously (ok vs conflict)
  const cartRef = useRef(cart);
  cartRef.current = cart;

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch { /* private mode */ }
  }, [cart]);

  useEffect(() => {
    const sync = (e) => { if (e.key === KEY) setCart(read()); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const commit = useCallback((next) => {
    cartRef.current = next;
    setCart(next);
  }, []);

  // drug = item from /shop/drugs. Returns 'ok' | 'conflict' | 'invalid'
  const add = useCallback((drug, qty = 1, { replace = false } = {}) => {
    const pharmacyId = String(drug?.pharmacy?.id ?? drug?.pharmacy?._id ?? '');
    if (!OBJECT_ID.test(pharmacyId)) return 'invalid';

    const c = cartRef.current;
    const other = c.pharmacy && String(c.pharmacy.id) !== pharmacyId;
    if (other && !replace) return 'conflict';

    const base = other ? EMPTY : c;
    const max = drug.available || 1;
    const existing = base.items.find((i) => i.drugId === drug.id);
    const items = existing
      ? base.items.map((i) => (i.drugId === drug.id ? { ...i, quantity: Math.min(max, i.quantity + qty), max } : i))
      : [...base.items, {
        drugId: drug.id,
        name: [drug.genericName, drug.brandName && `(${drug.brandName})`].filter(Boolean).join(' '),
        strength: drug.strength,
        price: drug.sellingPrice,
        image: drug.images?.[0],
        quantity: Math.min(max, qty),
        max,
      }];

    commit({ pharmacy: { id: pharmacyId, name: drug.pharmacy.name }, items });
    return 'ok';
  }, [commit]);

  const setQty = useCallback((drugId, q) => {
    const c = cartRef.current;
    const items = c.items
      .map((i) => (i.drugId === drugId ? { ...i, quantity: Math.min(q, i.max || q) } : i))
      .filter((i) => i.quantity > 0);
    commit(items.length ? { ...c, items } : EMPTY);
  }, [commit]);

  const clear = useCallback(() => commit(EMPTY), [commit]);

  const value = useMemo(() => ({
    ...cart, add, setQty, clear,
    count: cart.items.reduce((n, i) => n + i.quantity, 0),
    subtotal: cart.items.reduce((s, i) => s + i.price * i.quantity, 0),
  }), [cart, add, setQty, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCart = () => useContext(Ctx);

/* Header cart icon with badge */
export function CartButton() {
  const { count } = useCart();
  return (
    <Link to="/shop/cart" aria-label={`Cart, ${count} items`} className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-white ring-1 ring-gray-200 hover:ring-pharmacy-300">
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-navy-800" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6" /><circle cx="9.5" cy="20" r="1.2" /><circle cx="17" cy="20" r="1.2" /></svg>
      {count > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-pharmacy-600 px-1 text-[11px] font-semibold text-white">{count}</span>}
    </Link>
  );
}

export function QtyStepper({ value, max, onChange, size = 'md' }) {
  const h = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  return (
    <div className="inline-flex items-center rounded-full bg-gray-100">
      <button type="button" onClick={() => onChange(value - 1)} aria-label="Decrease quantity" className={`${h} rounded-full text-lg font-semibold text-navy-800 hover:bg-gray-200`}>−</button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">{value}</span>
      <button type="button" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="Increase quantity" className={`${h} rounded-full text-lg font-semibold text-navy-800 hover:bg-gray-200 disabled:opacity-40`}>+</button>
    </div>
  );
}

/* Add-to-cart button that turns into a stepper once the item is in the cart */
export function AddToCart({ drug, size }) {
  const cart = useCart();
  const [conflict, setConflict] = useState(false);
  const [problem, setProblem] = useState('');
  const inCart = cart.items.find((i) => i.drugId === drug.id);

  if (!drug.orderable) {
    return (
      <div>
        <button type="button" disabled className={`${primaryBtn} cursor-not-allowed opacity-50 ${size === 'sm' ? 'h-10 px-4 text-sm' : ''}`}>
          Add to cart
        </button>
        <p className="mt-2 font-bold text-green-800">
          {drug.available <= 0
            ? 'Out of stock'
            : "This medicine needs a prescription, so it can't be ordered online. Visit the pharmacy."}
        </p>
      </div>
    );
  }

  const handleAdd = () => {
    const res = cart.add(drug);
    if (res === 'conflict') setConflict(true);
    else if (res === 'invalid') setProblem("Couldn't add this item. Please refresh the page and try again.");
    else setProblem('');
  };

  return (
    <>
      {inCart
        ? <QtyStepper size={size} value={inCart.quantity} max={drug.available} onChange={(q) => cart.setQty(drug.id, q)} />
        : <button type="button" onClick={handleAdd} className={`${primaryBtn} ${size === 'sm' ? 'h-10 px-4 text-sm' : ''}`}>Add to cart</button>}
      {problem && <p className="mt-2 text-xs text-red-600">{problem}</p>}
      <Sheet open={conflict} title="Start a new cart?" onClose={() => setConflict(false)}>
        <p className="text-sm text-gray-700">
          Your cart has items from <strong>{cart.pharmacy?.name}</strong>. You can only order from one pharmacy at a time. Replace your cart with this item from <strong>{drug.pharmacy.name}</strong>?
        </p>
        <div className="mt-4 flex gap-3">
          <button type="button" className={`${ghostBtn} flex-1`} onClick={() => setConflict(false)}>Keep my cart</button>
          <button type="button" className={`${primaryBtn} flex-1`} onClick={() => { cart.add(drug, 1, { replace: true }); setConflict(false); }}>Replace</button>
        </div>
      </Sheet>
    </>
  );
}

export function DrugImage({ src, alt, className = '' }) {
  return src
    ? <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />
    : <div className={`flex items-center justify-center bg-pharmacy-50 text-pharmacy-300 ${className}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="h-1/3 w-1/3" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-35 12 12)" /><path d="M10 7.5l4 6" transform="rotate(-35 12 12)" /></svg>
    </div>;
}

export { money };