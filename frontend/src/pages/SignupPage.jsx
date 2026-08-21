import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuthStore } from '../store/authStore.js';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await api.signup(name, email, password);
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
          <p className="text-sm text-slate-400">Create an analyst account.</p>
        </div>
        {error && <p className="text-sm text-decline">{error}</p>}
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Name</label>
          <input
            className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            type="text"
            required
            placeholder="Jane Doe"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400">Email</label>
          <input
            className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            placeholder="jane@creditintel.dev"
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
            minLength={6}
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
        >
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
        <p className="text-xs text-center text-slate-400 pt-2">
          Already have an account? <Link to="/login" className="text-blue-500 hover:underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}
