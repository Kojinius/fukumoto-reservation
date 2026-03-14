import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils/cn';

const ICONS: Record<string, string> = {
  success: '\u2713',
  error:   '\u2715',
  warning: '\u26A0',
  info:    '\u2139',
};

const TYPE_STYLES: Record<string, string> = {
  success: 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
  error:   'border-l-red-500 bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300',
  warning: 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
  info:    'border-l-sky-500 bg-sky-50 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300',
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
            'flex items-center gap-3 px-4 py-3 rounded-lg border-l-4 shadow-lg',
            'text-sm font-medium',
            TYPE_STYLES[toast.type],
            toast.removing ? 'animate-toast-out' : 'animate-toast-in',
          )}
        >
          <span className="text-base">{ICONS[toast.type]}</span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
