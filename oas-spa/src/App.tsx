import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ClinicProvider } from '@/contexts/ClinicContext';
import { ToastContainer } from '@/components/ui/Toast';

/* レイアウト */
import { PatientLayout } from '@/components/layout/PatientLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';

/* ページ */
import BookingIndex from '@/pages/booking/Index';
import Cancel from '@/pages/Cancel';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import Login from '@/pages/Login';
import AuthAction from '@/pages/AuthAction';
import Dashboard from '@/pages/admin/Dashboard';
import VisitHistory from '@/pages/admin/VisitHistory';
import Settings from '@/pages/admin/Settings';
import ChangePassword from '@/pages/admin/ChangePassword';
import Questionnaire from '@/pages/booking/Questionnaire';
import Maintenance from '@/pages/Maintenance';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ClinicProvider>
              <Routes>
                {/* 患者向けページ */}
                <Route element={<PatientLayout />}>
                  <Route path="/" element={<BookingIndex />} />
                  <Route path="/questionnaire" element={<Questionnaire />} />
                  <Route path="/cancel" element={<Cancel />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                </Route>

                {/* 認証ページ */}
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth-action" element={<AuthAction />} />
                </Route>

                {/* 管理者ページ */}
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<Dashboard />} />
                  <Route path="/admin/history" element={<VisitHistory />} />
                  <Route path="/admin/settings" element={<Settings />} />
                  <Route path="/admin/change-password" element={<ChangePassword />} />
                </Route>

                {/* メンテナンス */}
                <Route path="/maintenance" element={<Maintenance />} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>

              <ToastContainer />
            </ClinicProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
