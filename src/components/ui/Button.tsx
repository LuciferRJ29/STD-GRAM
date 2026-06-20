import { forwardRef, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-60',
          variant === 'primary' && 'bg-brand-600 text-white hover:bg-brand-700',
          variant === 'secondary' && 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100',
          variant === 'ghost' && 'bg-transparent text-brand-600 hover:bg-brand-50 dark:hover:bg-zinc-800',
          variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
          className,
        )}
        {...props}
      >
        {isLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
