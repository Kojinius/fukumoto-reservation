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
            'relative bg-white rounded-xl shadow-xl flex flex-col',
            'w-full max-w-md max-h-[85vh] animate-scale-in',
            'border border-cream-300/60',
            className,
          )}
        >
          {title && (
            <div className="flex items-center justify-between px-5 py-4 border-b border-cream-300/60 shrink-0">
              <h3 className="text-lg font-heading font-semibold text-navy-700">
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="閉じる"
                className="p-1 rounded-md text-navy-300 hover:text-navy-600 hover:bg-cream-100 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          )}
          <div className="px-5 py-4 overflow-y-auto min-h-0">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
