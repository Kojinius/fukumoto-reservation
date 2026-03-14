import { Outlet, useNavigate } from 'react-router-dom';
import { useClinic } from '@/hooks/useClinic';
import { Header } from './Header';
import { Spinner } from '@/components/ui/Spinner';
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
    <div className="min-h-screen flex flex-col bg-canvas">
      <Header />

      {/* お知らせバナー */}
      {clinic?.announcement.active && clinic.announcement.message && (() => {
        const t = clinic.announcement.type;
        const cfg = t === 'warning'
          ? { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-800', icon: (
              <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            ) }
          : t === 'maintenance'
          ? { bg: 'bg-navy-50', border: 'border-navy-400', text: 'text-navy-700', icon: (
              <svg className="w-5 h-5 text-navy-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 5.384a2.025 2.025 0 01-2.864-2.864l5.384-5.384m2.864 2.864L18 7.5V3h-4.5l-7.08 7.08m4.5 4.5l-2.864-2.864M3 3l3 3" />
              </svg>
            ) }
          : { bg: 'bg-sky-50', border: 'border-sky-400', text: 'text-sky-800', icon: (
              <svg className="w-5 h-5 text-sky-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            ) };
        return (
          <div className="max-w-3xl mx-auto w-full px-4 pt-6 animate-slide-down">
            <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
              {cfg.icon}
              <p className="text-sm leading-relaxed">{clinic.announcement.message}</p>
            </div>
          </div>
        );
      })()}

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>

      {/* フッター */}
      <footer className="border-t border-cream-300/40 bg-cream-100/50">
        <div className="max-w-3xl mx-auto px-4 py-5 text-center space-y-2">
          {clinic?.clinicName && (
            <p className="text-sm font-heading font-semibold text-navy-700">
              {clinic.clinicName}
            </p>
          )}
          {clinic?.phone && (
            <p>
              <a href={`tel:${clinic.phone}`} className="inline-flex items-center gap-1.5 text-xs text-navy-400 hover:text-navy-600 font-mono font-medium transition-colors link-gold-underline">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {clinic.phone}
              </a>
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
