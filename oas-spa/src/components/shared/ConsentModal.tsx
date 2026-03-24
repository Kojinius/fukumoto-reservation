import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

interface ConsentModalProps {
  open: boolean;
  termsText: string;
  privacyText: string;
  onAccept: () => Promise<void>;
}

/**
 * [C2] 利用規約・プライバシーポリシー同意モーダル
 *
 * - 2ステップ: 利用規約 → プライバシーポリシー
 * - スクロール末尾到達で「同意」ボタン有効化
 * - Escape / バックドロップクリック無効（同意必須）
 */
export function ConsentModal({ open, termsText, privacyText, onAccept }: ConsentModalProps) {
  const { t } = useTranslation('auth');
  const [step, setStep] = useState<1 | 2>(1);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // モーダル表示時にリセット
  useEffect(() => {
    if (open) {
      setStep(1);
      setScrolledToBottom(false);
      setAccepting(false);
    }
  }, [open]);

  // ステップ切替時にスクロールリセット
  useEffect(() => {
    setScrolledToBottom(false);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [step]);

  // テキストが短くスクロール不要な場合は即座に有効化
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // DOM更新後にチェック
    requestAnimationFrame(() => {
      if (el.scrollHeight <= el.clientHeight + 10) {
        setScrolledToBottom(true);
      }
    });
  }, [step, open]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
    if (isBottom) setScrolledToBottom(true);
  }, []);

  async function handleAccept() {
    if (step === 1) {
      setStep(2);
      return;
    }
    setAccepting(true);
    try {
      await onAccept();
    } finally {
      setAccepting(false);
    }
  }

  // Escape キー無効化
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') e.preventDefault();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  if (!open) return null;

  const currentText = step === 1 ? termsText : privacyText;
  const stepLabel = step === 1 ? t('consent.terms') : t('consent.privacy');
  const buttonLabel = step === 1 ? t('consent.agreeAndNext') : t('consent.agreeAndStart');

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      {/* バックドロップ（クリック無効） */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* センタリング */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={stepLabel}
          className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg animate-scale-in border border-cream-300/60 flex flex-col max-h-[85vh]"
        >
          {/* ヘッダー */}
          <div className="px-5 py-4 border-b border-cream-300/60 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-heading font-semibold text-navy-700">
                {stepLabel}
              </h3>
              {/* ステップインジケーター */}
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full transition-colors ${step === 1 ? 'bg-gold' : 'bg-cream-300'}`} />
                <span className={`w-2 h-2 rounded-full transition-colors ${step === 2 ? 'bg-gold' : 'bg-cream-300'}`} />
              </div>
            </div>
            <p className="text-xs text-navy-400 mt-1">
              {t('consent.stepIndicator', { current: step, total: 2 })}
            </p>
          </div>

          {/* スクロール可能なテキスト領域 */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-5 py-4 min-h-0"
          >
            <div className="text-sm text-navy-600 leading-relaxed whitespace-pre-wrap font-body">
              {currentText || t('consent.notSet', { label: stepLabel })}
            </div>
          </div>

          {/* フッター */}
          <div className="px-5 py-4 border-t border-cream-300/60 shrink-0 space-y-3">
            {!scrolledToBottom && (
              <p className="text-xs text-navy-400 text-center flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                {t('consent.scrollPrompt')}
              </p>
            )}
            <Button
              className="w-full"
              disabled={!scrolledToBottom}
              loading={accepting}
              onClick={handleAccept}
            >
              {buttonLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
