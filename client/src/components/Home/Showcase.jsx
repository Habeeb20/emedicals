import { Check } from 'lucide-react';
import { images } from './images';

const rows = [
  {
    title: 'See a doctor without the waiting room',
    text: 'Pick a verified doctor, choose a slot and walk in prepared. Your history is already there.',
    points: ['Profiles with specialty and experience', 'Instant booking confirmation', 'Reminders before every visit'],
    image: images.doctor,
    alt: 'Female doctor in a white coat holding a clipboard',
    accent: 'text-primary-700 bg-primary-50',
  },
  {
    title: 'Tests and medicines, tracked end to end',
    text: 'Order a lab test, get results in the app, then send the prescription straight to a pharmacy.',
    points: ['Lab results delivered securely online', 'Prescriptions filled in one tap', 'Every record saved to your profile'],
    image: images.lab,
    alt: 'Laboratory technician examining samples',
    accent: 'text-lab-700 bg-lab-50',
  },
];

export default function Showcase() {
  return (
    <section id="why" className="bg-gray-50 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl space-y-20 px-4 sm:space-y-28 sm:px-6 lg:px-8">
        {rows.map((r, i) => (
          <div key={r.title} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <img
              src={r.image}
              alt={r.alt}
              className={`aspect-[4/3] w-full rounded-3xl bg-primary-100 object-cover shadow-xl ${i % 2 ? 'lg:order-2' : ''}`}
            />
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">{r.title}</h2>
              <p className="mt-4 text-lg leading-relaxed text-gray-600">{r.text}</p>
              <ul className="mt-6 space-y-3">
                {r.points.map((p) => (
                  <li key={p} className="flex items-center gap-3 text-navy-800">
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${r.accent}`}>
                      <Check size={14} strokeWidth={3} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}