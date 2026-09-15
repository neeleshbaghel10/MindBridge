import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, BookOpen, ArrowRight, RefreshCw, Activity } from 'lucide-react';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { PageLoading } from '../components/common/LoadingState';
import { ErrorBanner } from '../components/common/ErrorBanner';

const CATEGORY_BADGE: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'calm'> = {
  ANXIETY: 'warning',
  STRESS: 'danger',
  SLEEP: 'info',
  MINDFULNESS: 'success',
  DEPRESSION: 'warning',
  ACADEMIC: 'calm',
};

export const RecommendationsPage: React.FC = () => {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadRecommendations = async () => {
    setError('');
    try {
      const data = await api.getRecommendations();
      setRecommendations(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load personalized recommendations.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadRecommendations();
  };

  if (isLoading) {
    return <PageLoading label="Generating personalized recommendations..." />;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-calm-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand-600" />
            Personalized For You
          </h1>
          <p className="text-sm text-calm-500 mt-0.5">
            Tailored self-care modules and articles based on your wellbeing check-ins and screening patterns.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          isLoading={isRefreshing}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Suggestions
        </Button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadRecommendations} />}

      {/* Info Context Card */}
      <Card variant="calm" padding="md" className="flex items-start gap-3">
        <Activity className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-calm-600 leading-relaxed">
          <p className="font-semibold text-calm-800">How do recommendations work?</p>
          <p>
            Our intelligent recommendation engine dynamically analyzes your recent mood trends, sleep duration,
            and psychometric assessment categories to curate the most relevant coping tools and psychoeducational articles.
          </p>
        </div>
      </Card>

      {/* Recommendations List */}
      {recommendations.length === 0 ? (
        <EmptyState
          icon="book"
          title="No recommendations yet"
          description="Log your daily wellbeing check-in or complete a self-reflection screening to unlock tailored content."
          actionLabel="Log Check-in Now"
          onAction={() => window.location.assign('/checkin')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {recommendations.map((resource: any) => (
            <Link key={resource.id} to={`/resources/${resource.slug}`} className="block group">
              <Card
                variant="elevated"
                padding="md"
                className="h-full flex flex-col justify-between hover:border-brand-300 hover:shadow-md transition-all space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={CATEGORY_BADGE[resource.category] || 'info'} size="sm">
                      {resource.category}
                    </Badge>
                    {resource.readingTimeMin && (
                      <span className="text-[11px] text-calm-400 font-medium">
                        {resource.readingTimeMin} min read
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-calm-900 group-hover:text-brand-700 transition-colors line-clamp-2">
                      {resource.title}
                    </h3>
                    <p className="text-xs text-calm-500 mt-1 leading-relaxed line-clamp-3">
                      {resource.description}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-calm-100 flex items-center justify-between text-xs text-brand-600 font-semibold">
                  <span>Start Reading</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Footer Navigation */}
      <div className="text-center pt-4">
        <Link to="/resources" className="text-sm text-brand-600 font-semibold hover:underline">
          Explore all guides in the Resource Hub →
        </Link>
      </div>
    </div>
  );
};
