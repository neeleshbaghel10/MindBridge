import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, BookOpen, Heart, ShieldCheck, ChevronRight, ChevronLeft, CheckCircle, Sparkles, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card } from '../components/common/Card';

const DEPARTMENTS = [
  'Computer Science & Engineering', 'Mechanical Engineering', 'Electrical Engineering',
  'Civil Engineering', 'Electronics & Communication', 'Information Technology',
  'Chemical Engineering', 'Other',
];

const LANGUAGES = [
  { value: 'en', label: 'English' }, { value: 'hi', label: 'Hindi' },
  { value: 'ta', label: 'Tamil' }, { value: 'te', label: 'Telugu' },
  { value: 'mr', label: 'Marathi' }, { value: 'bn', label: 'Bengali' },
];

const FOCUS_AREAS = [
  'Managing stress & anxiety', 'Better sleep habits', 'Academic performance pressure',
  'Social connection', 'Coping with change', 'Building resilience',
];

const STEPS = [
  { title: 'Welcome to MINDBRIDGE', icon: Sparkles, subtitle: 'Your anonymous identity' },
  { title: 'Your academic journey', icon: BookOpen, subtitle: 'Personalise your experience' },
  { title: 'What matters to you?', icon: Heart, subtitle: 'Wellbeing focus areas' },
  { title: 'Emergency support', icon: ShieldCheck, subtitle: 'Optional safety setup' },
];

export const OnboardingPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    department: user?.studentProfile?.department || DEPARTMENTS[0],
    yearOfStudy: user?.studentProfile?.yearOfStudy || 1,
    preferredLanguage: user?.studentProfile?.preferredLanguage || 'en',
    focusAreas: [] as string[],
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactConsent: false,
  });

  const alias = user?.studentProfile?.anonymousAlias || 'YourAlias';

  const setField = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleFocus = (area: string) => {
    setForm((prev) => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(area)
        ? prev.focusAreas.filter((a) => a !== area)
        : [...prev.focusAreas, area],
    }));
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await api.updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        department: form.department,
        yearOfStudy: form.yearOfStudy,
        preferredLanguage: form.preferredLanguage,
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactPhone: form.emergencyContactPhone || null,
        emergencyContactConsent: form.emergencyContactConsent,
        onboardingCompleted: true,
      });
      await refreshUser();
      navigate('/');
    } catch {
      // Still navigate even if update fails
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const StepIcon = STEPS[step].icon;

  return (
    <div className="max-w-lg mx-auto space-y-6 py-4 animate-fadeIn">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-calm-500">
          <span>Step {step + 1} of {STEPS.length}</span>
          <span>{STEPS[step].title}</span>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'bg-brand-600' : 'bg-calm-200'}`} />
          ))}
        </div>
      </div>

      <Card padding="lg" variant="elevated" className="space-y-6">
        {/* Step header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-50 flex items-center justify-center">
            <StepIcon className="w-6 h-6 text-brand-600" />
          </div>
          <h2 className="text-xl font-extrabold text-calm-900">{STEPS[step].title}</h2>
          <p className="text-sm text-calm-500">{STEPS[step].subtitle}</p>
        </div>

        {/* Step 0: Identity */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-center space-y-1">
              <p className="text-xs text-brand-600 font-semibold">Your anonymous alias</p>
              <p className="text-2xl font-extrabold text-brand-800">@{alias}</p>
              <p className="text-xs text-brand-400">This protects your identity across all peer spaces</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="First name" value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} />
              <Input label="Last name" value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} />
            </div>
            <p className="text-xs text-calm-400 text-center">
              Your real name is only visible to licensed counsellors in private sessions
            </p>
          </div>
        )}

        {/* Step 1: Academic */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="dept" className="block text-xs font-semibold text-calm-700">Department</label>
              <select
                id="dept"
                value={form.department}
                onChange={(e) => setField('department', e.target.value)}
                className="w-full rounded-xl border border-calm-200 text-sm px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <fieldset>
              <legend className="text-xs font-semibold text-calm-700 mb-2">Year of Study</legend>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map((y) => (
                  <label key={y}>
                    <input type="radio" name="year" value={y} checked={form.yearOfStudy === y} onChange={() => setField('yearOfStudy', y)} className="sr-only" />
                    <span className={`flex items-center justify-center py-2 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${form.yearOfStudy === y ? 'bg-brand-600 text-white border-brand-600' : 'bg-calm-50 text-calm-600 border-calm-200 hover:border-brand-300'}`}>
                      Year {y}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="space-y-1.5">
              <label htmlFor="lang" className="block text-xs font-semibold text-calm-700">Preferred Language</label>
              <select
                id="lang"
                value={form.preferredLanguage}
                onChange={(e) => setField('preferredLanguage', e.target.value)}
                className="w-full rounded-xl border border-calm-200 text-sm px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Focus areas */}
        {step === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-calm-500">Select areas you'd like to focus on. This helps personalise your resource recommendations.</p>
            <div className="grid grid-cols-2 gap-2">
              {FOCUS_AREAS.map((area) => {
                const selected = form.focusAreas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleFocus(area)}
                    aria-pressed={selected}
                    className={`text-left p-3 rounded-xl text-xs font-semibold border transition-all ${selected ? 'bg-brand-600 text-white border-brand-600' : 'bg-calm-50 text-calm-600 border-calm-200 hover:border-brand-300'}`}
                  >
                    {selected && <CheckCircle className="w-3.5 h-3.5 inline mr-1.5" />}
                    {area}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-calm-400">You can change these later from your profile settings.</p>
          </div>
        )}

        {/* Step 3: Emergency contact */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-calm-50 border border-calm-200 rounded-xl p-3">
              <p className="text-xs text-calm-500 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-calm-400 flex-shrink-0 mt-0.5" />
                This is completely optional. Emergency contact is only used in genuine life-threatening situations and only if you provide explicit consent.
              </p>
            </div>
            <Input label="Emergency contact name" placeholder="e.g. Parent or guardian name" value={form.emergencyContactName} onChange={(e) => setField('emergencyContactName', e.target.value)} />
            <Input label="Emergency contact phone" type="tel" placeholder="+91 98765 43210" value={form.emergencyContactPhone} onChange={(e) => setField('emergencyContactPhone', e.target.value)} leftIcon={<Phone className="w-4 h-4" />} />
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.emergencyContactConsent}
                onChange={(e) => setField('emergencyContactConsent', e.target.checked)}
                className="mt-0.5 rounded border-calm-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-xs text-calm-600 leading-relaxed">
                I consent to my emergency contact being notified <strong>only in life-threatening situations</strong>, as assessed by a licensed counsellor.
              </span>
            </label>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <Button type="button" onClick={() => setStep((s) => s - 1)} variant="outline" leftIcon={<ChevronLeft className="w-4 h-4" />}>
              Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => setStep((s) => s + 1)} variant="primary" className="flex-1" rightIcon={<ChevronRight className="w-4 h-4" />}>
              Continue
            </Button>
          ) : (
            <Button type="button" onClick={handleComplete} variant="primary" className="flex-1" isLoading={isLoading} rightIcon={<CheckCircle className="w-4 h-4" />}>
              Complete Setup
            </Button>
          )}
        </div>

        {step === 3 && (
          <button type="button" onClick={handleComplete} className="w-full text-center text-xs text-calm-400 hover:text-calm-600 hover:underline">
            Skip this step
          </button>
        )}
      </Card>
    </div>
  );
};
