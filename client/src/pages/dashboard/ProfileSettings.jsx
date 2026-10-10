// import { useEffect, useState } from 'react';
// import { Plus, X } from 'lucide-react';
// import api from '@/lib/api.js'; // your axios instance
// import ImageUpload from '../../utils/ImageUpload';


// const input = 'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-navy-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 disabled:bg-gray-100 disabled:text-gray-500';
// const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// const Card = ({ title, hint, children }) => (
//   <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
//     <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
//     {hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
//     <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
//   </section>
// );
// const Field = ({ label, full, children }) => (
//   <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
//     <span className="mb-1.5 block text-sm font-medium text-navy-800">{label}</span>
//     {children}
//   </label>
// );

// /** <ProfileSettings onSaved={(user) => refreshAuthUser(user)} /> works for every role. */
// export default function ProfileSettings({ onSaved }) {
//   const [data, setData] = useState(null);
//   const [form, setForm] = useState(null);
//   const [busy, setBusy] = useState(false);
//   const [msg, setMsg] = useState({ type: '', text: '' });

//   const hydrate = (d) => {
//     setData(d);
//     const u = d.user;
//     setForm({
//       user: {
//         fullName: u.fullName || '', phone: u.phone || '', gender: u.gender || '', state: u.state || '', lga: u.lga || '',
//         address: u.address || '', dateOfBirth: u.dateOfBirth ? u.dateOfBirth.slice(0, 10) : '', avatar: u.profilePicture || '',
//       },
//       profile: { availability: [], ...(d.profile || {}) },
//       organization: d.organization && {
//         ...d.organization, address: { ...d.organization.address }, departments: (d.organization.departments || []).join(', '), logo: d.organization.logo?.url || '',
//       },
//     });
//   };

//   useEffect(() => { api.get('/users/profile/me').then((r) => hydrate(r.data)).catch(() => setMsg({ type: 'error', text: 'Could not load your profile' })); }, []);

//   const set = (section, key) => (e) => setForm((f) => ({ ...f, [section]: { ...f[section], [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value } }));
//   const setVal = (section, key, value) => setForm((f) => ({ ...f, [section]: { ...f[section], [key]: value } }));
//   const setAddr = (key) => (e) => setForm((f) => ({ ...f, organization: { ...f.organization, address: { ...f.organization.address, [key]: e.target.value } } }));

//   const slots = form?.profile.availability || [];
//   const setSlot = (i, k, v) => setVal('profile', 'availability', slots.map((s, n) => (n === i ? { ...s, [k]: v } : s)));

//   const save = async (e) => {
//     e.preventDefault(); setBusy(true); setMsg({ type: '', text: '' });
//     const payload = { user: { ...form.user, avatar: form.user.avatar || null } };
//     if (data.profileType === 'doctor') {
//       const { specialization, licenseNumber, yearsOfExperience, bio, consultationFee, availability, isAvailableOnline } = form.profile;
//       payload.profile = { specialization, licenseNumber, yearsOfExperience, bio, consultationFee, availability, isAvailableOnline };
//     } else if (data.profileType === 'staff') {
//       const { designation, department, licenseNumber, employeeId } = form.profile;
//       payload.profile = { designation, department, licenseNumber, employeeId };
//     }
//     if (data.canEditOrganization) {
//       const o = form.organization;
//       payload.organization = {
//         name: o.name, phone: o.phone, email: o.email, registrationNumber: o.registrationNumber, licenseNumber: o.licenseNumber,
//         address: o.address, logo: o.logo || null, departments: o.departments.split(',').map((d) => d.trim()).filter(Boolean),
//       };
//     }
//     try {
//       const res = await api.patch('/users/profile/me', payload);
//       hydrate(res.data); onSaved?.(res.data.user);
//       setMsg({ type: 'ok', text: 'Profile updated' });
//     } catch (err) {
//       setMsg({ type: 'error', text: err.response?.data?.message || 'Could not save your changes' });
//     } finally { setBusy(false); }
//   };

//   if (!form) return <p className="p-8 text-gray-500">{msg.text || 'Loading…'}</p>;
//   const { user, profile, organization } = form;

//   return (
//     <form onSubmit={save} className="mx-auto max-w-3xl space-y-6 px-4 py-8">
//       <h1 className="text-3xl font-bold text-navy-900">Profile settings</h1>

//       <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
//         <ImageUpload value={user.avatar} onChange={(url) => setVal('user', 'avatar', url || '')} fallback={user.fullName.charAt(0).toUpperCase()} />
//       </section>

