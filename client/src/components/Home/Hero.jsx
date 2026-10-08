import { Search, CalendarCheck, ShieldCheck } from 'lucide-react';
import { images } from './images';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary-50">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-primary-700 ring-1 ring-primary-200">
            <ShieldCheck size={16} /> Verified doctors and licensed facilities
          </p>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-navy-900 sm:text-5xl lg:text-6xl">
            Every part of your healthcare, in one app.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-gray-600">
            Find a hospital, see a doctor, run lab tests and fill prescriptions without
            leaving eMedicals. Your records follow you everywhere.
          </p>

          <form
            onSubmit={(e) => e.preventDefault()}
            className="mt-8 flex max-w-xl flex-col gap-3 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-gray-200 sm:flex-row"
          >
            <label className="flex flex-1 items-center gap-3 px-3">
              <Search size={20} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search doctors, hospitals or tests"
                className="w-full bg-transparent py-3 text-base text-navy-900 placeholder-gray-400 outline-none"
              />
            </label>
            <button className="rounded-xl bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700">
              Search
            </button>
          </form>

          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
            {[['500+', 'Partner facilities'], ['2,000+', 'Verified doctors'], ['24/7', 'Online access']].map(([v, l]) => (
              <div key={l}>
                <dt className="text-2xl font-bold text-navy-900">{v}</dt>
                <dd className="text-sm text-gray-600">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
          <img
            src={images.hero}
            alt="Doctor with a stethoscope smiling at the camera"
            className="aspect-[4/5] w-full rounded-[2rem] bg-primary-100 object-cover shadow-2xl sm:aspect-[5/5]"
          />
          <div className="absolute -left-2 bottom-8 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-gray-100 sm:-left-8">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-50 text-primary-700">
              <CalendarCheck size={22} />
            </span>
            <div>
              <p className="text-sm font-semibold text-navy-900">Consultation booked</p>
              <p className="text-xs text-gray-500">Tomorrow, 10:30 AM</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}