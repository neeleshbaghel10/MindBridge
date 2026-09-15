import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'calm';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const sizeStyles = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2.5 gap-2',
      lg: 'text-base px-5 py-3 gap-2.5',
    };

    const variantStyles = {
      primary: 'bg-brand-700 hover:bg-brand-800 text-white shadow-soft focus:ring-brand-500 border border-brand-800',
      secondary: 'bg-calm-100 hover:bg-calm-200 text-calm-800 focus:ring-calm-400 border border-calm-200',
      outline: 'bg-transparent hover:bg-calm-50 text-calm-700 border border-calm-300 focus:ring-calm-400',
      danger: 'bg-crisis-600 hover:bg-crisis-700 text-white shadow-soft focus:ring-crisis-500 border border-crisis-700',
      ghost: 'bg-transparent hover:bg-calm-100 text-calm-600 hover:text-calm-900 focus:ring-calm-300',
      calm: 'bg-calm-50 hover:bg-calm-100 text-calm-700 border border-calm-200 focus:ring-calm-300',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" aria-hidden="true" />}
        {!isLoading && leftIcon}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
