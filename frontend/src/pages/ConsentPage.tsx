import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ErrorBanner, SuccessBanner } from '../components/common/ErrorBanner';
import { PageLoading } from '../components/common/LoadingState';

interface ConsentItem {
  type: string;
  label: string;
  description: string;
  required: boolean;
}

const CONSENT_ITEMS: ConsentItem[] = [
  {
    type: 'TERMS_OF_SERVICE',
    label: 'Terms of Service',
    description: 'Agreement to use MINDBRIDGE responsibly and in accordance with the platform guidelines.',
    required: true,
  },
  {
    type: 'PRIVACY_POLICY',
    label: 'Privacy Policy',
    description: 'Acknowledgement of how your data is collected, stored, and protected under the DPDP Act 2023.',
    required: true,
  },
  {
    type: 'EMERGENCY_DISCLOSURE',
    label: 'Emergency Lifesaving Disclosure',
    description: 'If an imminent safety risk is detected, allow trained counsellors to be notified to provide immediate, life-saving support. Your identity remains protected except in genuine emergencies.',
    required: false,
  },
  {
    type: 'RESEARCH_CONSENT',
    label: 'Voluntary Research Contribution',
    description: 'Contribute anonymised, aggregated data to improve campus mental health support programmes. Your individual data is never shared — only mathematically anonymised cohort trends (N≥10).',
    required: false,
  },
];

export const ConsentPage: React.FC = () => {
  const { user } = useAuth();
  const [consents, setConsents] = useState<Record<string, boolean>>({
    TERMS_OF_SERVICE: true,
    PRIVACY_POLICY: true,
    EMERGENCY_DISCLOSURE: false,
    RESEARCH_CONSENT: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user?.consents) {
      const map: Record<string, boolean> = {
        TERMS_OF_SERVICE: true,
        PRIVACY_POLICY: true,
        EMERGENCY_DISCLOSURE: false,
        RESEARCH_CONSENT: false,
      };
      user.consents.forEach((c: any) => {
        map[c.type] = c.status === 'GRANTED';
      });
      setConsents(map);
    }
    setIsLoading(false);
  }, [user]);

  const handleToggle = async (type: string, required: boolean) => {
    if (required) return;
    const newValue = !consents[type];
    setSaving(type);
    setError('');
    setSuccess('');
    try {
      await api.updateConsent({ type, status: newValue ? 'GRANTED' : 'REVOKED' });
      setConsents((prev) => ({ ...prev, [type]: newValue }));
      setSuccess(`${CONSENT_ITEMS.find((c) => c.type === type)?.label} updated.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update consent. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) return <PageLoading label="Loading your privacy settings…" />;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-50 flex items-center justify-center">
          <ShieldCheck className="w-7 h-7 text-brand-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-calm-900">Your Privacy, Your Control</h1>
        <p className="text-sm text-calm-500">
          DPDP Act 2023 compliant. Manage how MINDBRIDGE uses your information. You can change these at any time.
        </p>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => setError('')} />}
      {success && <SuccessBanner message={success} />}

      {/* Consent items */}
      <div className="space-y-3">
        {CONSENT_ITEMS.map((item) => {
          const isGranted = consents[item.type];
          const isCurrentlySaving = saving === item.type;

          return (
            <Card key={item.type} padding="md" className="flex items-start gap-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-calm-900">{item.label}</h3>
                  {item.required && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-calm-100 text-calm-500 rounded-full flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Required
                    </span>
                  )}
                </div>
                <p className="text-xs text-calm-500 leading-relaxed">{item.description}</p>
              </div>
              <button
                onClick={() => handleToggle(item.type, item.required)}
                disabled={item.required || isCurrentlySaving}
                aria-checked={isGranted}
                aria-label={`${item.label}: ${isGranted ? 'Granted' : 'Not granted'}`}
                role="switch"
                className={`flex-shrink-0 transition-opacity ${item.required ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
              >
                {isGranted ? (
                  <ToggleRight className="w-8 h-8 text-brand-600" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-calm-400" />
                )}
              </button>
            </Card>
          );
        })}
      </div>

      {/* Disclaimer */}
      <Card variant="calm" padding="md">
        <p className="text-xs text-calm-500 leading-relaxed">
          <strong className="text-calm-700">Important:</strong> MINDBRIDGE is a non-diagnostic psychoeducational support platform. 
          It does not provide clinical diagnosis or medical advice. Emergency contacts are only notified in genuine life-threatening situations, 
          and only if Emergency Lifesaving Disclosure consent is granted. All data is processed under DPDP Act 2023.
        </p>
      </Card>

      <div className="flex justify-between items-center pt-2">
        <Link to="/" className="text-sm text-brand-600 font-semibold hover:underline">← Back to Dashboard</Link>
        <Link to="/privacy" className="text-sm text-calm-500 hover:text-calm-700 hover:underline">View full Privacy Settings</Link>
      </div>
    </div>
  );
};
