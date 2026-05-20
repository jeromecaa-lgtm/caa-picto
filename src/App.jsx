import { AuthProvider, useAuth } from './context/AuthContext';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import AuthPage from './pages/AuthPage';
import AppPage from './pages/AppPage';
import PersonSelector from './pages/PersonSelector';
import './styles/main.css';

function Router() {
  const { user, loading: authLoading } = useAuth();
  const { currentPerson, loading: profileLoading } = useProfile();

  if (authLoading || profileLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontFamily: 'DM Sans, sans-serif',
        gap: '10px',
      }}>
        <div style={{
          width: '20px', height: '20px',
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}/>
        Chargement...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return <AuthPage />;
  if (!currentPerson) return <PersonSelector />;
  return <AppPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <Router />
      </ProfileProvider>
    </AuthProvider>
  );
}