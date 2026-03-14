import { Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';

export function AdminLayout() {
  const { user, isAdmin, loading, logout, profile } = useAuth();
  const location = useLocation();

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
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="flex items-center gap-2.5 group">
              <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center transition-colors group-hover:bg-white/15">
                <svg className="w-4 h-4 text-cream" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </span>
              <span className="text-base font-heading font-semibold text-cream group-hover:text-gold transition-colors duration-200">
                管理画面
              </span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1 ml-2">
              <Link
                to="/admin"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  location.pathname === '/admin'
                    ? 'bg-white/10 text-cream'
                    : 'text-cream/60 hover:text-cream hover:bg-white/5'
                }`}
              >
                予約一覧
              </Link>
              <Link
                to="/admin/settings"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  location.pathname.includes('/settings')
                    ? 'bg-white/10 text-cream'
                    : 'text-cream/60 hover:text-cream hover:bg-white/5'
                }`}
              >
                設定
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-cream/50 font-mono">
              {profile?.displayName || user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-cream/60 hover:text-cream hover:bg-white/10"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
