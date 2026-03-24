import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { isStrongPassword } from '@/utils/validation';

/**
 * パスワード変更ページ
 * - ?forced=1: 初回ログイン時の強制変更モード（変更完了まで他ページへ遷移不可）
 * - 通常アクセス: 任意のパスワード変更
 */
export default function ChangePassword() {
  const { t } = useTranslation('admin');
  const { t: tToast } = useTranslation('toast');
  const { t: tAuth } = useTranslation('auth');
  const { changePassword, clearMustChangePassword } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isForced = searchParams.get('forced') === '1';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    // バリデーション
    if (!currentPassword) {
      setError(t('changePassword.errors.currentPasswordRequired'));
      return;
    }

    const strength = isStrongPassword(newPassword);
    if (!strength.valid) {
      setError(tAuth(strength.reasonKey!));
      return;
    }

    if (newPassword === currentPassword) {
      setError(t('changePassword.errors.newPasswordSameAsCurrent'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('changePassword.errors.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      // Firebase Auth でパスワード変更（再認証→更新）
      await changePassword(currentPassword, newPassword);

      // 強制変更モードの場合、Firestore の mustChangePassword を解除
      if (isForced) {
        await clearMustChangePassword();
      }

      showToast(tToast('passwordChanged'), 'success');
      navigate('/admin', { replace: true });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const friendly: Record<string, string> = {
        'auth/wrong-password':     t('changePassword.errors.wrongPassword'),
        'auth/invalid-credential': t('changePassword.errors.wrongPassword'),
        'auth/too-many-requests':  t('changePassword.errors.tooManyRequests'),
        'auth/weak-password':      t('changePassword.errors.weakPassword'),
      };
      setError(
        code && friendly[code]
          ? friendly[code]
          : t('changePassword.errors.changeFailed'),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-xl font-heading font-semibold text-navy-700">
        {t('changePassword.title')}
      </h2>

      {isForced && (
        <Alert variant="warning">
          {t('changePassword.forcedAlert')}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-navy-700">{t('changePassword.cardTitle')}</h3>
        </CardHeader>
        <CardBody>
          {error && (
            <Alert variant="error" className="mb-4">{error}</Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordInput
              label={t('changePassword.currentPassword')}
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <PasswordInput
              label={t('changePassword.newPassword')}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            {/* パスワード要件の説明 */}
            <ul className="text-xs text-navy-400 space-y-0.5 -mt-2 ml-1">
              <li className={newPassword.length >= 8 ? 'text-success' : ''}>
                {t('changePassword.requirements.minLength')}
              </li>
              <li className={/[A-Z]/.test(newPassword) ? 'text-success' : ''}>
                {t('changePassword.requirements.uppercase')}
              </li>
              <li className={/[a-z]/.test(newPassword) ? 'text-success' : ''}>
                {t('changePassword.requirements.lowercase')}
              </li>
              <li className={/[0-9]/.test(newPassword) ? 'text-success' : ''}>
                {t('changePassword.requirements.number')}
              </li>
              <li className={/[!@#$%^&*()_+\-=[\]{};':"|,.<>/?]/.test(newPassword) ? 'text-success' : ''}>
                {t('changePassword.requirements.symbol')}
              </li>
            </ul>

            <PasswordInput
              label={t('changePassword.confirmPassword')}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              error={confirmPassword && newPassword !== confirmPassword ? t('changePassword.passwordMismatch') : undefined}
              required
            />

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" loading={loading}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                {t('changePassword.submitButton')}
              </Button>
              {!isForced && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/admin')}
                >
                  {t('changePassword.cancelButton')}
                </Button>
              )}
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
