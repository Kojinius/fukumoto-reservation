import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || label?.replace(/\s/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs tracking-wider uppercase text-navy-400 font-body">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm font-body',
            'text-navy-700',
            'placeholder:text-navy-300',
            'focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold',
            'transition-all duration-200',
            'hover:border-navy-200',
            error && 'border-danger focus:ring-danger/30 focus:border-danger',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
