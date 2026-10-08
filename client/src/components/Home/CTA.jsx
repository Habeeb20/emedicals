import { images } from './images';

export default function CTA() {
  return (
    <section className="bg-white px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-navy-900">
        <img src={images.hospital} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="relative px-6 py-16 text-center sm:px-12 sm:py-20">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Take care of your health from your phone
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-navy-300">
            Join eMedicals and keep every appointment, result and prescription in one place.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href="/signup" className="rounded-full bg-primary-500 px-8 py-3.5 font-semibold text-white hover:bg-primary-400">
              Create free account
            </a>
            <a href="/login" className="rounded-full border border-navy-500 px-8 py-3.5 font-semibold text-white hover:bg-white/10">
              Log in
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}