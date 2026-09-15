import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, ShieldCheck, RefreshCw, GraduationCap, Phone, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { ErrorBanner, SuccessBanner } from '../components/common/ErrorBanner';

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

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [department, setDepartment] = useState(user?.studentProfile?.department || DEPARTMENTS[0]);
  const [yearOfStudy, setYearOfStudy] = useState(user?.studentProfile?.yearOfStudy || 1);
  const [preferredLanguage, setPreferredLanguage] = useState(user?.studentProfile?.preferredLanguage || 'en');

  // Emergency Contact
  const [emergencyContactName, setEmergencyContactName] = useState(user?.studentProfile?.emergencyContactName || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(user?.studentProfile?.emergencyContactPhone || '');
  const [emergencyContactConsent, setEmergencyContactConsent] = useState(user?.studentProfile?.emergencyContactConsent || false);

  const [isUpdating, setIsUpdating] = useState(false);
  const [isRegeneratingAlias, setIsRegeneratingAlias] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      if (user.studentProfile) {
        setDepartment(user.studentProfile.department || DEPARTMENTS[0]);
        setYearOfStudy(user.studentProfile.yearOfStudy || 1);
        setPreferredLanguage(user.studentProfile.preferredLanguage || 'en');
        setEmergencyContactName(user.studentProfile.emergencyContactName || '');
        setEmergencyContactPhone(user.studentProfile.emergencyContactPhone || '');
        setEmergencyContactConsent(user.studentProfile.emergencyContactConsent || false);
      }
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setError('');
    setSuccess('');

    try {
      await api.updateProfile({
        firstName,
        lastName,
        department,
        yearOfStudy: Number(yearOfStudy),
        preferredLanguage,
        emergencyContactName: emergencyContactName.trim() || null,
        emergencyContactPhone: emergencyContactPhone.trim() || null,
        emergencyContactConsent,
      });
      await refreshUser();
      setSuccess('Your profile details have been saved successfully.');
      setTimeout(() => setSuccess(''), 3500);
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRegenerateAlias = async () => {
    setIsRegeneratingAlias(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.regenerateAlias();
      await refreshUser();
      setSuccess(`New anonymous alias generated: @${res.anonymousAlias}`);
      setTimeout(() => setSuccess(''), 3500);
    } catch (err: any) {
      setError(err?.message || 'Failed to regenerate alias.');
    } finally {
      setIsRegeneratingAlias(false);
    }
  };

  const alias = user?.studentProfile?.anonymousAlias || 'AnonymousStudent';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-calm-900">Student Profile & Identity</h1>
        <p className="text-sm text-calm-500 mt-0.5">
          Manage your personal details, anonymous peer alias, and safety preferences.
        </p>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => setError('')} />}
      {success && <SuccessBanner message={success} />}

      {/* Profile Overview Card */}
      <Card variant="elevated" padding="lg" className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white font-extrabold text-xl flex items-center justify-center shadow-soft flex-shrink-0">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>

        <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
          <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-calm-900">{user?.firstName} {user?.lastName}</h2>
            <Badge variant="info" size="sm">{user?.role?.replace('_', ' ')}</Badge>
          </div>
          <p className="text-xs text-calm-500">{user?.email}</p>
          <p className="text-xs text-brand-700 font-medium">{user?.institution?.name || 'Academic Institution'}</p>
        </div>
      </Card>

      {/* Anonymous Identity Card */}
      <Card padding="lg" className="space-y-4 border-brand-200 bg-brand-50/40">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-brand-600" />
            <h3 className="text-sm font-bold text-calm-900">Anonymous Peer Identity</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerateAlias}
            isLoading={isRegeneratingAlias}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Regenerate Alias
          </Button>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-brand-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-calm-500 font-medium">Public Handle</p>
            <p className="text-base font-extrabold text-brand-800">@{alias}</p>
          </div>
          <Badge variant="success" size="sm">Zero PII Leakage</Badge>
        </div>

        <p className="text-[11px] text-calm-500 leading-relaxed">
          This alias is shown on all peer forum posts and community discussions.
          Your real name and college email are strictly concealed from peers and professors.
        </p>
      </Card>

      {/* Edit Academic Details Form */}
      <form onSubmit={handleUpdateProfile} className="space-y-6">
        <Card padding="lg" className="space-y-4">
          <h3 className="text-sm font-bold text-calm-900 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-brand-600" />
            Academic Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="deptSelect" className="block text-xs font-semibold text-calm-700">
              Department
            </label>
            <select
              id="deptSelect"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-xl border border-calm-200 text-sm px-3.5 py-2.5 bg-white text-calm-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="yearSelect" className="block text-xs font-semibold text-calm-700">
                Year of Study
              </label>
              <select
                id="yearSelect"
                value={yearOfStudy}
                onChange={(e) => setYearOfStudy(Number(e.target.value))}
                className="w-full rounded-xl border border-calm-200 text-sm px-3.5 py-2.5 bg-white text-calm-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {[1, 2, 3, 4, 5, 6].map((y) => (
                  <option key={y} value={y}>Year {y}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="langSelect" className="block text-xs font-semibold text-calm-700">
                Preferred Language
              </label>
              <select
                id="langSelect"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="w-full rounded-xl border border-calm-200 text-sm px-3.5 py-2.5 bg-white text-calm-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Emergency Contact */}
        <Card padding="lg" className="space-y-4">
          <h3 className="text-sm font-bold text-calm-900 flex items-center gap-2">
            <Phone className="w-4 h-4 text-brand-600" />
            Emergency Life-Safety Contact <span className="font-normal text-calm-400 text-xs">(optional)</span>
          </h3>

          <div className="bg-calm-50 p-3 rounded-xl text-xs text-calm-600 leading-relaxed">
            Emergency contacts are <strong>never</strong> contacted for regular appointments or check-ins.
            They are strictly reserved for severe, life-safety emergencies evaluated by clinical professionals.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Full Name"
              placeholder="e.g. Parent or guardian"
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
            />
            <Input
              label="Emergency Phone Number"
              placeholder="+91 98765 43210"
              type="tel"
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={emergencyContactConsent}
              onChange={(e) => setEmergencyContactConsent(e.target.checked)}
              className="mt-0.5 rounded border-calm-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-xs text-calm-600 leading-relaxed">
              I authorise contacting this individual <strong>only</strong> in acute life-threatening situations.
            </span>
          </label>
        </Card>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          isLoading={isUpdating}
          rightIcon={<CheckCircle2 className="w-4 h-4" />}
        >
          Save Profile Changes
        </Button>
      </form>

      {/* Quick Links */}
      <div className="flex items-center justify-between text-xs text-calm-500 pt-2 border-t border-calm-200">
        <Link to="/privacy" className="text-brand-600 hover:underline">
          DPDP Act Privacy & Data Controls →
        </Link>
        <Link to="/consent" className="text-brand-600 hover:underline">
          Manage Consents →
        </Link>
      </div>
    </div>
  );
};
