import { Hospital, Stethoscope, FlaskConical, Pill, Cross, Flower2, ArrowRight } from 'lucide-react';

const modules = [
  { name: 'Hospitals', desc: 'Find hospitals and clinics near you.', icon: Hospital, tint: 'bg-primary-50 text-primary-700' },
  { name: 'Doctors', desc: 'Book consultations with verified doctors.', icon: Stethoscope, tint: 'bg-primary-50 text-primary-700' },
  { name: 'Laboratory', desc: 'Order tests and receive results online.', icon: FlaskConical, tint: 'bg-lab-50 text-lab-700' },
  { name: 'Pharmacy', desc: 'Fill prescriptions and order medicines.', icon: Pill, tint: 'bg-pharmacy-50 text-pharmacy-700' },
  { name: 'Mortuary', desc: 'Dignified, well-documented care services.', icon: Cross, tint: 'bg-memorial-100 text-memorial-700' },
  { name: 'Cemetery', desc: 'Plot reservation and burial records.', icon: Flower2, tint: 'bg-memorial-100 text-memorial-700' },
];

export default function Modules() {
  return (
    <section id="services" className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
            Six services, one account
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            From a routine check-up to final arrangements, everything is linked to your profile.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ name, desc, icon: Icon, tint }) => (
            <a
              key={name}
              href={`/${name.toLowerCase()}`}
              className="group rounded-2xl border border-gray-200 bg-gray-50 p-6 transition hover:border-primary-300 hover:bg-white hover:shadow-lg"
            >
              <span className={`grid h-12 w-12 place-items-center rounded-xl ${tint}`}>
                <Icon size={24} />
              </span>
              <h3 className="mt-5 text-xl font-semibold text-navy-900">{name}</h3>
              <p className="mt-2 text-gray-600">{desc}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary-700">
                Open {name}
                <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}