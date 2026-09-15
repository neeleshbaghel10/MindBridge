import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, CheckCircle, Moon, Zap, Brain } from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { ErrorBanner, SuccessBanner } from '../components/common/ErrorBanner';
import { PageLoading } from '../components/common/LoadingState';

const MOODS = [
  { score: 1, emoji: '😞', label: 'Very Low' },
  { score: 2, emoji: '😟', label: 'Low' },
  { score: 3, emoji: '😐', label: 'Okay' },
  { score: 4, emoji: '🙂', label: 'Good' },
  { score: 5, emoji: '😊', label: 'Great' },
];

const STRESS_LABELS = ['', 'Very Calm', 'Calm', 'Moderate', 'Stressed', 'Very Stressed'];
const ENERGY_LABELS = ['', 'Drained', 'Tired', 'Neutral', 'Energised', 'Very Energised'];

const TAGS = ['Exams', 'Deadlines', 'Social', 'Family', 'Sleep Issues', 'Exercise', 'Good Day', 'Anxious', 'Tired', 'Motivated'];

export const DailyCheckinPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState(7);
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    api.getTodayCheckin().then((data: any) => {
      if (data?.hasCheckedInToday && data.checkin) {
        const c = data.checkin;
        setHasExisting(true);
        setMoodScore(c.moodScore);
        setSleepHours(c.sleepHours || 7);
        setStressLevel(c.stressLevel);
        setEnergyLevel(c.energyLevel);
        setSelectedTags(c.tags || []);
        setNotes(c.notes || '');
      }
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moodScore || !stressLevel || !energyLevel) {
      setError('Please rate your mood, stress level, and energy level.');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await api.submitCheckin({ moodScore, sleepHours, stressLevel, energyLevel, tags: selectedTags, notes: notes || null });
      setSuccess('Check-in saved! Your wellbeing journey is being tracked.');
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <PageLoading label="Loading your check-in…" />;

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-fadeIn">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-extrabold text-calm-900">How are you today?</h1>
        <p className="text-sm text-calm-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        {hasExisting && <Badge variant="info" size="sm">Updating today's check-in</Badge>}
      </div>

      {error && <ErrorBanner message={error} onRetry={() => setError('')} />}
      {success && <SuccessBanner message={success} />}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Mood */}
        <Card padding="md" className="space-y-3">
          <h2 className="text-sm font-bold text-calm-900">How's your mood?</h2>
          <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Mood score">
            {MOODS.map((m) => (
              <label key={m.score} className="cursor-pointer">
                <input type="radio" name="mood" value={m.score} checked={moodScore === m.score} onChange={() => setMoodScore(m.score)} className="sr-only" aria-label={m.label} />
                <div className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${moodScore === m.score ? 'border-brand-600 bg-brand-50' : 'border-calm-200 hover:border-brand-300'}`}>
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-[10px] font-semibold text-calm-600">{m.label}</span>
                </div>
              </label>
            ))}
          </div>
        </Card>

        {/* Sleep */}
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-calm-900 flex items-center gap-2"><Moon className="w-4 h-4 text-brand-600" /> Sleep last night</h2>
            <span className="text-lg font-extrabold text-brand-700">{sleepHours}h</span>
          </div>
          <input
            type="range" min={0} max={14} step={0.5} value={sleepHours}
            onChange={(e) => setSleepHours(Number(e.target.value))}
            className="w-full accent-brand-600"
            aria-label="Sleep hours"
          />
          <div className="flex justify-between text-[10px] text-calm-400">
            <span>0h</span>
            <span className={`font-semibold ${sleepHours >= 7 && sleepHours <= 9 ? 'text-emerald-600' : 'text-calm-400'}`}>Recommended: 7-9h</span>
            <span>14h</span>
          </div>
        </Card>

        {/* Stress & Energy */}
        <div className="grid grid-cols-2 gap-4">
          <Card padding="md" className="space-y-3">
            <h2 className="text-xs font-bold text-calm-900">Stress Level</h2>
            <div className="space-y-1">
              {[1, 2, 3, 4, 5].map((v) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="stress" value={v} checked={stressLevel === v} onChange={() => setStressLevel(v)} className="sr-only" />
                  <div className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold border text-center transition-all ${stressLevel === v ? 'border-brand-600 bg-brand-600 text-white' : 'border-calm-200 text-calm-600 hover:border-brand-300'}`}>
                    {STRESS_LABELS[v]}
                  </div>
                </label>
              ))}
            </div>
          </Card>

          <Card padding="md" className="space-y-3">
            <h2 className="text-xs font-bold text-calm-900 flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amberwarm-500" /> Energy</h2>
            <div className="space-y-1">
              {[1, 2, 3, 4, 5].map((v) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="energy" value={v} checked={energyLevel === v} onChange={() => setEnergyLevel(v)} className="sr-only" />
                  <div className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold border text-center transition-all ${energyLevel === v ? 'border-brand-600 bg-brand-600 text-white' : 'border-calm-200 text-calm-600 hover:border-brand-300'}`}>
                    {ENERGY_LABELS[v]}
                  </div>
                </label>
              ))}
            </div>
          </Card>
        </div>

        {/* Tags */}
        <Card padding="md" className="space-y-3">
          <h2 className="text-sm font-bold text-calm-900">What's influencing your day? <span className="font-normal text-calm-400 text-xs">(optional)</span></h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Context tags">
            {TAGS.map((tag) => (
              <button
                key={tag} type="button" onClick={() => toggleTag(tag)}
                aria-pressed={selectedTags.includes(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedTags.includes(tag) ? 'bg-brand-600 text-white border-brand-600' : 'bg-calm-50 text-calm-600 border-calm-200 hover:border-brand-300'}`}
              >
                {selectedTags.includes(tag) && <CheckCircle className="w-3 h-3 inline mr-1" />}
                {tag}
              </button>
            ))}
          </div>
        </Card>

        {/* Notes */}
        <Card padding="md" className="space-y-2">
          <label htmlFor="notes" className="text-sm font-bold text-calm-900">
            Private note <span className="font-normal text-calm-400 text-xs">(optional, only you can see this)</span>
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Anything you want to capture for yourself today…"
            className="w-full rounded-xl border border-calm-200 text-sm px-3.5 py-2.5 text-calm-900 placeholder-calm-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <p className="text-right text-[10px] text-calm-400">{notes.length}/500</p>
        </Card>

        <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isSaving} rightIcon={<CheckCircle className="w-4 h-4" />}>
          {hasExisting ? 'Update Check-in' : 'Save Check-in'}
        </Button>
      </form>

      <div className="text-center">
        <Link to="/" className="text-sm text-calm-500 hover:text-calm-700 hover:underline">← Back to Dashboard</Link>
      </div>
    </div>
  );
};
