import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, LoaderCircle, CircleAlert, ShieldCheck } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import TextField from '@/components/TextField.jsx';
import PasswordInput from '@/components/PasswordInput.jsx';
import api, { getErrorMessage } from '@/lib/api.js';
import { useAuth } from '@/context/AuthContext.jsx';

// Keep this in one place and make sure it matches what your API returns.
// (Your Login uses 'super_admin'; the route guards must use the same value.)
export const SUPER_ADMIN_ROLE = 'super_admin';
export const SUPER_ADMIN_HOME = '/dashboard/super-admin';

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email.trim() || !form.password) {
      setError('Enter your email and password');
      return;
    }

    setLoading(true);
    try {
      const email = form.email.trim().toLowerCase();
      const { data } = await api.post('/users/login', { email, password: form.password });
      const { token, user } = data.data;

      // Check the role BEFORE login() so a non-admin token is never stored.
      if (user.role !== SUPER_ADMIN_ROLE) {
        setError('This account does not have super admin access.');
        return;
      }

      login(token, user);
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}!`);
      navigate(SUPER_ADMIN_HOME, { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (data?.requiresVerification) {
        toast.info(data.message);
        navigate('/verify-otp', {
          state: { email: data.email, otpSent: data.otpSent, retryAfterSeconds: data.retryAfterSeconds },
        });
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Super admin login"
      subtitle="Sign in to manage eMedicals."
      footer={
        <>
          Not an administrator?{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
            Go to regular login
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="flex items-start gap-2.5 rounded-lg bg-primary-50 px-3.5 py-3 text-sm text-navy-700">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
          Restricted area. Only super admin accounts can sign in here.
        </div>

        {error && (
          <div
            className="flex items-start gap-2.5 rounded-lg border border-danger/20 bg-danger-light px-3.5 py-3 text-sm text-danger-dark"
            role="alert"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <TextField
          id="email"
          label="Email"
          icon={Mail}
          type="email"
          placeholder="admin@example.com"
          autoComplete="email"
          value={form.email}
          onChange={set('email')}
        />

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-navy-700">Password</label>
            <Link to="/send-otp" className="text-sm font-medium text-primary-600 hover:text-primary-700">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            label=""
            placeholder="Enter your password"
            autoComplete="current-password"
            value={form.password}
            onChange={set('password')}
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {loading ? 'Logging in...' : 'Log in as super admin'}
        </button>
      </form>
    </AuthLayout>
  );
}