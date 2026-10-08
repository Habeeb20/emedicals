// import { useState } from 'react';
// import { Link, useLocation, useNavigate } from 'react-router-dom';
// import { toast } from 'sonner';
// import { Mail, LoaderCircle, CircleAlert, Clock } from 'lucide-react';
// import AuthLayout from '@/components/AuthLayout.jsx';
// import TextField from '@/components/TextField.jsx';
// import PasswordInput from '@/components/PasswordInput.jsx';
// import api, { getErrorMessage } from '@/lib/api.js';
// import { useAuth } from '@/context/AuthContext.jsx';


// export const homeFor = (user) =>
//   user?.role === 'super_admin' ? '/dashboard/super-admin' : '/dashboard';
// // GuestRoute
// if (user) return <Navigate to={homeFor(user)} replace />;

// export default function Login() {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { login } = useAuth();

//   const [form, setForm] = useState({ email: '', password: '' });
//   const [error, setError] = useState('');
//   const [pending, setPending] = useState(false);   // account awaiting admin approval
//   const [loading, setLoading] = useState(false);

//   const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError('');
//     setPending(false);

//     if (!form.email.trim() || !form.password) {
//       setError('Enter your email and password');
//       return;
//     }

//     setLoading(true);
//     try {
//       const email = form.email.trim().toLowerCase();
//       const { data } = await api.post('/users/login', { email, password: form.password });
//      const { token, user } = data.data;
// login(token, user);
// toast.success(`Welcome back, ${user.fullName.split(' ')[0]}!`);
// navigate(user.role === 'super_admin' ? homeFor(user) : location.state?.from?.pathname || homeFor(user), { replace: true });
//     } catch (err) {
//       const data = err.response?.data;
//       if (data?.requiresVerification) {
//         // Email not verified yet. The server already sent a fresh code.
//         toast.info(data.message);
//         navigate('/verify-otp', {
//           state: { email: data.email, otpSent: data.otpSent, retryAfterSeconds: data.retryAfterSeconds },
//         });
//       } else if (data?.requiresApproval) {
//         setPending(true);
//       } else {
//         setError(getErrorMessage(err));
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <AuthLayout
//       title="Welcome back"
//       subtitle="Log in to continue to your account."
//       footer={<>New to eMedicals? <Link to="/signup" className="font-semibold text-primary-600 hover:text-primary-700">Create an account</Link></>}
//     >
//       <form onSubmit={handleSubmit} className="space-y-5" noValidate>
//         {error && (
//           <div className="flex items-start gap-2.5 rounded-lg border border-danger/20 bg-danger-light px-3.5 py-3 text-sm text-danger-dark" role="alert">
//             <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
//             {error}
//           </div>
//         )}
//         {pending && (
//           <div className="flex items-start gap-2.5 rounded-lg bg-warning-light px-3.5 py-3 text-sm text-warning-dark" role="status">
//             <Clock className="mt-0.5 h-4 w-4 shrink-0" />
//             Your account is awaiting administrator approval. You'll be able to sign in once it's approved.
//           </div>
//         )}

//         <TextField id="email" label="Email" icon={Mail} type="email" placeholder="you@example.com" autoComplete="email"
//           value={form.email} onChange={set('email')} />

//         <div>
//           <div className="mb-1.5 flex items-center justify-between">
//             <label htmlFor="password" className="text-sm font-medium text-navy-700">Password</label>
//             <Link to="/send-otp" className="text-sm font-medium text-primary-600 hover:text-primary-700">Forgot password?</Link>
//           </div>
//           <PasswordInput id="password" label="" placeholder="Enter your password" autoComplete="current-password"
//             value={form.password} onChange={set('password')} />
//         </div>

//         <button type="submit" disabled={loading} className="btn-primary w-full py-3">
//           {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
//           {loading ? 'Logging in...' : 'Log in'}
//         </button>
//       </form>

//       <div className="my-6 flex items-center gap-4 text-xs font-medium uppercase tracking-wide text-gray-400">
//         <span className="h-px flex-1 bg-gray-200" /> or <span className="h-px flex-1 bg-gray-200" />
//       </div>

//       <Link to="/send-otp" className="btn-outline w-full py-3">
//         <Mail className="h-4 w-4 text-primary-600" />
//         Continue with email code
//       </Link>
//       <p className="mt-3 text-center text-xs text-gray-500">No password needed. We'll email you a 6-digit code.</p>
//     </AuthLayout>
//   );
// }





























import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, LoaderCircle, CircleAlert, Clock } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import TextField from '@/components/TextField.jsx';
import PasswordInput from '@/components/PasswordInput.jsx';
import api, { getErrorMessage } from '@/lib/api.js';
import { homeFor } from '@/lib/homeFor.js';
import { useAuth } from '@/context/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);   // account awaiting admin approval
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPending(false);

    if (!form.email.trim() || !form.password) {
      setError('Enter your email and password');
      return;
    }

    setLoading(true);
    try {
      const email = form.email.trim().toLowerCase();
      const { data } = await api.post('/users/login', { email, password: form.password });
      const { token, user } = data.data;

      login(token, user);
      console.log(user)
      toast.success(`Welcome back, ${user.fullName.split(' ')[0]}!`);

      // Super admin always goes to their dashboard; everyone else returns to where they came from
      const destination =
        user.role === 'super_admin'
          ? homeFor(user)
          : location.state?.from?.pathname || homeFor(user);
      navigate(destination, { replace: true });
    } catch (err) {
      const data = err.response?.data;
      if (data?.requiresVerification) {
        // Email not verified yet. The server already sent a fresh code.
        toast.info(data.message);
        navigate('/verify-otp', {
          state: { email: data.email, otpSent: data.otpSent, retryAfterSeconds: data.retryAfterSeconds },
        });
      } else if (data?.requiresApproval) {
        setPending(true);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to continue to your account."
      footer={<>New to eMedicals? <Link to="/signup" className="font-semibold text-primary-600 hover:text-primary-700">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-danger/20 bg-danger-light px-3.5 py-3 text-sm text-danger-dark" role="alert">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {pending && (
          <div className="flex items-start gap-2.5 rounded-lg bg-warning-light px-3.5 py-3 text-sm text-warning-dark" role="status">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            Your account is awaiting administrator approval. You'll be able to sign in once it's approved.
          </div>
        )}

        <TextField id="email" label="Email" icon={Mail} type="email" placeholder="you@example.com" autoComplete="email"
          value={form.email} onChange={set('email')} />

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-navy-700">Password</label>
            <Link to="/send-otp" className="text-sm font-medium text-primary-600 hover:text-primary-700">Forgot password?</Link>
          </div>
          <PasswordInput id="password" label="" placeholder="Enter your password" autoComplete="current-password"
            value={form.password} onChange={set('password')} />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4 text-xs font-medium uppercase tracking-wide text-gray-400">
        <span className="h-px flex-1 bg-gray-200" /> or <span className="h-px flex-1 bg-gray-200" />
      </div>

      <Link to="/send-otp" className="btn-outline w-full py-3">
        <Mail className="h-4 w-4 text-primary-600" />
        Continue with email code
      </Link>
      <p className="mt-3 text-center text-xs text-gray-500">No password needed. We'll email you a 6-digit code.</p>
    </AuthLayout>
  );
}