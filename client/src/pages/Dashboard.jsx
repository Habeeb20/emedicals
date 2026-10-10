





// import { useEffect, useState } from 'react';
// import { Navigate, useSearchParams } from 'react-router-dom';
// import { toast } from 'sonner';
// import {
//   LayoutDashboard, CalendarDays, Users, Pill, FlaskConical, FileText, Package,
//   Stethoscope, ClipboardList, Landmark, MessageCircle, UserRound, LogOut, Menu, X, ChevronDown,
// } from 'lucide-react';
// import Logo from '@/components/Logo.jsx';
// import api, { getErrorMessage } from '@/lib/api.js';
// import { useAuth } from '@/context/AuthContext.jsx';

// // Each tab lives in its own file. Import it here, then add it to COMPONENTS below.
// import OverviewTab from './dashboard/OverviewTab.jsx';
// import ProfileTab from './dashboard/ProfileTab.jsx';
// import {
//   ProviderSearchPage, MyAppointmentsPage, ProviderAppointmentsPage, PaymentSettingsPage,
//   QuickChatPage, ChatPage, PrescriptionsPage, PharmacyLookupPage, NotificationBell,
// } from './appointments';
// import MyLabOrders from './Lab/MylabOrders.jsx';

// import LabOrderQueue from './Lab/LabOrderqueue.jsx';
// import LabCatalogManager from './Lab/LabcatalogManager.jsx';
// import LabOrderDetail from './Lab/LabOrderdetail.jsx';

// import LabBooking from './Lab/LabBooking.jsx';
// import LabDirectory from './Lab/LabDirectory.jsx';
// import ProfileSettings from './dashboard/ProfileSettings.jsx';

// /* ------------------------------------------------------------------ */
// /* Config                                                              */
// /* ------------------------------------------------------------------ */

// // key:      the value in the URL: /dashboard?tab=<key>
// // roles:    who can see it. null = every logged-in user.
// // module:   colour family (lab = violet, pharmacy = emerald, memorial = stone)
// // children: optional. Turns the item into a dropdown. Each child has its own key + roles
// //           and is what actually gets rendered; the parent only expands/collapses.
// //           A parent whose children are all hidden for a role falls back to a normal item.
// const NAV_ITEMS = [
//   { key: 'overview',         label: 'Overview',         icon: LayoutDashboard, module: 'primary',  roles: null },
//   {
//     key: 'appointments', label: 'Appointments', icon: CalendarDays, module: 'primary',
//     roles: ['patient', 'doctor', 'nurse', 'hospital_admin'],
//     children: [
//       { key: 'find-care',            label: 'Find care',          roles: ['patient'] },
//       { key: 'my-appointments',      label: 'My appointments',    roles: ['patient'] },
//       { key: 'manage-appointments',  label: 'Appointment queue',  roles: ['doctor', 'hospital_admin'] },
//       { key: 'quick-chat',           label: 'Quick chat',         roles: ['patient', 'doctor', 'hospital_admin'] },
//       { key: 'appointment-settings', label: 'Fees and settings',  roles: ['doctor', 'hospital_admin'] },
//     ],
//   },
//   { key: 'patients',         label: 'Patients',         icon: Users,           module: 'primary',  roles: ['doctor', 'nurse', 'hospital_admin'] },
//   { key: 'prescriptions',    label: 'Prescriptions',    icon: Pill,            module: 'pharmacy', roles: ['patient', 'doctor', 'pharmacist'] },
//   {
//   key: 'lab-orders', label: 'Lab', icon: FlaskConical, module: 'lab',
//   roles: ['patient', 'doctor', 'lab_tech'],
//   children: [
//     { key: 'find-labs',       label: 'Find a lab',        roles: ['patient'] },
//     { key: 'my-lab-orders',   label: 'My lab orders',     roles: ['patient'] },
//     { key: 'lab-requests',    label: 'Order a test',      roles: ['doctor'] },
//     { key: 'lab-results',     label: 'Patient results',   roles: ['doctor'] },
//     { key: 'lab-queue',       label: 'Order queue',       roles: ['lab_tech'] },
//     { key: 'lab-test-catalog',label: 'Test catalogue',    roles: ['lab_tech'] },
//   ],
// },
//   // { key: 'lab-orders',       label: 'Lab orders',       icon: FlaskConical,    module: 'lab',      roles: ['patient', 'doctor', 'lab_tech'] },

//   { key: 'medical-records',  label: 'Medical records',  icon: FileText,        module: 'primary',  roles: ['patient'] },
//   { key: 'inventory',        label: 'Inventory',        icon: Package,         module: 'pharmacy', roles: ['pharmacist'] },
//   { key: 'staff',            label: 'Staff',            icon: Stethoscope,     module: 'primary',  roles: ['hospital_admin'] },
//   { key: 'mortuary-records', label: 'Mortuary records', icon: ClipboardList,   module: 'memorial', roles: ['mortuary_officer'] },
//   { key: 'burial-plots',     label: 'Burial plots',     icon: Landmark,        module: 'memorial', roles: ['cemetery_officer'] },
//   { key: 'messages',         label: 'Messages',         icon: MessageCircle,   module: 'info',     roles: null },
//   { key: 'profile',          label: 'Profile',          icon: UserRound,       module: 'primary',  roles: null },
//   { key: 'profileSettings',          label: 'Profile Settings',          icon: UserRound,       module: 'primary',  roles: null },
// ];

