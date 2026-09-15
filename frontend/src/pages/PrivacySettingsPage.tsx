import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Download, Trash2, CheckCircle2, Lock, ToggleLeft, ToggleRight, AlertTriangle, FileText } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ErrorBanner, SuccessBanner } from '../components/common/ErrorBanner';

interface ConsentConfig {
  type: string;
  title: string;
  desc: string;
  required: boolean;
}

const CONSENTS: ConsentConfig[] = [
  {
    type: 'TERMS_OF_SERVICE',
    title: 'Platform Terms of Service',
    desc: 'Agreement governing respectful student community conduct and the strictly non-clinical, psychoeducational nature of the platform.',
    required: true,
  },
  {
    type: 'PRIVACY_POLICY',
    title: 'Mental Health Data Privacy Policy',
    desc: 'Zero-PII institutional protection and encrypted storage of personal check-in records under DPDP Act 2023 principles.',
    required: true,
  },
  {
    type: 'EMERGENCY_DISCLOSURE',
    title: 'Emergency Life-Safety Intervention',
    desc: 'Authorisation to provide emergency helpline contacts or dispatch on-campus first response in acute life-threatening emergencies.',
    required: false,
  },
  {
    type: 'COUNSELLOR_DATA_SHARING',
    title: 'Counsellor Clinical Summary Sharing',
    desc: 'Allows licensed campus counsellors you book with to see recent check-in stress trends and assessment bands before sessions.',
    required: false,
  },
  {
    type: 'ANONYMOUS_RESEARCH',
    title: 'De-identified Institutional Wellbeing Analytics',
    desc: 'Permits your check-in ratings to be pooled into campus-wide aggregate cohort reports with k-anonymity (N ≥ 10).',
    required: false,
  },
];

