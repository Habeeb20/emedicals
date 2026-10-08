import { UserPlus, Search, FileHeart } from 'lucide-react';

const steps = [
  { icon: UserPlus, title: 'Create your account', text: 'Sign up in a minute and set up your health profile.' },
  { icon: Search, title: 'Choose a service', text: 'Book a doctor, order a test or request a prescription.' },
  { icon: FileHeart, title: 'Get results and records', text: 'Everything is stored in your account for next time.' },
];

export default function HowItWorks() {
  return (
    <section id="how" className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">
          Get started in three steps
        </h2>
        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative rounded-2xl bg-primary-50 p-7">
              <span className="absolute right-6 top-5 text-5xl font-extrabold text-primary-200">{i + 1}</span>
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-600 text-white">
                <Icon size={24} />
              </span>
              <h3 className="mt-5 text-xl font-semibold text-navy-900">{title}</h3>
              <p className="mt-2 text-gray-600">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}