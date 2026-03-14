import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const selectId = id || label?.replace(/\s/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs tracking-wider uppercase text-navy-400 font-body">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full rounded-lg border border-cream-300 bg-white px-3 py-2.5 text-sm font-body appearance-none',
            'text-navy-700',
            'focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold',
            'transition-all duration-200',
            'bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25em_1.25em]',
            'bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236A86B8\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")]',
            'pr-8',
            error && 'border-danger focus:ring-danger/30 focus:border-danger',
            className,
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';