// const ROLE_LABELS = {
//   patient: 'Patient',
//   doctor: 'Doctor',
//   nurse: 'Nurse',
//   lab_tech: 'Lab technician',
//   pharmacist: 'Pharmacist',
//   hospital_admin: 'Hospital admin',
//   mortuary_officer: 'Mortuary officer',
//   cemetery_officer: 'Cemetery officer',
//   super_admin: 'Super admin',
// };

// /*
//  * Tailwind only keeps classes it finds as complete strings in source files,
//  * so every class is spelled out instead of built like `bg-${x}-600`.
//  */

// // Light tints for icon tiles (passed to tabs as item.tint)
// const TINTS = {
//   primary:  'bg-primary-50 text-primary-700',
//   lab:      'bg-lab-50 text-lab-700',
//   pharmacy: 'bg-pharmacy-50 text-pharmacy-700',
//   memorial: 'bg-memorial-100 text-memorial-700',
//   info:     'bg-info-light text-info-dark',
// };

// // Icon colours on the dark navy sidebar
// const SIDEBAR_ICONS = {
//   primary:  'text-primary-400',
//   lab:      'text-lab-400',
//   pharmacy: 'text-pharmacy-400',
//   memorial: 'text-memorial-300',
//   info:     'text-info',
// };

// // The dashboard takes the accent of the user's module
// const ROLE_ACCENT = {
//   lab_tech: 'lab',
//   pharmacist: 'pharmacy',
//   mortuary_officer: 'memorial',
//   cemetery_officer: 'memorial',
// };

// const ACCENTS = {
//   primary: {
//     hero: 'from-primary-900 via-primary-700 to-primary-500',
//     bar: 'bg-primary-400',
//     activeItem: 'bg-primary-500/15',
//     avatar: 'bg-primary-500',
//     badge: 'bg-primary-50 text-primary-700',
//     ring: 'focus-visible:ring-primary-400',
//   },
//   lab: {
//     hero: 'from-lab-900 via-lab-700 to-lab-500',
//     bar: 'bg-lab-400',
//     activeItem: 'bg-lab-500/20',
//     avatar: 'bg-lab-500',
//     badge: 'bg-lab-50 text-lab-700',
//     ring: 'focus-visible:ring-lab-400',
//   },
//   pharmacy: {
//     hero: 'from-pharmacy-900 via-pharmacy-700 to-pharmacy-500',
//     bar: 'bg-pharmacy-400',
//     activeItem: 'bg-pharmacy-500/15',
//     avatar: 'bg-pharmacy-500',
//     badge: 'bg-pharmacy-50 text-pharmacy-700',
//     ring: 'focus-visible:ring-pharmacy-400',
//   },
//   memorial: {
//     hero: 'from-memorial-900 via-memorial-700 to-memorial-500',
//     bar: 'bg-memorial-300',
//     activeItem: 'bg-memorial-500/25',
//     avatar: 'bg-memorial-500',
//     badge: 'bg-memorial-100 text-memorial-700',
//     ring: 'focus-visible:ring-memorial-300',
//   },
// };

// /* ------------------------------------------------------------------ */
// /* Small pieces used only by this page                                 */
// /* ------------------------------------------------------------------ */

// const initialsOf = (name) =>
//   name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

// function Sidebar({ items, active, onSelect, expanded, onToggle, open, onClose, user, accent, roleLabel, onLogout, badges }) {
//   const rowClass = (isActive) =>
//     `relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 ${accent.ring} ${
//       isActive ? `${accent.activeItem} text-white` : 'text-navy-300 hover:bg-navy-800 hover:text-white'
//     }`;

//   return (
//     <>
//       {open && (
//         <div
//           className="fixed inset-0 z-30 bg-navy-950/60 backdrop-blur-sm lg:hidden"
//           onClick={onClose}
//           aria-hidden="true"
//         />
//       )}

//       <aside
//         aria-label="Dashboard navigation"
//         className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 transition-transform duration-200 motion-reduce:transition-none lg:translate-x-0 ${
//           open ? 'translate-x-0' : '-translate-x-full'
//         }`}
//       >
//         <div className="flex items-center justify-between px-4 py-5">
//           {/* White chip keeps the logo readable on the dark sidebar */}
//           <div className="rounded-lg bg-white px-2.5 py-1.5">
//             <Logo />
//           </div>
//           <button
//             onClick={onClose}
//             className="rounded-lg p-2 text-navy-300 hover:bg-navy-800 hover:text-white lg:hidden"
//             aria-label="Close menu"
//           >
//             <X className="h-5 w-5" />
//           </button>
//         </div>

//         <nav className="flex-1 overflow-y-auto px-3 py-2">
//           <ul className="space-y-1">
//             {items.map((item) => {
//               const { key, label, icon: Icon, module } = item;

