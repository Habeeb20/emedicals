import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { memorialApi, errMsg } from '../memorialApi';
import { EmptyState, Spinner, Stars, btnGhost, btnPrimary, fmtDate, inputCls, toast } from '../ui';

export default function ReviewsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState(null);
  const [text, setText] = useState('');

  const load = useCallback(async () => {
    try { setItems((await memorialApi.orgReviews()).items); } catch (e) { toast(errMsg(e), 'error'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const send = async (id) => {
    try { await memorialApi.replyReview(id, text); setReplying(null); setText(''); toast('Reply posted'); load(); } catch (e) { toast(errMsg(e), 'error'); }
  };

  if (loading) return <Spinner className="mx-auto my-12" />;
  if (!items.length) return <EmptyState title="No reviews yet" hint="After a family completes a booking they can review you. A thoughtful reply builds trust." />;
  return (
    <ul className="space-y-4">
      {items.map((r) => (
        <li key={r._id} className="rounded-3xl border border-memorial-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-3"><Stars value={r.rating} size={15} /><span className="text-sm font-medium text-navy-900">{r.reviewer?.fullName}</span>{r.isVerifiedVisit && <span className="inline-flex items-center gap-1 rounded-full bg-success-light px-2 py-0.5 text-xs text-success-dark"><BadgeCheck size={12} /> Used your facility</span>}<span className="ml-auto text-xs text-memorial-500">{fmtDate(r.createdAt)}</span></div>
          {r.title && <p className="mt-2 font-medium text-navy-900">{r.title}</p>}
          {r.comment && <p className="mt-1 text-sm text-memorial-700">{r.comment}</p>}
          {r.reply?.text ? <p className="mt-3 rounded-xl bg-memorial-50 px-4 py-3 text-sm text-memorial-700"><b className="text-navy-900">Your reply:</b> {r.reply.text}</p> : replying === r._id ? (
            <div className="mt-3 space-y-2"><textarea rows={3} maxLength={800} className={inputCls} value={text} onChange={(e) => setText(e.target.value)} placeholder="Thank them, or address their concern with care." /><div className="flex gap-2"><button className={btnPrimary} onClick={() => send(r._id)}>Post reply</button><button className={btnGhost} onClick={() => setReplying(null)}>Cancel</button></div></div>
          ) : <button className={`${btnGhost} mt-3 !py-2`} onClick={() => { setReplying(r._id); setText(''); }}>Reply</button>}
        </li>
      ))}
    </ul>
  );
}
