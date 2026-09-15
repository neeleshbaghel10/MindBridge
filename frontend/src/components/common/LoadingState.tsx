import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse bg-calm-200 rounded-xl ${className}`} aria-hidden="true" />
);

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', label = 'Loading…' }) => {
  const sizeClasses = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8" role="status" aria-label={label}>
      <div className={`${sizeClasses[size]} border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin`} />
      <span className="text-xs font-medium text-calm-500">{label}</span>
    </div>
  );
};

interface PageLoadingProps {
  label?: string;
}

export const PageLoading: React.FC<PageLoadingProps> = ({ label = 'Loading your space…' }) => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <LoadingSpinner size="lg" label={label} />
  </div>
);