//               /* ---- Dropdown group ---- */
//               if (item.children) {
//                 const isOpen = !!expanded[key];
//                 const childActive = item.children.some((c) => c.key === active);
//                 return (
//                   <li key={key}>
//                     <button
//                       onClick={() => onToggle(key)}
//                       aria-expanded={isOpen}
//                       aria-controls={`group-${key}`}
//                       className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 ${accent.ring} ${
//                         childActive ? 'text-white' : 'text-navy-300 hover:bg-navy-800 hover:text-white'
//                       }`}
//                     >
//                       <Icon className={`h-[18px] w-[18px] shrink-0 ${SIDEBAR_ICONS[module]}`} />
//                       <span className="flex-1 text-left">{label}</span>
//                       <ChevronDown
//                         className={`h-4 w-4 shrink-0 text-navy-400 transition-transform duration-200 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
//                       />
//                     </button>

//                     {isOpen && (
//                       <ul id={`group-${key}`} className="ml-[1.35rem] mt-1 space-y-0.5 border-l border-navy-700 pl-3">
//                         {item.children.map((child) => {
//                           const isActive = child.key === active;
//                           return (
//                             <li key={child.key}>
//                               <button
//                                 onClick={() => onSelect(child.key)}
//                                 aria-current={isActive ? 'page' : undefined}
//                                 className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 ${accent.ring} ${
//                                   isActive
//                                     ? `${accent.activeItem} text-white`
//                                     : 'text-navy-300 hover:bg-navy-800 hover:text-white'
//                                 }`}
//                               >
//                                 <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? accent.bar : 'bg-navy-600'}`} />
//                                 <span className="flex-1 text-left">{child.label}</span>
//                                 {badges[child.key] > 0 && (
//                                   <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-white">
//                                     {badges[child.key]}
//                                   </span>
//                                 )}
//                               </button>
//                             </li>
//                           );
//                         })}
//                       </ul>
//                     )}
//                   </li>
//                 );
//               }

//               /* ---- Normal item ---- */
//               const isActive = key === active;
//               return (
//                 <li key={key}>
//                   <button
//                     onClick={() => onSelect(key)}
//                     aria-current={isActive ? 'page' : undefined}
//                     className={rowClass(isActive)}
//                   >
//                     {isActive && (
//                       <span className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full ${accent.bar}`} />
//                     )}
//                     <Icon className={`h-[18px] w-[18px] shrink-0 ${SIDEBAR_ICONS[module]}`} />
//                     <span className="flex-1 text-left">{label}</span>
//                     {badges[key] > 0 && (
//                       <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-white">
//                         {badges[key]}
//                       </span>
//                     )}
//                   </button>
//                 </li>
//               );
//             })}
//           </ul>
//         </nav>

//         <div className="border-t border-navy-800 p-3">
//           <div className="flex items-center gap-3 px-2 py-2">
//             <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${accent.avatar}`}>
//               {initialsOf(user.fullName)}
//             </span>
//             <div className="min-w-0 flex-1">
//               <p className="truncate text-sm font-medium text-white">{user.fullName}</p>
//               <p className="truncate text-xs text-navy-400">{roleLabel}</p>
//             </div>
//           </div>
//           <button
//             onClick={onLogout}
//             className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-navy-300 hover:bg-navy-800 hover:text-white"
//           >
//             <LogOut className="h-[18px] w-[18px]" /> Log out
//           </button>
//         </div>
//       </aside>
//     </>
//   );
// }

// // Shown for any sidebar item that doesn't have a component in COMPONENTS yet
// function Placeholder({ tab }) {
//   const Icon = tab.icon;
//   return (
//     <div className="card flex flex-col items-center px-6 py-16 text-center">
//       <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tab.tint}`}>
//         <Icon className="h-7 w-7" />
//       </span>
//       <h2 className="mt-5 text-lg font-semibold text-navy-900">{tab.label}</h2>
//       <p className="mt-1 max-w-sm text-sm text-gray-600">This section is being set up. Check back soon.</p>
//     </div>
//   );
// }

// // "Prescriptions" is one sidebar item but a different screen per role
// function PrescriptionsTab(props) {
//   if (props.user.role === 'patient') return <PrescriptionsPage {...props} />;
//   if (props.user.role === 'pharmacist') return <PharmacyLookupPage {...props} />;
//   return <Placeholder tab={props.tab} />;
// }

// // Map a tab key to its component. Any key not listed here shows the placeholder.
// // Dropdown children are listed by their own key.
// const COMPONENTS = {
//   overview: OverviewTab,
//   profile: ProfileTab,
//   profileSettings: ProfileSettings,



//   // lab dropdowns
 
//   'my-lab-orders': MyLabOrders,
//   'find-labs': LabDirectory,
//   'lab-requests':LabBooking,
//   'lab-results': LabOrderDetail,
//   'lab-queue': LabOrderQueue,
//   'lab-test-catalog': LabCatalogManager,
  

//   // appointments dropdown
//   'find-care': ProviderSearchPage,
//   'my-appointments': MyAppointmentsPage,
//   'manage-appointments': ProviderAppointmentsPage,
//   'quick-chat': QuickChatPage,
//   'appointment-settings': PaymentSettingsPage,
//   // other sidebar items
//   messages: ChatPage,
//   prescriptions: PrescriptionsTab,
//   // 'lab-orders': LabOrdersTab,
// };

