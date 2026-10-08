import {
  LayoutDashboard, CalendarDays, Users, Pill, FlaskConical, FileText, Package,
  Stethoscope, ClipboardList, Landmark, MessageCircle, UserRound,
} from 'lucide-react';

/**
 * One entry per sidebar page.
 *  - key:    the value used in the URL: /dashboard?tab=<key>
 *  - roles:  who can see it. null = every logged-in user.
 *  - module: which colour family the item uses (see theme/colors.js)
 *
 * To add a page: add an entry here, then map its key to a component in
 * COMPONENTS inside pages/Dashboard.jsx.
 */
export const NAV_ITEMS = [
  { key: 'overview',         label: 'Overview',         icon: LayoutDashboard, module: 'primary',  roles: null },
  { key: 'appointments',     label: 'Appointments',     icon: CalendarDays,    module: 'primary',  roles: ['patient', 'doctor', 'nurse', 'hospital_admin'] },
  { key: 'patients',         label: 'Patients',         icon: Users,           module: 'primary',  roles: ['doctor', 'nurse', 'hospital_admin'] },
  { key: 'prescriptions',    label: 'Prescriptions',    icon: Pill,            module: 'pharmacy', roles: ['patient', 'doctor', 'pharmacist'] },
  { key: 'lab-orders',       label: 'Lab orders',       icon: FlaskConical,    module: 'lab',      roles: ['patient', 'doctor', 'lab_tech'] },
  { key: 'medical-records',  label: 'Medical records',  icon: FileText,        module: 'primary',  roles: ['patient'] },
  { key: 'inventory',        label: 'Inventory',        icon: Package,         module: 'pharmacy', roles: ['pharmacist'] },
  { key: 'staff',            label: 'Staff',            icon: Stethoscope,     module: 'primary',  roles: ['hospital_admin'] },
  { key: 'mortuary-records', label: 'Mortuary records', icon: ClipboardList,   module: 'memorial', roles: ['mortuary_officer'] },
  { key: 'burial-plots',     label: 'Burial plots',     icon: Landmark,        module: 'memorial', roles: ['cemetery_officer'] },
  { key: 'messages',         label: 'Messages',         icon: MessageCircle,   module: 'info',     roles: null },
  { key: 'profile',          label: 'Profile',          icon: UserRound,       module: 'primary',  roles: null },
];

export const navFor = (role) =>
  NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

export const ROLE_LABELS = {
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
 * Tailwind only keeps classes it can find as complete strings in source files,
 * so these maps spell every class out instead of building names like `bg-${x}-600`.
 */

// Light tints for icon tiles and cards
export const TINTS = {
  primary:  'bg-primary-50 text-primary-700',
  lab:      'bg-lab-50 text-lab-700',
  pharmacy: 'bg-pharmacy-50 text-pharmacy-700',
  memorial: 'bg-memorial-100 text-memorial-700',
  info:     'bg-info-light text-info-dark',
};

// Icon colours on the dark navy sidebar
export const SIDEBAR_ICONS = {
  primary:  'text-primary-400',
  lab:      'text-lab-400',
  pharmacy: 'text-pharmacy-400',
  memorial: 'text-memorial-300',
  info:     'text-info',
};

// The whole dashboard takes the accent of the user's module
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

export const accentFor = (role) => ACCENTS[ROLE_ACCENT[role] ?? 'primary'];