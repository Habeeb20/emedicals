import { Stethoscope, FlaskConical, Pill, Hospital } from 'lucide-react';
import Logo from './Logo.jsx';

const features = [
  { icon: Stethoscope, title: 'Doctors, one tap away', text: 'Book and chat with verified doctors.' },
  { icon: FlaskConical, title: 'Lab results online', text: 'Order tests and get results in your account.' },
  { icon: Pill, title: 'Pharmacy ready', text: 'Send prescriptions straight to a pharmacy.' },
  { icon: Hospital, title: 'One account for everything', text: 'Hospitals, labs, pharmacies and more.' },
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Brand panel (desktop only) */}
      <aside className="relative hidden w-[46%] max-w-[620px] shrink-0 overflow-hidden bg-gradient-to-br from-primary-600 via-primary-800 to-navy-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-40 right-10 h-40 w-40 rounded-full border border-white/10" />

        <Logo light className="relative" />

        <div className="relative">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Your health, your records, your care. All in one place.
          </h2>
          <ul className="mt-10 space-y-5">
            {features.map(({ icon: Icon, title: t, text }) => (
              <li key={t} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="text-sm text-primary-100">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-primary-200">&copy; {new Date().getFullYear()} eMedicals</p>
      </aside>

      {/* Form side */}
      <main className="flex flex-1 items-center justify-center bg-gray-50 px-4 py-10 sm:px-8 lg:bg-white">
        <div className="w-full max-w-md animate-fade-up">
          <Logo className="mb-8 lg:hidden" />
          <h1 className="text-3xl font-bold tracking-tight text-navy-900">{title}</h1>
          {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-center text-sm text-gray-600">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
