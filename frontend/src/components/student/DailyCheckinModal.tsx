import React, { useState } from 'react';
import { X, Sparkles, Moon, Zap, Smile, Frown, Meh, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

interface DailyCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DailyCheckinModal: React.FC<DailyCheckinModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [moodScore, setMoodScore] = useState<number>(3);
  const [sleepHours, setSleepHours] = useState<number>(7.0);
  const [stressLevel, setStressLevel] = useState<number>(2);
  const [energyLevel, setEnergyLevel] = useState<number>(3);
  const [notes, setNotes] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const moodOptions = [
    { score: 1, label: 'Heavy / Low', icon: Frown, color: 'text-crisis-500 bg-crisis-50 border-crisis-200' },
    { score: 2, label: 'Under Strain', icon: Frown, color: 'text-amberwarm-600 bg-amberwarm-50 border-amberwarm-200' },
    { score: 3, label: 'Steady', icon: Meh, color: 'text-calm-600 bg-calm-100 border-calm-300' },
    { score: 4, label: 'Good', icon: Smile, color: 'text-brand-600 bg-brand-50 border-brand-200' },
    { score: 5, label: 'Thriving', icon: Sparkles, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  ];

  const availableTags = [
    'Exams', 'Assignments', 'Sleep Deprivation', 'Placement Anxiety',
    'Loneliness', 'Family Expectations', 'Financial Stress', 'Physical Health', 'Social Burnout'
  ];

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await api.submitCheckin({
        moodScore,
        sleepHours,
        stressLevel,
        energyLevel,
        notes: notes.trim() || undefined,
        tags: selectedTags,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit check-in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-calm-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white shadow-2xl rounded-2xl border border-calm-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-calm-100 bg-gradient-to-r from-brand-50 to-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-brand-600 text-white rounded-xl shadow-soft">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-calm-900">Daily Wellbeing Check-in</h2>
              <p className="text-xs text-calm-500">15 seconds to reflect and track your personal baseline</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-calm-400 hover:text-calm-600 rounded-lg hover:bg-calm-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-sm">
          {error && (
            <div className="p-3 bg-crisis-50 border border-crisis-200 rounded-xl text-crisis-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Mood Selection */}
          <div className="space-y-2">
            <label className="block font-semibold text-calm-800">
              How does your mind feel right now?
            </label>
            <div className="grid grid-cols-5 gap-2">
              {moodOptions.map(m => {
                const Icon = m.icon;
                const isSelected = moodScore === m.score;
                return (
                  <button
                    key={m.score}
                    type="button"
                    onClick={() => setMoodScore(m.score)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all ${
                      isSelected
                        ? `${m.color} ring-2 ring-brand-500 font-bold scale-105 shadow-sm`
                        : 'border-calm-200 hover:border-calm-300 text-calm-600 bg-calm-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] leading-tight text-center">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Sleep Hours */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-calm-800 flex items-center space-x-1.5">
                <Moon className="w-4 h-4 text-brand-600" />
                <span>Sleep Duration</span>
              </label>
              <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                {sleepHours.toFixed(1)} hrs
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="14"
              step="0.5"
              value={sleepHours}
              onChange={e => setSleepHours(parseFloat(e.target.value))}
              className="w-full h-2 bg-calm-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
            />
            <div className="flex justify-between text-[10px] text-calm-400">
              <span>0h (Severe Insomnia)</span>
              <span>7-8h (Restorative)</span>
              <span>12h+</span>
            </div>
          </div>

          {/* 3. Stress Level */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-calm-800">Perceived Stress Level (1-5)</label>
              <span className="text-xs font-semibold text-calm-600">
                {stressLevel === 1 ? '1 - Very Low' : stressLevel === 2 ? '2 - Manageable' : stressLevel === 3 ? '3 - Moderate' : stressLevel === 4 ? '4 - High Strain' : '5 - Overwhelming'}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setStressLevel(lvl)}
                  className={`py-2 rounded-lg border text-center font-bold text-xs transition-all ${
                    stressLevel === lvl
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-white text-calm-700 border-calm-200 hover:bg-calm-50'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Energy Level */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="font-semibold text-calm-800 flex items-center space-x-1.5">
                <Zap className="w-4 h-4 text-amberwarm-500" />
                <span>Vitality & Energy (1-5)</span>
              </label>
              <span className="text-xs font-semibold text-calm-600">{energyLevel} / 5</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setEnergyLevel(lvl)}
                  className={`py-2 rounded-lg border text-center font-bold text-xs transition-all ${
                    energyLevel === lvl
                      ? 'bg-amberwarm-500 text-white border-amberwarm-500 shadow-sm'
                      : 'bg-white text-calm-700 border-calm-200 hover:bg-calm-50'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Stress Factors / Tags */}
          <div className="space-y-2">
            <label className="block font-semibold text-calm-800">Key Context Tags (Optional)</label>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-brand-700 text-white shadow-xs'
                        : 'bg-calm-100 text-calm-600 hover:bg-calm-200'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. Short Reflection Note */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-calm-800">Personal Reflection (Private to You)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="What went well today, or what is weighing on your mind?"
              className="w-full p-2.5 border border-calm-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden text-xs text-calm-800"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-soft transition-all flex items-center justify-center space-x-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving Check-in...' : 'Save Daily Check-in'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
