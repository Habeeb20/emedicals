// import { useState } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { toast } from 'sonner';
// import { User, Mail, Phone, Stethoscope, HeartPulse, LoaderCircle, CircleAlert, Info } from 'lucide-react';
// import AuthLayout from '@/components/AuthLayout.jsx';
// import TextField from '@/components/TextField.jsx';
// import PasswordInput from '@/components/PasswordInput.jsx';
// import PasswordStrength from '@/components/PasswordStrength.jsx';
// import api, { getErrorMessage } from '@/lib/api.js';
// import { isPasswordValid } from '@/lib/password.js';

// const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;

// const PROFESSIONAL_ROLES = [
//   { value: 'doctor', label: 'Doctor' },
//   { value: 'nurse', label: 'Nurse' },
//   { value: 'lab_tech', label: 'Lab technician' },
//   { value: 'pharmacist', label: 'Pharmacist' },
//   { value: 'hospital_admin', label: 'Hospital administrator' },
//   { value: 'mortuary_officer', label: 'Mortuary officer' },
//   { value: 'cemetery_officer', label: 'Cemetery officer' },
// ];

// const accountTypes = [
//   { value: 'patient', label: 'Patient', text: 'Book care and manage records', icon: HeartPulse },
//   { value: 'professional', label: 'Professional', text: 'Doctor, lab, pharmacy, staff', icon: Stethoscope },
// ];

// export default function Signup() {
//   const navigate = useNavigate();
//   const [accountType, setAccountType] = useState('patient');
//   const [form, setForm] = useState({
//     fullName: '', email: '', phone: '', role: 'doctor', password: '', confirmPassword: '', terms: false,
//   });
//   const [errors, setErrors] = useState({});
//   const [formError, setFormError] = useState('');
//   const [loading, setLoading] = useState(false);

//   const set = (field) => (e) => {
//     const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
//     setForm((f) => ({ ...f, [field]: value }));
//     setErrors((errs) => ({ ...errs, [field]: undefined }));
//   };

//   const validate = () => {
//     const errs = {};
//     if (form.fullName.trim().length < 2) errs.fullName = 'Please enter your full name';
//     if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Enter a valid email address';
//     if (form.phone.trim() && !PHONE_RE.test(form.phone.trim())) errs.phone = 'Enter a valid phone number';
//     if (!isPasswordValid(form.password)) errs.password = 'Password does not meet all the requirements';
//     if (form.confirmPassword !== form.password) errs.confirmPassword = 'Passwords do not match';
//     if (!form.terms) errs.terms = 'You need to accept the terms to continue';
//     setErrors(errs);
//     return Object.keys(errs).length === 0;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setFormError('');
//     if (!validate()) return;

//     setLoading(true);
//     try {
//       const email = form.email.trim().toLowerCase();
//       const payload = {
//         fullName: form.fullName.trim(),
//         email,
//         password: form.password,
//         role: accountType === 'patient' ? 'patient' : form.role,
//       };
//       // An empty phone must be left out entirely (the database keeps phone numbers unique)
//       if (form.phone.trim()) payload.phone = form.phone.trim();

//       const { data } = await api.post('/users/signup', payload);
//       toast.success(data.message);
//       navigate('/verify-otp', {
//         state: { email, otpSent: data.data.otpSent, requiresApproval: data.data.requiresApproval },
//       });
//     } catch (err) {
//       toast.error(getErrorMessage(err));
//       setFormError(getErrorMessage(err));
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <AuthLayout
//       title="Create your account"
//       subtitle="One account for every part of your care."
//       footer={<>Already have an account? <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">Log in</Link></>}
//     >
//       <form onSubmit={handleSubmit} className="space-y-5" noValidate>
//         {formError && (
//           <div className="flex items-start gap-2.5 rounded-lg border border-danger/20 bg-danger-light px-3.5 py-3 text-sm text-danger-dark" role="alert">
//             <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
//             {formError}
//           </div>
//         )}