//       <Card title="Personal details">
//         <Field label="Full name"><input required className={input} value={user.fullName} onChange={set('user', 'fullName')} /></Field>
//         <Field label="Email"><input disabled className={input} value={data.user.email} /></Field>
//         <Field label="Phone"><input className={input} value={user.phone} onChange={set('user', 'phone')} /></Field>
//         <Field label="Date of birth"><input type="date" className={input} value={user.dateOfBirth} onChange={set('user', 'dateOfBirth')} /></Field>
//         <Field label="Gender">
//           <select className={input} value={user.gender} onChange={set('user', 'gender')}>
//             <option value="">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
//           </select>
//         </Field>
//         <Field label="State"><input className={input} value={user.state} onChange={set('user', 'state')} /></Field>
//         <Field label="LGA"><input className={input} value={user.lga} onChange={set('user', 'lga')} /></Field>
//         <Field label="Address"><input className={input} value={user.address} onChange={set('user', 'address')} /></Field>
//       </Card>

//       {data.profileType === 'doctor' && (
//         <Card title="Professional details">
//           <Field label="Specialization"><input required className={input} value={profile.specialization || ''} onChange={set('profile', 'specialization')} /></Field>
//           <Field label="Licence number (MDCN)"><input required className={input} value={profile.licenseNumber || ''} onChange={set('profile', 'licenseNumber')} /></Field>
//           <Field label="Years of experience"><input type="number" min="0" className={input} value={profile.yearsOfExperience ?? ''} onChange={set('profile', 'yearsOfExperience')} /></Field>
//           <Field label="Consultation fee (₦)"><input type="number" min="0" className={input} value={profile.consultationFee ?? ''} onChange={set('profile', 'consultationFee')} /></Field>
//           <Field label="Bio" full><textarea rows={4} className={input} value={profile.bio || ''} onChange={set('profile', 'bio')} /></Field>
//           <label className="flex items-center gap-3 sm:col-span-2">
//             <input type="checkbox" checked={!!profile.isAvailableOnline} onChange={set('profile', 'isAvailableOnline')} className="h-5 w-5 rounded border-gray-300 text-primary-600" />
//             <span className="text-sm font-medium text-navy-800">Available for online consultations</span>
//           </label>

//           <div className="sm:col-span-2">
//             <p className="mb-2 text-sm font-medium text-navy-800">Weekly availability</p>
//             <div className="space-y-2">
//               {slots.map((s, i) => (
//                 <div key={i} className="flex flex-wrap items-center gap-2">
//                   <select className={`${input} !w-24`} value={s.day} onChange={(e) => setSlot(i, 'day', e.target.value)}>{DAYS.map((d) => <option key={d} value={d}>{d}</option>)}</select>
//                   <input type="time" className={`${input} !w-32`} value={s.start} onChange={(e) => setSlot(i, 'start', e.target.value)} />
//                   <span className="text-gray-400">to</span>
//                   <input type="time" className={`${input} !w-32`} value={s.end} onChange={(e) => setSlot(i, 'end', e.target.value)} />
//                   <button type="button" aria-label="Remove slot" onClick={() => setVal('profile', 'availability', slots.filter((_, n) => n !== i))} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X size={16} /></button>
//                 </div>
//               ))}
//             </div>
//             <button type="button" onClick={() => setVal('profile', 'availability', [...slots, { day: 'mon', start: '09:00', end: '13:00' }])} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-700"><Plus size={16} />Add time slot</button>
//           </div>
//         </Card>
//       )}

//       {data.profileType === 'staff' && (
//         <Card title="Work details" hint="Your organization is set by your administrator.">
//           <Field label="Designation"><input className={input} value={profile.designation || ''} onChange={set('profile', 'designation')} /></Field>
//           <Field label="Department"><input className={input} value={profile.department || ''} onChange={set('profile', 'department')} /></Field>
//           <Field label="Licence number"><input className={input} value={profile.licenseNumber || ''} onChange={set('profile', 'licenseNumber')} /></Field>
//           <Field label="Employee ID"><input className={input} value={profile.employeeId || ''} onChange={set('profile', 'employeeId')} /></Field>
//         </Card>
//       )}

