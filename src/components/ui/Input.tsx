import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, id, ...props }, ref) => {
  const inputId = id || props.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={clsx(
          'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          'dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700',
          error ? 'border-red-400' : 'border-zinc-200',
          className,
        )}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
});
Input.displayName = 'Input';
