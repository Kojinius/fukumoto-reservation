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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in-up w-full max-w-sm">
      <div className="bg-white dark:bg-lien-800 rounded-2xl shadow-warm-lg overflow-hidden">
        {/* ヘッダー — ヒーロー風 */}
        <div className="hero-banner px-6 py-8 text-center">
          <div className="relative w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="relative text-lg font-heading font-black text-white">
            スタッフログイン
          </h2>
        </div>

        {/* フォーム */}
        <div className="p-6 space-y-5">
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
              ログイン
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
