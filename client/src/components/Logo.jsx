import { Link } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';

export default function Logo({ light = false, className = '' }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 text-xl font-bold ${light ? 'text-white' : 'text-navy-900'} ${className}`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${light ? 'bg-white/15 text-white' : 'bg-primary-600 text-white'}`}>
        <HeartPulse className="h-5 w-5" />
      </span>
      eMedicals
    </Link>
  );
}
