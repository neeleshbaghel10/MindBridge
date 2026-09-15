import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight, Search, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { TabGroup } from '../components/common/TabGroup';
import { EmptyState } from '../components/common/EmptyState';
import { PageLoading, Skeleton } from '../components/common/LoadingState';
import { ErrorBanner } from '../components/common/ErrorBanner';

const CATEGORIES = [
  { id: '', label: 'All' },
  { id: 'ANXIETY', label: 'Anxiety' },
  { id: 'STRESS', label: 'Stress' },
  { id: 'SLEEP', label: 'Sleep' },
  { id: 'MINDFULNESS', label: 'Mindfulness' },
  { id: 'DEPRESSION', label: 'Depression' },
  { id: 'ACADEMIC', label: 'Academic' },
];

const CATEGORY_BADGE: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'calm'> = {
  ANXIETY: 'warning', STRESS: 'danger', SLEEP: 'info', MINDFULNESS: 'success',
  DEPRESSION: 'warning', ACADEMIC: 'calm',
};

function ResourceCard({ resource }: { resource: any }) {
  return (
    <Link to={`/resources/${resource.slug}`} className="block">
      <Card variant="elevated" padding="md" className="h-full flex flex-col gap-3 hover:border-brand-300 hover:shadow-md transition-all group">
        <div className="flex items-start justify-between gap-2">
          <Badge variant={CATEGORY_BADGE[resource.category] || 'info'} size="sm">{resource.category}</Badge>
          {resource.readingTimeMin && <span className="text-[10px] text-calm-400 flex-shrink-0">{resource.readingTimeMin} min</span>}
        </div>
        <div className="flex-1 space-y-1.5">
          <h3 className="text-sm font-bold text-calm-900 group-hover:text-brand-700 transition-colors line-clamp-2">{resource.title}</h3>
          <p className="text-xs text-calm-500 leading-relaxed line-clamp-3">{resource.description}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-brand-600 font-semibold">
          Read Guide <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </Card>
    </Link>
  );
}

export const ResourcesPage: React.FC = () => {
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [resources, setResources] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [res, recs] = await Promise.all([
        api.getResources(category || undefined, debouncedQuery || undefined),
        api.getRecommendations().catch(() => []),
      ]);
      setResources(res || []);
      setRecommendations((recs || []).slice(0, 3));
    } catch (err: any) {
      setError(err?.message || 'Failed to load resources.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [category, debouncedQuery]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-extrabold text-calm-900 flex items-center gap-2"><BookOpen className="w-6 h-6 text-brand-600" /> Resource Hub</h1>
        <p className="text-sm text-calm-500 mt-0.5">Evidence-based guides for your wellbeing</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-calm-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guides, topics, or techniques…"
          aria-label="Search resources"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-calm-200 text-sm text-calm-900 placeholder-calm-400 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
        />
      </div>

      {/* Category filter */}
      <TabGroup tabs={CATEGORIES} activeTab={category} onChange={setCategory} variant="pills" />

      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* Recommendations */}
      {!debouncedQuery && recommendations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-calm-700 flex items-center gap-2"><Sparkles className="w-4 h-4 text-brand-600" /> Recommended for You</h2>
            <Link to="/recommendations" className="text-xs text-brand-600 font-semibold hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {recommendations.map((r) => (
              <div key={r.id} className="relative">
                <div className="absolute -top-2 left-3 z-10">
                  <Badge variant="success" size="sm">Recommended</Badge>
                </div>
                <ResourceCard resource={r} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resources grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-calm-700">
          {debouncedQuery ? `Results for "${debouncedQuery}"` : category ? `${category.charAt(0) + category.slice(1).toLowerCase()} Guides` : 'All Guides'}
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : resources.length === 0 ? (
          <EmptyState
            icon="search"
            title={debouncedQuery ? 'No resources found' : 'No guides available'}
            description={debouncedQuery ? `No guides match "${debouncedQuery}". Try a different search term.` : 'Check back soon for new content.'}
            actionLabel={debouncedQuery ? 'Clear search' : undefined}
            onAction={debouncedQuery ? () => setQuery('') : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((r) => <ResourceCard key={r.id} resource={r} />)}
          </div>
        )}
      </div>
    </div>
  );
};