// /* ------------------------------------------------------------------ */
// /* Page                                                                */
// /* ------------------------------------------------------------------ */

// export default function Dashboard() {
//   const { user, logout } = useAuth();
//   const [params, setParams] = useSearchParams();
//   const [menuOpen, setMenuOpen] = useState(false);
//   const [expanded, setExpanded] = useState({});
//   const [data, setData] = useState(null);
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(true);

//   // Only the pages this role may see. Dropdown children are filtered by role too.
//   const allowed = (roles) => !roles || roles.includes(user.role);
//   const items = NAV_ITEMS
//     .filter((i) => allowed(i.roles))
//     .map((i) => {
//       const tint = TINTS[i.module];
//       if (!i.children) return { ...i, tint };
//       const children = i.children
//         .filter((c) => allowed(c.roles))
//         .map((c) => ({ ...c, icon: i.icon, module: i.module, tint, parentKey: i.key, parentLabel: i.label }));
//       return children.length ? { ...i, tint, children } : { ...i, tint, children: undefined };
//     });

//   // Everything that can actually be shown as main content (children replace their parent)
//   const pages = items.flatMap((i) => i.children ?? [i]);
//   const requested = params.get('tab');
//   const requestedGroup = items.find((i) => i.children && i.key === requested);
//   // A missing or unauthorised ?tab= falls back to the first page.
//   // ?tab=appointments (the old key) lands on the first child.
//   const active = pages.find((i) => i.key === requested) ?? requestedGroup?.children[0] ?? pages[0];
//   const accent = ACCENTS[ROLE_ACCENT[user.role] ?? 'primary'];
//   const roleLabel = ROLE_LABELS[user.role] ?? user.role;

//   // Keep the URL in sync, e.g. /dashboard?tab=inventory becomes ?tab=overview for a patient
//   useEffect(() => {
//     if (params.get('tab') !== active.key) setParams({ tab: active.key }, { replace: true });
//   }, [params, active.key, setParams]);

//   // Open the dropdown that contains the current page (deep links, notifications, back button)
//   useEffect(() => {
//     if (active.parentKey) setExpanded((e) => (e[active.parentKey] ? e : { ...e, [active.parentKey]: true }));
//   }, [active.parentKey]);

//   useEffect(() => {
//     if (user.role === 'super_admin') return;
//     let cancelled = false;
//     api.get('/users/dashboard')
//       .then((res) => { if (!cancelled) setData(res.data.data); })
//       .catch((err) => { if (!cancelled) setError(getErrorMessage(err)); })
//       .finally(() => { if (!cancelled) setLoading(false); });
//     return () => { cancelled = true; };
//   }, [user.role]);

//   // Escape closes the mobile menu
//   useEffect(() => {
//     const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
//     window.addEventListener('keydown', onKey);
//     return () => window.removeEventListener('keydown', onKey);
//   }, []);

//   if (user.role === 'super_admin') return <Navigate to="/dashboard/super-admin" replace />;

//   const select = (key) => {
//     setParams({ tab: key });
//     setMenuOpen(false);
//     window.scrollTo({ top: 0 });
//   };

//   const toggleGroup = (key) => setExpanded((e) => ({ ...e, [key]: !e[key] }));

//   const handleLogout = () => {
//     logout();
//     toast.success('You have been logged out');
//   };

//   const Page = COMPONENTS[active.key];

//   return (
//     <div className="min-h-screen bg-gray-50 text-navy-800">
//       <Sidebar
//         items={items}
//         active={active.key}
//         onSelect={select}
//         expanded={expanded}
//         onToggle={toggleGroup}
//         open={menuOpen}
//         onClose={() => setMenuOpen(false)}
//         user={user}
//         accent={accent}
//         roleLabel={roleLabel}
//         onLogout={handleLogout}
//         badges={{ messages: data?.chat?.unread ?? 0 }}
//       />

//       <div className="lg:pl-64">
//         <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
//           <button
//             onClick={() => setMenuOpen(true)}
//             className="rounded-lg p-2 text-navy-700 hover:bg-gray-100 lg:hidden"
//             aria-label="Open menu"
//           >
//             <Menu className="h-5 w-5" />
//           </button>
//           <h1 className="flex-1 truncate text-base font-semibold text-navy-900">
//             {active.parentLabel && <span className="font-normal text-gray-500">{active.parentLabel} / </span>}
//             {active.label}
//           </h1>
//           <NotificationBell />
//           <span className={`hidden rounded-full px-3 py-1 text-xs font-semibold sm:inline-block ${accent.badge}`}>
//             {roleLabel}
//           </span>
//         </header>

//         <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
//           {Page ? (
//             <Page
//               tab={active}
//               items={items}
//               user={user}
//               roleLabel={roleLabel}
//               data={data}
//               loading={loading}
//               error={error}
//               accent={accent}
//               onNavigate={select}
//             />
//           ) : (
//             <Placeholder tab={active} />
//           )}
//         </main>
//       </div>
//     </div>
//   );
// }





