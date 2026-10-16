import { Link } from 'react-router-dom';
import {
  Phone, Mail, MapPin, Clock, ShieldCheck, HeartPulse,
  ArrowUpRight,
} from 'lucide-react';

const PHONE_DISPLAY = '0705 000 6666';
const PHONE_LINK = 'tel:+2347050006666';

const COLUMNS = [
  {
    title: 'Care',
    links: [
      { label: 'Find a hospital', to: '/hospitals' },
      { label: 'Find a doctor', to: '/doctors' },
      { label: 'Book an appointment', to: '/doctors' },
      { label: 'Quick chat with a doctor', to: '/login' },
    ],
  },
  {
    title: 'Services',
    links: [
      { label: 'Laboratory tests', to: '/labs' },
      { label: 'Online pharmacy', to: '/pharmacy' },
      { label: 'Health shop', to: '/shop' },
      { label: 'Memorial services', to: '/memorial' },
    ],
  },
  {
    title: 'Company',
    links: [
    //   { label: 'About eMedicals', to: '/about' },
    //   { label: 'Contact us', to: '/contact' },
      { label: 'Register your hospital or lab', to: '/signup' },
    //   { label: 'Help centre', to: '/help' },
    ],
  },
];

// const SOCIALS = [
//   { label: 'Facebook', icon: Facebook, href: 'https://facebook.com/' },
//   { label: 'X (Twitter)', icon: Twitter, href: 'https://x.com/' },
//   { label: 'Instagram', icon: Instagram, href: 'https://instagram.com/' },
//   { label: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com/' },
// ];

export default function Footer() {
  return (
    <footer className="bg-navy-900 text-gray-300 mt-20">
      {/* ---------- Call-to-action band ---------- */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="-translate-y-1/2 overflow-hidden rounded-3xl bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 px-6 py-8 shadow-xl sm:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Need help right now?</h2>
              <p className="mt-2 text-primary-50">
                Talk to our support team about appointments, lab results, pharmacy orders or anything else.
              </p>
            </div>
            <a
              href={PHONE_LINK}
              className="group inline-flex shrink-0 items-center gap-3 rounded-2xl bg-white px-5 py-3 text-navy-900 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-700">
                <Phone size={22} />
              </span>
              <span className="text-left">
                <span className="block text-xs font-medium text-gray-500">Call us</span>
                <span className="block text-xl font-bold tracking-wide">{PHONE_DISPLAY}</span>
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* ---------- Main grid ---------- */}
      <div className="mx-auto -mt-8 max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-white">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-600">
                <HeartPulse size={22} />
              </span>
              <span className="text-xl font-bold tracking-tight">eMedicals</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-400">
              Hospitals, doctors, laboratories and pharmacies on one platform, so you can book, pay, track and get your results without queueing.
            </p>

            <ul className="mt-6 space-y-3 text-sm">
              <li>
                <a href={PHONE_LINK} className="flex items-center gap-3 hover:text-white">
                  <Phone size={16} className="shrink-0 text-primary-400" />{PHONE_DISPLAY}
                </a>
              </li>
              <li>
                <a href="mailto:support@emedicals.com" className="flex items-center gap-3 break-all hover:text-white">
                  <Mail size={16} className="shrink-0 text-primary-400" />support@emedicals.com
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={16} className="mt-0.5 shrink-0 text-primary-400" />Lagos, Nigeria
              </li>
              <li className="flex items-center gap-3">
                <Clock size={16} className="shrink-0 text-primary-400" />Support: Monday to Saturday, 8am to 8pm
              </li>
            </ul>

            {/* <div className="mt-6 flex gap-2">
              {SOCIALS.map(({ label, icon: Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="grid h-10 w-10 place-items-center rounded-full bg-navy-800 text-gray-300 transition hover:bg-primary-600 hover:text-white"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div> */}
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">{col.title}</h3>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="group inline-flex items-center gap-1 transition hover:text-white">
                      {l.label}
                      <ArrowUpRight size={14} className="opacity-0 transition group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* emergency notice */}
        <div className="mt-12 flex items-start gap-3 rounded-2xl border border-navy-800 bg-navy-800/50 p-4 text-sm">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-primary-400" />
          <p className="text-gray-400">
            <span className="font-semibold text-white">In an emergency,</span> go to the nearest hospital or call your local emergency number. eMedicals is not a substitute for emergency care.
          </p>
        </div>
      </div>

      {/* ---------- Bottom bar ---------- */}
      {/* <div className="border-t border-navy-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-gray-500 sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} eMedicals. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-white">Privacy policy</Link>
            <Link to="/terms" className="hover:text-white">Terms of use</Link>
          </div>
        </div>
      </div> */}
    </footer>
  );
}