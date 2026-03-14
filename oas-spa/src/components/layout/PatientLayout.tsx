import { Outlet, useNavigate } from 'react-router-dom';
import { useClinic } from '@/hooks/useClinic';
import { Header } from './Header';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { useEffect } from 'react';

export function PatientLayout() {
  const { clinic, loading, isMaintenance } = useClinic();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isMaintenance && !location.pathname.includes('/maintenance')) {
      navigate('/maintenance', { replace: true });
    }
  }, [loading, isMaintenance, navigate]);

  if (loading) return <Spinner overlay />;

  return (
    <div className="min-h-screen flex flex-col bg-warm-scene transition-theme duration-theme">
      <Header />

      {/* お知らせバナー */}
      {clinic?.announcement.active && clinic.announcement.message && (
        <div className="max-w-4xl mx-auto w-full px-4 pt-6 relative z-10">
          <Alert variant={clinic.announcement.type === 'warning' ? 'warning' : 'info'}>
            {clinic.announcement.message}
          </Alert>
        </div>
      )}

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 relative z-10">
        <Outlet />
      </main>

      {/* フッター — 温かみのあるグラデーション */}
      <footer className="relative z-10 border-t border-accent/10 dark:border-lien-700/40">
        <div className="bg-gradient-to-b from-white/80 to-accent-50/50 dark:from-lien-800/80 dark:to-lien-900/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-6 text-center space-y-2">
            {clinic?.clinicName && (
              <p className="text-sm font-heading font-bold text-lien-700 dark:text-lien-200">
                {clinic.clinicName}
              </p>
            )}
            {clinic?.phone && (
              <p>
                <a href={`tel:${clinic.phone}`} className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-dark font-mono font-bold transition-colors">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {clinic.phone}
                </a>
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
