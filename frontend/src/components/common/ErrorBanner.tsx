import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry, className = '' }) => (
  <div
    className={`flex items-start gap-3 p-4 rounded-xl bg-crisis-50 border border-crisis-200 ${className}`}
    role="alert"
    aria-live="polite"
  >
    <AlertCircle className="w-5 h-5 text-crisis-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-crisis-700">{message}</p>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="flex items-center gap-1 text-xs font-semibold text-crisis-600 hover:text-crisis-800 focus:outline-none focus:ring-2 focus:ring-crisis-400 rounded"
        aria-label="Retry"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Retry
      </button>
    )}
  </div>
);

export interface SuccessBannerProps {
  message: string;
  className?: string;
}

export const SuccessBanner: React.FC<SuccessBannerProps> = ({ message, className = '' }) => (
  <div
    className={`flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 ${className}`}
    role="status"
    aria-live="polite"
  >
    <svg className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
    <p className="text-sm font-medium text-emerald-700">{message}</p>
  </div>
);