import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  LayoutDashboard, CalendarDays, Users, Pill, FlaskConical, FileText, Store,
  Stethoscope, ClipboardList, Landmark, MessageCircle, UserRound, LogOut, Menu, X, ChevronDown,
} from 'lucide-react';
import Logo from '@/components/Logo.jsx';
import api, { getErrorMessage } from '@/lib/api.js';
import { useAuth } from '@/context/AuthContext.jsx';

// Each tab lives in its own file. Import it here, then add it to COMPONENTS below.
import OverviewTab from './dashboard/OverviewTab.jsx';
import ProfileTab from './dashboard/ProfileTab.jsx';
import {
  ProviderSearchPage, MyAppointmentsPage, ProviderAppointmentsPage, PaymentSettingsPage,
  QuickChatPage, ChatPage, PrescriptionsPage, NotificationBell,
} from './appointments';
import MyLabOrders from './Lab/MylabOrders.jsx';

import LabOrderQueue from './Lab/LabOrderqueue.jsx';
import LabCatalogManager from './Lab/LabcatalogManager.jsx';
import LabOrderDetail from './Lab/LabOrderdetail.jsx';

import LabBooking from './Lab/LabBooking.jsx';
import LabDirectory from './Lab/LabDirectory.jsx';
import ProfileSettings from './dashboard/ProfileSettings.jsx';

// Pharmacy pages. Adjust the folder if you put these files somewhere else.
import PharmacyOverviewPage from './pharmacy/PharmacyDashboardpage.jsx';
import PharmacyLookupPage from './pharmacy/PharmacyLookupPage.jsx';
import PharmacyAttendPage from './pharmacy/PharmacyAttendPage.jsx';
import PharmacyPosPage from './pharmacy/PharmacyPOSpAGE.jsx';
import PharmacyInventoryPage from './pharmacy/PharmacyInventoryPage.jsx';
import PharmacySalesPage from './pharmacy/PharmacySalesPage.jsx';
import PharmacyReportsPage from './pharmacy/PharmacyReportPage.jsx';
import FindPharmacyPage from './pharmacy/FindPharmacyPage.jsx';
import PharmacyProfilePage from './pharmacy/PharmacyProfilePage.jsx';
import PharmacyChatPage from './pharmacy/PharmacyChatPage.jsx';
import { usePharmacyMe } from './pharmacy/PharmacyShared.jsx';

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

// key:      the value in the URL: /dashboard?tab=<key>
// roles:    who can see it. null = every logged-in user.
// module:   colour family (lab = violet, pharmacy = emerald, memorial = stone)
// children: optional. Turns the item into a dropdown. Each child has its own key + roles
//           and is what actually gets rendered; the parent only expands/collapses.
//           A parent whose children are all hidden for a role falls back to a normal item.
// Child flags:
//   hidden:      reachable by URL/links but not listed in the sidebar (detail pages)
//   activeAs:    which sidebar entry to highlight while a hidden page is open
//   managerOnly: pharmacist pages only the pharmacy manager (organization owner) may see
const NAV_ITEMS = [
  { key: 'overview',         label: 'Overview',         icon: LayoutDashboard, module: 'primary',  roles: null },
  {
    key: 'appointments', label: 'Appointments', icon: CalendarDays, module: 'primary',
    roles: ['patient', 'doctor', 'nurse', 'hospital_admin'],
    children: [
      { key: 'find-care',            label: 'Find care',          roles: ['patient'] },
      { key: 'my-appointments',      label: 'My appointments',    roles: ['patient'] },
      { key: 'manage-appointments',  label: 'Appointment queue',  roles: ['doctor', 'hospital_admin'] },
      { key: 'quick-chat',           label: 'Quick chat',         roles: ['patient', 'doctor', 'hospital_admin'] },
      { key: 'appointment-settings', label: 'Fees and settings',  roles: ['doctor', 'hospital_admin'] },
    ],
  },
  { key: 'patients',         label: 'Patients',         icon: Users,           module: 'primary',  roles: ['doctor', 'nurse', 'hospital_admin'] },
  // Pharmacists work from the Pharmacy dropdown below, so they no longer need this item
  { key: 'prescriptions',    label: 'Prescriptions',    icon: Pill,            module: 'pharmacy', roles: ['patient', 'doctor'] },
  {
    key: 'pharmacy', label: 'Pharmacy', icon: Store, module: 'pharmacy',
    roles: ['patient', 'pharmacist'],
    children: [
      // ---- Patients: find pharmacies, rate them, chat. No stock or back-office pages. ----
      { key: 'find-pharmacy',      label: 'Find a pharmacy',       roles: ['patient'] },
      { key: 'pharmacy-chat',      label: 'Chat with a pharmacist', roles: ['patient'] },
      { key: 'pharmacy-profile',   label: 'Pharmacy profile',      roles: ['patient'], hidden: true, activeAs: 'find-pharmacy' },

      // ---- Pharmacy staff ----
      { key: 'pharmacy-home',      label: 'Pharmacy overview',     roles: ['pharmacist'] },
      { key: 'pharmacy-lookup',    label: 'Prescriptions',         roles: ['pharmacist'] },
      { key: 'pharmacy-attend',    label: 'Attend to prescription', roles: ['pharmacist'], hidden: true, activeAs: 'pharmacy-lookup' },
      { key: 'pharmacy-pos',       label: 'Sell (walk-in)',        roles: ['pharmacist'] },
      { key: 'pharmacy-inventory', label: 'Stock and inventory',   roles: ['pharmacist'] },
      { key: 'pharmacy-sales',     label: 'Sales history',         roles: ['pharmacist'] },
      { key: 'pharmacy-chats',     label: 'Patient chats',         roles: ['pharmacist'] },
      { key: 'pharmacy-reports',   label: 'Reports',               roles: ['pharmacist'], managerOnly: true },
    ],
  },
  {
    key: 'lab-orders', label: 'Lab', icon: FlaskConical, module: 'lab',
    roles: ['patient', 'doctor', 'lab_tech'],
    children: [
      { key: 'find-labs',        label: 'Find a lab',       roles: ['patient'] },
      { key: 'my-lab-orders',    label: 'My lab orders',    roles: ['patient'] },
      { key: 'lab-requests',     label: 'Order a test',     roles: ['doctor'] },
      { key: 'lab-results',      label: 'Patient results',  roles: ['doctor'] },
      { key: 'lab-queue',        label: 'Order queue',      roles: ['lab_tech'] },
      { key: 'lab-test-catalog', label: 'Test catalogue',   roles: ['lab_tech'] },
    ],
  },

  { key: 'medical-records',  label: 'Medical records',  icon: FileText,        module: 'primary',  roles: ['patient'] },
  { key: 'staff',            label: 'Staff',            icon: Stethoscope,     module: 'primary',  roles: ['hospital_admin'] },
  { key: 'mortuary-records', label: 'Mortuary records', icon: ClipboardList,   module: 'memorial', roles: ['mortuary_officer'] },
  { key: 'burial-plots',     label: 'Burial plots',     icon: Landmark,        module: 'memorial', roles: ['cemetery_officer'] },
  { key: 'messages',         label: 'Messages',         icon: MessageCircle,   module: 'info',     roles: null },
  { key: 'profile',          label: 'Profile',          icon: UserRound,       module: 'primary',  roles: null },
  { key: 'profileSettings',  label: 'Profile Settings', icon: UserRound,       module: 'primary',  roles: null },
];

