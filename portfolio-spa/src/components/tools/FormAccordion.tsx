import { useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface FormAccordionProps {
  title: string;
  sectionNumber: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** 開閉式フォームセクション（chevron アニメーション付き） */
export function FormAccordion({ title, sectionNumber, defaultOpen = false, children }: FormAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn(
      'rounded-xl border transition-all duration-200',
      isOpen
        ? 'bg-white dark:bg-brown-900/60 border-brown-200 dark:border-brown-700 shadow-sm'
        : 'bg-white/60 dark:bg-brown-900/30 border-brown-200/60 dark:border-brown-800/60',
    )}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer"
      >
        <span className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors shrink-0',
          isOpen
            ? 'bg-accent text-white'
            : 'bg-brown-100 dark:bg-brown-800 text-brown-500 dark:text-brown-400',
        )}>
          {sectionNumber}
        </span>
        <span className="flex-1 font-bold text-brown-800 dark:text-brown-100 text-sm">
          {title}
        </span>
        <svg
          className={cn('w-4 h-4 text-brown-400 transition-transform duration-200', isOpen && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1">
          {children}
        </div>
      )}
    </div>
  );
}
