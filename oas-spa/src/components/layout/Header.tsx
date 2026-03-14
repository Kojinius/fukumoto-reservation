import { useClinic } from '@/hooks/useClinic';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function Header() {
  const { clinic } = useClinic();

  return (
    <header className="relative">
      <div className="header-gradient shadow-warm">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* ロゴ — グラデーション背景 + アイコン */}
            {clinic?.clinicLogo ? (
              <img src={clinic.clinicLogo} alt="" className="h-12 w-12 rounded-2xl object-cover ring-2 ring-accent/20 shadow-sm" />
            ) : (
              <div className="h-12 w-12 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(247,147,33,0.4)]">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
            )}
            <div>
              <h1 className="text-xl font-heading font-black text-lien-900 dark:text-lien-50 leading-tight tracking-tight">
                {clinic?.clinicName || 'オンライン予約'}
              </h1>
              <p className="text-[11px] tracking-[0.2em] text-accent font-heading font-bold mt-0.5">
                ONLINE RESERVATION
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {clinic?.phone && (
              <a
                href={`tel:${clinic.phone}`}
                className="hidden sm:flex items-center gap-2 bg-accent/10 dark:bg-accent/20 hover:bg-accent/20 dark:hover:bg-accent/30 rounded-xl px-4 py-2 transition-all duration-200 group"
              >
                <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="font-mono font-bold text-sm text-accent-dark dark:text-accent-light">{clinic.phone}</span>
              </a>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
      {/* アクセントストライプ — 太めで存在感 */}
      <div className="accent-stripe h-1" />
    </header>
  );
}
