import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Download,
  AlertCircle,
  BookOpen,
  HeartHandshake,
  Activity,
  FileText,
  CheckCircle2,
  Building2,
  GraduationCap,
  Filter,
  ShieldAlert,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { PageLoading } from '../components/common/LoadingState';
import { ErrorBanner } from '../components/common/ErrorBanner';

export const AdminAnalyticsPage: React.FC = () => {
  const { user } = useAuth();

  // Filters State
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'semester'>('30d');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [selectedYear, setSelectedYear] = useState<string>('All');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'assessments' | 'counselling' | 'community' | 'cohorts' | 'audit'>('overview');

  // Data States
  const [overview, setOverview] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [assessments, setAssessments] = useState<any>(null);
  const [breakdowns, setBreakdowns] = useState<any>(null);
  const [auditData, setAuditData] = useState<any>({ logs: [], totalCount: 0 });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filterParams = {
        range,
        department: selectedDept !== 'All' ? selectedDept : undefined,
        yearOfStudy: selectedYear !== 'All' ? Number(selectedYear) : undefined,
      };

      const [ovRes, trRes, asRes, bdRes, auRes] = await Promise.all([
        api.getAnalyticsOverview(filterParams),
        api.getAnalyticsTrends(range),
        api.getAssessmentAnalytics(),
        api.getDemographicBreakdowns(),
        api.getInstitutionalAuditLogs({ limit: 50 }),
      ]);

      setOverview(ovRes.data);
      setTrends(trRes.data);
      setAssessments(asRes.data);
      setBreakdowns(bdRes.data);
      setAuditData(auRes.data || { logs: [], totalCount: 0 });
    } catch (err: any) {
      console.error('Failed to load institutional analytics:', err);
      setError(err?.message || 'Failed to retrieve institutional analytics. Please ensure administrator privileges.');
    } finally {
      setIsLoading(false);
    }
  }, [range, selectedDept, selectedYear]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      await api.exportAnalyticsReport(format);
    } catch (err) {
      alert('Report export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading && !overview) {
    return <PageLoading label="Aggregating privacy-shielded campus analytics..." />;
  }

  const kpis = overview?.kpiSummary;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fadeIn">
      {/* Header & Governance Banner */}
      <div className="bg-white border border-calm-200 rounded-2xl p-6 shadow-soft flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-calm-900">
                Institutional Mental-Health Analytics Dashboard
              </h1>
              <p className="text-xs text-calm-500">
                {user?.institution?.name || 'Apex Institute of Technology'} • Dean of Academic Affairs & Student Welfare Governance
              </p>
            </div>
          </div>
        </div>

        {/* Export & Actions */}
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="text-xs flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleExport('json')}
            disabled={isExporting}
            className="text-xs flex items-center space-x-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </Button>
        </div>
      </div>

      {/* DPDP Act 2023 & k-Anonymity Privacy Shield Notice */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs mt-0.5 sm:mt-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  Mathematical k-Anonymity Privacy Guarantee (N ≥ 10)
                </h4>
                <Badge variant="success" className="text-[10px] py-0 px-2 font-bold">
                  DPDP Act 2023 Compliant
                </Badge>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                Zero Personally Identifiable Information (PII) is exposed. Individual student chat logs, screening submissions, and clinical notes remain cryptographically partitioned. Cohorts smaller than 10 students are automatically suppressed to prevent intersectional re-identification.
              </p>
            </div>
          </div>
          <div className="text-right sm:text-right shrink-0">
            <span className="text-[11px] font-semibold text-emerald-900 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200">
              Audit Logging: Active
            </span>
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Global Filter Bar */}
      <div className="bg-white border border-calm-200 rounded-2xl p-4 shadow-soft flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 text-xs text-calm-500 font-semibold">
            <Filter className="w-4 h-4 text-calm-400" />
            <span>Filters:</span>
          </div>

          {/* Department Filter */}
          <div className="flex items-center space-x-1">
            <label className="text-[11px] text-calm-400 font-bold uppercase">Dept:</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs border border-calm-300 rounded-lg px-2.5 py-1.5 bg-white text-calm-800 font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="All">All Departments</option>
              <option value="Computer Science & Engineering">Computer Science & Eng</option>
              <option value="Electronics & Communication">Electronics & Comm</option>
              <option value="Mechanical Engineering">Mechanical Eng</option>
              <option value="Civil Engineering">Civil Eng</option>
              <option value="Information Technology">Information Tech</option>
            </select>
          </div>

          {/* Year Filter */}
          <div className="flex items-center space-x-1">
            <label className="text-[11px] text-calm-400 font-bold uppercase">Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-xs border border-calm-300 rounded-lg px-2.5 py-1.5 bg-white text-calm-800 font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="All">All Academic Years</option>
              <option value="1">1st Year (Freshmen)</option>
              <option value="2">2nd Year (Sophomores)</option>
              <option value="3">3rd Year (Juniors)</option>
              <option value="4">4th Year (Seniors)</option>
            </select>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center space-x-1 bg-calm-100 p-1 rounded-xl">
          {[
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: '90d', label: 'Last 90 Days' },
            { id: 'semester', label: 'This Semester' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                range === r.id
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-calm-600 hover:text-calm-900'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Level KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-4 bg-white border border-calm-200">
            <div className="flex items-center justify-between text-calm-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Campus Mood</span>
              <Activity className="w-4 h-4 text-brand-500" />
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-extrabold text-brand-700">{kpis.averageCampusMoodScore}</span>
              <span className="text-xs text-calm-400 font-semibold">/5</span>
            </div>
            <p className="text-[10px] text-calm-500 mt-1">Campus-wide vitality baseline</p>
          </Card>

          <Card className="p-4 bg-white border border-calm-200">
            <div className="flex items-center justify-between text-calm-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Stress Index</span>
              <TrendingUp className="w-4 h-4 text-amberwarm-500" />
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-extrabold text-amberwarm-700">{kpis.averageCampusStressIndex}</span>
              <span className="text-xs text-calm-400 font-semibold">/5</span>
            </div>
            <p className="text-[10px] text-calm-500 mt-1">Spikes during midterm exams</p>
          </Card>

          <Card className="p-4 bg-white border border-calm-200">
            <div className="flex items-center justify-between text-calm-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Avg Sleep</span>
              <Clock className="w-4 h-4 text-calm-500" />
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-extrabold text-calm-800">{kpis.averageCampusSleepHours}</span>
              <span className="text-xs text-calm-400 font-semibold">hrs</span>
            </div>
            <p className="text-[10px] text-calm-500 mt-1">From {kpis.totalCheckinsLogged} daily check-ins</p>
          </Card>

          <Card className="p-4 bg-white border border-calm-200">
            <div className="flex items-center justify-between text-calm-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Engagement</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-extrabold text-emerald-700">{kpis.activeEngagementRate}%</span>
            </div>
            <p className="text-[10px] text-calm-500 mt-1">{kpis.activeEngagedStudents} of {kpis.totalStudentsMonitored} students</p>
          </Card>

          <Card className="p-4 bg-white border border-calm-200">
            <div className="flex items-center justify-between text-calm-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Screening Rate</span>
              <FileText className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-extrabold text-purple-700">{kpis.assessmentParticipationRate}%</span>
            </div>
            <p className="text-[10px] text-calm-500 mt-1">{kpis.totalAssessmentsTaken} completed screenings</p>
          </Card>

          <Card className="p-4 bg-white border border-calm-200">
            <div className="flex items-center justify-between text-calm-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Crisis Triage</span>
              <ShieldAlert className="w-4 h-4 text-crisis-500" />
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-extrabold text-crisis-600">{kpis.totalCrisisEscalations}</span>
            </div>
            <p className="text-[10px] text-calm-500 mt-1">De-identified helpline dispatches</p>
          </Card>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="border-b border-calm-200">
        <nav className="flex space-x-6 overflow-x-auto text-xs font-semibold text-calm-500">
          {[
            { id: 'overview', label: '📈 Campus Trends & Overview' },
            { id: 'assessments', label: '🧠 Clinical Screening & Severity' },
            { id: 'counselling', label: '🩺 Counselling & Interventions' },
            { id: 'community', label: '💬 Peer Support & Resources' },
            { id: 'cohorts', label: '🏛️ Department & Cohort Vitality (k>=10)' },
            { id: 'audit', label: `🔒 Audit Trail (${auditData.totalCount || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-700 font-bold'
                  : 'border-transparent hover:border-calm-300 hover:text-calm-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* TAB 1: OVERVIEW & TIME-BASED TREND ANALYSIS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Visual SVG Trend Curve: Mood vs Stress */}
          <Card className="p-6 bg-white border border-calm-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-calm-900 flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-brand-600" />
                  <span>Longitudinal Campus Mood vs Stress Index ({range.toUpperCase()})</span>
                </h3>
                <p className="text-xs text-calm-500">
                  Aggregated daily averages tracking student emotional resilience across the timeline.
                </p>
              </div>
              <div className="flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-brand-500" />
                  <span className="font-semibold text-calm-700">Mood Score (1-5)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-amberwarm-500" />
                  <span className="font-semibold text-calm-700">Stress Index (1-5)</span>
                </div>
              </div>
            </div>

            {/* SVG Trend Line Visualizer */}
            {trends?.series && trends.series.length > 0 ? (
              <div className="w-full h-64 relative pt-4">
                <svg className="w-full h-48 overflow-visible" viewBox="0 0 800 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0, 50, 100, 150, 200].map((y, idx) => (
                    <line key={idx} x1="0" y1={y} x2="800" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                  ))}

                  {/* Polyline: Mood */}
                  {(() => {
                    const points = trends.series.map((pt: any, i: number) => {
                      const x = (i / (trends.series.length - 1)) * 800;
                      const y = 200 - (pt.avgMood / 5) * 180;
                      return `${x},${y}`;
                    }).join(' ');
                    return (
                      <>
                        <polygon
                          points={`0,200 ${points} 800,200`}
                          fill="url(#moodGrad)"
                        />
                        <polyline
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="2.5"
                          points={points}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    );
                  })()}

                  {/* Polyline: Stress */}
                  {(() => {
                    const points = trends.series.map((pt: any, i: number) => {
                      const x = (i / (trends.series.length - 1)) * 800;
                      const y = 200 - (pt.avgStress / 5) * 180;
                      return `${x},${y}`;
                    }).join(' ');
                    return (
                      <>
                        <polygon
                          points={`0,200 ${points} 800,200`}
                          fill="url(#stressGrad)"
                        />
                        <polyline
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="2.5"
                          points={points}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    );
                  })()}
                </svg>

                {/* X Axis Dates */}
                <div className="flex justify-between text-[10px] text-calm-400 mt-3 px-1 border-t border-calm-100 pt-2 font-mono">
                  <span>{trends.series[0]?.date}</span>
                  <span>{trends.series[Math.floor(trends.series.length / 2)]?.date}</span>
                  <span>{trends.series[trends.series.length - 1]?.date}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-calm-400">No time-series data recorded for this window.</div>
            )}
          </Card>

          {/* Grid: Top Stress Factors & Check-in Volume Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Stress Factors */}
            <Card className="p-6 bg-white border border-calm-200">
              <h3 className="text-sm font-bold text-calm-900 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <span>Primary Campus Stress Drivers</span>
              </h3>
              <p className="text-xs text-calm-500 mt-1">
                Extracted anonymously from student daily wellbeing check-ins.
              </p>

              <div className="space-y-3 mt-4">
                {overview?.topStressDrivers?.map((driver: any, idx: number) => (
                  <div key={driver.tag} className="flex items-center justify-between text-xs p-2.5 bg-calm-50/80 rounded-xl border border-calm-200">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-5 h-5 rounded-lg bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-[11px]">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-calm-800">{driver.tag}</span>
                    </div>
                    <span className="font-semibold text-calm-500">{driver.count} mentions</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Daily Check-in Volume */}
            <Card className="p-6 bg-white border border-calm-200">
              <h3 className="text-sm font-bold text-calm-900 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-brand-600" />
                <span>Daily Student Activity Volume</span>
              </h3>
              <p className="text-xs text-calm-500 mt-1">
                Total daily self-reflections logged by students across campus.
              </p>

              <div className="mt-4 flex items-end justify-between h-40 gap-1 pt-4">
                {trends?.series?.slice(-21).map((pt: any, i: number) => {
                  const maxVol = Math.max(...trends.series.map((p: any) => p.checkinVolume || 1), 1);
                  const hPercent = Math.max(10, Math.min(100, (pt.checkinVolume / maxVol) * 100));
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center group relative">
                      <div
                        style={{ height: `${hPercent}%` }}
                        className="w-full bg-brand-200 hover:bg-brand-500 transition-all rounded-t-sm"
                      />
                      <span className="hidden group-hover:block absolute -top-7 bg-calm-900 text-white text-[10px] py-0.5 px-1.5 rounded whitespace-nowrap z-10 font-mono">
                        {pt.date}: {pt.checkinVolume}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-calm-400 text-center mt-2 font-mono">Past 21 Days Activity Distribution</p>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: CLINICAL SCREENING & SEVERITY */}
      {activeTab === 'assessments' && assessments && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GAD-7 Anxiety Breakdown */}
            <Card className="p-6 bg-white border border-calm-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-calm-900">GAD-7 Anxiety Screening Cohort Distribution</h3>
                  <p className="text-xs text-calm-500">
                    Standardized 7-item Generalized Anxiety Disorder instrument (Total: {assessments.gad7?.totalTaken})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-calm-700">Avg Score: {assessments.gad7?.averageScore}/21</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {Object.entries(assessments.gad7?.distribution || {}).map(([cat, count]: [string, any]) => {
                  const total = assessments.gad7?.totalTaken || 1;
                  const pct = Math.round((count / total) * 100);
                  const color = cat.includes('Severe') ? 'bg-red-500' : cat.includes('Moderate') ? 'bg-amber-500' : 'bg-emerald-500';
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-calm-800">{cat}</span>
                        <span className="text-calm-500">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-calm-100 rounded-full overflow-hidden">
                        <div style={{ width: `${pct}%` }} className={`h-full ${color} rounded-full`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* PHQ-9 Depression Breakdown */}
            <Card className="p-6 bg-white border border-calm-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-calm-900">PHQ-9 Depression Screening Cohort Distribution</h3>
                  <p className="text-xs text-calm-500">
                    Standardized 9-item Patient Health Questionnaire (Total: {assessments.phq9?.totalTaken})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-calm-700">Avg Score: {assessments.phq9?.averageScore}/27</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {Object.entries(assessments.phq9?.distribution || {}).map(([cat, count]: [string, any]) => {
                  const total = assessments.phq9?.totalTaken || 1;
                  const pct = Math.round((count / total) * 100);
                  const color = cat.includes('Severe') ? 'bg-red-500' : cat.includes('Moderate') ? 'bg-amber-500' : 'bg-emerald-500';
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-calm-800">{cat}</span>
                        <span className="text-calm-500">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-calm-100 rounded-full overflow-hidden">
                        <div style={{ width: `${pct}%` }} className={`h-full ${color} rounded-full`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* WHO-5 Wellbeing Index Card */}
          <Card className="p-6 bg-white border border-calm-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-calm-900">WHO-5 Vitality & Mental Wellbeing Index</h4>
                <p className="text-xs text-calm-500 mt-0.5">
                  World Health Organization 5-question positive mental health index (0 to 100). Higher indicates greater vitality.
                </p>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-extrabold text-brand-700">{assessments.who5?.averageScore}</span>
                <span className="text-xs font-bold text-calm-400">/ 100</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: COUNSELLING & INTERVENTIONS */}
      {activeTab === 'counselling' && overview?.counsellingFunnel && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Appointment Completion Funnel */}
            <Card className="p-6 bg-white border border-calm-200 space-y-4">
              <h3 className="text-sm font-bold text-calm-900 flex items-center space-x-2">
                <HeartHandshake className="w-4 h-4 text-brand-600" />
                <span>Counselling Appointment Lifecycle Funnel</span>
              </h3>
              <p className="text-xs text-calm-500">
                Resolution statistics across scheduled clinical consultations.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  { label: 'Completed Consultations', count: overview.counsellingFunnel.completed, color: 'bg-emerald-500' },
                  { label: 'Active / Confirmed Ahead', count: overview.counsellingFunnel.confirmed, color: 'bg-brand-500' },
                  { label: 'Cancelled by Student / Conflict', count: overview.counsellingFunnel.cancelled, color: 'bg-amber-500' },
                  { label: 'No-Show / Unattended', count: overview.counsellingFunnel.noShow, color: 'bg-red-500' },
                ].map((st) => {
                  const total = overview.counsellingFunnel.total || 1;
                  const pct = Math.round((st.count / total) * 100);
                  return (
                    <div key={st.label} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-calm-800">{st.label}</span>
                        <span className="text-calm-500">{st.count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-calm-100 rounded-full overflow-hidden">
                        <div style={{ width: `${pct}%` }} className={`h-full ${st.color} rounded-full`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Crisis Risk Tiers De-identified Breakdown */}
            <Card className="p-6 bg-white border border-calm-200 space-y-4">
              <h3 className="text-sm font-bold text-calm-900 flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-crisis-600" />
                <span>Campus Crisis & Safety Engine Triage Volume</span>
              </h3>
              <p className="text-xs text-calm-500">
                Aggregated event frequencies across the 5-tier operational risk classification architecture.
              </p>

              <div className="space-y-2.5 pt-2">
                {[
                  { tier: 'LEVEL_0', label: 'Level 0: Conversational / Normal', color: 'bg-emerald-100 text-emerald-800' },
                  { tier: 'LEVEL_1', label: 'Level 1: Mild Distress / Exam Fatigue', color: 'bg-blue-100 text-blue-800' },
                  { tier: 'LEVEL_2', label: 'Level 2: Significant Overwhelm (Referral Prompted)', color: 'bg-amber-100 text-amber-800' },
                  { tier: 'LEVEL_3', label: 'Level 3: Potential Self-Harm (Helplines Dispatched)', color: 'bg-orange-100 text-orange-800' },
                  { tier: 'LEVEL_4', label: 'Level 4: Imminent Crisis / SOS Escalation', color: 'bg-red-100 text-red-800' },
                ].map((t) => {
                  const count = overview.crisisRiskTiers?.[t.tier] || 0;
                  return (
                    <div key={t.tier} className="flex items-center justify-between text-xs p-2.5 rounded-xl border border-calm-200">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${t.color}`}>
                          {t.tier}
                        </span>
                        <span className="font-medium text-calm-800">{t.label}</span>
                      </div>
                      <span className="font-bold text-calm-900 font-mono">{count}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: COMMUNITY & RESOURCES */}
      {activeTab === 'community' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Peer Community Health */}
            <Card className="p-6 bg-white border border-calm-200 space-y-4">
              <h3 className="text-sm font-bold text-calm-900 flex items-center space-x-2">
                <Users className="w-4 h-4 text-brand-600" />
                <span>Peer Support Community Activity</span>
              </h3>
              <p className="text-xs text-calm-500">
                Participation metrics across moderated peer support forums.
              </p>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-calm-50 rounded-xl border border-calm-200 text-center">
                  <span className="text-[11px] font-bold text-calm-400 uppercase">Total Posts</span>
                  <p className="text-2xl font-extrabold text-calm-900 mt-1">{overview.peerCommunityActivity?.posts || 0}</p>
                </div>
                <div className="p-4 bg-calm-50 rounded-xl border border-calm-200 text-center">
                  <span className="text-[11px] font-bold text-calm-400 uppercase">Comments</span>
                  <p className="text-2xl font-extrabold text-calm-900 mt-1">{overview.peerCommunityActivity?.comments || 0}</p>
                </div>
                <div className="p-4 bg-calm-50 rounded-xl border border-calm-200 text-center">
                  <span className="text-[11px] font-bold text-calm-400 uppercase">Reactions</span>
                  <p className="text-2xl font-extrabold text-calm-900 mt-1">{overview.peerCommunityActivity?.reactions || 0}</p>
                </div>
              </div>
            </Card>

            {/* Resource Psychoeducation Utilization */}
            <Card className="p-6 bg-white border border-calm-200 space-y-4">
              <h3 className="text-sm font-bold text-calm-900 flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-brand-600" />
                <span>Psychoeducational Resource Consumption</span>
              </h3>
              <p className="text-xs text-calm-500">
                Engagement with evidence-based breathing protocols, grounding tools, and sleep hygiene.
              </p>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-calm-50 rounded-xl border border-calm-200 text-center">
                  <span className="text-[11px] font-bold text-calm-400 uppercase">Total Reads</span>
                  <p className="text-2xl font-extrabold text-calm-900 mt-1">{overview.resourceUtilization?.totalReads || 0}</p>
                </div>
                <div className="p-4 bg-calm-50 rounded-xl border border-calm-200 text-center">
                  <span className="text-[11px] font-bold text-calm-400 uppercase">Completed</span>
                  <p className="text-2xl font-extrabold text-emerald-700 mt-1">{overview.resourceUtilization?.completedReads || 0}</p>
                </div>
                <div className="p-4 bg-calm-50 rounded-xl border border-calm-200 text-center">
                  <span className="text-[11px] font-bold text-calm-400 uppercase">Minutes Spent</span>
                  <p className="text-2xl font-extrabold text-brand-700 mt-1">{overview.resourceUtilization?.totalMinutesSpent || 0}m</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 5: DEMOGRAPHIC BREAKDOWNS (k-Anonymity Protected) */}
      {activeTab === 'cohorts' && breakdowns && (
        <div className="space-y-6">
          {/* Department Breakdown Table */}
          <Card className="p-6 bg-white border border-calm-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-calm-900 flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-brand-600" />
                  <span>Departmental Vitality Breakdown (k-Anonymity Guarded)</span>
                </h3>
                <p className="text-xs text-calm-500">
                  Cohorts with fewer than 10 students are automatically suppressed to prevent re-identification.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-calm-200 text-calm-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Cohort Size</th>
                    <th className="py-2.5 px-3">Avg Mood (1-5)</th>
                    <th className="py-2.5 px-3">Avg Stress (1-5)</th>
                    <th className="py-2.5 px-3">Avg Sleep (Hrs)</th>
                    <th className="py-2.5 px-3 text-right">Privacy Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-calm-100 text-calm-700 font-medium">
                  {breakdowns.departments?.map((dept: any) => (
                    <tr key={dept.department} className="hover:bg-calm-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-calm-900">{dept.department}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold">{dept.cohortSize} students</td>
                      <td className="py-2.5 px-3">
                        {dept.isSuppressed ? (
                          <span className="text-calm-400 italic">Suppressed</span>
                        ) : (
                          <span className="font-bold text-brand-700">{dept.avgMood}/5</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {dept.isSuppressed ? (
                          <span className="text-calm-400 italic">Suppressed</span>
                        ) : (
                          <span className="font-bold text-amberwarm-700">{dept.avgStress}/5</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {dept.isSuppressed ? (
                          <span className="text-calm-400 italic">Suppressed</span>
                        ) : (
                          <span className="font-bold text-calm-800">{dept.avgSleep}h</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {dept.isSuppressed ? (
                          <Badge variant="warning" className="text-[10px]">
                            Suppressed (N &lt; 10)
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px]">
                            Verified (k ≥ 10)
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Year of Study Breakdown Table */}
          <Card className="p-6 bg-white border border-calm-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-calm-900 flex items-center space-x-2">
                  <GraduationCap className="w-4 h-4 text-brand-600" />
                  <span>Year-of-Study Vitality Breakdown</span>
                </h3>
                <p className="text-xs text-calm-500">
                  Tracking mental health patterns across freshmen, sophomores, juniors, and graduating seniors.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-calm-200 text-calm-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Academic Cohort</th>
                    <th className="py-2.5 px-3">Cohort Size</th>
                    <th className="py-2.5 px-3">Avg Mood (1-5)</th>
                    <th className="py-2.5 px-3">Avg Stress (1-5)</th>
                    <th className="py-2.5 px-3">Avg Sleep (Hrs)</th>
                    <th className="py-2.5 px-3 text-right">Privacy Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-calm-100 text-calm-700 font-medium">
                  {breakdowns.yearsOfStudy?.map((yr: any) => (
                    <tr key={yr.yearOfStudy} className="hover:bg-calm-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-calm-900">{yr.yearLabel}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold">{yr.cohortSize} students</td>
                      <td className="py-2.5 px-3">
                        {yr.isSuppressed ? (
                          <span className="text-calm-400 italic">Suppressed</span>
                        ) : (
                          <span className="font-bold text-brand-700">{yr.avgMood}/5</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {yr.isSuppressed ? (
                          <span className="text-calm-400 italic">Suppressed</span>
                        ) : (
                          <span className="font-bold text-amberwarm-700">{yr.avgStress}/5</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {yr.isSuppressed ? (
                          <span className="text-calm-400 italic">Suppressed</span>
                        ) : (
                          <span className="font-bold text-calm-800">{yr.avgSleep}h</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {yr.isSuppressed ? (
                          <Badge variant="warning" className="text-[10px]">
                            Suppressed (N &lt; 10)
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px]">
                            Verified (k ≥ 10)
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 6: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <Card className="p-6 bg-white border border-calm-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-calm-900 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-brand-600" />
                <span>Tamper-Evident Security & Compliance Audit Log</span>
              </h3>
              <p className="text-xs text-calm-500 mt-0.5">
                Immutable records of administrative analytics queries, report exports, and role authorizations.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-calm-200 text-calm-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Target Entity</th>
                  <th className="py-2.5 px-3">Authorized Operator</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-calm-100 text-calm-700 font-medium">
                {auditData.logs?.map((log: any) => (
                  <tr key={log.id} className="hover:bg-calm-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-calm-900 font-mono text-[11px]">{log.action}</td>
                    <td className="py-2.5 px-3 text-brand-700 font-semibold">{log.entityType}</td>
                    <td className="py-2.5 px-3 text-calm-600">{log.performedBy}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-calm-400">{log.ipAddress}</td>
                    <td className="py-2.5 px-3 text-right text-calm-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
