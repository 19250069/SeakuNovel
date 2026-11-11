import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';

export function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(username, email, password, displayName);
      navigate('/');
    } catch (err: any) {
      let apiError = 'Pendaftaran gagal. Silakan coba lagi.';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950/20 to-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "Cinzel, serif" }}>SeakuNovel</h1>
          <p className="text-muted-foreground">Buat akun baru</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4" aria-label="Form registrasi" noValidate>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg text-sm" role="alert">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="reg-username" className="block text-sm font-medium mb-2">Username</label>
              <input
                id="reg-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
                minLength={3}
                maxLength={50}
                autoComplete="username"
                aria-required="true"
              />
            </div>

            <div>
              <label htmlFor="reg-display-name" className="block text-sm font-medium mb-2">Display Name</label>
              <input
                id="reg-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
                aria-required="true"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium mb-2">Email</label>
              <input
                id="reg-email"
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
              <label htmlFor="reg-password" className="block text-sm font-medium mb-2">Password</label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
                minLength={8}
                pattern="(?=.*[A-Z])(?=.*[0-9]).{8,}"
                title="Password minimal 8 karakter dengan setidaknya satu huruf kapital dan satu angka"
                autoComplete="new-password"
                aria-required="true"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              aria-busy={loading}
            >
              {loading ? 'Mendaftar...' : 'Daftar'}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            <Link to="/" className="flex items-center justify-center w-full rounded-lg border border-border bg-background/70 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary">
              Kembali ke Beranda
            </Link>
            <p className="text-center text-sm text-muted-foreground">
              Sudah punya akun?{' '}
              <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium">
                Masuk
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}