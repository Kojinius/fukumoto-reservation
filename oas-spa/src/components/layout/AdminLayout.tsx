import { Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useClinic } from '@/hooks/useClinic';
import { usePendingCount } from '@/hooks/useAdmin';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { ConsentModal } from '@/components/shared/ConsentModal';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';

export function AdminLayout() {
  const { t } = useTranslation('admin');
  const { user, isAdmin, loading, logout, profile, needsConsent, acceptConsent } = useAuth();
  const { clinic } = useClinic();
  const location = useLocation();
  const pendingCount = usePendingCount();

  if (loading) return <Spinner overlay />;
  if (!user)    return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/login" replace />;

  // パスワード変更強制
  if (profile?.mustChangePassword && !location.pathname.includes('/change-password')) {
    return <Navigate to="/admin/change-password?forced=1" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {/* 管理者ヘッダー — ダークネイビーで患者側と差別化 */}
      <header className="admin-header sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="flex items-center gap-2.5 group">
              <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center transition-colors group-hover:bg-white/15">
                <svg className="w-4 h-4 text-cream" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </span>
              <span className="text-base font-heading font-semibold text-cream group-hover:text-gold transition-colors duration-200">
                {t('layout.adminPanel')}
              </span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1 ml-2">
              <Link
                to={pendingCount > 0 ? '/admin?filter=pending' : '/admin'}
                className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  location.pathname === '/admin'
                    ? 'bg-white/10 text-cream'
                    : 'text-cream/60 hover:text-cream hover:bg-white/5'
                }`}
              >
                {t('layout.reservationList')}
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold px-1 animate-pulse">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </Link>
              <Link
                to="/admin/settings"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  location.pathname.includes('/settings')
                    ? 'bg-white/10 text-cream'
                    : 'text-cream/60 hover:text-cream hover:bg-white/5'
                }`}
              >
                {t('layout.settings')}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {needsConsent && !profile?.mustChangePassword && (
              <span
                title={t('layout.consentPending')}
                aria-label={t('layout.consentPending')}
                className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 animate-pulse shrink-0"
              >
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
            )}
            <span className="hidden sm:inline text-sm text-cream/50 font-mono">
              {profile?.displayName || user.email}
              {profile?.lastLoginAt && (() => {
                const raw = profile.lastLoginAt as unknown;
                const ms = raw && typeof raw === 'object' && 'seconds' in (raw as Record<string,unknown>)
                  ? (raw as { seconds: number }).seconds * 1000
                  : typeof raw === 'string' ? new Date(raw).getTime() : 0;
                if (!ms) return null;
                return (
                  <span className="ml-2 text-[11px] text-cream/30">
                    {t('layout.lastLogin')}{new Date(ms).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                );
              })()}
            </span>
            <LanguageSwitcher variant="header" />
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-cream/60 hover:text-cream hover:bg-white/10"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {t('layout.logout')}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>

      {/* [C2] 利用規約・PP同意モーダル（未同意時はブロッキング表示） */}
      <ConsentModal
        open={needsConsent && !profile?.mustChangePassword}
        termsText={clinic?.termsOfService || ''}
        privacyText={clinic?.privacyPolicy || ''}
        onAccept={acceptConsent}
      />
    </div>
  );
}
