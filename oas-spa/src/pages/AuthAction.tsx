import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { isStrongPassword } from '@/utils/validation';

type ActionMode = 'verifyEmail' | 'resetPassword' | null;

export default function AuthAction() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation(['auth', 'common']);
  const mode = params.get('mode') as ActionMode;
  const oobCode = params.get('oobCode') || '';

  const [status, setStatus] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  // パスワードリセット用
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    if (!oobCode || !mode) {
      setStatus('error');
      setMessage(t('auth:invalidLink'));
      return;
    }

    if (mode === 'verifyEmail') {
      applyActionCode(auth, oobCode)
        .then(() => {
          setStatus('success');
          setMessage(t('auth:emailVerified'));
        })
        .catch(() => {
          setStatus('error');
          setMessage(t('auth:linkExpired'));
        });
    } else if (mode === 'resetPassword') {
      verifyPasswordResetCode(auth, oobCode)
        .then((resolvedEmail) => {
          setEmail(resolvedEmail);
          setStatus('form');
        })
        .catch(() => {
          setStatus('error');
          setMessage(t('auth:linkExpired'));
        });
    } else {
      setStatus('error');
      setMessage(t('auth:unknownAction'));
    }
  }, [mode, oobCode]);

  async function handleResetPassword() {
    setPwError('');
    if (newPassword !== confirmPassword) {
      setPwError(t('auth:passwordMismatch'));
      return;
    }
    const check = isStrongPassword(newPassword);
    if (!check.valid) {
      setPwError(check.reason!);
      return;
    }
    setSaving(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatus('success');
      setMessage(t('auth:passwordChanged'));
    } catch {
      setPwError(t('auth:passwordChangeFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading') return <Spinner className="py-12" />;

  if (status === 'error') {
    return (
      <div className="animate-fade-in-up w-full max-w-sm">
        <Card>
          <CardBody className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm text-navy-700 mb-4">{message}</p>
            <Button variant="ghost" onClick={() => navigate('/login')}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              {t('common:backToLogin')}
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="animate-fade-in-up w-full max-w-sm">
        <Card>
          <CardBody className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="check-draw" />
              </svg>
            </div>
            <p className="text-sm text-navy-700 mb-4">{message}</p>
            <Button onClick={() => navigate('/login')}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              {t('common:backToLogin')}
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  // パスワードリセットフォーム
  return (
    <div className="animate-fade-in-up w-full max-w-sm">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 justify-center">
            <div className="w-9 h-9 rounded-lg bg-navy-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-navy-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <h2 className="text-lg font-heading font-semibold text-navy-700">
              {t('auth:resetPassword')}
            </h2>
          </div>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-navy-400 mb-4 text-center font-mono">{email}</p>
          {pwError && <Alert variant="error" className="mb-4">{pwError}</Alert>}
          <div className="space-y-4">
            <PasswordInput label={t('auth:newPassword')} value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" />
            <PasswordInput label={t('auth:confirmPassword')} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            <Button className="w-full" onClick={handleResetPassword} loading={saving}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              {t('auth:changePassword')}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
