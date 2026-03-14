import { cn } from '@/utils/cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {icon && <div className="text-lien-300 dark:text-lien-600 mb-4">{icon}</div>}
      <h3 className="text-lg font-heading font-bold text-lien-500 dark:text-lien-400 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-lien-400 dark:text-lien-500 mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}
