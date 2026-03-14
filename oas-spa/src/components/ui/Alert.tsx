import { cn } from '@/utils/cn';

type AlertVariant = 'error' | 'warning' | 'info' | 'success';

interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<AlertVariant, string> = {
  error:   'border-l-danger bg-danger/5 text-danger',
  warning: 'border-l-amber-500 bg-amber-50/60 text-amber-700',
  info:    'border-l-info bg-info/5 text-info',
  success: 'border-l-success bg-success/5 text-success',
};

export function Alert({ variant = 'info', children, className }: AlertProps) {
  return (
    <div className={cn(
      'px-4 py-3 rounded-r-lg border-l-2 text-sm',
      VARIANT_STYLES[variant],
      className,
    )}>
      {children}
    </div>
  );
}
