import { cn } from '@/utils/cn';

interface SpinnerProps {
  className?: string;
  overlay?: boolean;
}

export function Spinner({ className, overlay }: SpinnerProps) {
  const spinner = (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="w-8 h-8 border-3 border-navy-100 border-t-gold rounded-full animate-spin" />
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/10 backdrop-blur-[2px]">
        <div className="w-12 h-12 border-4 border-navy-100 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return spinner;
}