//       {data.canEditOrganization && organization && (
//         <>
//           <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
//             <p className="mb-4 text-lg font-semibold text-navy-900">Organization logo</p>
//             <ImageUpload shape="square" label="Change logo" value={organization.logo} onChange={(url) => setVal('organization', 'logo', url || '')} fallback={organization.name.charAt(0).toUpperCase()} />
//           </section>
//           <Card title="Organization details">
//             <Field label="Name" full><input required className={input} value={organization.name} onChange={set('organization', 'name')} /></Field>
//             <Field label="Email"><input type="email" className={input} value={organization.email || ''} onChange={set('organization', 'email')} /></Field>
//             <Field label="Phone"><input className={input} value={organization.phone || ''} onChange={set('organization', 'phone')} /></Field>
//             <Field label="Registration number"><input className={input} value={organization.registrationNumber || ''} onChange={set('organization', 'registrationNumber')} /></Field>
//             <Field label="Licence number"><input className={input} value={organization.licenseNumber || ''} onChange={set('organization', 'licenseNumber')} /></Field>
//             <Field label="Street" full><input className={input} value={organization.address.street || ''} onChange={setAddr('street')} /></Field>
//             <Field label="City"><input className={input} value={organization.address.city || ''} onChange={setAddr('city')} /></Field>
//             <Field label="State"><input className={input} value={organization.address.state || ''} onChange={setAddr('state')} /></Field>
//             {['hospital', 'clinic'].includes(organization.type) && (
//               <Field label="Departments (separate with commas)" full>
//                 <input className={input} placeholder="Dentistry, Optician, Cardiology" value={organization.departments} onChange={set('organization', 'departments')} />
//               </Field>
//             )}
//           </Card>
//         </>
//       )}

//       {msg.text && (
//         <p className={`rounded-xl p-3 text-sm ${msg.type === 'ok' ? 'bg-success-light text-success-dark' : 'bg-danger-light text-danger-dark'}`}>{msg.text}</p>
//       )}
//       <button disabled={busy} className="btn-primary w-full disabled:opacity-50 sm:w-auto">{busy ? 'Saving…' : 'Save changes'}</button>
//     </form>
//   );
// }




import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import api from '@/lib/api.js'; // your axios instance
import ImageUpload from '../../utils/ImageUpload';
import { statesAndLgas } from '../../utils/stateAndLga';
import { DEPARTMENTS } from '../../config/medicalDepartments';


const input = 'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-navy-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 disabled:bg-gray-100 disabled:text-gray-500';
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const STATES = Object.keys(statesAndLgas).sort();
const DEPARTMENT_NAMES = DEPARTMENTS.map((d) => d.name);

const Card = ({ title, hint, children }) => (
  <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
    <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
    {hint && <p className="mt-1 text-sm text-gray-500">{hint}</p>}
    <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
  </section>
);

const Field = ({ label, full, children }) => (
  <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
    <span className="mb-1.5 block text-sm font-medium text-navy-800">{label}</span>
    {children}
  </label>
);

/**
 * Dropdown that always shows the saved value, even if it is no longer in `options`
 * (old data like "Cardiologist" or a differently spelled state), so saving never wipes it silently.
 */
