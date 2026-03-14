import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'muted';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-gradient-to-b from-accent to-accent-dark text-white shadow-[0_2px_8px_-2px_rgba(247,147,33,0.4)] hover:shadow-[0_4px_16px_-2px_rgba(247,147,33,0.45)] hover:from-accent-light hover:to-accent active:from-accent-dark active:to-accent-700',
  secondary: 'bg-lien-100 dark:bg-lien-700 text-lien-700 dark:text-lien-200 hover:bg-lien-200 dark:hover:bg-lien-600 border border-lien-200 dark:border-lien-600',
  danger:    'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[0_2px_8px_-2px_rgba(224,82,82,0.35)] hover:shadow-[0_4px_16px_-2px_rgba(224,82,82,0.4)] hover:from-red-400 hover:to-red-500 active:from-red-600 active:to-red-700',
  ghost:     'text-lien-600 dark:text-lien-300 hover:bg-lien-100 dark:hover:bg-lien-800',
  muted:     'bg-lien-200 dark:bg-lien-700 text-lien-500 dark:text-lien-400 hover:bg-lien-300 dark:hover:bg-lien-600',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3 text-base rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, className, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-heading font-medium',
        'transition-all duration-200 hover:-translate-y-0.5',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
