import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export default function Login() {
  const { user, isAdmin, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  if (!authLoading && user && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { mustChangePassword } = await login(email, password);
      if (mustChangePassword) {
        navigate('/admin/change-password?forced=1');
      } else {
        navigate('/admin');
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const friendly: Record<string, string> = {
        'auth/user-not-found':      'メールアドレスまたはパスワードが正しくありません。',
        'auth/wrong-password':      'メールアドレスまたはパスワードが正しくありません。',
        'auth/invalid-credential':  'メールアドレスまたはパスワードが正しくありません。',
        'auth/invalid-email':       'メールアドレスの形式が正しくありません。',
        'auth/too-many-requests':   'ログイン試行回数が多すぎます。しばらくお待ちください。',
      };
      setError(code && friendly[code] ? friendly[code] : (err instanceof Error ? err.message : 'ログインに失敗しました'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in-up w-full max-w-sm">
      {/* アイコン + タイトル — AuthLayoutの左パネルが装飾を担当するため簡素化 */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-navy-700 flex items-center justify-center">
          <svg className="w-6 h-6 text-cream" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
        </div>
        <h2 className="text-xl font-heading font-semibold text-navy-700">
          スタッフログイン
        </h2>
        <p className="text-[11px] tracking-[0.2em] uppercase text-navy-400 font-display mt-1">
          STAFF PORTAL
        </p>
      </div>

      {/* フォームカード */}
      <div className="bg-white rounded-xl border border-cream-300/60 shadow-sm p-6 space-y-5">
        {error && <Alert variant="error">{error}</Alert>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="メールアドレス"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <Input
            label="パスワード"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            ログイン
          </Button>
        </form>
      </div>
    </div>
  );
}
