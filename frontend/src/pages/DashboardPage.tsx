import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Brain, Calendar, Sparkles, ClipboardList, Activity, ArrowRight, BookOpen, Users, CheckCircle, Clock, ShieldCheck, Moon, Zap, Wind } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DailyCheckinModal } from '../components/student/DailyCheckinModal';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Skeleton } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';

const MOOD_EMOJIS = ['', '😞', '😟', '😐', '🙂', '😊'];
const MOOD_LABELS = ['', 'Very Low', 'Low', 'Okay', 'Good', 'Great'];

const QUICK_ACTIONS = [
  { label: 'Screenings', icon: ClipboardList, to: '/assessments', colour: 'bg-purple-50 text-purple-700 border-purple-200' },
  { label: 'Timeline', icon: Activity, to: '/timeline', colour: 'bg-brand-50 text-brand-700 border-brand-200' },
  { label: 'Counsellors', icon: Calendar, to: '/counsellors', colour: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { label: 'Resources', icon: BookOpen, to: '/resources', colour: 'bg-amberwarm-50 text-amberwarm-800 border-amberwarm-200' },
  { label: 'Peer Hub', icon: Users, to: '/peer-community', colour: 'bg-calm-100 text-calm-700 border-calm-200' },
  { label: 'Appointments', icon: Calendar, to: '/appointments', colour: 'bg-blue-50 text-blue-700 border-blue-200' },
];

function BreathingWidget() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale' | 'idle'>('idle');
  const [label, setLabel] = useState('');

  const start = () => {
    setRunning(true);
    let count = 0;
    const steps: { p: 'inhale' | 'hold' | 'exhale'; l: string; d: number }[] = [
      { p: 'inhale', l: 'Breathe in… (4)', d: 4000 },
      { p: 'hold', l: 'Hold… (7)', d: 7000 },
      { p: 'exhale', l: 'Breathe out… (8)', d: 8000 },
    ];
    const run = () => {
      const s = steps[count % 3];
      setPhase(s.p);
      setLabel(s.l);
      count++;
      setTimeout(run, s.d);
    };
    run();
  };

  return (
    <Card variant="calm" padding="md" className="space-y-3">
      <div className="flex items-center gap-2">
        <Wind className="w-4 h-4 text-brand-600" />
        <h3 className="text-sm font-bold text-calm-900">4-7-8 Breathing</h3>
      </div>
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center transition-all duration-1000 flex-shrink-0 ${
          phase === 'inhale' ? 'scale-125 border-brand-500 bg-brand-50' :
          phase === 'hold' ? 'border-amberwarm-400 bg-amberwarm-50' :
          phase === 'exhale' ? 'scale-75 border-calm-300 bg-calm-50' :
          'border-calm-200 bg-calm-50'
        }`}>
          <span className="text-[10px] text-calm-600 text-center leading-tight">{phase === 'idle' ? '·' : label.split(' ')[0]}</span>
        </div>
        <div className="flex-1">
          <p className="text-xs text-calm-500">{running ? label : 'A calming breath exercise to ground yourself in moments of stress.'}</p>
          {!running && (
            <button onClick={start} className="mt-1.5 text-xs text-brand-600 font-semibold hover:underline">Start now →</button>
          )}
        </div>
      </div>
    </Card>
  );
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [todayCheckin, setTodayCheckin] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const [checkin, recs, apts] = await Promise.all([
        api.getTodayCheckin().catch(() => ({ hasCheckedInToday: false })),
        api.getRecommendations().catch(() => []),
        api.getMyAppointments().catch(() => []),
      ]);
      setTodayCheckin(checkin);
      setRecommendations(recs?.slice(0, 3) || []);
      setUpcomingAppointments(
        (apts || []).filter((a: any) => ['CONFIRMED', 'PENDING'].includes(a.status)).slice(0, 2)
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const alias = user?.studentProfile?.anonymousAlias || user?.firstName || 'Friend';
  const dept = user?.studentProfile?.department || '';
  const mood = todayCheckin?.moodScore;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 text-white rounded-3xl p-6 sm:p-8 shadow-card">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-brand-100 text-xs font-semibold border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-300" />
            Confidential · Stigma-Free
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, <span className="text-brand-200">@{alias}</span>
          </h1>
          {dept && <p className="text-sm text-brand-100/80">{dept}</p>}
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={() => setIsCheckinOpen(true)}
              className="px-4 py-2.5 bg-white text-brand-900 hover:bg-brand-50 rounded-xl font-bold text-sm shadow-soft transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-brand-600" />
              {todayCheckin?.hasCheckedInToday ? 'Update Check-in' : 'Log 15-Second Check-in'}
            </button>
            <Link to="/ai-support" className="px-4 py-2.5 bg-brand-600/60 hover:bg-brand-600 text-white border border-white/20 rounded-xl font-semibold text-sm backdrop-blur-md transition-all flex items-center gap-2">
              <Heart className="w-4 h-4 text-brand-200" />
              Talk with AI First-Aid
            </Link>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Today's checkin status */}
          {isLoading ? (
            <Skeleton className="h-24" />
          ) : (
            <Card padding="md" className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-2xl flex-shrink-0">
                {mood ? MOOD_EMOJIS[mood] : '✨'}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-calm-500">Today's Wellbeing</p>
                {todayCheckin?.hasCheckedInToday ? (
                  <div>
                    <p className="text-sm font-bold text-calm-900">{MOOD_LABELS[mood]} · Mood {mood}/5</p>
                    <p className="text-xs text-calm-500">Sleep: {todayCheckin.sleepHours}h · Stress: {todayCheckin.stressLevel}/5</p>
                  </div>
                ) : (
                  <p className="text-sm text-calm-600">How are you feeling today? <button onClick={() => setIsCheckinOpen(true)} className="text-brand-600 font-semibold hover:underline">Check in →</button></p>
                )}
              </div>
              {todayCheckin?.hasCheckedInToday && <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
            </Card>
          )}

          {/* Quick actions grid */}
          <div>
            <h2 className="text-sm font-bold text-calm-700 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-3 gap-3">
              {QUICK_ACTIONS.map((a) => (
                <Link key={a.to} to={a.to} className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-xs font-semibold hover:opacity-80 transition-all ${a.colour}`}>
                  <a.icon className="w-5 h-5" />
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Personalized Recommendations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-calm-700">Personalized For You</h2>
              <Link to="/recommendations" className="text-xs text-brand-600 font-semibold hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
            </div>
            {isLoading ? (
              <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-16" />)}</div>
            ) : recommendations.length === 0 ? (
              <EmptyState icon="book" title="No recommendations yet" description="Complete a check-in to get personalised suggestions" actionLabel="Log Check-in" onAction={() => setIsCheckinOpen(true)} />
            ) : (
              <div className="space-y-2">
                {recommendations.map((r: any) => (
                  <Link key={r.id} to={`/resources/${r.slug}`} className="flex items-center gap-3 p-3 bg-white border border-calm-200 rounded-xl hover:border-brand-300 hover:shadow-soft transition-all">
                    <BookOpen className="w-5 h-5 text-brand-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-calm-900 truncate">{r.title}</p>
                      <p className="text-[11px] text-calm-500">{r.readingTimeMin ? `${r.readingTimeMin} min read` : 'Guide'}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-calm-400 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Breathing widget */}
          <BreathingWidget />

          {/* Upcoming appointments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-calm-700">Upcoming Sessions</h2>
              <Link to="/appointments" className="text-xs text-brand-600 font-semibold hover:underline">View all</Link>
            </div>
            {isLoading ? <Skeleton className="h-20" /> : upcomingAppointments.length === 0 ? (
              <Card variant="calm" padding="sm" className="text-center space-y-2">
                <Clock className="w-6 h-6 text-calm-400 mx-auto" />
                <p className="text-xs text-calm-500">No upcoming sessions</p>
                <Link to="/counsellors" className="text-xs text-brand-600 font-semibold hover:underline">Book a counsellor →</Link>
              </Card>
            ) : (
              <div className="space-y-2">
                {upcomingAppointments.map((a: any) => (
                  <Card key={a.id} padding="sm" className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-calm-900">{a.counsellor?.user ? `Dr. ${a.counsellor.user.firstName} ${a.counsellor.user.lastName}` : 'Counsellor'}</p>
                      <Badge variant={a.status === 'CONFIRMED' ? 'success' : 'warning'} size="sm">{a.status}</Badge>
                    </div>
                    <p className="text-[11px] text-calm-500">{new Date(a.scheduledAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <DailyCheckinModal isOpen={isCheckinOpen} onClose={() => { setIsCheckinOpen(false); load(); }} />
    </div>
  );
};
