import { MapPin } from 'lucide-react';
import { useApi, Badge, StatusBadge, Spinner, Empty, ErrorNote, btn, money, fmtDate } from './hospitalShared.jsx';
import { placeOf } from './HospitalDirectoryPage.jsx';

// Patient: every hospital I am registered at, and what is happening there right now (updates live)
export default function MyHospitalsPage({ onNavigate }) {
  const { data: hospitals, loading, error } = useApi('/hospital/my-hospitals', {
    live: ['hospital:visit', 'hospital:admission', 'hospital:invoice', 'hospital:patient'],
  });

  if (loading) return <Spinner />;
  if (error) return <ErrorNote message={error} />;

  if (!hospitals.length) {
    return (
      <div className="space-y-4">
        <Empty title="You are not registered at any hospital yet" hint="Find a hospital, open its page and press Register." />
        <button className={btn.primary} onClick={() => onNavigate('find-hospital')}>Find a hospital</button>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {hospitals.map((item) => {
        const { hospital, openVisit, admission } = item;
        return (
          <li key={item.recordId} className="card flex flex-col p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-navy-900">{hospital.name}</p>
                <p className="flex items-center gap-1 text-sm text-gray-600"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{placeOf(hospital.address)}</span></p>
              </div>
              <Badge tone="primary">{item.mrn}</Badge>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              {admission && <p className="rounded-lg bg-primary-50 px-3 py-2 text-primary-700">Admitted: {admission.ward?.name}, bed {admission.bed?.label}</p>}
              {openVisit && (
                <p className="flex items-center gap-2">
                  <StatusBadge value={openVisit.status} /> <span className="text-gray-600">{openVisit.visitNumber} · {openVisit.complaint}</span>
                </p>
              )}
              {!admission && !openVisit && <p className="text-gray-500">No visit in progress. Registered {fmtDate(item.registeredAt)}.</p>}
              {item.amountDue > 0 && <p className="font-medium text-danger-dark">Unpaid bills: {money(item.amountDue)}</p>}
            </div>

            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              <button className={`${btn.primary} ${btn.small}`} onClick={() => onNavigate('hospital-profile', { id: hospital._id })}>Open hospital</button>
              <button className={`${btn.ghost} ${btn.small}`} onClick={() => onNavigate('medical-records')}>My records</button>
              <button className={`${btn.ghost} ${btn.small}`} onClick={() => onNavigate('my-bills')}>My bills</button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}