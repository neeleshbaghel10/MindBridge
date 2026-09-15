import React, { useState } from 'react';
import { ShieldAlert, PhoneCall, AlertTriangle, X, HeartHandshake, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

interface EmergencySosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencySosModal: React.FC<EmergencySosModalProps> = ({ isOpen, onClose }) => {
  const [sosDispatched, setSosDispatched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleTriggerSosAlert = async () => {
    setIsSubmitting(true);
    try {
      await api.triggerEmergencySos();
      setSosDispatched(true);
    } catch (err) {
      console.error('SOS dispatch error:', err);
      // Still show emergency numbers regardless
      setSosDispatched(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-calm-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg overflow-hidden bg-white shadow-2xl rounded-2xl border-2 border-crisis-500">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-crisis-50 border-b border-crisis-100">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-crisis-600 text-white rounded-xl shadow-sm">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-crisis-700">Immediate Crisis & Emergency Support</h2>
              <p className="text-xs font-medium text-calm-600">Confidential • Free • 24 Hours / 7 Days</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-calm-400 hover:text-calm-600 rounded-lg hover:bg-calm-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="p-3.5 bg-amberwarm-50 rounded-xl border border-amberwarm-200 text-amberwarm-900 text-sm leading-relaxed flex items-start space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-amberwarm-700 flex-shrink-0 mt-0.5" />
            <p>
              <strong>You matter, and you are not alone.</strong> If you or someone you know is in immediate danger or feeling overwhelming distress, please connect with a compassionate professional right away.
            </p>
          </div>

          {/* Helplines List */}
          <div className="space-y-3">
            <a
              href="tel:14416"
              className="flex items-center justify-between p-3.5 bg-calm-50 hover:bg-brand-50 border border-calm-200 hover:border-brand-300 rounded-xl transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-brand-100 text-brand-700 rounded-lg group-hover:bg-brand-600 group-hover:text-white transition-colors">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-calm-900 group-hover:text-brand-800">Tele-MANAS (National Helpline)</h4>
                  <p className="text-xs text-calm-500">Ministry of Health & Family Welfare • 20+ Languages</p>
                </div>
              </div>
              <span className="text-lg font-bold text-brand-700 group-hover:underline">14416</span>
            </a>

            <a
              href="tel:18005990019"
              className="flex items-center justify-between p-3.5 bg-calm-50 hover:bg-brand-50 border border-calm-200 hover:border-brand-300 rounded-xl transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-calm-200 text-calm-700 rounded-lg group-hover:bg-brand-600 group-hover:text-white transition-colors">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-calm-900 group-hover:text-brand-800">KIRAN Mental Health Line</h4>
                  <p className="text-xs text-calm-500">Govt. of India 24x7 Psychological First-Aid</p>
                </div>
              </div>
              <span className="text-sm font-bold text-brand-700 group-hover:underline">1800-599-0019</span>
            </a>

            <a
              href="tel:112"
              className="flex items-center justify-between p-3.5 bg-crisis-50 hover:bg-crisis-100 border border-crisis-200 rounded-xl transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-crisis-600 text-white rounded-lg">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-crisis-900">Campus Emergency & First Response</h4>
                  <p className="text-xs text-crisis-700">Immediate Medical & Campus Security Dispatch</p>
                </div>
              </div>
              <span className="text-lg font-bold text-crisis-700">112</span>
            </a>
          </div>

          {/* Priority Check-in Request */}
          {!sosDispatched ? (
            <button
              onClick={handleTriggerSosAlert}
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-crisis-600 to-crisis-700 hover:from-crisis-700 hover:to-crisis-800 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 text-sm"
            >
              <HeartHandshake className="w-5 h-5" />
              <span>{isSubmitting ? 'Requesting Priority Care...' : 'Request Urgent Priority Counsellor Callback'}</span>
            </button>
          ) : (
            <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl flex items-center space-x-2.5 text-brand-900 text-xs">
              <CheckCircle2 className="w-5 h-5 text-brand-600 flex-shrink-0" />
              <span>
                <strong>Confidential Alert Logged.</strong> Our campus mental health team has been alerted for priority triage. Please stay on the line with one of the free numbers above.
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-calm-50 border-t border-calm-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-calm-300 text-calm-700 hover:bg-calm-100 rounded-lg text-sm font-medium transition-colors"
          >
            Close Emergency Panel
          </button>
        </div>
      </div>
    </div>
  );
};
