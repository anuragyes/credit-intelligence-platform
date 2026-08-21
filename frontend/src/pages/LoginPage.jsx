import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';

export default function LoginPage() {
  const [email, setEmail] = useState('analyst@creditintel.dev');
  const [password, setPassword] = useState('analyst123');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await api.login(email, password);
      setSession({ accessToken: result.accessToken, user: result.user });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-lg font-semibold">Credit Intelligence</h1>
          <p className="text-sm text-slate-400">Sign in as an analyst to continue.</p>
        </div>
        {error && <p className="text-sm text-decline">{error}</p>}
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Email</label>
          <input
            className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Password</label>
          <input
            className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-xs text-center text-slate-400 pt-2">
          Don't have an account? <Link to="/signup" className="text-blue-500 hover:underline">Sign up</Link>
        </p>
        <p className="text-xs text-slate-500 mt-4 pt-4 border-t border-white/5">
          Seeded demo account: analyst@creditintel.dev / analyst123
        </p>
      </form>
    </div>
  );
}
