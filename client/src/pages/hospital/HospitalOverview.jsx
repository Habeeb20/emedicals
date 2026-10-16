import { useApi, Spinner, ErrorNote, money } from './hospitalShared.jsx';

function Tile({ label, value, hint }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-navy-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

// Every number here refreshes by itself when a visit, bed, admission or payment changes
export default function HospitalOverviewPage() {
  const { data, loading, error } = useApi('/hospital/stats', {
    live: ['hospital:visit', 'hospital:admission', 'hospital:bed', 'hospital:invoice', 'hospital:patient'],
  });

  if (loading) return <Spinner />;
  if (error) return <ErrorNote message={error} />;

  const { beds, last7Days } = data;
  const occupancy = beds.total ? Math.round((beds.occupied / beds.total) * 100) : 0;
  const busiest = Math.max(1, ...last7Days.map((d) => d.visits));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Visits today" value={data.visitsToday} />
        <Tile label="Waiting now" value={data.waiting} hint={`${data.inConsultation} in consultation`} />
        <Tile label="Admitted now" value={data.admitted} />
        <Tile label="Registered patients" value={data.patients} />
        <Tile label="Collected today" value={money(data.revenueToday)} />
        <Tile label="Unpaid balances" value={money(data.outstanding)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-navy-900">Bed occupancy</h2>
          <p className="mt-2 text-sm text-gray-600">{beds.occupied} of {beds.total} beds in use ({occupancy}%)</p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-100" role="img" aria-label={`${occupancy} percent of beds in use`}>
            <div className={`h-full rounded-full ${occupancy >= 90 ? 'bg-danger' : occupancy >= 70 ? 'bg-warning' : 'bg-primary-500'}`} style={{ width: `${occupancy}%` }} />
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold text-navy-900">Visits, last 7 days</h2>
          <div className="mt-4 flex h-32 items-end gap-2">
            {last7Days.map((day) => (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs text-gray-600">{day.visits}</span>
                <div className="w-full rounded-t bg-primary-400" style={{ height: `${Math.max(4, (day.visits / busiest) * 100)}%` }} />
                <span className="text-xs text-gray-500">{new Date(`${day.date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' })}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}