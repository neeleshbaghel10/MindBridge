import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Brain, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle, User, GraduationCap, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../services/api';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { ErrorBanner } from '../components/common/ErrorBanner';

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Civil Engineering',
  'Electronics & Communication',
  'Information Technology',
  'Chemical Engineering',
  'Other',
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'mr', label: 'Marathi' },
  { value: 'bn', label: 'Bengali' },
];

const PREFIXES = ['Serene', 'Tranquil', 'Mindful', 'Resilient', 'Gentle', 'Kind', 'Calm'];
const NOUNS = ['Sparrow', 'River', 'Forest', 'Mountain', 'Harbor', 'Cedar', 'Pebble'];

function genPreviewAlias() {
  return `${PREFIXES[Math.floor(Math.random() * PREFIXES.length)]}${NOUNS[Math.floor(Math.random() * NOUNS.length)]}${Math.floor(1000 + Math.random() * 9000)}`;
}

function getPasswordStrength(pw: string): { label: string; width: string; colour: string } {
  if (pw.length === 0) return { label: '', width: 'w-0', colour: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', width: 'w-1/4', colour: 'bg-crisis-500' };
  if (score <= 3) return { label: 'Fair', width: 'w-2/4', colour: 'bg-amberwarm-400' };
  return { label: 'Strong', width: 'w-full', colour: 'bg-emerald-500' };
}

export const RegisterPage: React.FC = () => {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewAlias] = useState(genPreviewAlias());

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: DEPARTMENTS[0],
    yearOfStudy: 1,
    preferredLanguage: 'en',
    agreeTerms: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const setField = (key: string, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: '' }));
  };

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required.';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required.';
    if (!form.email.includes('@')) errs.email = 'Please enter a valid email.';
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!form.agreeTerms) errs.agreeTerms = 'You must agree to continue.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;
    setError('');
    setIsLoading(true);
    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        department: form.department,
        yearOfStudy: form.yearOfStudy,
        preferredLanguage: form.preferredLanguage,
      });
      navigate('/onboarding');
    } catch (err) {
      if (err instanceof ApiError) {
        const friendly: Record<string, string> = {
          USER_ALREADY_EXISTS: 'An account with this email already exists.',
          VALIDATION_ERROR: 'Please check your details and try again.',
          CANNOT_SELF_ASSIGN_PRIVILEGED_ROLE: 'Invalid role selection.',
        };
        setError(friendly[err.code] || err.message || 'Registration failed. Please try again.');
      } else {
        setError('Unable to connect. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const pwStrength = getPasswordStrength(form.password);

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center shadow-soft">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-calm-900">Create your space</h1>
            <p className="text-sm text-calm-500 mt-0.5">Step {step} of 2 — {step === 1 ? 'Account details' : 'Academic profile'}</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2">
          {[1, 2].map((s) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${step >= s ? 'bg-brand-600' : 'bg-calm-200'}`} />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-calm-200 p-6">
          {error && <ErrorBanner message={error} className="mb-4" />}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="First name" id="firstName" value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} error={fieldErrors.firstName} required leftIcon={<User className="w-4 h-4" />} />
                <Input label="Last name" id="lastName" value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} error={fieldErrors.lastName} required />
              </div>

              <Input
                label="College Email"
                type="email"
                id="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                error={fieldErrors.email}
                helperText="Use your college email address"
                required
              />

              <div className="space-y-1.5">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  error={fieldErrors.password}
                  required
                  rightIcon={
                    <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="text-calm-400 hover:text-calm-600 focus:outline-none">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
                {form.password.length > 0 && (
                  <div className="space-y-1">
                    <div className="h-1 bg-calm-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pwStrength.width} ${pwStrength.colour}`} />
                    </div>
                    <p className={`text-[11px] font-semibold ${pwStrength.colour.replace('bg-', 'text-')}`}>{pwStrength.label}</p>
                  </div>
                )}
              </div>

              <Input
                label="Confirm Password"
                type="password"
                id="confirmPassword"
                value={form.confirmPassword}
                onChange={(e) => setField('confirmPassword', e.target.value)}
                error={fieldErrors.confirmPassword}
                required
              />

              <Button type="button" onClick={handleNext} variant="primary" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Alias preview */}
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-brand-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-brand-600 font-semibold">Your anonymous alias</p>
                  <p className="text-lg font-extrabold text-brand-800">@{previewAlias}</p>
                  <p className="text-[11px] text-brand-500">Actual alias is generated by the platform to protect privacy</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="department" className="block text-xs font-semibold text-calm-700">Department <span className="text-crisis-500">*</span></label>
                <select
                  id="department"
                  value={form.department}
                  onChange={(e) => setField('department', e.target.value)}
                  className="w-full rounded-xl border border-calm-200 text-sm px-3.5 py-2.5 text-calm-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
                >
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <fieldset>
                <legend className="text-xs font-semibold text-calm-700 mb-2">Year of Study <span className="text-crisis-500">*</span></legend>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4, 5, 6].map((y) => (
                    <label key={y} className="flex-1">
                      <input type="radio" name="yearOfStudy" value={y} checked={form.yearOfStudy === y} onChange={() => setField('yearOfStudy', y)} className="sr-only" />
                      <span className={`flex items-center justify-center px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${form.yearOfStudy === y ? 'bg-brand-600 text-white border-brand-600' : 'bg-calm-50 text-calm-600 border-calm-200 hover:border-brand-400'}`}>
                        Year {y}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-1.5">
                <label htmlFor="language" className="block text-xs font-semibold text-calm-700">Preferred Language</label>
                <select
                  id="language"
                  value={form.preferredLanguage}
                  onChange={(e) => setField('preferredLanguage', e.target.value)}
                  className="w-full rounded-xl border border-calm-200 text-sm px-3.5 py-2.5 text-calm-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400"
                >
                  {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.agreeTerms}
                  onChange={(e) => setField('agreeTerms', e.target.checked)}
                  className="mt-0.5 rounded border-calm-300 text-brand-600 focus:ring-brand-500"
                  aria-required="true"
                />
                <span className="text-xs text-calm-600 leading-relaxed">
                  I agree to the <Link to="/privacy" className="text-brand-600 hover:underline">Terms of Service and Privacy Policy</Link>. I understand this platform provides <strong>non-diagnostic psychoeducational support</strong> only.
                </span>
              </label>
              {fieldErrors.agreeTerms && <p className="text-xs text-crisis-600">{fieldErrors.agreeTerms}</p>}

              <div className="flex gap-3">
                <Button type="button" onClick={() => setStep(1)} variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
                <Button type="submit" variant="primary" className="flex-1" isLoading={isLoading} rightIcon={<CheckCircle className="w-4 h-4" />}>
                  Create Account
                </Button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-calm-500">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};
