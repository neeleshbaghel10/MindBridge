import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Calendar, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import { TabGroup } from '../components/common/TabGroup';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { PageLoading } from '../components/common/LoadingState';
import { ErrorBanner } from '../components/common/ErrorBanner';

const MOOD_EMOJIS = ['', '😞', '😟', '😐', '🙂', '😊'];
const MOOD_COLOURS = ['', 'bg-crisis-400', 'bg-crisis-300', 'bg-amberwarm-400', 'bg-brand-400', 'bg-emerald-500'];
const PERIOD_TABS = [
  { id: '7', label: '7 Days' },
  { id: '14', label: '14 Days' },
  { id: '30', label: '30 Days' },
];

export const TimelinePage: React.FC = () => {
  const [days, setDays] = useState('14');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (d: string) => {
    setIsLoading(true);
    setError('');
    try {
      const result = await api.getTimeline(Number(d));
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to load timeline.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(days); }, [days]);

  const checkins = data?.checkins || [];
  const summary = data?.summary || {};

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-calm-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-brand-600" />
            Wellbeing Timeline
          </h1>
          <p className="text-sm text-calm-500 mt-0.5">Track your patterns over time</p>
        </div>
        <Link to="/checkin" className="text-sm text-brand-600 font-semibold hover:underline flex items-center gap-1">
          + Log today's check-in
        </Link>
      </div>

      <TabGroup tabs={PERIOD_TABS} activeTab={days} onChange={setDays} />

      {error && <ErrorBanner message={error} onRetry={() => load(days)} />}

      {/* Summary stats */}
      {!isLoading && checkins.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Check-ins', value: summary.totalCheckins ?? checkins.length, sub: `past ${days} days` },
            { label: 'Avg Mood', value: summary.averageMood ? `${summary.averageMood.toFixed(1)}/5` : '—', sub: 'out of 5' },
            { label: 'Avg Sleep', value: summary.averageSleep ? `${summary.averageSleep.toFixed(1)}h` : '—', sub: 'per night' },
            { label: 'Avg Stress', value: summary.averageStress ? `${summary.averageStress.toFixed(1)}/5` : '—', sub: '1=calm, 5=stressed' },
          ].map((s) => (
            <Card key={s.label} padding="sm" className="text-center space-y-0.5">
              <p className="text-xl font-extrabold text-brand-700">{s.value}</p>
              <p className="text-xs font-semibold text-calm-700">{s.label}</p>
              <p className="text-[10px] text-calm-400">{s.sub}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Bar chart */}
      {!isLoading && checkins.length > 0 && (
        <Card padding="md" className="space-y-3">
          <h2 className="text-sm font-bold text-calm-900 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand-600" /> Mood Chart</h2>
          <div className="flex items-end gap-1 h-20 overflow-x-auto pb-1">
            {checkins.slice().reverse().map((c: any) => (
              <div key={c.id} className="flex flex-col items-center gap-1 min-w-[28px] flex-1">
                <div
                  className={`w-full rounded-t-md transition-all ${MOOD_COLOURS[c.moodScore] || 'bg-calm-300'}`}
                  style={{ height: `${(c.moodScore / 5) * 64}px` }}
                  title={`${MOOD_EMOJIS[c.moodScore]} ${c.moodScore}/5 — ${new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                  role="img"
                  aria-label={`Mood ${c.moodScore} on ${new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                />
                <span className="text-[9px] text-calm-400 rotate-0 leading-none">{new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).replace(' ', '\n')}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Check-in list */}
      {isLoading ? (
        <PageLoading label="Loading your timeline…" />
      ) : checkins.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No check-ins yet"
          description={`You haven't logged any check-ins in the past ${days} days. Start tracking your wellbeing today.`}
          actionLabel="Log your first check-in"
          onAction={() => {}}
        />
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-calm-700">History</h2>
          {checkins.map((c: any) => (
            <Card key={c.id} padding="md" className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{MOOD_EMOJIS[c.moodScore]}</span>
                  <div>
                    <p className="text-xs font-bold text-calm-900">Mood {c.moodScore}/5</p>
                    <p className="text-[11px] text-calm-500">{new Date(c.createdAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="info" size="sm">Sleep {c.sleepHours}h</Badge>
                  <Badge variant={c.stressLevel >= 4 ? 'danger' : c.stressLevel >= 3 ? 'warning' : 'success'} size="sm">Stress {c.stressLevel}/5</Badge>
                  <Badge variant={c.energyLevel >= 4 ? 'success' : 'info'} size="sm">Energy {c.energyLevel}/5</Badge>
                </div>
              </div>
              {c.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {c.tags.map((tag: string) => (
                    <span key={tag} className="px-2 py-0.5 text-[10px] bg-calm-100 text-calm-600 rounded-full">{tag}</span>
                  ))}
                </div>
              )}
              {c.notes && <p className="text-xs text-calm-500 italic">"{c.notes}"</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
