import { Avatar, Badge, Button, Icon, Card } from './ui';
import { formatKm, formatMinutes, naira, PAYMENT_MODES } from './format';

export default function ProviderCard({ provider: p, onBook }) {
  const isDoctor = p.kind === 'doctor';
  const km = p.travel?.distanceKm ?? p.distanceKm;
  const mins = p.travel?.durationMin;
  const approx = p.travel?.estimated ? '~' : '';

  return (
    <Card className="flex flex-col gap-4 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <Avatar name={p.name} src={(isDoctor ? p.avatar : p.logo)?.url} rounded={isDoctor ? 'rounded-full' : 'rounded-xl'} size="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-navy-900">{p.name}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-600">
            <Icon name={isDoctor ? 'doctor' : 'hospital'} className="h-4 w-4 text-primary-600" />
            <span className="truncate">{isDoctor ? p.department : p.type === 'clinic' ? 'Clinic' : 'Hospital'}</span>
          </p>
          {isDoctor && p.hospitals?.length > 0 && (
            <p className="mt-0.5 truncate text-sm text-gray-500">{p.hospitals.map((h) => h.name).join(', ')}</p>
          )}
        </div>
        {isDoctor && p.isAvailableOnline && <Badge tone="success">Online</Badge>}
      </div>

      {!isDoctor && p.departments?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {p.departments.slice(0, 4).map((d) => <Badge key={d} tone="primary">{d}</Badge>)}
          {p.departments.length > 4 && <Badge>+{p.departments.length - 4} more</Badge>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-700">
        {km != null ? (
          <span className="inline-flex items-center gap-1.5"><Icon name="pin" className="h-4 w-4 text-gray-500" />{approx}{formatKm(km)} away</span>
        ) : (
          <span className="text-gray-500">Distance unavailable</span>
        )}
        {mins != null && <span className="inline-flex items-center gap-1.5"><Icon name="car" className="h-4 w-4 text-gray-500" />{approx}{formatMinutes(mins)} drive</span>}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <div>
          <p className="text-lg font-semibold text-navy-900">{p.fee ? naira(p.fee) : 'Free'}</p>
          <p className="text-xs text-gray-500">{PAYMENT_MODES[p.paymentMode]?.label}</p>
        </div>
        <Button onClick={() => onBook(p)} icon="calendar">Book</Button>
      </div>
    </Card>
  );
}