//         {/* Account type */}
//         <div role="radiogroup" aria-label="Account type" className="grid grid-cols-2 gap-3">
//           {accountTypes.map(({ value, label, text, icon: Icon }) => {
//             const active = accountType === value;
//             return (
//               <button
//                 key={value}
//                 type="button"
//                 role="radio"
//                 aria-checked={active}
//                 onClick={() => setAccountType(value)}
//                 className={`rounded-xl border p-3.5 text-left transition ${
//                   active ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20' : 'border-gray-300 bg-white hover:border-gray-400'
//                 }`}
//               >
//                 <Icon className={`h-5 w-5 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
//                 <p className="mt-2 text-sm font-semibold text-navy-900">{label}</p>
//                 <p className="text-xs text-gray-500">{text}</p>
//               </button>
//             );
//           })}
//         </div>

//         {accountType === 'professional' && (
//           <div className="space-y-3">
//             <div>
//               <label htmlFor="role" className="label">Your role</label>
//               <select id="role" value={form.role} onChange={set('role')} className="input">
//                 {PROFESSIONAL_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
//               </select>
//             </div>
//             <div className="flex items-start gap-2.5 rounded-lg bg-warning-light px-3.5 py-3 text-sm text-warning-dark">
//               <Info className="mt-0.5 h-4 w-4 shrink-0" />
//               Professional accounts are reviewed by an administrator before you can sign in.
//             </div>
//           </div>
//         )}

//         <TextField id="fullName" label="Full name" icon={User} placeholder="Ada Okafor" autoComplete="name"
//           value={form.fullName} onChange={set('fullName')} error={errors.fullName} />

//         <div className="grid gap-5 sm:grid-cols-2">
//           <TextField id="email" label="Email" icon={Mail} type="email" placeholder="you@example.com" autoComplete="email"
//             value={form.email} onChange={set('email')} error={errors.email} />
//           <TextField id="phone" label="Phone (optional)" icon={Phone} type="tel" placeholder="0803 000 0000" autoComplete="tel"
//             value={form.phone} onChange={set('phone')} error={errors.phone} />
//         </div>

//         <div>
//           <PasswordInput id="password" label="Password" placeholder="Create a strong password" autoComplete="new-password"
//             value={form.password} onChange={set('password')} error={errors.password} />
//           {form.password && <PasswordStrength password={form.password} />}
//         </div>

//         <PasswordInput id="confirmPassword" label="Confirm password" placeholder="Re-enter your password" autoComplete="new-password"
//           value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />

//         <div>
//           <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-600">
//             <input type="checkbox" checked={form.terms} onChange={set('terms')}
//               className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-primary-600" />
//             <span>
//               I agree to the <span className="font-medium text-primary-700">Terms of Service</span> and{' '}
//               <span className="font-medium text-primary-700">Privacy Policy</span>
//             </span>
//           </label>
//           {errors.terms && <p className="mt-1.5 text-xs text-danger">{errors.terms}</p>}
//         </div>

//         <button type="submit" disabled={loading} className="btn-primary w-full py-3">
//           {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
//           {loading ? 'Creating account...' : 'Create account'}
//         </button>
//       </form>
//     </AuthLayout>
//   );
// }





import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  User, Mail, Phone, Stethoscope, HeartPulse, LoaderCircle, CircleAlert, Info,
  Building2, MapPin, FileText, Clock, LocateFixed,
} from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import TextField from '@/components/TextField.jsx';
import PasswordInput from '@/components/PasswordInput.jsx';
import PasswordStrength from '@/components/PasswordStrength.jsx';
import api, { getErrorMessage } from '@/lib/api.js';
import { isPasswordValid } from '@/lib/password.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s-]{7,15}$/;

const PROFESSIONAL_ROLES = [
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'lab_tech', label: 'Lab technician' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'hospital_admin', label: 'Hospital administrator' },
  { value: 'mortuary_officer', label: 'Mortuary officer' },
  { value: 'cemetery_officer', label: 'Cemetery officer' },
];

