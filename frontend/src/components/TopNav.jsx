import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

export default function TopNav() {
  const { user, logout } = useAuthStore();
  return (
    <header className="border-b border-white/10 px-6 py-3 flex items-center justify-between">
      <Link to="/" className="font-semibold tracking-tight">
        Credit Intelligence <span className="text-slate-400 font-normal">— Would You Lend Them ₹1 Crore?</span>
      </Link>
      <div className="flex items-center gap-4 text-sm text-slate-400">
        {user && <span>{user.name}</span>}
        <button onClick={logout} className="hover:text-slate-100 transition-colors">
          Sign out
        </button>
      </div>
    </header>
  );
}
