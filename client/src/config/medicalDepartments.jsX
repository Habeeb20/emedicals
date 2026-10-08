import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Stethoscope, Smile, Eye, Activity, Baby, HeartHandshake, Brain,
  Bone, Ear, Sparkles, Dumbbell, Scan, Search, ArrowUpRight,
} from 'lucide-react';

// Names should match the strings stored in Organization.departments
export const DEPARTMENTS = [
  { name: 'General Medicine', desc: 'Check-ups, fevers and everyday health concerns.', icon: Stethoscope, tint: 'bg-primary-50 text-primary-700' },
  { name: 'Dentistry', desc: 'Cleaning, fillings, braces and dental surgery.', icon: Smile, tint: 'bg-info-light text-info-dark' },
  { name: 'Optician', desc: 'Eye tests, glasses and contact lenses.', icon: Eye, tint: 'bg-lab-50 text-lab-700' },
  { name: 'Cardiology', desc: 'Heart health, blood pressure and ECG.', icon: Activity, tint: 'bg-danger-light text-danger-dark' },
  { name: 'Paediatrics', desc: 'Care for babies, children and teenagers.', icon: Baby, tint: 'bg-warning-light text-warning-dark' },
  { name: 'Maternity', desc: 'Antenatal care, delivery and postnatal support.', icon: HeartHandshake, tint: 'bg-pharmacy-50 text-pharmacy-700' },
  { name: 'Mental Health', desc: 'Counselling, therapy and psychiatric care.', icon: Brain, tint: 'bg-lab-50 text-lab-700' },
  { name: 'Orthopaedics', desc: 'Bones, joints, fractures and sports injuries.', icon: Bone, tint: 'bg-memorial-100 text-memorial-700' },
  { name: 'ENT', desc: 'Ear, nose and throat conditions.', icon: Ear, tint: 'bg-info-light text-info-dark' },
  { name: 'Dermatology', desc: 'Skin, hair and nail treatment.', icon: Sparkles, tint: 'bg-warning-light text-warning-dark' },
  { name: 'Physiotherapy', desc: 'Rehabilitation, mobility and pain relief.', icon: Dumbbell, tint: 'bg-pharmacy-50 text-pharmacy-700' },
  { name: 'Radiology', desc: 'X-ray, ultrasound, CT and MRI scans.', icon: Scan, tint: 'bg-primary-50 text-primary-700' },
];

/**
 * Props
 *  - departments: array of { name, desc, icon, tint, count? }  (defaults to DEPARTMENTS)
 *  - basePath:    where a card links to; the department is added as ?department=Name
 *  - initialCount: how many cards show before "View all"
 */
export default function Departments({ departments = DEPARTMENTS, basePath = '/doctors', initialCount = 8 }) {
  const [q, setQ] = useState('');
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(
    () => departments.filter((d) => d.name.toLowerCase().includes(q.trim().toLowerCase())),
    [departments, q]
  );
  const visible = showAll || q ? filtered : filtered.slice(0, initialCount);

  return (
    <section id="departments" className="bg-gray-50 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
              Find the right specialist
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              From dental care to eye tests, pick a department and see who can help.
            </p>
          </div>

          <label className="relative block w-full md:w-80">
            <span className="sr-only">Search departments</span>
            <Search size={18} className="absolute left-4 top-3.5 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search departments"
              className="w-full rounded-full border border-gray-300 bg-white py-3 pl-11 pr-4 text-navy-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            />
          </label>
        </div>

        {visible.length === 0 ? (
          <p className="mt-12 text-gray-500">No department matches “{q}”.</p>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {visible.map(({ name, desc, icon: Icon, tint, count }) => (
              <Link
                key={name}
                to={`${basePath}?department=${encodeURIComponent(name)}`}
                className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-4 transition hover:-translate-y-1 hover:border-primary-300 hover:shadow-lg sm:p-6"
              >
                <ArrowUpRight
                  size={18}
                  className="absolute right-4 top-4 text-gray-300 transition group-hover:text-primary-600 sm:right-5 sm:top-5"
                />
                <span className={`grid h-12 w-12 place-items-center rounded-xl sm:h-14 sm:w-14 ${tint}`}>
                  <Icon size={26} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-navy-900 sm:text-lg">{name}</h3>
                <p className="mt-1 hidden text-sm leading-relaxed text-gray-600 sm:block">{desc}</p>
                {count != null && (
                  <p className="mt-3 text-xs font-medium text-primary-700">{count} specialists</p>
                )}
              </Link>
            ))}
          </div>
        )}

        {!q && filtered.length > initialCount && (
          <div className="mt-10 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-navy-800 hover:border-primary-400 hover:text-primary-700"
            >
              {showAll ? 'Show fewer' : `View all ${filtered.length} departments`}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}