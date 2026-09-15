import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, Calendar, ShieldCheck, Languages, Award, ArrowRight, Search, Clock } from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Skeleton } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorBanner } from '../components/common/ErrorBanner';

const DAYS_MAP: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

export const CounsellorDirectoryPage: React.FC = () => {
  const [counsellors, setCounsellors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>('ALL');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ALL');
  const [selectedDay, setSelectedDay] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCounsellors = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getCounsellors({
        specialization: selectedSpecialization !== 'ALL' ? selectedSpecialization : undefined,
        language: selectedLanguage !== 'ALL' ? selectedLanguage : undefined,
        dayOfWeek: selectedDay !== 'ALL' ? selectedDay : undefined,
        search: searchQuery.trim() || undefined,
      });
      setCounsellors(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load counsellor directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCounsellors();
  }, [selectedSpecialization, selectedLanguage, selectedDay]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCounsellors();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Extract all unique specializations & languages across all counsellors
  const allSpecializations = Array.from(
    new Set(
      counsellors.flatMap((c) =>
        Array.isArray(c.specializations)
          ? c.specializations
          : Array.isArray(c.specialization)
          ? c.specialization
          : []
      )
    )
  );

  const allLanguages = Array.from(
    new Set(
      counsellors.flatMap((c) =>
        Array.isArray(c.languages)
          ? c.languages
          : Array.isArray(c.languagesSpoken)
          ? c.languagesSpoken
          : []
      )
    )
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-calm-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-brand-600" />
            Licensed Campus Counsellors
          </h1>
          <p className="text-sm text-calm-500 mt-0.5">
            Verified RCI-registered clinical psychologists available for 1-on-1 confidential sessions.
          </p>
        </div>

        <Link to="/appointments">
          <Button variant="outline" size="sm" leftIcon={<Calendar className="w-3.5 h-3.5" />}>
            My Appointments
          </Button>
        </Link>
      </div>

      {/* Trust & Safety Banner */}
      <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-brand-700 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-brand-900 space-y-1 leading-relaxed">
          <p className="font-bold">100% Confidential & Professional Standards</p>
          <p className="text-brand-700">
            All counselling sessions follow strict clinical confidentiality ethics.
            Your academic records, professors, and parents cannot access your counselling notes.
          </p>
        </div>
      </div>

      {/* Search & Multi-criteria Filters */}
      <div className="space-y-3 bg-white p-4 rounded-2xl border border-calm-200 shadow-soft">
        <div className="relative">
          <Search className="w-4 h-4 text-calm-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by counsellor name, specialty, or license..."
            aria-label="Search counsellors"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-calm-200 text-sm text-calm-900 placeholder-calm-400 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-calm-50/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
          {/* Day of Week Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-calm-500 font-semibold">Day:</span>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="p-1.5 rounded-lg border border-calm-200 bg-white text-calm-700 font-medium"
            >
              <option value="ALL">Any Day</option>
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
            </select>
          </div>

          {/* Language Selector */}
          {allLanguages.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-calm-500 font-semibold">Language:</span>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="p-1.5 rounded-lg border border-calm-200 bg-white text-calm-700 font-medium"
              >
                <option value="ALL">All Languages</option>
                {allLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Clear Filters CTA */}
          {(selectedSpecialization !== 'ALL' || selectedLanguage !== 'ALL' || selectedDay !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedSpecialization('ALL');
                setSelectedLanguage('ALL');
                setSelectedDay('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-brand-600 hover:text-brand-800 font-bold ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Specialization Filter Pills */}
        {allSpecializations.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 text-xs border-t border-calm-100">
            <button
              onClick={() => setSelectedSpecialization('ALL')}
              className={`px-3 py-1.5 rounded-full font-semibold transition-colors whitespace-nowrap ${
                selectedSpecialization === 'ALL'
                  ? 'bg-brand-700 text-white shadow-soft'
                  : 'bg-calm-100 text-calm-600 hover:bg-calm-200'
              }`}
            >
              All Specialties
            </button>
            {allSpecializations.map((spec) => (
              <button
                key={spec}
                onClick={() => setSelectedSpecialization(spec)}
                className={`px-3 py-1.5 rounded-full font-semibold transition-colors whitespace-nowrap ${
                  selectedSpecialization === spec
                    ? 'bg-brand-700 text-white shadow-soft'
                    : 'bg-calm-100 text-calm-600 hover:bg-calm-200'
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <ErrorBanner message={error} onRetry={loadCounsellors} />}

      {/* Counsellors Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-60" />
          ))}
        </div>
      ) : counsellors.length === 0 ? (
        <EmptyState
          icon="search"
          title="No counsellors match your filters"
          description="Try broadening your criteria or reset filters to see all campus psychologists."
          actionLabel="Reset All Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedSpecialization('ALL');
            setSelectedLanguage('ALL');
            setSelectedDay('ALL');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {counsellors.map((c) => {
            const fullName = c.name || `Dr. ${c.user?.firstName || 'Clinical'} ${c.user?.lastName || 'Counsellor'}`;
            const initials = fullName
              .replace('Dr. ', '')
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2);

            const specs: string[] = Array.isArray(c.specializations)
              ? c.specializations
              : Array.isArray(c.specialization)
              ? c.specialization
              : [];

            const langs: string[] = Array.isArray(c.languages)
              ? c.languages
              : Array.isArray(c.languagesSpoken)
              ? c.languagesSpoken
              : [];

            const availableDays: number[] = Array.isArray(c.availableDays) ? c.availableDays : [];

            return (
              <Card
                key={c.id}
                variant="elevated"
                padding="lg"
                className="flex flex-col justify-between space-y-4 hover:border-brand-200 transition-all"
              >
                <div className="space-y-4">
                  {/* Avatar + Name + RCI License */}
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white font-extrabold text-lg flex items-center justify-center shadow-soft flex-shrink-0">
                      {initials}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-bold text-calm-900 truncate">{fullName}</h2>
                        <Badge variant="success" size="sm">
                          RCI Verified
                        </Badge>
                      </div>

                      {c.licenseNumber && (
                        <p className="text-[11px] text-calm-500 flex items-center gap-1 font-mono">
                          <Award className="w-3.5 h-3.5 text-calm-400" />
                          Reg No: {c.licenseNumber}
                        </p>
                      )}

                      {c.qualification && (
                        <p className="text-[11px] text-calm-600 font-medium">
                          {c.qualification}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {c.bio && (
                    <p className="text-xs text-calm-600 leading-relaxed line-clamp-3">
                      {c.bio}
                    </p>
                  )}

                  {/* Specializations Tags */}
                  {specs.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-calm-500 uppercase tracking-wider">
                        Specialties
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {specs.map((spec) => (
                          <span
                            key={spec}
                            className="px-2 py-0.5 rounded-lg bg-calm-100 text-calm-700 text-[11px] font-medium"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Languages & Available Days */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-calm-500 pt-1">
                    {langs.length > 0 && (
                      <p className="flex items-center gap-1.5">
                        <Languages className="w-3.5 h-3.5 text-calm-400 flex-shrink-0" />
                        <span>{langs.join(', ')}</span>
                      </p>
                    )}

                    {availableDays.length > 0 && (
                      <p className="flex items-center gap-1 text-[11px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md">
                        <Clock className="w-3 h-3" />
                        <span>{availableDays.map((d) => DAYS_MAP[d] || d).join(', ')}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Booking Button */}
                <div className="pt-3 border-t border-calm-100">
                  <Link to={`/counselling/book/${c.id}`} className="block">
                    <Button variant="primary" className="w-full" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Book Appointment
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
