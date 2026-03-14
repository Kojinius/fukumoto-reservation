import { Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
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
    <div className="min-h-screen flex flex-col bg-warm-scene transition-theme duration-theme">
      {/* 管理者ヘッダー */}
      <header className="relative bg-white dark:bg-lien-800 shadow-warm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="flex items-center gap-2 group">
              <span className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </span>
              <span className="text-lg font-heading font-bold text-lien-900 dark:text-lien-50 group-hover:text-accent transition-colors">
                管理画面
              </span>
            </Link>
            <Link to="/admin/settings" className="text-sm text-lien-500 dark:text-lien-400 hover:text-accent transition-colors font-medium">
              設定
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-lien-500 dark:text-lien-400 font-mono">
              {profile?.displayName || user.email}
            </span>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={logout}>
              ログアウト
            </Button>
          </div>
        </div>
        <div className="accent-stripe h-[2px]" />
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
