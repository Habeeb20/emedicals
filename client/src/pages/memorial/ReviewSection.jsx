import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { memorialApi, errMsg } from './memorialApi';
import { Stars, StarInput, Field, inputCls, btnPrimary, btnGhost, fmtDate, Spinner, toast } from './ui';

export default function ReviewSection({ org, breakdown = [], canReview = true, onChanged }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [items, setItems] = useState([]);
  const [mine, setMine] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('recent');
  const [form, setForm] = useState({ rating: 0, title: '', comment: '' });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const r = await memorialApi.reviews(org._id, { page: p, sort });
        setItems((cur) => (p === 1 ? r.items : [...cur, ...r.items]));
        setPage(p);
        setPages(r.pages);
        setMine(r.mine);
      } finally {
        setLoading(false);
      }
    },
    [org._id, sort]
  );
  useEffect(() => { load(1); }, [load]);

  const startWriting = () => {
    if (!user) return navigate(`/login?redirect=${encodeURIComponent(loc.pathname)}`);
    setForm(mine ? { rating: mine.rating, title: mine.title || '', comment: mine.comment || '' } : { rating: 0, title: '', comment: '' });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.rating) return toast('Choose a star rating first', 'error');
    setSaving(true);
    try {
      const r = await memorialApi.saveReview(org._id, form);
      toast(r.pointsAwarded ? `Thank you. +${r.pointsAwarded} loyalty points` : 'Review saved');
      setOpen(false);
      await load(1);
      onChanged?.();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!mine || !window.confirm('Delete your review?')) return;
    try {
      await memorialApi.deleteReview(mine._id);
      setMine(null);
      await load(1);
      onChanged?.();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  };

  const total = breakdown.reduce((a, b) => a + b.count, 0);

  return (
    <section id="reviews">
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <div>
          <p className="font-serif text-5xl text-navy-900">{org.ratingCount ? org.ratingAverage : '–'}</p>
          <Stars value={org.ratingAverage} size={18} />
          <p className="mt-1 text-sm text-memorial-500">{org.ratingCount || 0} review{org.ratingCount === 1 ? '' : 's'}</p>
          <div className="mt-4 space-y-1.5">
            {breakdown.map((b) => (
              <div key={b.rating} className="flex items-center gap-2 text-xs text-memorial-600">
                <span className="w-3">{b.rating}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-memorial-100">
                  <div className="h-full rounded-full bg-warning" style={{ width: total ? `${(b.count / total) * 100}%` : 0 }} />
                </div>
                <span className="w-5 text-right">{b.count}</span>
              </div>
            ))}
          </div>
          {canReview && <button onClick={startWriting} className={`${btnPrimary} mt-5 w-full`}>{mine ? 'Edit your review' : 'Write a review'}</button>}
        </div>

        <div>
          {open && (
            <form onSubmit={submit} className="mb-6 space-y-4 rounded-2xl border border-memorial-200 bg-memorial-50 p-5">
              <Field label="Your rating"><StarInput value={form.rating} onChange={(rating) => setForm({ ...form, rating })} /></Field>
              <Field label="Headline (optional)"><input className={inputCls} maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Caring staff, clear communication" /></Field>
              <Field label="Your experience" hint="Your words help other families choose with confidence.">
                <textarea className={inputCls} rows={4} maxLength={2000} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
              </Field>
              <div className="flex gap-2">
                <button className={btnPrimary} disabled={saving}>{saving ? 'Saving' : 'Save review'}</button>
                <button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button>
              </div>
            </form>
          )}

          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-serif text-xl text-navy-900">What families say</h3>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-xl border border-memorial-200 bg-white px-3 py-1.5 text-sm" aria-label="Sort reviews">
              <option value="recent">Most recent</option>
              <option value="high">Highest rated</option>
              <option value="low">Lowest rated</option>
            </select>
          </div>

          {loading && !items.length ? <Spinner /> : items.length === 0 ? (
            <p className="rounded-2xl bg-memorial-50 p-6 text-sm text-memorial-500">No reviews yet. Families who have used this facility can be the first to share their experience.</p>
          ) : (
            <ul className="divide-y divide-memorial-100">
              {items.map((r) => (
                <li key={r._id} className="py-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-memorial-200 text-sm font-medium text-memorial-700">{r.reviewer?.fullName?.[0] || '?'}</span>
                    <div>
                      <p className="text-sm font-medium text-navy-900">{r.reviewer?.fullName || 'A family member'}</p>
                      <p className="text-xs text-memorial-500">{fmtDate(r.createdAt)}</p>
                    </div>
                    {r.isVerifiedVisit && <span className="inline-flex items-center gap-1 rounded-full bg-success-light px-2 py-0.5 text-xs text-success-dark"><BadgeCheck size={12} /> Used this facility</span>}
                    {mine?._id === r._id && <button onClick={remove} className="ml-auto text-memorial-400 hover:text-danger" aria-label="Delete your review"><Trash2 size={16} /></button>}
                  </div>
                  <div className="mt-2"><Stars value={r.rating} size={14} /></div>
                  {r.title && <p className="mt-2 font-medium text-navy-900">{r.title}</p>}
                  {r.comment && <p className="mt-1 text-sm leading-relaxed text-memorial-700">{r.comment}</p>}
                  {r.reply?.text && (
                    <div className="mt-3 rounded-xl border-l-2 border-memorial-300 bg-memorial-50 px-4 py-3 text-sm">
                      <p className="font-medium text-navy-900">Reply from {org.name}</p>
                      <p className="mt-1 text-memorial-700">{r.reply.text}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {page < pages && <button onClick={() => load(page + 1)} className={`${btnGhost} mt-2`}>Show more reviews</button>}
        </div>
      </div>
    </section>
  );
}
