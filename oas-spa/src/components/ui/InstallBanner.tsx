/**
 * PWA インストールバナー
 * beforeinstallprompt イベントをキャッチし、患者向けにインストール案内を表示
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'oas-pwa-install-dismissed';

export function InstallBanner() {
  const { t } = useTranslation('common');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 過去に閉じた場合は7日間非表示
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setDeferredPrompt(null);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }, []);

  if (!visible) return null;

  return (
    <div className="max-w-3xl mx-auto w-full px-4 pt-4 animate-slide-down">
      <div className="flex items-center gap-3 rounded-lg border border-gold-300/60 bg-cream-50 px-4 py-3 shadow-sm">
        {/* アプリアイコン */}
        <div className="w-10 h-10 rounded-lg bg-navy-800 flex items-center justify-center shrink-0">
          <svg className="w-6 h-6 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-navy-800">{t('pwa.installTitle')}</p>
          <p className="text-xs text-navy-500 mt-0.5">{t('pwa.installDescription')}</p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md bg-navy-800 text-white hover:bg-navy-700 transition-colors"
        >
          {t('pwa.install')}
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 text-navy-400 hover:text-navy-600 transition-colors"
          aria-label={t('close')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
