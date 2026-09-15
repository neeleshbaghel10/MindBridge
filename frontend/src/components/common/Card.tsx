import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'calm' | 'highlight';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', padding = 'md', className = '', ...props }, ref) => {
    const baseStyles = 'rounded-2xl transition-all duration-150';

    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const variantStyles = {
      default: 'bg-white border border-calm-200/80 shadow-soft',
      elevated: 'bg-white border border-calm-200/50 shadow-card hover:shadow-lg',
      bordered: 'bg-white border-2 border-calm-200',
      calm: 'bg-calm-50/60 border border-calm-200/70',
      highlight: 'bg-gradient-to-br from-brand-50/80 to-white border border-brand-200/80 shadow-soft',
    };

    return (
      <div ref={ref} className={`${baseStyles} ${paddingStyles[padding]} ${variantStyles[variant]} ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
