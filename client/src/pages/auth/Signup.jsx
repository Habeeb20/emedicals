import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { User, Mail, Phone, Stethoscope, HeartPulse, LoaderCircle, CircleAlert, Info } from 'lucide-react';
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

const accountTypes = [
  { value: 'patient', label: 'Patient', text: 'Book care and manage records', icon: HeartPulse },
  { value: 'professional', label: 'Professional', text: 'Doctor, lab, pharmacy, staff', icon: Stethoscope },
];

export default function Signup() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState('patient');
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', role: 'doctor', password: '', confirmPassword: '', terms: false,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (form.fullName.trim().length < 2) errs.fullName = 'Please enter your full name';
    if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Enter a valid email address';
    if (form.phone.trim() && !PHONE_RE.test(form.phone.trim())) errs.phone = 'Enter a valid phone number';
    if (!isPasswordValid(form.password)) errs.password = 'Password does not meet all the requirements';
    if (form.confirmPassword !== form.password) errs.confirmPassword = 'Passwords do not match';
    if (!form.terms) errs.terms = 'You need to accept the terms to continue';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

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

        {accountType === 'professional' && (
          <div className="space-y-3">
            <div>
              <label htmlFor="role" className="label">Your role</label>
              <select id="role" value={form.role} onChange={set('role')} className="input">
                {PROFESSIONAL_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex items-start gap-2.5 rounded-lg bg-warning-light px-3.5 py-3 text-sm text-warning-dark">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              Professional accounts are reviewed by an administrator before you can sign in.
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
