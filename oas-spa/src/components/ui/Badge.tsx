import { cn } from '@/utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium tracking-wide',
      className,
    )}>
      {children}
    </span>
  );
}
