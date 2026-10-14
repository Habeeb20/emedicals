import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { MapPin, Phone, Clock, ShieldCheck, Users, Check, ChevronLeft, Mail, Truck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { memorialApi, errMsg } from './memorialApi';
import EngagementBar from './EngagementBar';
import PlotMap from './PlotMap';
import ReviewSection from './ReviewSection';
import BookingWizard from './BookingWizard';
import { ArchLogo, EmptyState, KIND, Spinner, Stars, ToastHost, btnDark, btnGhost, btnPrimary, naira, placeLine, toast } from './ui';

export default function MemorialProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [data, setData] = useState(null);
  const [plots, setPlots] = useState({ plots: [], sections: [] });
  const [plot, setPlot] = useState(null);
  const [error, setError] = useState('');
  const [wizard, setWizard] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await memorialApi.getOrg(id);
      setData(r);
      if (r.org.type === 'cemetery') setPlots(await memorialApi.getPlots(id));
    } catch (e) {
      setError(errMsg(e, 'This listing could not be found.'));
    }
  }, [id]);

  useEffect(() => { setData(null); setPlot(null); load(); memorialApi.view(id).catch(() => {}); }, [id, load]);

  if (error) return <div className="mx-auto max-w-lg px-4 py-20"><EmptyState title="Listing not found" hint={error} action={<Link to="/memorial" className={btnPrimary}>Back to search</Link>} /></div>;
  if (!data) return <div className="grid min-h-[60vh] place-items-center"><Spinner className="!h-8 !w-8" /></div>;

  const { org, stats, ratingBreakdown, liked } = data;
  const K = KIND[org.type];
  const isCemetery = org.type === 'cemetery';
  const isStaff = user && ['mortuary_officer', 'cemetery_officer', 'super_admin'].includes(user.role);
  const closed = org.memorial?.bookingsOpen === false;
  const full = !isCemetery && stats.occupancy?.capacity && stats.occupancy.available === 0;
  const fromPrice = isCemetery ? stats.plots?.fromPrice : org.memorial?.storageRatePerDay;

  const startBooking = () => {
    if (!user) return navigate(`/login?redirect=${encodeURIComponent(loc.pathname)}`);
    if (isCemetery && !plot) {
      document.getElementById('plots')?.scrollIntoView({ behavior: 'smooth' });
      return toast('Choose a plot on the map first');
    }
    setWizard(true);
  };

  const occ = stats.occupancy;
  const cta = closed ? 'Bookings paused' : full ? 'No space right now' : isCemetery ? (plot ? `Reserve plot ${plot.plotNumber}` : 'Choose a plot') : 'Book a space';

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0">
      <ToastHost />
      <header className="bg-memorial-900 text-white">
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6">
          <Link to="/memorial" className="inline-flex items-center gap-1 text-sm text-memorial-300 hover:text-white"><ChevronLeft size={16} /> All facilities</Link>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end">
            <ArchLogo org={org} size={104} />
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs"><K.Icon size={13} /> {K.label}</span>
              <h1 className="mt-2 font-serif text-3xl sm:text-4xl">{org.name}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-memorial-300">
                <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> {[org.address?.street, placeLine(org.address)].filter(Boolean).join(', ') || 'Address not listed'}</span>
                <span className="inline-flex items-center gap-2"><Stars value={org.ratingAverage} size={14} /> {org.ratingCount ? `${org.ratingAverage} from ${org.ratingCount}` : 'New on eMedicals'}</span>
              </p>
            </div>
          </div>
          <div className="mt-6"><EngagementBar key={org._id} org={org} initialLiked={liked} onDark /></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_340px]">
        <main className="min-w-0 space-y-6">
          <Card title="About">
            <p className="leading-relaxed text-memorial-700">{org.about || 'This facility has not added a description yet.'}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {org.licenseNumber && <Pill Icon={ShieldCheck}>Licensed, no. {org.licenseNumber}</Pill>}
              {org.registrationNumber && <Pill Icon={ShieldCheck}>Registered, no. {org.registrationNumber}</Pill>}
              {stats.familiesServed > 0 && <Pill Icon={Users}>{stats.familiesServed} families served</Pill>}
              {org.offersDelivery && <Pill Icon={Truck}>Collection available</Pill>}
              {(org.memorial?.amenities || []).map((a) => <Pill key={a} Icon={Check}>{a}</Pill>)}
            </div>
          </Card>

          {(org.memorial?.services?.length > 0 || (!isCemetery && org.memorial?.storageRatePerDay > 0)) && (
            <Card title="Services and prices">
              <ul className="divide-y divide-memorial-100">
                {!isCemetery && org.memorial?.storageRatePerDay > 0 && <Row name="Storage" desc="Per day, includes cold-room care" price={`${naira(org.memorial.storageRatePerDay)} / day`} />}
                {(org.memorial?.services || []).map((s) => <Row key={s._id} name={s.name} desc={s.description} price={naira(s.price)} />)}
              </ul>
            </Card>
          )}

          {isCemetery && (
            <Card title="Choose a plot" id="plots" hint={`${stats.plots?.available || 0} of ${stats.plots?.total || 0} plots are open`}>
              {plots.plots.length === 0 ? <p className="text-sm text-memorial-500">This cemetery has not listed its plots online yet. Call to enquire.</p> : (
                <PlotMap plots={plots.plots} sections={plots.sections} selectedId={plot?._id} onSelect={setPlot} />
              )}
            </Card>
          )}

          {!isCemetery && occ?.capacity > 0 && (
            <Card title="Space available today">
              <div className="flex items-end justify-between">
                <p className="font-serif text-3xl text-navy-900">{occ.available}<span className="font-sans text-base text-memorial-500"> of {occ.capacity} free</span></p>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-memorial-100"><div className="h-full rounded-full bg-primary-600" style={{ width: `${Math.min((occ.used / occ.capacity) * 100, 100)}%` }} /></div>
            </Card>
          )}

          <Card title="Reviews"><ReviewSection org={org} breakdown={ratingBreakdown} canReview={!isStaff} onChanged={load} /></Card>
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            <BookingCard {...{ org, fromPrice, isCemetery, plot, cta, startBooking, disabled: closed || full || isStaff }} />
            <ContactCard org={org} />
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-memorial-200 bg-white p-3 lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-memorial-500">{isCemetery ? (plot ? `Plot ${plot.plotNumber}` : 'Plots from') : 'Storage from'}</p>
            <p className="font-serif text-lg text-navy-900">{naira(plot ? plot.price : fromPrice) || 'Ask'}</p>
          </div>
          <button onClick={startBooking} disabled={closed || full || isStaff} className={btnPrimary}>{cta}</button>
        </div>
      </div>

      <BookingWizard key={plot?._id || 'm'} org={org} plot={plot} open={wizard} onClose={() => { setWizard(false); load(); setPlot(null); }} />
    </div>
  );
}

