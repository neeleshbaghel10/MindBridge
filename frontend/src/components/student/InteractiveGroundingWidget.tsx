import React, { useState, useEffect } from 'react';
import { Wind, Play, Pause, RotateCcw } from 'lucide-react';

export const InteractiveGroundingWidget: React.FC = () => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [phase, setPhase] = useState<'INHALE' | 'HOLD' | 'EXHALE'>('INHALE');
  const [secondsLeft, setSecondsLeft] = useState<number>(4);
  const [cyclesCompleted, setCyclesCompleted] = useState<number>(0);

  useEffect(() => {
    let timer: any = null;
    if (isActive) {
      timer = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev > 1) return prev - 1;

          // Transition phase
          if (phase === 'INHALE') {
            setPhase('HOLD');
            return 7;
          } else if (phase === 'HOLD') {
            setPhase('EXHALE');
            return 8;
          } else {
            setPhase('INHALE');
            setCyclesCompleted(c => c + 1);
            return 4;
          }
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isActive, phase]);

  const handleReset = () => {
    setIsActive(false);
    setPhase('INHALE');
    setSecondsLeft(4);
    setCyclesCompleted(0);
  };

  const phaseInstruction = {
    INHALE: { text: 'Inhale gently through your nose...', color: 'text-brand-700', scale: 'scale-125' },
    HOLD: { text: 'Hold your breath gently...', color: 'text-amberwarm-700', scale: 'scale-125 ring-8 ring-amberwarm-200' },
    EXHALE: { text: 'Exhale slowly through your mouth...', color: 'text-calm-700', scale: 'scale-90' },
  };

  return (
    <div className="p-6 bg-gradient-to-br from-brand-50/60 via-white to-calm-50 border border-brand-200/80 rounded-2xl shadow-soft flex flex-col items-center text-center relative overflow-hidden">
      {/* Background soft aura */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-200/40 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center space-x-2 text-brand-800 text-xs font-bold uppercase tracking-wider mb-2">
        <Wind className="w-4 h-4 text-brand-600" />
        <span>4-7-8 Parasympathetic Reset</span>
      </div>

      <h3 className="text-base font-bold text-calm-900 mb-1">
        Take a Mindful Pause
      </h3>
      <p className="text-xs text-calm-500 max-w-sm mb-6">
        Stimulate your vagus nerve to lower heart rate and calm test anxiety in under 2 minutes.
      </p>

      {/* Breathing Sphere */}
      <div className="relative w-44 h-44 flex items-center justify-center mb-6">
        <div
          className={`w-36 h-36 rounded-full bg-gradient-to-tr from-brand-500 to-brand-300 shadow-elevated flex flex-col items-center justify-center text-white transition-all duration-1000 ease-in-out ${
            isActive ? phaseInstruction[phase].scale : 'scale-100'
          }`}
        >
          <span className="text-3xl font-extrabold tracking-tight">{secondsLeft}s</span>
          <span className="text-[11px] font-semibold tracking-wider uppercase opacity-90">{phase}</span>
        </div>
      </div>

      {/* Prompt Instruction */}
      <p className={`text-sm font-semibold h-6 mb-5 transition-colors ${phaseInstruction[phase].color}`}>
        {isActive ? phaseInstruction[phase].text : 'Press play to start breathing rhythm'}
      </p>

      {/* Control Buttons */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => setIsActive(!isActive)}
          className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl shadow-soft flex items-center space-x-1.5 transition-all"
        >
          {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{isActive ? 'Pause' : 'Begin 4-7-8'}</span>
        </button>
        <button
          onClick={handleReset}
          className="p-2 bg-white border border-calm-200 hover:bg-calm-50 text-calm-600 rounded-xl text-xs transition-colors"
          title="Reset"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        {cyclesCompleted > 0 && (
          <span className="text-xs font-medium text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-1 rounded-lg">
            {cyclesCompleted} {cyclesCompleted === 1 ? 'cycle' : 'cycles'} done
          </span>
        )}
      </div>
    </div>
  );
};
