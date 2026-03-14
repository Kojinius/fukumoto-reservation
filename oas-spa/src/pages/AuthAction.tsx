import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { isStrongPassword } from '@/utils/validation';

type ActionMode = 'verifyEmail' | 'resetPassword' | null;

export default function AuthAction() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
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
      setMessage('無効なリンクです。');
      return;
    }

    if (mode === 'verifyEmail') {
      applyActionCode(auth, oobCode)
        .then(() => {
          setStatus('success');
          setMessage('メールアドレスが確認されました。');
        })
        .catch(() => {
          setStatus('error');
          setMessage('リンクが無効または期限切れです。');
        });
    } else if (mode === 'resetPassword') {
      verifyPasswordResetCode(auth, oobCode)
        .then((resolvedEmail) => {
          setEmail(resolvedEmail);
          setStatus('form');
        })
        .catch(() => {
          setStatus('error');
          setMessage('リンクが無効または期限切れです。');
        });
    } else {
      setStatus('error');
      setMessage('不明なアクションです。');
    }
  }, [mode, oobCode]);

  async function handleResetPassword() {
    setPwError('');
    if (newPassword !== confirmPassword) {
      setPwError('パスワードが一致しません');
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
      setMessage('パスワードが変更されました。');
    } catch {
      setPwError('パスワードの変更に失敗しました。リンクが期限切れの可能性があります。');
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
            <Alert variant="error" className="mb-4">{message}</Alert>
            <Button variant="ghost" onClick={() => navigate('/login')}>ログイン画面へ</Button>
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
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-lien-700 dark:text-lien-300 mb-4">{message}</p>
            <Button onClick={() => navigate('/login')}>ログイン画面へ</Button>
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
          <h2 className="text-lg font-heading font-bold text-lien-900 dark:text-lien-50 text-center">
            パスワード再設定
          </h2>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-lien-500 dark:text-lien-400 mb-4 text-center">{email}</p>
          {pwError && <Alert variant="error" className="mb-4">{pwError}</Alert>}
          <div className="space-y-4">
            <Input label="新しいパスワード" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" />
            <Input label="パスワード確認" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            <Button className="w-full" onClick={handleResetPassword} loading={saving}>
              パスワードを変更
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
