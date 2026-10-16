// import { useState } from 'react';
// import { Link } from 'react-router-dom';
// import { Menu, X } from 'lucide-react';
// import Logo from '@/components/Logo.jsx';
// import { useAuth } from '@/context/AuthContext.jsx';

// const links = [
//   { label: 'Drugs', href: '/shop' },
//   { label: 'Why eMedicals', href: '#why' },
//   { label: 'How it works', href: '#how' },
// ];

// const Navbar = () => {
//   const { user } = useAuth();
//   const [open, setOpen] = useState(false);

//   const AuthButtons = ({ className = '' }) =>
//     user ? (
//       <Link to="/dashboard" className={`btn-primary ${className}`}>
//         Go to dashboard
//       </Link>
//     ) : (
//       <>
//         <Link to="/login" className={`btn-outline ${className}`}>Log in</Link>
//         <Link to="/signup" className={`btn-primary ${className}`}>Sign up</Link>
//       </>
//     );

//   return (
//     <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/85 backdrop-blur">
//       <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
//         <Logo />

//         {/* Desktop links */}
//         <ul className="hidden items-center gap-8 md:flex">
//           {links.map((l) => (
//             <li key={l.href}>
//               <a href={l.href} className="text-sm font-medium text-gray-600 hover:text-primary-700">
//                 {l.label}
//               </a>
//             </li>
//           ))}
//         </ul>

//         {/* Desktop auth */}
//         <div className="hidden items-center gap-2 md:flex">
//           <AuthButtons />
//         </div>

//         {/* Mobile toggle */}
//         <button
//           onClick={() => setOpen(!open)}
//           aria-label="Toggle menu"
//           aria-expanded={open}
//           className="grid h-10 w-10 place-items-center rounded-lg text-navy-800 hover:bg-gray-100 md:hidden"
//         >
//           {open ? <X size={22} /> : <Menu size={22} />}
//         </button>
//       </nav>

//       {/* Mobile menu */}
//       {open && (
//         <div className="border-t border-gray-200 bg-white px-4 pb-5 pt-2 md:hidden">
//           {links.map((l) => (
//             <a
//               key={l.href}
//               href={l.href}
//               onClick={() => setOpen(false)}
//               className="block py-3 text-base font-medium text-navy-800"
//             >
//               {l.label}
//             </a>
//           ))}
//           <div className="mt-3 flex gap-3" onClick={() => setOpen(false)}>
//             <AuthButtons className="flex-1 text-center" />
//           </div>
//         </div>
//       )}
//     </header>
//   );
// };

// export default Navbar;








import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '@/components/Logo.jsx';
import { useAuth } from '@/context/AuthContext.jsx';

const links = [
  { label: 'Drugs', href: '/shop' },
  { label: 'Memorials', href: '/memorial' },
  { label: 'Hospitals', href: '/hospitals' },
  { label: 'Doctors', href: '/doctors' },
];

const AuthButtons = ({ user, className = '' }) =>
  user ? (
    <Link to="/dashboard" className={`btn-primary ${className}`}>
      Go to dashboard
    </Link>
  ) : (
    <>
      <Link to="/login" className={`btn-outline ${className}`}>Log in</Link>
      <Link to="/signup" className={`btn-primary ${className}`}>Sign up</Link>
    </>
  );

const Navbar = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Hide the whole navbar on /dashboard and any nested dashboard route
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        {/* Desktop links */}
        <ul className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-sm font-medium text-gray-600 hover:text-primary-700">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop auth */}
        <div className="hidden items-center gap-2 md:flex">
          <AuthButtons user={user} />
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="grid h-10 w-10 place-items-center rounded-lg text-navy-800 hover:bg-gray-100 md:hidden"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-gray-200 bg-white px-4 pb-5 pt-2 md:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-3 text-base font-medium text-navy-800"
            >
              {l.label}
            </a>
          ))}
          <div className="mt-3 flex gap-3" onClick={() => setOpen(false)}>
            <AuthButtons user={user} className="flex-1 text-center" />
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;