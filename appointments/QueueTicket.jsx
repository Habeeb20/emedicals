import { cx } from './ui';
import { ordinal } from './format';

const COPY = {
  pending: 'Waiting for the doctor to accept',
  awaiting_payment: 'Pay to keep your place',
  confirmed: "You're booked in",
  in_progress: 'Your consultation is in progress',
};

/**
 * The queue ticket. The one memorable element: the patient's place in line,
 * with the people ahead drawn as dots. `notch` must match the surface behind it.
 */
export default function QueueTicket({ position, total, status = 'confirmed', notch = 'bg-white', className }) {
  if (!position) return null;
  const ahead = Math.max(0, position - 1);
  const shown = Math.min(ahead, 8);

  return (
    <div role="status" aria-live="polite" className={cx('relative flex overflow-hidden rounded-2xl bg-navy-900 text-white', className)}>
      <div className="min-w-0 flex-1 p-4 sm:p-5">
        <p className="text-sm text-navy-300">{COPY[status] || 'Your place in the queue'}</p>
        <p className="mt-1.5 flex items-baseline gap-2">
          <span className="text-5xl font-semibold leading-none tabular-nums text-primary-300 sm:text-6xl">{ordinal(position)}</span>
          <span className="text-lg text-navy-200">in line</span>
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-1.5" aria-hidden="true">
          {Array.from({ length: shown }).map((_, i) => <span key={i} className="h-2.5 w-2.5 rounded-full bg-navy-600" />)}
          {ahead > shown && <span className="text-xs text-navy-300">+{ahead - shown}</span>}
          <span className="h-3.5 w-3.5 rounded-full bg-primary-300 ring-4 ring-primary-300/25" />
        </div>
      </div>

      <div className="relative flex w-24 shrink-0 flex-col items-center justify-center border-l-2 border-dashed border-navy-600 px-3 text-center sm:w-28">
        <span className={cx('absolute -left-2 -top-2 h-4 w-4 rounded-full', notch)} />
        <span className={cx('absolute -bottom-2 -left-2 h-4 w-4 rounded-full', notch)} />
        <span className="text-3xl font-semibold tabular-nums">{ahead}</span>
        <span className="mt-0.5 text-xs leading-tight text-navy-300">{ahead === 1 ? 'person ahead' : 'people ahead'}</span>
        {total ? <span className="mt-2 text-xs text-navy-400">{total} waiting</span> : null}
      </div>
    </div>
  );
}