// Mirrors the backend: these roles register together with the organization they run.
const ORG_TYPES_BY_ROLE = {
  hospital_admin: [
    { value: 'hospital', label: 'Hospital' },
    { value: 'clinic', label: 'Clinic' },
  ],
  lab_tech: [{ value: 'lab', label: 'Laboratory' }],
  pharmacist: [{ value: 'pharmacy', label: 'Pharmacy' }],
  mortuary_officer: [{ value: 'mortuary', label: 'Mortuary' }],
  cemetery_officer: [{ value: 'cemetery', label: 'Cemetery' }],
};

const ORG_NOUN = {
  hospital: 'hospital', clinic: 'clinic', lab: 'laboratory',
  pharmacy: 'pharmacy', mortuary: 'mortuary', cemetery: 'cemetery',
};

const PAYMENT_MODES = [
  { value: 'arrival', label: 'Pay on arrival' },
  { value: 'booking', label: 'Pay when booking' },
  { value: 'deposit', label: 'Pay a deposit when booking' },
];

const accountTypes = [
  { value: 'patient', label: 'Patient', text: 'Book care and manage records', icon: HeartPulse },
  { value: 'professional', label: 'Professional', text: 'Doctor, lab, pharmacy, staff', icon: Stethoscope },
];

const emptyOrg = (type = '') => ({
  name: '', type, registrationNumber: '', licenseNumber: '', email: '', phone: '',
  street: '', city: '', state: '', country: 'Nigeria',
  about: '', openingHours: '', is24Hours: false, offersDelivery: false, departments: '',
  lat: '', lng: '',
  paymentMode: 'arrival', appointmentFee: '', depositAmount: '',
});

const getOrgTypes = (role) => ORG_TYPES_BY_ROLE[role] || [];
const roleNeedsOrg = (role) => getOrgTypes(role).length > 0;

