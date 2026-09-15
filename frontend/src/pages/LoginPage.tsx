import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Brain, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext';
import { api, ApiError } from '../services/api';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { ErrorBanner } from '../components/common/ErrorBanner';

const FRIENDLY_ERRORS: Record<string, string> = {
  INVALID_CREDENTIALS: 'Incorrect email or password. Please try again.',
  TOO_MANY_FAILED_ATTEMPTS: 'Account temporarily locked after too many failed attempts. Please try again in 15 minutes.',
  USER_DEACTIVATED: 'Your account has been deactivated. Please contact support.',
};

const DEMO_PERSONAS: { role: UserRole; label: string; email: string; colour: string }[] = [
  { role: 'STUDENT', label: 'Student', email: 'aarav.patel@aiths.ac.in', colour: 'bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100' },
  { role: 'COUNSELLOR', label: 'Counsellor', email: 'dr.ananya@aiths.ac.in', colour: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
  { role: 'PEER_VOLUNTEER', label: 'Peer Volunteer', email: 'rohan.peer@aiths.ac.in', colour: 'bg-amberwarm-50 text-amberwarm-800 border-amberwarm-200 hover:bg-amberwarm-100' },
  { role: 'INSTITUTION_ADMIN', label: 'Dean / Admin', email: 'dean.welfare@aiths.ac.in', colour: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
  { role: 'SUPER_ADMIN', label: 'Super Admin', email: 'admin@mindbridge.org', colour: 'bg-calm-100 text-calm-700 border-calm-200 hover:bg-calm-200' },
];

export const LoginPage: React.FC = () => {
  const { user, login, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<UserRole | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(FRIENDLY_ERRORS[err.code] || err.message || 'Something went wrong. Please try again.');
      } else {
        setError('Unable to connect. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemo = async (role: UserRole) => {
    setDemoLoading(role);
    try {
      await switchDemoRole(role);
      navigate('/');
    } catch {
      setError('Demo login failed. Please try again.');
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center shadow-soft">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-calm-900">Welcome back</h1>
            <p className="text-sm text-calm-500 mt-0.5">Sign in to your confidential space</p>
          </div>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-2xl shadow-card border border-calm-200 p-6 space-y-4">
          {error && <ErrorBanner message={error} onRetry={() => setError('')} />}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="College Email"
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@college.ac.in"
              required
              autoComplete="email"
              disabled={isLoading}
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={isLoading}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="text-calm-400 hover:text-calm-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            </div>

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading} size="lg">
              Sign In
            </Button>
          </form>

          <div className="text-center text-xs text-calm-500">
            New here?{' '}
            <Link to="/register" className="text-brand-600 font-semibold hover:underline">
              Create your account
            </Link>
          </div>
        </div>

        {/* Demo Persona Switcher */}
        <div className="bg-white rounded-2xl border border-calm-200 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-calm-500 uppercase tracking-wider">
            <div className="flex-1 h-px bg-calm-200" />
            <span>1-Click Demo Personas</span>
            <div className="flex-1 h-px bg-calm-200" />
          </div>
          <p className="text-[11px] text-calm-400 text-center">For SIH evaluators — instantly switch between all 5 roles</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DEMO_PERSONAS.map((p) => (
              <button
                key={p.role}
                onClick={() => handleDemo(p.role)}
                disabled={!!demoLoading}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${p.colour} disabled:opacity-60`}
                aria-label={`Sign in as ${p.label}`}
              >
                {demoLoading === p.role ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : null}
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Safety helpline */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-calm-400">
          <ShieldCheck className="w-3.5 h-3.5 text-calm-400" />
          <span>Crisis support: Tele-MANAS <strong className="text-calm-600">14416</strong> | KIRAN <strong className="text-calm-600">1800-599-0019</strong></span>
        </div>
      </div>
    </div>
  );
};