const ROLE_LABELS = {
  patient: 'Patient',
  doctor: 'Doctor',
  nurse: 'Nurse',
  lab_tech: 'Lab technician',
  pharmacist: 'Pharmacist',
  hospital_admin: 'Hospital admin',
  mortuary_officer: 'Mortuary officer',
  cemetery_officer: 'Cemetery officer',
  super_admin: 'Super admin',
};

/*
 * Tailwind only keeps classes it finds as complete strings in source files,
 * so every class is spelled out instead of built like `bg-${x}-600`.
 */

// Light tints for icon tiles (passed to tabs as item.tint)
const TINTS = {
  primary:  'bg-primary-50 text-primary-700',
  lab:      'bg-lab-50 text-lab-700',
  pharmacy: 'bg-pharmacy-50 text-pharmacy-700',
  memorial: 'bg-memorial-100 text-memorial-700',
  info:     'bg-info-light text-info-dark',
};

// Icon colours on the dark navy sidebar
const SIDEBAR_ICONS = {
  primary:  'text-primary-400',
  lab:      'text-lab-400',
  pharmacy: 'text-pharmacy-400',
  memorial: 'text-memorial-300',
  info:     'text-info',
};

// The dashboard takes the accent of the user's module
const ROLE_ACCENT = {
  lab_tech: 'lab',
  pharmacist: 'pharmacy',
  mortuary_officer: 'memorial',
  cemetery_officer: 'memorial',
};

const ACCENTS = {
  primary: {
    hero: 'from-primary-900 via-primary-700 to-primary-500',
    bar: 'bg-primary-400',
    activeItem: 'bg-primary-500/15',
    avatar: 'bg-primary-500',
    badge: 'bg-primary-50 text-primary-700',
    ring: 'focus-visible:ring-primary-400',
  },
  lab: {
    hero: 'from-lab-900 via-lab-700 to-lab-500',
    bar: 'bg-lab-400',
    activeItem: 'bg-lab-500/20',
    avatar: 'bg-lab-500',
    badge: 'bg-lab-50 text-lab-700',
    ring: 'focus-visible:ring-lab-400',
  },
  pharmacy: {
    hero: 'from-pharmacy-900 via-pharmacy-700 to-pharmacy-500',
    bar: 'bg-pharmacy-400',
    activeItem: 'bg-pharmacy-500/15',
    avatar: 'bg-pharmacy-500',
    badge: 'bg-pharmacy-50 text-pharmacy-700',
    ring: 'focus-visible:ring-pharmacy-400',
  },
  memorial: {
    hero: 'from-memorial-900 via-memorial-700 to-memorial-500',
    bar: 'bg-memorial-300',
    activeItem: 'bg-memorial-500/25',
    avatar: 'bg-memorial-500',
    badge: 'bg-memorial-100 text-memorial-700',
    ring: 'focus-visible:ring-memorial-300',
  },
};

