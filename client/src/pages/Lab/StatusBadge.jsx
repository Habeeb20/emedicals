const STATUS = {
  ordered: ['Ordered', 'bg-gray-100 text-gray-700'],
  sample_collected: ['Sample collected', 'bg-info-light text-info-dark'],
  processing: ['Processing', 'bg-warning-light text-warning-dark'],
  completed: ['Completed', 'bg-success-light text-success-dark'],
  cancelled: ['Cancelled', 'bg-danger-light text-danger-dark'],
};
const FLAG = {
  normal: 'bg-success-light text-success-dark',
  low: 'bg-warning-light text-warning-dark',
  high: 'bg-warning-light text-warning-dark',
  critical: 'bg-danger-light text-danger-dark',
};
const PAY = {
  unpaid: 'bg-gray-100 text-gray-700',
  paid: 'bg-success-light text-success-dark',
  refunded: 'bg-info-light text-info-dark',
};
const pill = 'inline-block rounded-full px-2.5 py-1 text-xs font-semibold capitalize';

export const StatusLabels = Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v[0]]));

export default function StatusBadge({ status }) {
  const [label, cls] = STATUS[status] || [status, STATUS.ordered[1]];
  return <span className={`${pill} ${cls}`}>{label}</span>;
}
export const FlagBadge = ({ flag }) => (flag ? <span className={`${pill} ${FLAG[flag]}`}>{flag}</span> : null);
export const PaymentBadge = ({ status }) => <span className={`${pill} ${PAY[status]}`}>{status}</span>;