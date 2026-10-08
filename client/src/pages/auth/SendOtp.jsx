import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, MailCheck, ArrowLeft, LoaderCircle, CircleAlert } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import TextField from '@/components/TextField.jsx';
import api, { getErrorMessage } from '@/lib/api.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SendOtp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      setError('Enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await api.post('/users/request-otp', { email: clean });
      toast.success('Check your inbox for the code');
      navigate('/verify-otp', { state: { email: clean } });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in with email code"
      subtitle="Enter your email and we'll send you a 6-digit code. No password needed."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-primary-600 hover:text-primary-700">
          <ArrowLeft className="h-4 w-4" /> Back to log in
        </Link>
      }
    >
      <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
        <MailCheck className="h-7 w-7" />
      </span>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-danger/20 bg-danger-light px-3.5 py-3 text-sm text-danger-dark" role="alert">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        <TextField id="email" label="Email" icon={Mail} type="email" placeholder="you@example.com" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {loading ? 'Sending code...' : 'Send code'}
        </button>
      </form>
    </AuthLayout>
  );
}
