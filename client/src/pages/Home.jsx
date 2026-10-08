import { Link } from 'react-router-dom';
import { Hospital, Stethoscope, FlaskConical, Pill, Flower2, Cross } from 'lucide-react';
import Logo from '@/components/Logo.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import Navbar from '../components/Navbar';
import Hero from '../components/Home/Hero';
import Showcase from '../components/Home/Showcase';
import Modules from '../components/Home/Modules';
import HowItWorks from '../components/Home/HowItWorks';
import CTA from '../components/Home/CTA';
import CareCarousel from '../components/Home/CareCarousel';

// Classes are written out in full so Tailwind can see them. Every colour comes from src/theme/colors.js.
const modules = [
  { name: 'Hospitals', desc: 'Find hospitals and clinics near you.', icon: Hospital, tint: 'bg-primary-50 text-primary-700' },
  { name: 'Doctors', desc: 'Book consultations with verified doctors.', icon: Stethoscope, tint: 'bg-primary-50 text-primary-700' },
  { name: 'Laboratory', desc: 'Order tests and receive results online.', icon: FlaskConical, tint: 'bg-lab-50 text-lab-700' },
  { name: 'Pharmacy', desc: 'Fill prescriptions and order medicines.', icon: Pill, tint: 'bg-pharmacy-50 text-pharmacy-700' },
  { name: 'Mortuary', desc: 'Dignified, well-documented care services.', icon: Cross, tint: 'bg-memorial-100 text-memorial-700' },
  { name: 'Cemetery', desc: 'Plot reservation and burial records.', icon: Flower2, tint: 'bg-memorial-100 text-memorial-700' },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <Navbar/>
      <Hero />
      <Showcase/>
      <CareCarousel />
      <Modules />
      <HowItWorks/>
      <CTA/>
      
      
 

      <main className="mx-auto max-w-6xl px-4 py-16">
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-navy-900 sm:text-5xl">
            Every part of healthcare, <span className="text-primary-600">one account</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Hospitals, doctors, labs, pharmacies and more, all with a single login.
          </p>
          {!user && (
            <Link to="/signup" className="btn-primary mt-8 px-6 py-3 text-base">Get started</Link>
          )}
        </section>

        <section className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ name, desc, icon: Icon, tint }) => (
            <div key={name} className="card p-6 transition hover:shadow-md">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tint}`}>
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-navy-900">{name}</h3>
              <p className="mt-1 text-sm text-gray-600">{desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