/* ------------------------------------------------------------------ */
/* Small pieces used only by this page                                 */
/* ------------------------------------------------------------------ */

const initialsOf = (name) =>
  name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

function Sidebar({ items, active, onSelect, expanded, onToggle, open, onClose, user, accent, roleLabel, onLogout, badges }) {
  const rowClass = (isActive) =>
    `relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 ${accent.ring} ${
      isActive ? `${accent.activeItem} text-white` : 'text-navy-300 hover:bg-navy-800 hover:text-white'
    }`;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-navy-950/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Dashboard navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 transition-transform duration-200 motion-reduce:transition-none lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-5">
          {/* White chip keeps the logo readable on the dark sidebar */}
          <div className="rounded-lg bg-white px-2.5 py-1.5">
            <Logo />
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-navy-300 hover:bg-navy-800 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="space-y-1">
            {items.map((item) => {
              const { key, label, icon: Icon, module } = item;

              /* ---- Dropdown group ---- */
              if (item.children) {
                const isOpen = !!expanded[key];
                const childActive = item.children.some((c) => c.key === active);
                const visibleChildren = item.children.filter((c) => !c.hidden);
                return (
                  <li key={key}>
                    <button
                      onClick={() => onToggle(key)}
                      aria-expanded={isOpen}
                      aria-controls={`group-${key}`}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 ${accent.ring} ${
                        childActive ? 'text-white' : 'text-navy-300 hover:bg-navy-800 hover:text-white'
                      }`}
                    >
                      <Icon className={`h-[18px] w-[18px] shrink-0 ${SIDEBAR_ICONS[module]}`} />
                      <span className="flex-1 text-left">{label}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-navy-400 transition-transform duration-200 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {isOpen && (
                      <ul id={`group-${key}`} className="ml-[1.35rem] mt-1 space-y-0.5 border-l border-navy-700 pl-3">
                        {visibleChildren.map((child) => {
                          const isActive = child.key === active;
                          return (
                            <li key={child.key}>
                              <button
                                onClick={() => onSelect(child.key)}
                                aria-current={isActive ? 'page' : undefined}
                                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 ${accent.ring} ${
                                  isActive
                                    ? `${accent.activeItem} text-white`
                                    : 'text-navy-300 hover:bg-navy-800 hover:text-white'
                                }`}
                              >
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? accent.bar : 'bg-navy-600'}`} />
                                <span className="flex-1 text-left">{child.label}</span>
                                {badges[child.key] > 0 && (
                                  <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-white">
                                    {badges[child.key]}
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              /* ---- Normal item ---- */
              const isActive = key === active;
              return (
                <li key={key}>
                  <button
                    onClick={() => onSelect(key)}
                    aria-current={isActive ? 'page' : undefined}
                    className={rowClass(isActive)}
                  >
                    {isActive && (
                      <span className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full ${accent.bar}`} />
                    )}
                    <Icon className={`h-[18px] w-[18px] shrink-0 ${SIDEBAR_ICONS[module]}`} />
                    <span className="flex-1 text-left">{label}</span>
                    {badges[key] > 0 && (
                      <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-white">
                        {badges[key]}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-navy-800 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${accent.avatar}`}>
              {initialsOf(user.fullName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user.fullName}</p>
              <p className="truncate text-xs text-navy-400">{roleLabel}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-navy-300 hover:bg-navy-800 hover:text-white"
          >
            <LogOut className="h-[18px] w-[18px]" /> Log out
          </button>
        </div>
      </aside>
    </>
  );
}

// Shown for any sidebar item that doesn't have a component in COMPONENTS yet
function Placeholder({ tab }) {
  const Icon = tab.icon;
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tab.tint}`}>
        <Icon className="h-7 w-7" />
      </span>
      <h2 className="mt-5 text-lg font-semibold text-navy-900">{tab.label}</h2>
      <p className="mt-1 max-w-sm text-sm text-gray-600">This section is being set up. Check back soon.</p>
    </div>
  );
}

// "Prescriptions" is the patient's / doctor's item. Pharmacists use Pharmacy > Prescriptions.
function PrescriptionsTab(props) {
  if (props.user.role === 'patient') return <PrescriptionsPage {...props} />;
  return <Placeholder tab={props.tab} />;
}