export const PrivacySettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [consents, setConsents] = useState<Record<string, boolean>>({
    TERMS_OF_SERVICE: true,
    PRIVACY_POLICY: true,
    EMERGENCY_DISCLOSURE: false,
    COUNSELLOR_DATA_SHARING: false,
    ANONYMOUS_RESEARCH: false,
  });

  const [savingConsent, setSavingConsent] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.consents) {
      const map: Record<string, boolean> = {
        TERMS_OF_SERVICE: true,
        PRIVACY_POLICY: true,
        EMERGENCY_DISCLOSURE: false,
        COUNSELLOR_DATA_SHARING: false,
        ANONYMOUS_RESEARCH: false,
      };
      user.consents.forEach((c: any) => {
        map[c.type] = c.status === 'GRANTED';
      });
      setConsents((prev) => ({ ...prev, ...map }));
    }
  }, [user]);

  const handleToggleConsent = async (type: string, required: boolean) => {
    if (required) return;
    const current = consents[type];
    const newStatus = current ? 'REVOKED' : 'GRANTED';
    setSavingConsent(type);
    setError('');

    try {
      await api.updateConsent({ type, status: newStatus });
      setConsents((prev) => ({ ...prev, [type]: !current }));
      setFeedback(`Consent for ${type.replace(/_/g, ' ')} updated.`);
      setTimeout(() => setFeedback(''), 3500);
    } catch (err: any) {
      setError(err?.message || 'Failed to update consent.');
    } finally {
      setSavingConsent(null);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setError('');
    try {
      const data = await api.exportPersonalData();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `mindbridge_data_export_${user?.id || 'me'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setFeedback('Your complete data package (JSON) has been downloaded.');
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to export data package.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAccountDeletion = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setIsDeleting(true);
    setError('');
    try {
      await api.requestAccountDeletion();
      setDeleteModalOpen(false);
      alert('Your account has been deactivated and queued for erasure. Signing you out now.');
      logout();
    } catch (err: any) {
      setError(err?.message || 'Failed to request account deletion.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-calm-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-brand-600" />
            Privacy & Data Sovereignty
          </h1>
          <p className="text-sm text-calm-500 mt-0.5">
            Full compliance with India's Digital Personal Data Protection (DPDP) Act 2023.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportData}
          isLoading={isExporting}
          leftIcon={<Download className="w-3.5 h-3.5" />}
        >
          Download My Data (JSON)
        </Button>
      </div>

      {feedback && <SuccessBanner message={feedback} />}
      {error && <ErrorBanner message={error} onRetry={() => setError('')} />}

      {/* DPDP Compliance Card */}
      <Card variant="calm" padding="md" className="space-y-2">
        <div className="flex items-center gap-2 text-brand-900 font-bold text-xs">
          <FileText className="w-4 h-4 text-brand-600" />
          <span>DPDP Act 2023 Principles Applied</span>
        </div>
        <p className="text-xs text-calm-600 leading-relaxed">
          MINDBRIDGE adheres to the principles of Purpose Limitation, Data Minimisation, and Granular Consent.
          Your psychological assessments, mood logs, and AI conversations are encrypted at rest and are never sold or shared with external third parties.
        </p>
      </Card>

      {/* Consent Matrix */}
      <Card padding="lg" className="space-y-5">
        <div>
          <h2 className="text-base font-bold text-calm-900">Active Consent Preferences</h2>
          <p className="text-xs text-calm-500 mt-0.5">
            Toggle specific permissions below. Revocation takes effect immediately for all subsequent data operations.
          </p>
        </div>

        <div className="divide-y divide-calm-100">
          {CONSENTS.map((item) => {
            const isGranted = consents[item.type];
            const isSaving = savingConsent === item.type;

            return (
              <div key={item.type} className="py-4 flex items-start justify-between gap-4 first:pt-0 last:pb-0">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-calm-900">{item.title}</h3>
                    {item.required && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-calm-100 text-calm-500 rounded-full flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Essential
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-calm-500 leading-relaxed">{item.desc}</p>
                </div>

                <button
                  onClick={() => handleToggleConsent(item.type, item.required)}
                  disabled={item.required || isSaving}
                  aria-checked={isGranted}
                  aria-label={`${item.title}: ${isGranted ? 'Granted' : 'Revoked'}`}
                  role="switch"
                  className={`flex-shrink-0 transition-opacity ${
                    item.required ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
                  }`}
                >
                  {isGranted ? (
                    <ToggleRight className="w-8 h-8 text-brand-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-calm-400" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Right to Erasure / Account Deletion */}
      <Card padding="lg" className="border-crisis-200 bg-crisis-50/40 space-y-3">
        <div className="flex items-center gap-2 text-crisis-800 font-bold text-sm">
          <Trash2 className="w-4 h-4 text-crisis-600" />
          <span>Right to Erasure (Account Deletion)</span>
        </div>
        <p className="text-xs text-crisis-700 leading-relaxed">
          In accordance with DPDP Act standards, you may permanently erase your account, pseudonymized records,
          screening history, and counselling logs.
        </p>
        <Button
          variant="danger"
          size="sm"
          onClick={() => setDeleteModalOpen(true)}
        >
          Request Account Deletion
        </Button>
      </Card>

      {/* Deletion Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Permanent Account Deletion"
        description="This action cannot be undone. All check-in history, screening scores, and profile records will be expunged."
        size="sm"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 bg-crisis-50 border border-crisis-200 rounded-xl text-xs text-crisis-700 space-y-1">
            <p className="font-bold">Important Notice:</p>
            <p>Your session will be immediately terminated and your data queued for cryptographic wiping.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmDeleteInput" className="block text-xs font-semibold text-calm-700">
              Type <strong className="text-crisis-700 font-mono">DELETE</strong> to confirm:
            </label>
            <input
              id="confirmDeleteInput"
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-xl border border-calm-200 text-xs px-3 py-2 text-calm-900 focus:outline-none focus:ring-2 focus:ring-crisis-400 font-mono"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleAccountDeletion}
              disabled={deleteConfirmText !== 'DELETE'}
              isLoading={isDeleting}
            >
              Permanently Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
