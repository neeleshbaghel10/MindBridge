import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, Heart, Users, ShieldCheck, UserCheck, ArrowRight, Phone, Sparkles, BookOpen, Activity } from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext';

const FEATURES = [
  { icon: Heart, title: 'AI First-Aid Support', desc: '24/7 CBT/DBT-grounded conversational support. Never diagnostic — always compassionate.', colour: 'text-brand-600 bg-brand-50' },
  { icon: UserCheck, title: 'Licensed Counsellors', desc: 'Verified RCI-registered clinical psychologists. Book confidential appointments in 60 seconds.', colour: 'text-purple-600 bg-purple-50' },
  { icon: Users, title: 'Anonymous Peer Hub', desc: 'Connect with peers anonymously. Share, listen, and support each other safely.', colour: 'text-amberwarm-700 bg-amberwarm-50' },
  { icon: ShieldCheck, title: 'Zero-PII Analytics', desc: 'Institutional data uses mathematical k-anonymity (N≥10). Your identity is never exposed.', colour: 'text-emerald-700 bg-emerald-50' },
];

const DEMO_PERSONAS: { role: UserRole; label: string; desc: string; colour: string }[] = [
  { role: 'STUDENT', label: 'Student', desc: 'Aarav Patel — CSE Year 3', colour: 'bg-brand-50 text-brand-700 border-brand-200 hover:bg-brand-100' },
  { role: 'COUNSELLOR', label: 'Counsellor', desc: 'Dr. Ananya Sen — RCI Psychologist', colour: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
  { role: 'PEER_VOLUNTEER', label: 'Peer Volunteer', desc: 'Rohan Mehra — Trained Peer', colour: 'bg-amberwarm-50 text-amberwarm-800 border-amberwarm-200 hover:bg-amberwarm-100' },
  { role: 'INSTITUTION_ADMIN', label: 'Dean / Admin', desc: 'Prof. Meenakshi Iyer — Zero-PII Dashboard', colour: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
  { role: 'SUPER_ADMIN', label: 'Super Admin', desc: 'Platform Governance', colour: 'bg-calm-100 text-calm-700 border-calm-200 hover:bg-calm-200' },
];

export const LandingPage: React.FC = () => {
  const { user, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState<UserRole | null>(null);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleDemo = async (role: UserRole) => {
    setDemoLoading(role);
    try {
      await switchDemoRole(role);
      navigate('/');
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="space-y-0 -mt-6 -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-white px-6 py-20 sm:py-28">
        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-brand-100 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-300" />
            Confidential • Stigma-Free • DPDP Act 2023 Compliant
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Your Mind,<br /><span className="text-brand-200">Your Space</span>
          </h1>
          <p className="text-lg text-brand-100/90 max-w-xl mx-auto leading-relaxed">
            A safe, stigma-free mental wellness ecosystem for students in higher education. 
            AI-powered first-aid, licensed counselling, and anonymous peer support — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-6 py-3 bg-white text-brand-800 hover:bg-brand-50 rounded-xl font-bold text-sm shadow-soft transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-brand-600" />
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 bg-brand-600/50 hover:bg-brand-600 text-white border border-white/20 rounded-xl font-semibold text-sm backdrop-blur-sm transition-all"
            >
              Sign In
            </Link>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-brand-200">Available 24/7 — No appointment needed to start</span>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 left-10 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Stats */}
      <section className="bg-white border-y border-calm-200 py-6">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { value: '24/7', label: 'AI Support Available' },
            { value: '100%', label: 'Confidential' },
            { value: 'N≥10', label: 'k-Anonymity Shield' },
            { value: '2023', label: 'DPDP Act Compliant' },
          ].map((s) => (
            <div key={s.label} className="space-y-1">
              <div className="text-2xl font-extrabold text-brand-700">{s.value}</div>
              <div className="text-xs text-calm-500 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 max-w-5xl mx-auto">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl font-extrabold text-calm-900">Everything you need, nothing you don't</h2>
          <p className="text-sm text-calm-500">Designed specifically for students in higher education</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white border border-calm-200 rounded-2xl p-5 space-y-3 shadow-soft hover:shadow-md transition-shadow">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.colour}`}>
                <f.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-calm-900">{f.title}</h3>
                <p className="text-xs text-calm-500 mt-1 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Crisis Helplines */}
      <section className="py-12 px-6 bg-crisis-50 border-y border-crisis-200">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h2 className="text-lg font-bold text-crisis-800">In immediate distress? Help is one call away</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a href="tel:14416" className="flex items-center gap-3 bg-white border border-crisis-200 rounded-xl p-4 hover:bg-crisis-50 transition-colors">
              <Phone className="w-5 h-5 text-crisis-600 flex-shrink-0" />
              <div className="text-left">
                <p className="text-xs font-bold text-crisis-800">Tele-MANAS</p>
                <p className="text-lg font-extrabold text-crisis-700">14416</p>
                <p className="text-[10px] text-crisis-500">National Mental Health • 24/7 Free</p>
              </div>
            </a>
            <a href="tel:18005990019" className="flex items-center gap-3 bg-white border border-crisis-200 rounded-xl p-4 hover:bg-crisis-50 transition-colors">
              <Phone className="w-5 h-5 text-crisis-600 flex-shrink-0" />
              <div className="text-left">
                <p className="text-xs font-bold text-crisis-800">KIRAN</p>
                <p className="text-lg font-extrabold text-crisis-700">1800-599-0019</p>
                <p className="text-[10px] text-crisis-500">Mental Health Rehab • 24/7 Free</p>
              </div>
            </a>
            <a href="tel:112" className="flex items-center gap-3 bg-white border border-crisis-200 rounded-xl p-4 hover:bg-crisis-50 transition-colors">
              <Phone className="w-5 h-5 text-crisis-600 flex-shrink-0" />
              <div className="text-left">
                <p className="text-xs font-bold text-crisis-800">Emergency</p>
                <p className="text-lg font-extrabold text-crisis-700">112</p>
                <p className="text-[10px] text-crisis-500">Police / Ambulance</p>
              </div>
            </a>
          </div>
          <Link to="/crisis" className="inline-flex items-center gap-2 text-xs text-crisis-600 font-semibold hover:underline">
            View full crisis support page <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Demo Persona Switcher */}
      <section className="py-16 px-6 max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-brand-50 to-calm-50 border border-brand-200 rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              For SIH 2025 Evaluators
            </div>
            <h2 className="text-xl font-extrabold text-calm-900">1-Click Demo Personas</h2>
            <p className="text-sm text-calm-500">Instantly experience each stakeholder's unique journey</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DEMO_PERSONAS.map((p) => (
              <button
                key={p.role}
                onClick={() => handleDemo(p.role)}
                disabled={!!demoLoading}
                className={`text-left p-4 rounded-xl border font-semibold transition-all disabled:opacity-60 ${p.colour}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{p.label}</span>
                  {demoLoading === p.role ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 opacity-60" />
                  )}
                </div>
                <p className="text-xs opacity-70 mt-0.5 font-normal">{p.desc}</p>
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-calm-400">All demo accounts use password: Password123!</p>
        </div>
      </section>

      {/* Footer disclaimer */}
      <div className="py-8 px-6 border-t border-calm-200 bg-calm-50 text-center">
        <p className="text-xs text-calm-400 max-w-2xl mx-auto">
          MINDBRIDGE is a <strong>strictly non-diagnostic psychoeducational support platform</strong>. 
          It does not provide clinical diagnosis, treatment, or therapy. Always consult a qualified healthcare professional.
        </p>
      </div>
    </div>
  );
};
