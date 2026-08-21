import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CompanyPage from './pages/CompanyPage.jsx';
import TopNav from './components/TopNav.jsx';

function ProtectedRoute({ children }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const accessToken = useAuthStore((s) => s.accessToken);

  return (
    <div className="min-h-screen">
      {accessToken && <TopNav />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/companies/:id"
          element={
            <ProtectedRoute>
              <CompanyPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
