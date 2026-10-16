import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  UserPlus, Send, ClipboardList, HeartPulse, Stethoscope, CheckCircle2, XCircle,
  BedDouble, ArrowLeftRight, LogOut, Receipt, Wallet,
} from 'lucide-react';
import { useApi, Badge, Tabs, Spinner, Empty, ErrorNote, btn, inputCls } from './hospitalShared.jsx';

// Icon and colour for each kind of event (colours come from colors.js)
const KINDS = {
  registration:  { icon: UserPlus,       tint: 'bg-primary-50 text-primary-700' },
  request:       { icon: Send,           tint: 'bg-info-light text-info-dark' },
  queue:         { icon: ClipboardList,  tint: 'bg-gray-100 text-gray-700' },
  vitals:        { icon: HeartPulse,     tint: 'bg-danger-light text-danger-dark' },
  consult_start: { icon: Stethoscope,    tint: 'bg-primary-50 text-primary-700' },
  consult_done:  { icon: CheckCircle2,   tint: 'bg-success-light text-success-dark' },
  cancelled:     { icon: XCircle,        tint: 'bg-gray-100 text-gray-700' },
  admitted:      { icon: BedDouble,      tint: 'bg-lab-50 text-lab-700' },
  moved:         { icon: ArrowLeftRight, tint: 'bg-lab-50 text-lab-700' },
  discharged:    { icon: LogOut,         tint: 'bg-success-light text-success-dark' },
  bill:          { icon: Receipt,        tint: 'bg-warning-light text-warning-dark' },
  payment:       { icon: Wallet,         tint: 'bg-success-light text-success-dark' },
};

const dayHeading = (at) => new Date(at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const timeOf = (at) => new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

function EventCard({ event, onOpenHospital }) {
  const { icon: Icon, tint } = KINDS[event.kind] || KINDS.queue;
  return (
    <li className="card flex gap-4 p-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tint}`}><Icon className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-navy-900">{event.title}</p>
          <Badge tone={event.by === 'you' ? 'primary' : 'neutral'}>{event.by === 'you' ? 'You' : 'Hospital'}</Badge>
        </div>
        <p className="text-sm text-gray-600">
          <button onClick={() => onOpenHospital(event.hospital._id)} className="font-medium text-primary-700 hover:underline">{event.hospital.name}</button>
          {' · '}{timeOf(event.at)}
        </p>
        {event.details.length > 0 && (
          <dl className="mt-3 space-y-1.5 rounded-lg bg-gray-50 p-3">
            {event.details.map((d) => (
              <div key={d.label} className="grid gap-x-3 sm:grid-cols-[9rem_1fr]">
                <dt className="text-xs text-gray-500">{d.label}</dt>
                <dd className="whitespace-pre-line text-sm text-navy-800">{d.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </li>
  );
}

// Patient: everything between me and my hospitals, newest first, updating live
export default function MyCareHistoryPage({ onNavigate }) {
  const [searchParams] = useSearchParams();
  const [hospital, setHospital] = useState(searchParams.get('hospital') || ''); // set when coming from My hospitals
  const [group, setGroup] = useState('all');
  const [page, setPage] = useState(1);

  const { data, loading, error } = useApi('/hospital/my-activity', {
    params: { hospital: hospital || undefined, group, page },
    live: ['hospital:visit', 'hospital:admission', 'hospital:invoice', 'hospital:patient'],
  });

  const change = (setter) => (value) => { setter(value); setPage(1); };
  const openHospital = (id) => onNavigate('hospital-profile', { id });

  if (error) return <ErrorNote message={error} />;
  if (!data) return <Spinner />;

  const { events, counts, hospitals, pages } = data;

  // Group the events under their day
  const days = [];
  events.forEach((event) => {
    const heading = dayHeading(event.at);
    const last = days[days.length - 1];
    if (last?.heading === heading) last.items.push(event);
    else days.push({ heading, items: [event] });
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={group}
          onChange={change(setGroup)}
          tabs={[
            { key: 'all', label: 'Everything', count: counts.all },
            { key: 'visit', label: 'Visits', count: counts.visit || 0 },
            { key: 'admission', label: 'Hospital stays', count: counts.admission || 0 },
            { key: 'bill', label: 'Bills', count: counts.bill || 0 },
            { key: 'account', label: 'Registration', count: counts.account || 0 },
          ]}
        />
        {hospitals.length > 1 && (
          <select className={`${inputCls} ml-auto max-w-xs`} value={hospital} onChange={(e) => change(setHospital)(e.target.value)} aria-label="Filter by hospital">
            <option value="">All my hospitals</option>
            {hospitals.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
          </select>
        )}
      </div>

      {loading && <Spinner />}
      {!loading && events.length === 0 && (
        <div className="space-y-4">
          <Empty title="Nothing here yet" hint="When you register at a hospital, request a visit, get treated or are billed, it all shows up here in order." />
          <button className={btn.primary} onClick={() => onNavigate('find-hospital')}>Find a hospital</button>
        </div>
      )}

      {days.map((d) => (
        <section key={d.heading} aria-label={d.heading}>
          <h2 className="mb-2 text-sm font-semibold text-gray-600">{d.heading}</h2>
          <ul className="space-y-3">
            {d.items.map((event) => <EventCard key={event.id} event={event} onOpenHospital={openHospital} />)}
          </ul>
        </section>
      ))}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button className={btn.ghost} disabled={page <= 1} onClick={() => setPage(page - 1)}>Newer</button>
          <span className="text-sm text-gray-600">Page {page} of {pages}</span>
          <button className={btn.ghost} disabled={page >= pages} onClick={() => setPage(page + 1)}>Older</button>
        </div>
      )}
    </div>
  );
}