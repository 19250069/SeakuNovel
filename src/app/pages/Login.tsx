import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      let apiError = 'Email atau password salah. Silakan coba lagi.';
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
         apiError = err.response.data.errors.map((e: any) => e.msg).join(', ');
      } else if (err.response?.data?.error) {
         apiError = err.response.data.error;
      } else if (err.response?.data?.message) {
         apiError = err.response.data.message;
      }
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950/20 to-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "Cinzel, serif" }}>SeakuNovel</h1>
          <p className="text-muted-foreground">Masuk ke akun Anda</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6" aria-label="Form login" noValidate>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg text-sm" role="alert">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-sm font-medium mb-2">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
                autoComplete="email"
                aria-required="true"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium mb-2">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
                autoComplete="current-password"
                aria-required="true"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              aria-busy={loading}
            >
              {loading ? 'Masuk...' : 'Masuk'}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            <Link to="/" className="flex items-center justify-center w-full rounded-lg border border-border bg-background/70 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary">
              Kembali ke Beranda
            </Link>
            <p className="text-center text-sm text-muted-foreground">
              Belum punya akun?{' '}
              <Link to="/register" className="text-purple-400 hover:text-purple-300 font-medium">
                Daftar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}