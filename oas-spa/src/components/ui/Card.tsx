import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn(
      'bg-white dark:bg-lien-800 rounded-2xl border border-lien-200/80 dark:border-lien-600/60',
      'shadow-warm transition-shadow duration-300',
      'hover:shadow-warm-lg',
      className,
    )}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn(
      'px-5 py-4 border-b border-lien-200/60 dark:border-lien-600/60',
      className,
    )}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: CardProps) {
  return (
    <div className={cn('px-5 py-4', className)}>
      {children}
    </div>
  );
}
