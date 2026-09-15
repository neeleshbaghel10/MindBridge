import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, Wind, BookOpen } from 'lucide-react';
import { api } from '../services/api';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { PageLoading } from '../components/common/LoadingState';
import { ErrorBanner, SuccessBanner } from '../components/common/ErrorBanner';

export const ResourceDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [resource, setResource] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [breathRunning, setBreathRunning] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale' | 'idle'>('idle');
  const [breathLabel, setBreathLabel] = useState('');

  useEffect(() => {
    if (!slug) return;
    api.getResourceBySlug(slug)
      .then((r: any) => {
        setResource(r);
        setCompleted(r.isCompleted || false);
      })
      .catch((err: any) => setError(err?.message || 'Resource not found.'))
      .finally(() => setIsLoading(false));
  }, [slug]);

  const markComplete = async () => {
    if (!resource || completing) return;
    setCompleting(true);
    try {
      await api.updateResourceProgress(resource.id, { completed: true });
      setCompleted(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to mark as completed.');
    } finally {
      setCompleting(false);
    }
  };

  const startBreathing = () => {
    if (breathRunning) return;
    setBreathRunning(true);
    let count = 0;
    const steps: { p: 'inhale' | 'hold' | 'exhale'; l: string; d: number }[] = [
      { p: 'inhale', l: 'Breathe in… (4)', d: 4000 },
      { p: 'hold', l: 'Hold… (7)', d: 7000 },
      { p: 'exhale', l: 'Breathe out… (8)', d: 8000 },
    ];
    const run = () => { const s = steps[count % 3]; setBreathPhase(s.p); setBreathLabel(s.l); count++; setTimeout(run, s.d); };
    run();
  };

  if (isLoading) return <PageLoading label="Loading guide…" />;
  if (error) return (
    <div className="space-y-4">
      <Link to="/resources" className="text-sm text-brand-600 flex items-center gap-1 hover:underline"><ArrowLeft className="w-4 h-4" /> Back to Resources</Link>
      <ErrorBanner message={error} />
    </div>
  );
  if (!resource) return null;

  const showBreathingWidget = ['ANXIETY', 'STRESS'].includes(resource.category);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      {/* Back */}
      <Link to="/resources" className="text-sm text-brand-600 flex items-center gap-1 hover:underline">
        <ArrowLeft className="w-4 h-4" /> Back to Resources
      </Link>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info" size="sm">{resource.category}</Badge>
          {resource.readingTimeMin && (
            <span className="flex items-center gap-1 text-xs text-calm-400">
              <Clock className="w-3.5 h-3.5" /> {resource.readingTimeMin} min read
            </span>
          )}
          {completed && <Badge variant="success" size="sm"><CheckCircle className="w-3 h-3 inline mr-1" />Completed</Badge>}
        </div>
        <h1 className="text-2xl font-extrabold text-calm-900">{resource.title}</h1>
        {resource.description && <p className="text-sm text-calm-500 leading-relaxed">{resource.description}</p>}
        {resource.authorName && <p className="text-xs text-calm-400">By {resource.authorName}</p>}
      </div>

      {/* Breathing widget for anxiety/stress resources */}
      {showBreathingWidget && (
        <Card variant="calm" padding="md" className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full border-4 flex-shrink-0 flex items-center justify-center transition-all duration-1000 ${breathPhase === 'inhale' ? 'scale-125 border-brand-500 bg-brand-50' : breathPhase === 'hold' ? 'border-amberwarm-400 bg-amberwarm-50' : breathPhase === 'exhale' ? 'scale-75 border-calm-300 bg-calm-50' : 'border-calm-200 bg-calm-50'}`}>
            <Wind className="w-5 h-5 text-calm-500" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-calm-800">4-7-8 Breathing</p>
            <p className="text-xs text-calm-500">{breathRunning ? breathLabel : 'A quick grounding exercise before reading'}</p>
            {!breathRunning && <button onClick={startBreathing} className="text-xs text-brand-600 font-semibold hover:underline mt-1">Start →</button>}
          </div>
        </Card>
      )}

      {/* Content */}
      <div className="prose prose-sm prose-calm max-w-none">
        {resource.content ? (
          resource.content.split('\n\n').map((para: string, i: number) => (
            <p key={i} className="text-sm text-calm-700 leading-relaxed mb-4">{para}</p>
          ))
        ) : (
          <p className="text-sm text-calm-500">Content is being prepared. Please check back soon.</p>
        )}
      </div>

      {/* Key Takeaways */}
      {resource.bulletPoints?.length > 0 && (
        <Card variant="calm" padding="md" className="space-y-3">
          <h2 className="text-sm font-bold text-calm-900 flex items-center gap-2"><BookOpen className="w-4 h-4 text-brand-600" /> Key Takeaways</h2>
          <ul className="space-y-2">
            {resource.bulletPoints.map((point: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-xs text-calm-700">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                {point}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Mark complete */}
      {!completed ? (
        <Button onClick={markComplete} isLoading={completing} variant="primary" className="w-full" rightIcon={<CheckCircle className="w-4 h-4" />}>
          Mark as Completed
        </Button>
      ) : (
        <SuccessBanner message="You've completed this guide! Great work taking care of your wellbeing." />
      )}

      <div className="text-center">
        <Link to="/recommendations" className="text-sm text-brand-600 font-semibold hover:underline">View more recommendations →</Link>
      </div>
    </div>
  );
};