const Card = ({ title, hint, children, id }) => (
  <section id={id} className="scroll-mt-6 rounded-3xl border border-memorial-200 bg-white p-6">
    <div className="mb-4 flex items-baseline justify-between gap-3"><h2 className="font-serif text-2xl text-navy-900">{title}</h2>{hint && <span className="text-sm text-memorial-500">{hint}</span>}</div>
    {children}
  </section>
);
const Pill = ({ Icon, children }) => <span className="inline-flex items-center gap-1.5 rounded-full bg-memorial-100 px-3 py-1.5 text-xs text-memorial-700"><Icon size={13} /> {children}</span>;
const Row = ({ name, desc, price }) => (
  <li className="flex items-start justify-between gap-4 py-3.5">
    <div><p className="font-medium text-navy-900">{name}</p>{desc && <p className="text-sm text-memorial-500">{desc}</p>}</div>
    <p className="shrink-0 font-medium text-navy-900">{price}</p>
  </li>
);

function BookingCard({ fromPrice, isCemetery, plot, cta, startBooking, disabled, org }) {
  return (
    <div className="rounded-3xl border border-memorial-200 bg-white p-6">
      <p className="text-sm text-memorial-500">{isCemetery ? (plot ? `Plot ${plot.plotNumber}${plot.section ? `, ${plot.section}` : ''}` : 'Plots from') : 'Storage from'}</p>
      <p className="mt-1 font-serif text-4xl text-navy-900">{naira(plot ? plot.price : fromPrice) || 'On request'}{!isCemetery && fromPrice ? <span className="font-sans text-sm text-memorial-500"> / day</span> : null}</p>
      <button onClick={startBooking} disabled={disabled} className={`${btnPrimary} mt-5 w-full !py-3.5`}>{cta}</button>
      <p className="mt-3 text-center text-xs text-memorial-500">No payment now. The facility confirms first.</p>
      {org.memorial?.cancellationPolicy && <p className="mt-4 border-t border-memorial-100 pt-4 text-xs text-memorial-600">{org.memorial.cancellationPolicy}</p>}
    </div>
  );
}

function ContactCard({ org }) {
  return (
    <div className="space-y-3 rounded-3xl border border-memorial-200 bg-white p-6 text-sm text-memorial-700">
      <p className="flex items-center gap-3"><Clock size={16} className="text-memorial-400" /> {org.is24Hours ? 'Open 24 hours' : org.openingHours || 'Hours not listed'}</p>
      {org.phone && <a href={`tel:${org.phone}`} className="flex items-center gap-3 hover:text-primary-700"><Phone size={16} className="text-memorial-400" /> {org.phone}</a>}
      {org.email && <a href={`mailto:${org.email}`} className="flex items-center gap-3 hover:text-primary-700"><Mail size={16} className="text-memorial-400" /> {org.email}</a>}
      {org.coordinates?.lat != null && (
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${org.coordinates.lat},${org.coordinates.lng}`} target="_blank" rel="noreferrer" className={`${btnGhost} w-full`}>Get directions</a>
      )}
    </div>
  );
}