export default function Signup() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState('patient');
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', role: 'doctor', password: '', confirmPassword: '', terms: false,
  });
  const [org, setOrg] = useState(emptyOrg());
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const isProfessional = accountType === 'professional';
  const needsOrg = isProfessional && roleNeedsOrg(form.role);
  const orgTypes = getOrgTypes(form.role);
  const orgType = orgTypes.some((t) => t.value === org.type) ? org.type : (orgTypes[0]?.value || '');
  const hasBookings = ['hospital', 'clinic'].includes(orgType);
  const noun = ORG_NOUN[orgType] || 'organization';

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  const setOrgField = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setOrg((o) => ({ ...o, [field]: value }));
    setErrors((errs) => ({ ...errs, [`org.${field}`]: undefined }));
  };

  // Changing the role changes which organization types are allowed
  const handleRoleChange = (e) => {
    const role = e.target.value;
    setForm((f) => ({ ...f, role }));
    setOrg((o) => ({ ...o, type: getOrgTypes(role)[0]?.value || '' }));
    setErrors({});
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Your browser does not support location access');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setOrg((o) => ({ ...o, lat: coords.latitude.toFixed(6), lng: coords.longitude.toFixed(6) }));
        setErrors((errs) => ({ ...errs, 'org.lat': undefined, 'org.lng': undefined }));
        setLocating(false);
      },
      () => {
        toast.error('Could not get your location. You can enter the coordinates yourself.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const validate = () => {
    const errs = {};
    if (form.fullName.trim().length < 2) errs.fullName = 'Please enter your full name';
    if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Enter a valid email address';
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim())) errs.phone = 'Enter a valid phone number';

    if (needsOrg) {
      if (!org.name.trim()) errs['org.name'] = `Enter the name of your ${noun}`;
      if (!orgTypes.some((t) => t.value === orgType)) errs['org.type'] = 'Choose an organization type';
      if (org.email.trim() && !EMAIL_RE.test(org.email.trim())) errs['org.email'] = 'Enter a valid email address';
      if (org.phone.trim() && !PHONE_RE.test(org.phone.trim())) errs['org.phone'] = 'Enter a valid phone number';
      if (!org.city.trim()) errs['org.city'] = 'Enter the city';
      if (!org.state.trim()) errs['org.state'] = 'Enter the state';

      const hasLat = org.lat.trim() !== '';
      const hasLng = org.lng.trim() !== '';
      if (hasLat || hasLng) {
        const lat = Number(org.lat);
        const lng = Number(org.lng);
        if (!hasLat || !(Math.abs(lat) <= 90)) errs['org.lat'] = 'Latitude must be between -90 and 90';
        if (!hasLng || !(Math.abs(lng) <= 180)) errs['org.lng'] = 'Longitude must be between -180 and 180';
      }

      if (hasBookings) {
        const fee = Number(org.appointmentFee || 0);
        const deposit = Number(org.depositAmount || 0);
        if (!Number.isFinite(fee) || fee < 0) errs['org.appointmentFee'] = 'Enter a valid amount';
        if (!Number.isFinite(deposit) || deposit < 0) errs['org.depositAmount'] = 'Enter a valid amount';
        if (!errs['org.appointmentFee'] && org.paymentMode === 'booking' && fee <= 0) {
          errs['org.appointmentFee'] = 'Set an appointment fee to take payment on booking';
        }
        if (!errs['org.depositAmount'] && org.paymentMode === 'deposit' && !(deposit > 0 && deposit < fee)) {
          errs['org.depositAmount'] = 'The deposit must be more than 0 and less than the appointment fee';
        }
      }
    }

    if (!isPasswordValid(form.password)) errs.password = 'Password does not meet all the requirements';
    if (form.confirmPassword !== form.password) errs.confirmPassword = 'Passwords do not match';
    if (!form.terms) errs.terms = 'You need to accept the terms to continue';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildOrganizationPayload = () => {
    const payload = {
      name: org.name.trim(),
      type: orgType,
      address: {
        street: org.street.trim(),
        city: org.city.trim(),
        state: org.state.trim(),
        country: org.country.trim() || 'Nigeria',
      },
      is24Hours: org.is24Hours,
      offersDelivery: org.offersDelivery,
    };

    // Optional text fields are left out when empty so the backend defaults apply
    ['registrationNumber', 'licenseNumber', 'email', 'phone', 'about', 'openingHours'].forEach((key) => {
      if (org[key].trim()) payload[key] = org[key].trim();
    });

    const departments = [...new Set(org.departments.split(',').map((d) => d.trim()).filter(Boolean))];
    if (departments.length) payload.departments = departments;

    if (org.lat.trim() !== '' && org.lng.trim() !== '') {
      payload.coordinates = { lat: Number(org.lat), lng: Number(org.lng) };
    }

    if (hasBookings) {
      payload.paymentSettings = {
        mode: org.paymentMode,
        appointmentFee: Number(org.appointmentFee || 0),
        depositAmount: org.paymentMode === 'deposit' ? Number(org.depositAmount || 0) : 0,
      };
    }
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) {
      const firstError = document.querySelector('[aria-invalid="true"]');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setLoading(true);
    try {
      const email = form.email.trim().toLowerCase();
      const payload = {
        fullName: form.fullName.trim(),
        email,
        password: form.password,
        role: accountType === 'patient' ? 'patient' : form.role,
      };
      // An empty phone must be left out entirely (the database keeps phone numbers unique)
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (needsOrg) payload.organization = buildOrganizationPayload();

      const { data } = await api.post('/users/signup', payload);
      toast.success(data.message);
      navigate('/verify-otp', {
        state: { email, otpSent: data.data.otpSent, requiresApproval: data.data.requiresApproval },
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setFormError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const orgError = (field) => errors[`org.${field}`];

  return (
    <AuthLayout
      title="Create your account"
      subtitle="One account for every part of your care."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">Log in</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {formError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-danger/20 bg-danger-light px-3.5 py-3 text-sm text-danger-dark" role="alert">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {formError}
          </div>
        )}

        {/* Account type */}
        <div role="radiogroup" aria-label="Account type" className="grid grid-cols-2 gap-3">
          {accountTypes.map(({ value, label, text, icon: Icon }) => {
            const active = accountType === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setAccountType(value)}
                className={`rounded-xl border p-3.5 text-left transition ${
                  active ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500/20' : 'border-gray-300 bg-white hover:border-gray-400'
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
                <p className="mt-2 text-sm font-semibold text-navy-900">{label}</p>
                <p className="text-xs text-gray-500">{text}</p>
              </button>
            );
          })}
        </div>

        {isProfessional && (
          <div className="space-y-3">
            <div>
              <label htmlFor="role" className="label">Your role</label>
              <select id="role" value={form.role} onChange={handleRoleChange} className="input">
                {PROFESSIONAL_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex items-start gap-2.5 rounded-lg bg-warning-light px-3.5 py-3 text-sm text-warning-dark">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              {needsOrg
                ? 'Your account and your organization are reviewed by an administrator before you can sign in.'
                : 'Professional accounts are reviewed by an administrator before you can sign in.'}
            </div>
          </div>
        )}

        <TextField id="fullName" label="Full name" icon={User} placeholder="Ada Okafor" autoComplete="name"
          value={form.fullName} onChange={set('fullName')} error={errors.fullName} />

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="email" label="Email" icon={Mail} type="email" placeholder="you@example.com" autoComplete="email"
            value={form.email} onChange={set('email')} error={errors.email} />
          <TextField id="phone" label="Phone (optional)" icon={Phone} type="tel" placeholder="0803 000 0000" autoComplete="tel"
            value={form.phone} onChange={set('phone')} error={errors.phone} />
        </div>

        {/* Organization details */}
        {needsOrg && (
          <fieldset className="space-y-5 rounded-xl border border-gray-200 bg-gray-50/60 p-4 sm:p-5">
            <legend className="px-2 text-sm font-semibold text-navy-900">Your {noun}</legend>

            {orgTypes.length > 1 && (
              <div>
                <label htmlFor="orgType" className="label">Organization type</label>
                <select id="orgType" value={orgType} onChange={setOrgField('type')} className="input"
                  aria-invalid={!!orgError('type')}>
                  {orgTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {orgError('type') && <p className="mt-1.5 text-xs text-danger">{orgError('type')}</p>}
              </div>
            )}

            <TextField id="orgName" label={`Name of ${noun}`} icon={Building2} placeholder="Grace Specialist Hospital"
              value={org.name} onChange={setOrgField('name')} error={orgError('name')} />

            <div className="grid gap-5 sm:grid-cols-2">
              <TextField id="orgRegistration" label="Registration number (optional)" icon={FileText} placeholder="RC 123456"
                value={org.registrationNumber} onChange={setOrgField('registrationNumber')} error={orgError('registrationNumber')} />
              <TextField id="orgLicense" label="License number (optional)" icon={FileText} placeholder="LIC-0001"
                value={org.licenseNumber} onChange={setOrgField('licenseNumber')} error={orgError('licenseNumber')} />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <TextField id="orgEmail" label="Organization email (optional)" icon={Mail} type="email" placeholder="Defaults to your email"
                value={org.email} onChange={setOrgField('email')} error={orgError('email')} />
              <TextField id="orgPhone" label="Organization phone (optional)" icon={Phone} type="tel" placeholder="Defaults to your phone"
                value={org.phone} onChange={setOrgField('phone')} error={orgError('phone')} />
            </div>

            {/* Address */}
            <div className="space-y-5">
              <TextField id="orgStreet" label="Street address (optional)" icon={MapPin} placeholder="12 Adeola Odeku Street"
                autoComplete="street-address" value={org.street} onChange={setOrgField('street')} error={orgError('street')} />
              <div className="grid gap-5 sm:grid-cols-3">
                <TextField id="orgCity" label="City" placeholder="Ikeja" autoComplete="address-level2"
                  value={org.city} onChange={setOrgField('city')} error={orgError('city')} />
                <TextField id="orgState" label="State" placeholder="Lagos" autoComplete="address-level1"
                  value={org.state} onChange={setOrgField('state')} error={orgError('state')} />
                <TextField id="orgCountry" label="Country" autoComplete="country-name"
                  value={org.country} onChange={setOrgField('country')} error={orgError('country')} />
              </div>
            </div>

            {/* Coordinates */}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="label !mb-0">Map location (optional)</span>
                <button type="button" onClick={useMyLocation} disabled={locating}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-60">
                  {locating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
                  Use my current location
                </button>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField id="orgLat" label="Latitude" type="number" placeholder="6.5244" inputMode="decimal" step="any"
                  value={org.lat} onChange={setOrgField('lat')} error={orgError('lat')} />
                <TextField id="orgLng" label="Longitude" type="number" placeholder="3.3792" inputMode="decimal" step="any"
                  value={org.lng} onChange={setOrgField('lng')} error={orgError('lng')} />
              </div>
            </div>

            {/* Hours and services */}
            <TextField id="orgHours" label="Opening hours (optional)" icon={Clock} placeholder="Mon-Sat, 8am - 6pm"
              value={org.openingHours} onChange={setOrgField('openingHours')} error={orgError('openingHours')} />

            <div className="flex flex-col gap-3 text-sm text-gray-600 sm:flex-row sm:gap-6">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input type="checkbox" checked={org.is24Hours} onChange={setOrgField('is24Hours')}
                  className="h-4 w-4 rounded border-gray-300 accent-primary-600" />
                Open 24 hours
              </label>
              {orgType === 'pharmacy' && (
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input type="checkbox" checked={org.offersDelivery} onChange={setOrgField('offersDelivery')}
                    className="h-4 w-4 rounded border-gray-300 accent-primary-600" />
                  We deliver medication
                </label>
              )}
            </div>

            {hasBookings && (
              <div>
                <label htmlFor="orgDepartments" className="label">Departments (optional)</label>
                <input id="orgDepartments" className="input" placeholder="Cardiology, Pediatrics, Radiology"
                  value={org.departments} onChange={setOrgField('departments')} />
                <p className="mt-1.5 text-xs text-gray-500">Separate departments with commas.</p>
              </div>
            )}

            <div>
              <label htmlFor="orgAbout" className="label">About (optional)</label>
              <textarea id="orgAbout" rows={3} maxLength={1000} className="input" placeholder={`A short description of your ${noun}`}
                value={org.about} onChange={setOrgField('about')} />
            </div>

            {/* Payment settings - only for places patients book appointments at */}
            {hasBookings && (
              <div className="space-y-4 border-t border-gray-200 pt-5">
                <div>
                  <p className="text-sm font-semibold text-navy-900">Appointment payments</p>
                  <p className="text-xs text-gray-500">Choose when patients pay for appointments. You can change this later.</p>
                </div>

                <div>
                  <label htmlFor="orgPaymentMode" className="label">When do patients pay?</label>
                  <select id="orgPaymentMode" value={org.paymentMode} onChange={setOrgField('paymentMode')} className="input">
                    {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <TextField id="orgFee" label="Appointment fee (₦)" type="number" inputMode="decimal" min="0" step="any" placeholder="5000"
                    value={org.appointmentFee} onChange={setOrgField('appointmentFee')} error={orgError('appointmentFee')} />
                  {org.paymentMode === 'deposit' && (
                    <TextField id="orgDeposit" label="Deposit (₦)" type="number" inputMode="decimal" min="0" step="any" placeholder="2000"
                      value={org.depositAmount} onChange={setOrgField('depositAmount')} error={orgError('depositAmount')} />
                  )}
                </div>
              </div>
            )}
          </fieldset>
        )}

        <div>
          <PasswordInput id="password" label="Password" placeholder="Create a strong password" autoComplete="new-password"
            value={form.password} onChange={set('password')} error={errors.password} />
          {form.password && <PasswordStrength password={form.password} />}
        </div>

        <PasswordInput id="confirmPassword" label="Confirm password" placeholder="Re-enter your password" autoComplete="new-password"
          value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />

        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-600">
            <input type="checkbox" checked={form.terms} onChange={set('terms')}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-primary-600" />
            <span>
              I agree to the <span className="font-medium text-primary-700">Terms of Service</span> and{' '}
              <span className="font-medium text-primary-700">Privacy Policy</span>
            </span>
          </label>
          {errors.terms && <p className="mt-1.5 text-xs text-danger">{errors.terms}</p>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}