const Select = ({ value, onChange, options, placeholder, disabled, required }) => (
  <select required={required} disabled={disabled} className={input} value={value || ''} onChange={onChange}>
    <option value="">{placeholder}</option>
    {value && !options.includes(value) && <option value={value}>{value}</option>}
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

/** <ProfileSettings onSaved={(user) => refreshAuthUser(user)} /> works for every role. */
export default function ProfileSettings({ onSaved }) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const hydrate = (d) => {
    setData(d);
    const u = d.user;
    setForm({
      user: {
        fullName: u.fullName || '', phone: u.phone || '', gender: u.gender || '', state: u.state || '', lga: u.lga || '',
        address: u.address || '', dateOfBirth: u.dateOfBirth ? u.dateOfBirth.slice(0, 10) : '', avatar: u.profilePicture || '',
      },
      profile: { availability: [], ...(d.profile || {}) },
      organization: d.organization && {
        ...d.organization,
        address: { ...d.organization.address },
        departments: d.organization.departments || [], // kept as an array now
        logo: d.organization.logo?.url || '',
      },
    });
  };

  useEffect(() => {
    api.get('/users/profile/me')
      .then((r) => hydrate(r.data))
      .catch(() => setMsg({ type: 'error', text: 'Could not load your profile' }));
  }, []);

  const set = (section, key) => (e) =>
    setForm((f) => ({ ...f, [section]: { ...f[section], [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value } }));
  const setVal = (section, key, value) => setForm((f) => ({ ...f, [section]: { ...f[section], [key]: value } }));
  const setAddr = (key) => (e) =>
    setForm((f) => ({ ...f, organization: { ...f.organization, address: { ...f.organization.address, [key]: e.target.value } } }));

  // Changing the state clears the LGA so it can never belong to a different state
  const setUserState = (e) =>
    setForm((f) => ({ ...f, user: { ...f.user, state: e.target.value, lga: '' } }));

  const slots = form?.profile.availability || [];
  const setSlot = (i, k, v) => setVal('profile', 'availability', slots.map((s, n) => (n === i ? { ...s, [k]: v } : s)));

  // Organization departments: the standard list plus any custom ones already saved
  const orgDepartments = form?.organization?.departments || [];
  const departmentOptions = useMemo(
    () => [...DEPARTMENT_NAMES, ...orgDepartments.filter((d) => !DEPARTMENT_NAMES.includes(d))],
    [orgDepartments]
  );
  const toggleDepartment = (name) =>
    setVal(
      'organization',
      'departments',
      orgDepartments.includes(name) ? orgDepartments.filter((d) => d !== name) : [...orgDepartments, name]
    );

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg({ type: '', text: '' });

    const payload = { user: { ...form.user, avatar: form.user.avatar || null } };

    if (data.profileType === 'doctor') {
      const { specialization, licenseNumber, yearsOfExperience, bio, consultationFee, availability, isAvailableOnline } = form.profile;
      payload.profile = { specialization, licenseNumber, yearsOfExperience, bio, consultationFee, availability, isAvailableOnline };
    } else if (data.profileType === 'staff') {
      const { designation, department, licenseNumber, employeeId } = form.profile;
      payload.profile = { designation, department, licenseNumber, employeeId };
    }

    if (data.canEditOrganization) {
      const o = form.organization;
      payload.organization = {
        name: o.name, phone: o.phone, email: o.email, registrationNumber: o.registrationNumber, licenseNumber: o.licenseNumber,
        address: o.address, logo: o.logo || null, departments: o.departments,
      };
    }

    try {
      const res = await api.put('/users/profile/me', payload);
      hydrate(res.data);
      onSaved?.(res.data.user);
      setMsg({ type: 'ok', text: 'Profile updated' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Could not save your changes' });
    } finally {
      setBusy(false);
    }
  };

  if (!form) return <p className="p-8 text-gray-500">{msg.text || 'Loading…'}</p>;
  const { user, profile, organization } = form;

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-3xl font-bold text-navy-900">Profile settings</h1>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
        <ImageUpload
          value={user.avatar}
          onChange={(url) => setVal('user', 'avatar', url || '')}
          fallback={user.fullName.charAt(0).toUpperCase()}
        />
      </section>

      <Card title="Personal details">
        <Field label="Full name"><input required className={input} value={user.fullName} onChange={set('user', 'fullName')} /></Field>
        <Field label="Email"><input disabled className={input} value={data.user.email} /></Field>
        <Field label="Phone"><input className={input} value={user.phone} onChange={set('user', 'phone')} /></Field>
        <Field label="Date of birth"><input type="date" className={input} value={user.dateOfBirth} onChange={set('user', 'dateOfBirth')} /></Field>
        <Field label="Gender">
          <select className={input} value={user.gender} onChange={set('user', 'gender')}>
            <option value="">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
          </select>
        </Field>
        <Field label="State">
          <Select value={user.state} onChange={setUserState} options={STATES} placeholder="Select state" />
        </Field>
        <Field label="LGA">
          <Select
            value={user.lga}
            onChange={set('user', 'lga')}
            options={statesAndLgas[user.state] || []}
            placeholder={user.state ? 'Select LGA' : 'Select a state first'}
            disabled={!user.state}
          />
        </Field>
        <Field label="Address"><input className={input} value={user.address} onChange={set('user', 'address')} /></Field>
      </Card>

      {data.profileType === 'doctor' && (
        <Card title="Professional details">
          <Field label="Specialization">
            <Select
              required
              value={profile.specialization}
              onChange={set('profile', 'specialization')}
              options={DEPARTMENT_NAMES}
              placeholder="Select specialization"
            />
          </Field>
          <Field label="Licence number (MDCN)"><input required className={input} value={profile.licenseNumber || ''} onChange={set('profile', 'licenseNumber')} /></Field>
          <Field label="Years of experience"><input type="number" min="0" className={input} value={profile.yearsOfExperience ?? ''} onChange={set('profile', 'yearsOfExperience')} /></Field>
          <Field label="Consultation fee (₦)"><input type="number" min="0" className={input} value={profile.consultationFee ?? ''} onChange={set('profile', 'consultationFee')} /></Field>
          <Field label="Bio" full><textarea rows={4} className={input} value={profile.bio || ''} onChange={set('profile', 'bio')} /></Field>
          <label className="flex items-center gap-3 sm:col-span-2">
            <input type="checkbox" checked={!!profile.isAvailableOnline} onChange={set('profile', 'isAvailableOnline')} className="h-5 w-5 rounded border-gray-300 text-primary-600" />
            <span className="text-sm font-medium text-navy-800">Available for online consultations</span>
          </label>

          <div className="sm:col-span-2">
            <p className="mb-2 text-sm font-medium text-navy-800">Weekly availability</p>
            <div className="space-y-2">
              {slots.map((s, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <select className={`${input} !w-24`} value={s.day} onChange={(e) => setSlot(i, 'day', e.target.value)}>
                    {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input type="time" className={`${input} !w-32`} value={s.start} onChange={(e) => setSlot(i, 'start', e.target.value)} />
                  <span className="text-gray-400">to</span>
                  <input type="time" className={`${input} !w-32`} value={s.end} onChange={(e) => setSlot(i, 'end', e.target.value)} />
                  <button
                    type="button"
                    aria-label="Remove slot"
                    onClick={() => setVal('profile', 'availability', slots.filter((_, n) => n !== i))}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setVal('profile', 'availability', [...slots, { day: 'mon', start: '09:00', end: '13:00' }])}
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-700"
            >
              <Plus size={16} />Add time slot
            </button>
          </div>
        </Card>
      )}

      {data.profileType === 'staff' && (
        <Card title="Work details" hint="Your organization is set by your administrator.">
          <Field label="Designation"><input className={input} value={profile.designation || ''} onChange={set('profile', 'designation')} /></Field>
          <Field label="Department"><input className={input} value={profile.department || ''} onChange={set('profile', 'department')} /></Field>
          <Field label="Licence number"><input className={input} value={profile.licenseNumber || ''} onChange={set('profile', 'licenseNumber')} /></Field>
          <Field label="Employee ID"><input className={input} value={profile.employeeId || ''} onChange={set('profile', 'employeeId')} /></Field>
        </Card>
      )}

      {data.canEditOrganization && organization && (
        <>
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
            <p className="mb-4 text-lg font-semibold text-navy-900">Organization logo</p>
            <ImageUpload
              shape="square"
              label="Change logo"
              value={organization.logo}
              onChange={(url) => setVal('organization', 'logo', url || '')}
              fallback={organization.name.charAt(0).toUpperCase()}
            />
          </section>

          <Card title="Organization details">
            <Field label="Name" full><input required className={input} value={organization.name} onChange={set('organization', 'name')} /></Field>
            <Field label="Email"><input type="email" className={input} value={organization.email || ''} onChange={set('organization', 'email')} /></Field>
            <Field label="Phone"><input className={input} value={organization.phone || ''} onChange={set('organization', 'phone')} /></Field>
            <Field label="Registration number"><input className={input} value={organization.registrationNumber || ''} onChange={set('organization', 'registrationNumber')} /></Field>
            <Field label="Licence number"><input className={input} value={organization.licenseNumber || ''} onChange={set('organization', 'licenseNumber')} /></Field>
            <Field label="Street" full><input className={input} value={organization.address.street || ''} onChange={setAddr('street')} /></Field>
            <Field label="City"><input className={input} value={organization.address.city || ''} onChange={setAddr('city')} /></Field>
            <Field label="State">
              <Select value={organization.address.state} onChange={setAddr('state')} options={STATES} placeholder="Select state" />
            </Field>

            {['hospital', 'clinic'].includes(organization.type) && (
              <div className="sm:col-span-2">
                <p className="mb-2 text-sm font-medium text-navy-800">Departments</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {departmentOptions.map((name) => (
                    <label key={name} className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 hover:border-primary-300">
                      <input
                        type="checkbox"
                        checked={orgDepartments.includes(name)}
                        onChange={() => toggleDepartment(name)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600"
                      />
                      <span className="text-sm text-navy-800">{name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {msg.text && (
        <p className={`rounded-xl p-3 text-sm ${msg.type === 'ok' ? 'bg-success-light text-success-dark' : 'bg-danger-light text-danger-dark'}`}>
          {msg.text}
        </p>
      )}

      <button disabled={busy} className="btn-primary w-full disabled:opacity-50 sm:w-auto">
        {busy ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}