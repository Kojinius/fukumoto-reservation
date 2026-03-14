import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* バックドロップ */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* センタリングラッパー */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={e => e.stopPropagation()}
          className={cn(
            'relative bg-white dark:bg-lien-800 rounded-xl shadow-xl',
            'w-full max-w-md animate-scale-in',
            'border border-lien-200 dark:border-lien-600',
            className,
          )}
        >
          {title && (
            <div className="flex items-center justify-between px-5 py-4 border-b border-lien-200 dark:border-lien-600">
              <h3 className="text-lg font-heading font-bold text-lien-900 dark:text-lien-50">
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="閉じる"
                className="p-1 rounded-lg text-lien-400 hover:text-lien-600 dark:hover:text-lien-200 hover:bg-lien-100 dark:hover:bg-lien-700 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          )}
          <div className="px-5 py-4">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
