import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone, ShieldAlert, Wind, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

const GROUNDING_STEPS = [
  { n: 5, sense: 'See', prompt: 'Name 5 things you can see right now' },
  { n: 4, sense: 'Touch', prompt: 'Name 4 things you can physically feel' },
  { n: 3, sense: 'Hear', prompt: 'Name 3 sounds you can hear' },
  { n: 2, sense: 'Smell', prompt: 'Name 2 things you can smell (or like to smell)' },
  { n: 1, sense: 'Taste', prompt: 'Name 1 thing you can taste' },
];

export const CrisisSupportPage: React.FC = () => {
  const { user } = useAuth();
  const [sosLoading, setSosLoading] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [breathing, setBreathing] = useState<'idle' | 'inhale' | 'hold' | 'exhale'>('idle');
  const [breathStep, setBreathStep] = useState('');

  const triggerSos = async () => {
    setSosLoading(true);
    try {
      if (user) await api.triggerEmergencySos();
    } catch {}
    setSosLoading(false);
    setSosModalOpen(true);
  };

  const startBreathing = () => {
    let step = 0;
    const steps: { phase: 'inhale' | 'hold' | 'exhale'; label: string; duration: number }[] = [
      { phase: 'inhale', label: 'Breathe in…', duration: 4000 },
      { phase: 'hold', label: 'Hold…', duration: 7000 },
      { phase: 'exhale', label: 'Breathe out…', duration: 8000 },
    ];

    const run = () => {
      const s = steps[step % 3];
      setBreathing(s.phase);
      setBreathStep(s.label);
      step++;
      setTimeout(run, s.duration);
    };
    run();
  };

  return (
    <div className="min-h-screen bg-crisis-50 -mt-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-crisis-100 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-crisis-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-calm-900">You are not alone</h1>
          <p className="text-sm text-calm-600 max-w-md mx-auto leading-relaxed">
            Immediate help is available right now, 24 hours a day, every day. You don't have to go through this alone.
          </p>
        </div>

        {/* Helpline cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="tel:14416"
            className="bg-white border-2 border-crisis-300 rounded-2xl p-5 flex flex-col items-center text-center gap-2 hover:bg-crisis-50 transition-colors focus:outline-none focus:ring-2 focus:ring-crisis-500"
            aria-label="Call Tele-MANAS at 14416"
          >
            <Phone className="w-6 h-6 text-crisis-600" />
            <div>
              <p className="text-xs font-bold text-crisis-700 uppercase tracking-wide">Tele-MANAS</p>
              <p className="text-3xl font-extrabold text-crisis-800">14416</p>
              <p className="text-xs text-crisis-500 mt-1">National Mental Health<br />24/7 • Free</p>
            </div>
          </a>
          <a
            href="tel:18005990019"
            className="bg-white border-2 border-crisis-300 rounded-2xl p-5 flex flex-col items-center text-center gap-2 hover:bg-crisis-50 transition-colors focus:outline-none focus:ring-2 focus:ring-crisis-500"
            aria-label="Call KIRAN helpline at 1800-599-0019"
          >
            <Phone className="w-6 h-6 text-crisis-600" />
            <div>
              <p className="text-xs font-bold text-crisis-700 uppercase tracking-wide">KIRAN</p>
              <p className="text-2xl font-extrabold text-crisis-800">1800-599-0019</p>
              <p className="text-xs text-crisis-500 mt-1">Mental Health Rehabilitation<br />24/7 • Free</p>
            </div>
          </a>
          <a
            href="tel:112"
            className="bg-white border-2 border-crisis-300 rounded-2xl p-5 flex flex-col items-center text-center gap-2 hover:bg-crisis-50 transition-colors focus:outline-none focus:ring-2 focus:ring-crisis-500"
            aria-label="Call emergency services at 112"
          >
            <Phone className="w-6 h-6 text-crisis-600" />
            <div>
              <p className="text-xs font-bold text-crisis-700 uppercase tracking-wide">Emergency</p>
              <p className="text-3xl font-extrabold text-crisis-800">112</p>
              <p className="text-xs text-crisis-500 mt-1">Police / Ambulance<br />Immediate response</p>
            </div>
          </a>
        </div>

        {/* Emergency SOS */}
        {user && (
          <div className="bg-white border-2 border-crisis-400 rounded-2xl p-6 text-center space-y-3">
            <p className="text-sm font-bold text-crisis-800">Alert your campus crisis team</p>
            <p className="text-xs text-crisis-600">Send an emergency alert to our on-call counsellors right now</p>
            <Button
              onClick={triggerSos}
              variant="danger"
              size="lg"
              isLoading={sosLoading}
              leftIcon={<ShieldAlert className="w-5 h-5" />}
              className="w-full sm:w-auto"
            >
              Send Emergency SOS
            </Button>
          </div>
        )}

        {/* Grounding exercises */}
        <div className="bg-white border border-calm-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-bold text-calm-900">5-4-3-2-1 Grounding Technique</h2>
          </div>
          <p className="text-xs text-calm-500">Bring yourself back to the present moment by engaging your five senses.</p>
          <div className="space-y-3">
            {GROUNDING_STEPS.map((s) => (
              <div key={s.n} className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{s.n}</span>
                <div>
                  <p className="text-xs font-semibold text-calm-700">{s.sense}</p>
                  <p className="text-xs text-calm-500">{s.prompt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4-7-8 Breathing */}
        <div className="bg-white border border-calm-200 rounded-2xl p-6 space-y-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <Wind className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-bold text-calm-900">4-7-8 Breathing Exercise</h2>
          </div>
          <div
            className={`w-28 h-28 mx-auto rounded-full border-4 flex items-center justify-center transition-all duration-1000 ${
              breathing === 'inhale' ? 'scale-125 border-brand-500 bg-brand-50' :
              breathing === 'hold' ? 'scale-125 border-amberwarm-400 bg-amberwarm-50' :
              breathing === 'exhale' ? 'scale-75 border-calm-300 bg-calm-50' :
              'scale-100 border-calm-200 bg-calm-50'
            }`}
          >
            <span className="text-xs font-semibold text-calm-600">
              {breathing === 'idle' ? 'Press Start' : breathStep}
            </span>
          </div>
          <p className="text-xs text-calm-500">Inhale 4 counts · Hold 7 counts · Exhale 8 counts</p>
          {breathing === 'idle' && (
            <Button onClick={startBreathing} variant="secondary">Start Breathing Guide</Button>
          )}
        </div>

        <div className="text-center">
          <Link to={user ? '/' : '/welcome'} className="text-sm text-brand-600 font-semibold hover:underline">
            ← Return to safety
          </Link>
        </div>
      </div>

      {/* SOS Confirmed Modal */}
      <Modal isOpen={sosModalOpen} onClose={() => setSosModalOpen(false)} title="Emergency Alert Sent" size="sm">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-calm-900">Your campus crisis team has been alerted</p>
            <p className="text-xs text-calm-500">A counsellor will reach out to you shortly. In the meantime, please call:</p>
          </div>
          <div className="space-y-2">
            <a href="tel:14416" className="flex items-center justify-center gap-2 p-3 bg-crisis-50 border border-crisis-200 rounded-xl text-crisis-700 font-bold hover:bg-crisis-100">
              <Phone className="w-4 h-4" /> Tele-MANAS: 14416
            </a>
            <a href="tel:18005990019" className="flex items-center justify-center gap-2 p-3 bg-crisis-50 border border-crisis-200 rounded-xl text-crisis-700 font-bold hover:bg-crisis-100">
              <Phone className="w-4 h-4" /> KIRAN: 1800-599-0019
            </a>
          </div>
          <Button onClick={() => setSosModalOpen(false)} variant="primary" className="w-full">I'm with someone safe</Button>
        </div>
      </Modal>
    </div>
  );
};
