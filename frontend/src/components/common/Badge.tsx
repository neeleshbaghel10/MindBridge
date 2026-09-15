import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'calm' | 'success' | 'warning' | 'danger' | 'purple' | 'amber' | 'info';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'calm',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-semibold',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  const variantStyles = {
    brand: 'bg-brand-50 text-brand-700 border border-brand-200/60',
    calm: 'bg-calm-100 text-calm-700 border border-calm-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amberwarm-50 text-amberwarm-800 border border-amberwarm-200',
    danger: 'bg-crisis-50 text-crisis-700 border border-crisis-200',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200',
    amber: 'bg-amber-50 text-amber-800 border border-amber-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
  };

  const dotColors = {
    brand: 'bg-brand-500',
    calm: 'bg-calm-400',
    success: 'bg-emerald-500',
    warning: 'bg-amberwarm-500',
    danger: 'bg-crisis-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
    info: 'bg-blue-500',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} aria-hidden="true" />}
      {children}
    </span>
  );
};
