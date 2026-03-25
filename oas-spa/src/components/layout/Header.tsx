import { useClinic } from '@/hooks/useClinic';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';

export function Header() {
  const { clinic } = useClinic();

  return (
    <header className="bg-white/90 backdrop-blur-sm border-b border-cream-300/60 sticky top-0 z-40">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* 医院名頭文字アイコン（ロゴ画像設定は将来機能） */}
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-navy-700 via-navy-600 to-navy-500 flex items-center justify-center shrink-0 shadow-sm ring-1 ring-white/10">
            <span className="text-[17px] font-bold text-gold leading-none tracking-tight" style={{ fontFamily: 'serif' }}>
              {(clinic?.clinicName ?? 'O').charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-heading font-semibold text-navy-700 leading-tight truncate">
              {clinic?.clinicName || 'オンライン予約'}
            </h1>
            <p className="text-[10px] tracking-[0.25em] uppercase text-navy-400 font-display font-light mt-0.5">
              ONLINE RESERVATION
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {clinic?.phone && (
            <a
              href={`tel:${clinic.phone}`}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md text-navy-400 hover:text-navy-600 hover:bg-cream-100 transition-all duration-200 active:scale-[0.97]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="font-mono text-sm font-medium">{clinic.phone}</span>
            </a>
          )}
          {/* 言語切り替えボタン */}
          <LanguageSwitcher variant="header" />
        </div>
      </div>
    </header>
  );
}
