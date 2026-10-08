import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldCheck, MailCheck, ArrowLeft, LoaderCircle, Clock } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import OtpInput from '@/components/OtpInput.jsx';
import api, { getErrorMessage } from '@/lib/api.js';
import { useAuth } from '@/context/AuthContext.jsx';

const LENGTH = 6;
const RESEND_SECONDS = 60;

const maskEmail = (email) => {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`;
};

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { login } = useAuth();

  const state = location.state || {};
  const email = state.email || params.get('email');

  const [digits, setDigits] = useState(Array(LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [awaitingApproval, setAwaitingApproval] = useState(false);

  // If the first email failed to send, let the user resend straight away
  const initialCooldown = state.retryAfterSeconds ?? (state.otpSent === false ? 0 : RESEND_SECONDS);
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (!email) return <Navigate to="/send-otp" replace />;

  const reset = () => {
    setDigits(Array(LENGTH).fill(''));
    setShake(false);
  };

  const verify = async (code) => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/users/verify-otp', { email, otp: code });
      if (data.data?.requiresApproval) {
        setAwaitingApproval(true);
        return;
      }
      login(data.data.token, data.data.user);
      toast.success('You are in. Welcome to eMedicals!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setShake(true);
      setTimeout(reset, 450);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < LENGTH) {
      setError('Enter the 6-digit code');
      return;
    }
    verify(code);
  };

  const resend = async () => {
    setResending(true);
    setError('');
    try {
      await api.post('/users/request-otp', { email });
      toast.success('A new code is on its way');
      setCooldown(RESEND_SECONDS);
      reset();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  // Email verified, but a professional account still needs admin approval
  if (awaitingApproval) {
    return (
      <AuthLayout title="Email verified" subtitle="One last step before you can sign in.">
        <div className="card flex items-start gap-4 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning-light text-warning-dark">
            <Clock className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-navy-900">Awaiting administrator approval</p>
            <p className="mt-1 text-sm text-gray-600">
              We're reviewing your professional account. You'll be able to log in as soon as it's approved.
            </p>
          </div>
        </div>
        <Link to="/login" className="btn-primary mt-6 w-full py-3">Back to log in</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Enter your code"
      subtitle={<>We sent a 6-digit code to <span className="font-semibold text-navy-800">{maskEmail(email)}</span></>}
      footer={
        <Link to="/send-otp" className="inline-flex items-center gap-1.5 font-semibold text-primary-600 hover:text-primary-700">
          <ArrowLeft className="h-4 w-4" /> Use a different email
        </Link>
      }
    >
      <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
        <ShieldCheck className="h-7 w-7" />
      </span>

      <form onSubmit={handleSubmit} className="space-y-6">
        <OtpInput digits={digits} onChange={setDigits} onComplete={verify} disabled={loading} shake={shake} length={LENGTH} />

        {error && <p className="text-center text-sm text-danger" role="alert">{error}</p>}

        <button type="submit" disabled={loading || digits.some((d) => !d)} className="btn-primary w-full py-3">
          {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {loading ? 'Verifying...' : 'Verify and continue'}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-600">
        <MailCheck className="h-4 w-4 text-gray-400" />
        {cooldown > 0 ? (
          <span>Resend code in <span className="font-semibold text-navy-800">{cooldown}s</span></span>
        ) : (
          <button type="button" onClick={resend} disabled={resending}
            className="font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-60">
            {resending ? 'Sending...' : "Didn't get it? Resend code"}
          </button>
        )}
      </div>
    </AuthLayout>
  );
}
