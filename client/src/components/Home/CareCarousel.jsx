import { useEffect, useRef, useState } from 'react';
import { Hospital, Stethoscope, FlaskConical, Pill, ArrowRight } from 'lucide-react';
import { images } from './images';

const cards = [
  { name: 'Hospitals', desc: 'Find trusted hospitals and clinics near you.', icon: Hospital, image: images.hospital, tint: 'bg-primary-600' },
  { name: 'Doctors', desc: 'Book consultations with verified specialists.', icon: Stethoscope, image: images.doctor, tint: 'bg-primary-600' },
  { name: 'Laboratory', desc: 'Order tests and get results on your phone.', icon: FlaskConical, image: images.lab, tint: 'bg-lab-600' },
  { name: 'Pharmacy', desc: 'Fill prescriptions and order medicines.', icon: Pill, image: images.pharmacy, tint: 'bg-pharmacy-600' },
];

const INTERVAL = 2000;

export default function CareCarousel() {
  const track = useRef(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const step = () => {
    const el = track.current;
    const card = el?.firstElementChild;
    return card ? card.offsetWidth + parseFloat(getComputedStyle(el).columnGap || 0) : 0;
  };

  const goTo = (i) => track.current?.scrollTo({ left: i * step(), behavior: 'smooth' });

  // Auto-advance every 2 seconds, looping back to the first card
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (paused || reduce) return;
    const id = setInterval(() => {
      const el = track.current;
      if (!el) return;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 4;
      atEnd ? el.scrollTo({ left: 0, behavior: 'smooth' }) : el.scrollBy({ left: step(), behavior: 'smooth' });
    }, INTERVAL);
    return () => clearInterval(id);
  }, [paused]);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 4;
    setActive(atEnd ? cards.length - 1 : Math.round(el.scrollLeft / step()));
  };

  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
          Care that comes to you
        </h2>
        <p className="mt-4 max-w-xl text-lg text-gray-600">
          A look at the services our patients use most.
        </p>

        <div
          className="mt-10"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div
            ref={track}
            onScroll={onScroll}
            style={{ scrollbarWidth: 'none' }}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2 [&::-webkit-scrollbar]:hidden"
          >
            {cards.map(({ name, desc, icon: Icon, image, tint }) => (
              <a
                key={name}
                href={`/${name.toLowerCase()}`}
                className="group relative aspect-[3/4] w-[82%] shrink-0 snap-start overflow-hidden rounded-3xl bg-navy-800 shadow-lg sm:w-[46%] lg:w-[31%]"
              >
                <img
                  src={image}
                  alt={`${name} service`}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/40 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-6">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl text-white ${tint}`}>
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-4 text-2xl font-bold text-white">{name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-navy-200">{desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-white">
                    Explore
                    <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                  </span>
                </div>
              </a>
            ))}
          </div>

          {/* Dots */}
          <div className="mt-6 flex justify-center gap-2">
            {cards.map((c, i) => (
              <button
                key={c.name}
                onClick={() => goTo(i)}
                aria-label={`Go to ${c.name}`}
                aria-current={active === i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  active === i ? 'w-8 bg-primary-600' : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}