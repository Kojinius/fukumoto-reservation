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
  primary:   'bg-navy-700 text-cream hover:bg-navy-600 shadow-sm hover:shadow-md hover:-translate-y-px',
  secondary: 'border border-cream-300 text-navy-700 hover:bg-cream-100 hover:-translate-y-px',
  danger:    'bg-danger text-white hover:bg-danger/90',
  ghost:     'text-navy-500 hover:text-navy-700 hover:bg-cream-100',
  muted:     'bg-cream-200 text-navy-400 hover:bg-cream-300',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-5 py-2.5 text-sm rounded-lg',
  lg: 'px-7 py-3 text-base rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, className, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-body font-medium',
        'transition-all duration-150',
        'active:scale-[0.97]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
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
