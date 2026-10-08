export const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

export const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

export const formatKm = (km) => (km == null ? null : km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`);
export const formatMinutes = (m) =>
  m == null ? null : m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ''}`;

export const todayISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
export const addDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA');
};
export const formatDay = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' });

export const timeAgo = (iso) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
};

export const ageFrom = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) a -= 1;
  return a;
};

export const PAYMENT_MODES = {
  arrival: { label: 'Pay on arrival', help: 'Patients pay at the front desk when they arrive. Chat opens as soon as you accept.' },
  booking: { label: 'Pay in full to confirm', help: 'After you accept, the patient pays the full fee online. Chat opens once payment is received.' },
  deposit: { label: 'Deposit to confirm', help: 'After you accept, the patient pays a deposit online. They pay the balance on arrival.' },
};

export const paymentLine = (a) => {
  const { totalAmount: t, amountPaid: p, status, mode } = a.payment || {};
  if (status === 'free' || !t) return 'No fee';
  if (status === 'paid') return `Paid ${naira(t)}`;
  if (status === 'partial') return `Paid ${naira(p)} of ${naira(t)}`;
  return mode === 'arrival' ? `${naira(t)} due on arrival` : `${naira(t)} to pay`;
};
