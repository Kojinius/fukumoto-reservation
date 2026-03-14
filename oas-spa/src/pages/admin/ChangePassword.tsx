import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { isStrongPassword } from '@/utils/validation';

/**
 * パスワード変更ページ
 * - ?forced=1: 初回ログイン時の強制変更モード（変更完了まで他ページへ遷移不可）
 * - 通常アクセス: 任意のパスワード変更
 */
export default function ChangePassword() {
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
      setError('現在のパスワードを入力してください');
      return;
    }

    const strength = isStrongPassword(newPassword);
    if (!strength.valid) {
      setError(strength.reason!);
      return;
    }

    if (newPassword === currentPassword) {
      setError('新しいパスワードは現在のパスワードと異なるものを設定してください');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('新しいパスワードが一致しません');
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

      showToast('パスワードを変更しました', 'success');
      navigate('/admin', { replace: true });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const friendly: Record<string, string> = {
        'auth/wrong-password':     '現在のパスワードが正しくありません',
        'auth/invalid-credential': '現在のパスワードが正しくありません',
        'auth/too-many-requests':  '試行回数が多すぎます。しばらくお待ちください',
        'auth/weak-password':      'パスワードが弱すぎます。より複雑なパスワードを設定してください',
      };
      setError(
        code && friendly[code]
          ? friendly[code]
          : 'パスワードの変更に失敗しました',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h2 className="text-xl font-heading font-semibold text-navy-700">
        パスワード変更
      </h2>

      {isForced && (
        <Alert variant="warning">
          セキュリティのため、初回ログイン時にパスワードの変更が必要です。変更が完了するまで他のページへ移動できません。
        </Alert>
      )}

      <Card>
        <CardHeader>
          <h3 className="text-sm font-medium text-navy-700">新しいパスワードを設定</h3>
        </CardHeader>
        <CardBody>
          {error && (
            <Alert variant="error" className="mb-4">{error}</Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="現在のパスワード"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            <Input
              label="新しいパスワード"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />

            {/* パスワード要件の説明 */}
            <ul className="text-xs text-navy-400 space-y-0.5 -mt-2 ml-1">
              <li className={newPassword.length >= 8 ? 'text-success' : ''}>
                ・8文字以上
              </li>
              <li className={/[A-Z]/.test(newPassword) ? 'text-success' : ''}>
                ・英大文字を含む
              </li>
              <li className={/[a-z]/.test(newPassword) ? 'text-success' : ''}>
                ・英小文字を含む
              </li>
              <li className={/[0-9]/.test(newPassword) ? 'text-success' : ''}>
                ・数字を含む
              </li>
              <li className={/[!@#$%^&*()_+\-=[\]{};':"|,.<>/?]/.test(newPassword) ? 'text-success' : ''}>
                ・記号を含む
              </li>
            </ul>

            <Input
              label="新しいパスワード（確認）"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              error={confirmPassword && newPassword !== confirmPassword ? 'パスワードが一致しません' : undefined}
              required
            />

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" loading={loading}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                パスワードを変更
              </Button>
              {!isForced && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/admin')}
                >
                  キャンセル
                </Button>
              )}
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
