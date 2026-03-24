// 言語切り替えコンポーネント
// OASデザインシステム（navy / cream / gold）に合わせたスタイル

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';

// サポート言語一覧
const LANGUAGES = [
  { code: 'ja',    label: '日本語',     flag: '🇯🇵' },
  { code: 'en',    label: 'English',    flag: '🇺🇸' },
  { code: 'zh-CN', label: '中文',       flag: '🇨🇳' },
  { code: 'vi',    label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'ko',    label: '한국어',     flag: '🇰🇷' },
  { code: 'pt-BR', label: 'Português',  flag: '🇧🇷' },
  { code: 'tl',    label: 'Filipino',   flag: '🇵🇭' },
];

interface Props {
  /** ヘッダー用 (navy背景) か ログイン画面用 (白背景) か */
  variant?: 'header' | 'login';
}

export function LanguageSwitcher({ variant = 'header' }: Props) {
  const { i18n, t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function changeLanguage(code: string) {
    i18n.changeLanguage(code);
    localStorage.setItem('language', code);
    setOpen(false);
  }

  const isHeader = variant === 'header';

  return (
    <div className="relative" ref={ref}>
      {/* トリガーボタン — 地球アイコン */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        title={t('languageSettings')}
        aria-label={t('languageSettings')}
        aria-expanded={open}
        className={cn(
          'flex items-center justify-center rounded-md transition-colors',
          isHeader
            ? 'p-2 min-w-[40px] min-h-[40px] text-navy-400 hover:text-navy-600 hover:bg-cream-100 active:scale-[0.97]'
            : 'p-1.5 text-navy-400 hover:text-navy-600',
        )}
      >
        {/* 地球アイコン（SVG） */}
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
      </button>

      {/* ドロップダウン */}
      {open && (
        <div
          className={cn(
            'absolute right-0 top-full mt-1 z-50',
            'w-48 py-1 rounded-lg',
            'bg-white border border-cream-300/60 shadow-float',
          )}
        >
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              type="button"
              onClick={() => changeLanguage(lang.code)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left',
                'transition-colors font-body',
                i18n.language === lang.code
                  ? 'bg-navy-700 text-cream font-medium'
                  : 'text-navy-600 hover:bg-cream-100 hover:text-navy-800',
              )}
            >
              <span className="text-base leading-none">{lang.flag}</span>
              <span>{lang.label}</span>
              {/* 現在選択中のチェックマーク */}
              {i18n.language === lang.code && (
                <svg
                  className="w-3.5 h-3.5 ml-auto text-gold"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
