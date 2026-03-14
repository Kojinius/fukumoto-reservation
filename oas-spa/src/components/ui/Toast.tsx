import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';

const ICONS: Record<string, string> = {
  success: '\u2713',
  error:   '\u2715',
  warning: '\u26A0',
  info:    '\u2139',
};

const TYPE_STYLES: Record<string, string> = {
  success: 'text-gold',
  error:   'text-danger',
  warning: 'text-amber-500',
  info:    'text-info',
};

export function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-lg',
            'bg-navy-800 text-cream shadow-float',
            'text-sm font-medium',
            toast.removing ? 'animate-toast-out' : 'animate-toast-in',
          )}
        >
          <span className={cn('text-base', TYPE_STYLES[toast.type])}>{ICONS[toast.type]}</span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
