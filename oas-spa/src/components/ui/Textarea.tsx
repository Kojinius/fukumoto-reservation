import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, disabled, ...props }, ref) => {
    const textareaId = id || label?.replace(/\s/g, '-');
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-xs tracking-wider uppercase text-navy-400 font-body">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full px-3 py-2.5 rounded-lg border border-cream-300 text-sm font-body resize-y',
            'bg-white',
            'text-navy-700',
            'placeholder:text-navy-300',
            'focus:outline-none focus:border-gold focus:shadow-[0_0_0_1px_#C9A96E]',
            'transition-all duration-200',
            error && 'border-danger focus:border-danger',
            disabled && 'bg-cream-100 text-navy-300 cursor-not-allowed opacity-60',
            className,
          )}
          disabled={disabled}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