// Map a tab key to its component. Any key not listed here shows the placeholder.
// Dropdown children are listed by their own key.
const COMPONENTS = {
  overview: OverviewTab,
  profile: ProfileTab,
  profileSettings: ProfileSettings,

  // lab dropdown
  'my-lab-orders': MyLabOrders,
  'find-labs': LabDirectory,
  'lab-requests': LabBooking,
  'lab-results': LabOrderDetail,
  'lab-queue': LabOrderQueue,
  'lab-test-catalog': LabCatalogManager,

  // pharmacy dropdown: patients
  'find-pharmacy': FindPharmacyPage,
  'pharmacy-profile': PharmacyProfilePage,
  'pharmacy-chat': PharmacyChatPage,
  // pharmacy dropdown: pharmacy staff
  'pharmacy-home': PharmacyOverviewPage,
  'pharmacy-lookup': PharmacyLookupPage,
  'pharmacy-attend': PharmacyAttendPage,
  'pharmacy-pos': PharmacyPosPage,
  'pharmacy-inventory': PharmacyInventoryPage,
  'pharmacy-sales': PharmacySalesPage,
  'pharmacy-chats': PharmacyChatPage,
  'pharmacy-reports': PharmacyReportsPage,

  // appointments dropdown
  'find-care': ProviderSearchPage,
  'my-appointments': MyAppointmentsPage,
  'manage-appointments': ProviderAppointmentsPage,
  'quick-chat': QuickChatPage,
  'appointment-settings': PaymentSettingsPage,

  // other sidebar items
  messages: ChatPage,
  prescriptions: PrescriptionsTab,
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [params, setParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Only pharmacists need this: it tells us whether they are the pharmacy manager
  const pharmacyMe = usePharmacyMe(user.role === 'pharmacist');

  // Only the pages this role may see. Dropdown children are filtered by role too.
  const allowed = (roles) => !roles || roles.includes(user.role);
  const childAllowed = (c) => allowed(c.roles) && (!c.managerOnly || !!pharmacyMe?.isManager);
  const items = NAV_ITEMS
    .filter((i) => allowed(i.roles))
    .map((i) => {
      const tint = TINTS[i.module];
      if (!i.children) return { ...i, tint };
      const children = i.children
        .filter(childAllowed)
        .map((c) => ({ ...c, icon: i.icon, module: i.module, tint, parentKey: i.key, parentLabel: i.label }));
      return children.length ? { ...i, tint, children } : { ...i, tint, children: undefined };
    });

  // Everything that can actually be shown as main content (children replace their parent)
  const pages = items.flatMap((i) => i.children ?? [i]);
  const requested = params.get('tab');
  const requestedGroup = items.find((i) => i.children && i.key === requested);
  // A missing or unauthorised ?tab= falls back to the first page.
  // ?tab=appointments (the old key) lands on the first visible child.
  const active =
    pages.find((i) => i.key === requested) ??
    requestedGroup?.children.find((c) => !c.hidden) ??
    pages[0];
  const accent = ACCENTS[ROLE_ACCENT[user.role] ?? 'primary'];
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;

  // Keep the URL in sync, e.g. /dashboard?tab=inventory becomes ?tab=overview for a patient.
  // Skipped for a pharmacist's manager-only page while we're still finding out who the manager is.
  useEffect(() => {
    const waitingForManagerCheck = user.role === 'pharmacist' && !pharmacyMe && requested === 'pharmacy-reports';
    if (waitingForManagerCheck) return;
    if (params.get('tab') !== active.key) setParams({ tab: active.key }, { replace: true });
  }, [params, active.key, setParams, user.role, pharmacyMe, requested]);

  // Open the dropdown that contains the current page (deep links, notifications, back button)
  useEffect(() => {
    if (active.parentKey) setExpanded((e) => (e[active.parentKey] ? e : { ...e, [active.parentKey]: true }));
  }, [active.parentKey]);

  useEffect(() => {
    if (user.role === 'super_admin') return;
    let cancelled = false;
    api.get('/users/dashboard')
      .then((res) => { if (!cancelled) setData(res.data.data); })
      .catch((err) => { if (!cancelled) setError(getErrorMessage(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user.role]);

  // Escape closes the mobile menu
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (user.role === 'super_admin') return <Navigate to="/dashboard/super-admin" replace />;

  const select = (key) => {
    setParams({ tab: key });
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  };

  const toggleGroup = (key) => setExpanded((e) => ({ ...e, [key]: !e[key] }));

  const handleLogout = () => {
    logout();
    toast.success('You have been logged out');
  };

  const Page = COMPONENTS[active.key];

  return (
    <div className="min-h-screen bg-gray-50 text-navy-800">
      <Sidebar
        items={items}
        active={active.activeAs ?? active.key}
        onSelect={select}
        expanded={expanded}
        onToggle={toggleGroup}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        user={user}
        accent={accent}
        roleLabel={roleLabel}
        onLogout={handleLogout}
        badges={{ messages: data?.chat?.unread ?? 0 }}
      />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
          <button
            onClick={() => setMenuOpen(true)}
            className="rounded-lg p-2 text-navy-700 hover:bg-gray-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="flex-1 truncate text-base font-semibold text-navy-900">
            {active.parentLabel && <span className="font-normal text-gray-500">{active.parentLabel} / </span>}
            {active.label}
          </h1>
          <NotificationBell />
          <span className={`hidden rounded-full px-3 py-1 text-xs font-semibold sm:inline-block ${accent.badge}`}>
            {roleLabel}
          </span>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {Page ? (
            <Page
              tab={active}
              items={items}
              user={user}
              roleLabel={roleLabel}
              data={data}
              loading={loading}
              error={error}
              accent={accent}
              onNavigate={select}
            />
          ) : (
            <Placeholder tab={active} />
          )}
        </main>
      </div>
    </div>
  );
}