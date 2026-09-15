import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, AlertTriangle, CheckCircle, ArrowLeft, Phone } from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { PageLoading } from '../components/common/LoadingState';
import { ErrorBanner } from '../components/common/ErrorBanner';

type AppState = 'list' | 'taking' | 'result';

const SEVERITY_BADGE: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
  Minimal: 'success', Mild: 'info', Moderate: 'warning',
  'Moderately Severe': 'danger', Severe: 'danger', 'Low': 'success', 'Medium': 'warning', 'High': 'danger',
};

const EST_TIME: Record<string, string> = { PHQ9: '5 min', GAD7: '5 min', WHO5: '3 min' };

export const AssessmentsPage: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('list');
  const [assessments, setAssessments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [activeAssessment, setActiveAssessment] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadList = async () => {
    setIsLoading(true);
    try {
      const [asmts, hist] = await Promise.all([
        api.getAssessments(),
        api.getAssessmentHistory().catch(() => []),
      ]);
      setAssessments(asmts || []);
      setHistory((hist || []).slice(0, 3));
    } catch (err: any) {
      setError(err?.message || 'Failed to load assessments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadList(); }, []);

  const startAssessment = async (code: string) => {
    setError('');
    try {
      const detail = await api.getAssessmentDetails(code);
      setActiveAssessment(detail);
      setAnswers({});
      setAppState('taking');
    } catch (err: any) {
      setError(err?.message || 'Failed to load screening. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!activeAssessment) return;
    const questions = activeAssessment.questions || [];
    if (questions.some((q: any) => answers[q.id] === undefined)) {
      setError('Please answer all questions before submitting.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const res = await api.submitAssessment(activeAssessment.code, answers);
      setResult(res);
      setAppState('result');
    } catch (err: any) {
      setError(err?.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && appState === 'list') return <PageLoading label="Loading screenings…" />;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* LIST STATE */}
      {appState === 'list' && (
        <>
          <div>
            <h1 className="text-2xl font-extrabold text-calm-900 flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-brand-600" /> Psychometric Screenings
            </h1>
            <p className="text-sm text-calm-500 mt-0.5">Evidence-based self-reflection tools. Not clinical diagnostic tests.</p>
          </div>

          {error && <ErrorBanner message={error} onRetry={loadList} />}

          <div className="bg-amberwarm-50 border border-amberwarm-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amberwarm-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amberwarm-800 leading-relaxed">
              <strong>Non-diagnostic disclaimer:</strong> These screenings are self-reflection tools and are <strong>not</strong> a clinical diagnosis. Results are private and for your personal awareness only. If you're in distress, please reach out to a counsellor or call <strong>14416</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessments.map((a) => (
              <Card key={a.code} variant="elevated" padding="md" className="flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="info" size="sm">{EST_TIME[a.code] || '5 min'}</Badge>
                  </div>
                  <h3 className="text-sm font-bold text-calm-900">{a.title}</h3>
                  <p className="text-xs text-calm-500 leading-relaxed">{a.description}</p>
                </div>
                <Button onClick={() => startAssessment(a.code)} variant="primary" size="sm">Begin Screening</Button>
              </Card>
            ))}
          </div>

          {history.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-calm-700">Previous Results</h2>
              {history.map((h: any, i: number) => (
                <Card key={i} padding="sm" className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-calm-900">{h.assessment?.title || h.assessmentCode}</p>
                    <p className="text-[11px] text-calm-500">{new Date(h.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-calm-900">{h.score}</span>
                    <Badge variant={SEVERITY_BADGE[h.severityCategory] || 'info'} size="sm">{h.severityCategory}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAKING STATE */}
      {appState === 'taking' && activeAssessment && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setAppState('list')} className="p-2 rounded-xl border border-calm-200 hover:bg-calm-50 text-calm-500">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-extrabold text-calm-900">{activeAssessment.title}</h1>
              <p className="text-xs text-calm-500">{activeAssessment.questions?.length} questions</p>
            </div>
          </div>

          <div className="bg-amberwarm-50 border border-amberwarm-200 rounded-xl p-3">
            <p className="text-xs text-amberwarm-700">{activeAssessment.clinicalDisclaimer}</p>
          </div>

          {error && <ErrorBanner message={error} />}

          <div className="space-y-5">
            {(activeAssessment.questions || []).map((q: any, idx: number) => (
              <Card key={q.id} padding="md">
                <fieldset>
                  <legend className="text-sm font-semibold text-calm-900 mb-3">
                    <span className="text-brand-600 mr-2">{idx + 1}.</span>{q.text}
                  </legend>
                  <div className="space-y-2">
                    {(q.options || []).map((opt: any) => (
                      <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={opt.value}
                          checked={answers[q.id] === opt.value}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.value }))}
                          className="text-brand-600 focus:ring-brand-500"
                        />
                        <span className={`text-xs ${answers[q.id] === opt.value ? 'text-brand-700 font-semibold' : 'text-calm-700'}`}>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </Card>
            ))}
          </div>

          <div className="flex gap-3 pb-4">
            <Button onClick={() => setAppState('list')} variant="outline">Cancel</Button>
            <Button onClick={handleSubmit} variant="primary" className="flex-1" isLoading={isSubmitting} rightIcon={<CheckCircle className="w-4 h-4" />}>
              Submit Screening
            </Button>
          </div>
        </div>
      )}

      {/* RESULT STATE */}
      {appState === 'result' && result && (
        <div className="max-w-xl mx-auto space-y-6 text-center">
          <div>
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-brand-700 to-brand-500 flex flex-col items-center justify-center shadow-soft">
              <span className="text-3xl font-extrabold text-white">{result.score}</span>
              <span className="text-[10px] text-brand-100 font-medium">Score</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Badge variant={SEVERITY_BADGE[result.severityCategory] || 'info'} size="md">{result.severityCategory}</Badge>
            </div>
            <p className="text-sm text-calm-600 leading-relaxed max-w-sm mx-auto">{result.guidance}</p>
          </div>

          {result.criticalTriggered && (
            <div className="bg-crisis-50 border-2 border-crisis-300 rounded-2xl p-5 space-y-3 text-left">
              <div className="flex items-center gap-2 text-crisis-700">
                <AlertTriangle className="w-5 h-5" />
                <p className="text-sm font-bold">Please reach out for support</p>
              </div>
              <p className="text-xs text-crisis-600">Your responses suggest you may benefit from speaking with someone right now. Please don't face this alone.</p>
              <div className="space-y-2">
                <a href="tel:14416" className="flex items-center gap-2 p-3 bg-white border border-crisis-200 rounded-xl text-crisis-700 font-bold text-sm hover:bg-crisis-50">
                  <Phone className="w-4 h-4" /> Tele-MANAS: 14416
                </a>
                <a href="tel:18005990019" className="flex items-center gap-2 p-3 bg-white border border-crisis-200 rounded-xl text-crisis-700 font-bold text-sm hover:bg-crisis-50">
                  <Phone className="w-4 h-4" /> KIRAN: 1800-599-0019
                </a>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/counsellors">
              <Button variant="primary">Speak with a Counsellor</Button>
            </Link>
            <Button onClick={() => { setAppState('list'); setResult(null); loadList(); }} variant="outline">
              Back to Screenings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
