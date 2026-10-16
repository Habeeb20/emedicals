import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, BadgeCheck, Building2, Clock, Eye, FlaskConical, Heart, Mail, MapPin,
  MessageSquare, Phone, Search, Share2, ShieldCheck, Trash2, Truck, Wallet,
} from 'lucide-react';
import { labApi, inputCls } from './labApi';
import { RatingLine, ShareMenu, Stars } from './LabEngagement';

const naira = (n = 0) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

const PAY_MODE = {
  arrival: 'Pay on arrival',
  booking: 'Pay when booking',
  deposit: 'Deposit required to book',
};

function Section({ title, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-navy-900">
        {Icon && <Icon size={18} className="text-lab-700" />} {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  if (!children) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800">{children}</dd>
    </div>
  );
}

export default function LabDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [lab, setLab] = useState(null);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [testQ, setTestQ] = useState('');
  const [category, setCategory] = useState('all');
console.log(labApi)
  const requireLogin = useCallback((err) => {
    if (err?.response?.status === 401) {
      navigate('/login', { state: { from: location.pathname } });
      return true;
    }
    return false;
  }, [navigate, location.pathname]);

  useEffect(() => {
    setLoading(true);
    labApi.getLab(id)
      .then((d) => { setLab(d.lab); setTests(d.tests); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    // count a view (server dedupes per viewer per day)
    labApi.recordView(id).then((d) => {
      if (d?.counted) setLab((l) => (l ? { ...l, viewsCount: d.viewsCount } : l));
    }).catch(() => {});
  }, [id]);

  const toggleLike = async () => {
    const prev = lab;
    setLab((l) => ({ ...l, liked: !l.liked, likesCount: Math.max(0, l.likesCount + (l.liked ? -1 : 1)) }));
    try {
      const d = await labApi.toggleLike(id);
      setLab((l) => ({ ...l, liked: d.liked, likesCount: d.likesCount }));
    } catch (err) {
      setLab(prev);
      requireLogin(err);
    }
  };

  const onShare = async (channel) => {
    try {
      const d = await labApi.shareLab(id, channel);
      setLab((l) => ({ ...l, sharesCount: d.sharesCount }));
    } catch { /* ignore */ }
  };

  const categories = useMemo(
    () => ['all', ...new Set(tests.map((t) => t.category).filter(Boolean))],
    [tests]
  );
  const filteredTests = useMemo(() => {
    const s = testQ.trim().toLowerCase();
    return tests.filter((t) =>
      (category === 'all' || t.category === category) &&
      (!s || t.name.toLowerCase().includes(s) || t.code?.toLowerCase().includes(s))
    );
  }, [tests, testQ, category]);

  if (loading) return <p className="mx-auto max-w-6xl px-4 py-10 text-gray-500">Loading lab…</p>;
  if (notFound || !lab) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-gray-600">This lab could not be found.</p>
        <Link to="/labs" className="mt-3 inline-block font-semibold text-lab-700 hover:underline">Back to labs</Link>
      </div>
    );
  }

  const addressLine = [lab.address?.street, lab.address?.city, lab.address?.state, lab.address?.country].filter(Boolean).join(', ');
  const mapsUrl = lab.coordinates?.lat != null
    ? `https://www.google.com/maps/search/?api=1&query=${lab.coordinates.lat},${lab.coordinates.lng}`
    : addressLine ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}` : null;
  const shareUrl = `${window.location.origin}/labs/${lab._id}`;
  const hasMemorial = lab.memorial && (lab.memorial.capacity > 0 || lab.memorial.services?.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/labs" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-lab-700">
        <ArrowLeft size={16} /> All labs
      </Link>

      {/* Header */}
      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-lab-50 text-lab-700">
              {lab.logo?.url ? <img src={lab.logo.url} alt="" className="h-full w-full object-cover" /> : <FlaskConical size={36} />}
            </span>
            <div>
              <h1 className="text-3xl font-bold text-navy-900">{lab.name}</h1>
              <RatingLine average={lab.ratingAverage} count={lab.ratingCount} />
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {lab.is24Hours && <span className="rounded-full bg-green-50 px-2.5 py-1 font-medium text-green-700">Open 24 hours</span>}
                {lab.offersDelivery && <span className="rounded-full bg-lab-50 px-2.5 py-1 font-medium text-lab-700">Sample pickup / delivery</span>}
                {lab.licenseNumber && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700"><BadgeCheck size={12} /> Licensed</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLike}
              className={`btn-outline inline-flex items-center gap-2 ${lab.liked ? 'border-red-300 text-red-600' : ''}`}
            >
              <Heart size={16} className={lab.liked ? 'fill-red-500 text-red-500' : ''} />
              {lab.liked ? 'Liked' : 'Like'}
            </button>
            <ShareMenu url={shareUrl} title={lab.name} onShare={onShare} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-4">
          {[
            { icon: Eye, v: lab.viewsCount, l: 'Views' },
            { icon: Heart, v: lab.likesCount, l: 'Likes' },
            { icon: Share2, v: lab.sharesCount, l: 'Shares' },
            { icon: MessageSquare, v: lab.ratingCount, l: 'Reviews' },
          ].map(({ icon: Icon, v, l }) => (
            <div key={l} className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gray-50 text-gray-500"><Icon size={18} /></span>
              <div>
                <p className="text-lg font-semibold text-navy-900">{(v || 0).toLocaleString()}</p>
                <p className="text-xs text-gray-500">{l}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {lab.about && (
            <Section title="About">
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{lab.about}</p>
            </Section>
          )}

          <Section title={`Tests offered (${tests.length})`} icon={FlaskConical}>
            {tests.length === 0 ? (
              <p className="text-sm text-gray-500">This lab has not listed any tests yet.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-3">
                  <div className="relative min-w-[200px] flex-1">
                    <Search size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                    <input value={testQ} onChange={(e) => setTestQ(e.target.value)} placeholder="Search tests by name or code" className={`${inputCls} pl-10`} />
                  </div>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} max-w-[12rem] capitalize`}>
                    {categories.map((c) => <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>)}
                  </select>
                </div>

                {filteredTests.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-500">No tests match your search.</p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="py-2 pr-3">Test</th>
                          <th className="py-2 pr-3">Category</th>
                          <th className="py-2 pr-3">Sample</th>
                          <th className="py-2 pr-3">Turnaround</th>
                          <th className="py-2 pr-3">Reference range</th>
                          <th className="py-2 text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredTests.map((t) => (
                          <tr key={t._id}>
                            <td className="py-3 pr-3">
                              <p className="font-medium text-navy-900">{t.name}</p>
                              {t.code && <p className="text-xs text-gray-500">{t.code}</p>}
                            </td>
                            <td className="py-3 pr-3 capitalize text-gray-600">{t.category || '-'}</td>
                            <td className="py-3 pr-3 capitalize text-gray-600">{t.sampleType || '-'}</td>
                            <td className="py-3 pr-3 text-gray-600">
                              {t.turnaroundHours ? (t.turnaroundHours >= 24 && t.turnaroundHours % 24 === 0 ? `${t.turnaroundHours / 24} day(s)` : `${t.turnaroundHours} hrs`) : '-'}
                            </td>
                            <td className="py-3 pr-3 text-gray-600">{t.referenceRange || '-'}</td>
                            <td className="py-3 text-right font-semibold text-navy-900">{naira(t.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </Section>

          <ReviewsSection labId={lab._id} onSummary={(s) => setLab((l) => ({ ...l, ...s }))} requireLogin={requireLogin} />
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <Section title="Contact & location" icon={MapPin}>
            <dl className="space-y-3">
              <Field label="Address">{addressLine}</Field>
              <Field label="Phone">{lab.phone && <a href={`tel:${lab.phone}`} className="inline-flex items-center gap-1.5 text-lab-700 hover:underline"><Phone size={14} />{lab.phone}</a>}</Field>
              <Field label="Email">{lab.email && <a href={`mailto:${lab.email}`} className="inline-flex items-center gap-1.5 text-lab-700 hover:underline"><Mail size={14} />{lab.email}</a>}</Field>
            </dl>
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn-outline mt-4 inline-flex items-center gap-2">
                <MapPin size={16} /> Open in Maps
              </a>
            )}
          </Section>

          <Section title="Opening hours" icon={Clock}>
            <p className="text-sm text-gray-800">{lab.is24Hours ? 'Open 24 hours, every day' : lab.openingHours || 'Not provided'}</p>
            {lab.offersDelivery && (
              <p className="mt-3 flex items-center gap-2 text-sm text-gray-700"><Truck size={16} className="text-lab-700" /> Offers sample pickup / delivery</p>
            )}
          </Section>

          <Section title="Payment" icon={Wallet}>
            <dl className="space-y-3">
              <Field label="Payment mode">{PAY_MODE[lab.paymentSettings?.mode] || PAY_MODE.arrival}</Field>
              {lab.paymentSettings?.appointmentFee > 0 && <Field label="Appointment fee">{naira(lab.paymentSettings.appointmentFee)}</Field>}
              {lab.paymentSettings?.depositAmount > 0 && <Field label="Deposit">{naira(lab.paymentSettings.depositAmount)}</Field>}
            </dl>
          </Section>

          <Section title="Registration" icon={ShieldCheck}>
            <dl className="space-y-3">
              <Field label="Registration number">{lab.registrationNumber}</Field>
              <Field label="License number">{lab.licenseNumber}</Field>
              <Field label="Member since">{new Date(lab.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</Field>
            </dl>
            {!lab.registrationNumber && !lab.licenseNumber && <p className="text-sm text-gray-500">No registration details provided.</p>}
          </Section>

          {lab.departments?.length > 0 && (
            <Section title="Departments" icon={Building2}>
              <div className="flex flex-wrap gap-2">
                {lab.departments.map((d) => (
                  <span key={d} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{d}</span>
                ))}
              </div>
            </Section>
          )}

          {hasMemorial && (
            <Section title="Memorial services">
              <dl className="space-y-3">
                <Field label="Capacity">{lab.memorial.capacity}</Field>
                <Field label="Storage rate / day">{lab.memorial.storageRatePerDay > 0 && naira(lab.memorial.storageRatePerDay)}</Field>
                <Field label="Bookings">{lab.memorial.bookingsOpen ? 'Open' : 'Closed'}</Field>
                <Field label="Cancellation policy">{lab.memorial.cancellationPolicy}</Field>
              </dl>
            </Section>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function ReviewsSection({ labId, onSummary, requireLogin }) {
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const load = useCallback((p = 1, replace = true) => {
    setLoading(true);
    labApi.listReviews(labId, { page: p, limit: 5 })
      .then((d) => {
        setReviews((prev) => (replace ? d.reviews : [...prev, ...d.reviews]));
        setPage(d.page);
        setPages(d.pages);
      })
      .finally(() => setLoading(false));
  }, [labId]);

  useEffect(() => { load(1); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return setError('Please choose a star rating.');
    setError('');
    setSaving(true);
    try {
      const d = await labApi.saveReview(labId, { rating, title, comment });
      onSummary({ ratingAverage: d.ratingAverage, ratingCount: d.ratingCount });
      setDone(true);
      setTitle(''); setComment(''); setRating(0);
      load(1);
    } catch (err) {
      if (!requireLogin(err)) setError(err.response?.data?.message || 'Could not save your review.');
    } finally {
      setSaving(false);
    }
  };

  const removeMine = async () => {
    try {
      const d = await labApi.deleteMyReview(labId);
      onSummary({ ratingAverage: d.ratingAverage, ratingCount: d.ratingCount });
      setDone(false);
      load(1);
    } catch (err) { requireLogin(err); }
  };

  return (
    <Section title="Reviews" icon={MessageSquare}>
      <form onSubmit={submit} className="rounded-xl bg-gray-50 p-4">
        <p className="text-sm font-medium text-navy-900">Rate this lab</p>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
              <Stars value={n <= rating ? 5 : 0} size={24} />
            </button>
          ))}
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Title (optional)" className={`${inputCls} mt-3`} />
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} rows={3} placeholder="Share your experience" className={`${inputCls} mt-3`} />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {done && <p className="mt-2 text-sm text-green-600">Thanks, your review has been saved. Submitting again will update it.</p>}
        <div className="mt-3 flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Submit review'}</button>
          <button type="button" onClick={removeMine} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-red-600">
            <Trash2 size={14} /> Delete my review
          </button>
        </div>
      </form>

      <div className="mt-6 space-y-5">
        {!loading && reviews.length === 0 && <p className="text-sm text-gray-500">No reviews yet. Be the first to review this lab.</p>}
        {reviews.map((r) => (
          <article key={r._id} className="border-b border-gray-100 pb-5 last:border-0">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-lab-50 text-sm font-semibold text-lab-700">
                {r.reviewer?.avatar?.url || r.reviewer?.profilePicture
                  ? <img src={r.reviewer.avatar?.url || r.reviewer.profilePicture} alt="" className="h-full w-full object-cover" />
                  : (r.reviewer?.fullName || '?')[0]}
              </span>
              <div>
                <p className="text-sm font-medium text-navy-900">{r.reviewer?.fullName || 'Anonymous'}</p>
                <p className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
              {r.isVerifiedVisit && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                  <BadgeCheck size={12} /> Verified visit
                </span>
              )}
            </div>
            <div className="mt-2"><Stars value={r.rating} /></div>
            {r.title && <p className="mt-1 font-semibold text-navy-900">{r.title}</p>}
            {r.comment && <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{r.comment}</p>}
            {r.reply?.text && (
              <div className="mt-3 rounded-lg bg-lab-50 p-3 text-sm">
                <p className="font-medium text-lab-700">Response from the lab</p>
                <p className="mt-1 text-gray-700">{r.reply.text}</p>
              </div>
            )}
          </article>
        ))}
        {page < pages && (
          <button type="button" onClick={() => load(page + 1, false)} disabled={loading} className="btn-outline">
            {loading ? 'Loading…' : 'Load more reviews'}
          </button>
        )}
      </div>
    </Section>
  );
}