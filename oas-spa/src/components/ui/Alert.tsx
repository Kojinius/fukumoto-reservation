import { cn } from '@/utils/cn';

type AlertVariant = 'error' | 'warning' | 'info' | 'success';

interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<AlertVariant, string> = {
  error:   'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  warning: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
  info:    'bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300',
  success: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
};

export function Alert({ variant = 'info', children, className }: AlertProps) {
  return (
    <div className={cn(
      'px-4 py-3 rounded-lg border text-sm',
      VARIANT_STYLES[variant],
      className,
    )}>
      {children}
    </div>
  );
}
