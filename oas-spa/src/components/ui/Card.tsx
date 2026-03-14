import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover }: CardProps) {
  return (
    <div className={cn(
      'bg-white rounded-xl border border-cream-300/60 shadow-sm',
      hover && 'transition-all duration-200 hover:shadow-md hover:-translate-y-px',
      className,
    )}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(
      'px-5 py-4 border-b border-cream-300/60',
      className,
    )}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('px-5 py-4', className)}>
      {children}
    </div>
  );
}
