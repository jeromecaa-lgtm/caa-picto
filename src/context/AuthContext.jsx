import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifie la session existante au démarrage
    const saved = localStorage.getItem('caa-session');
    if (saved) {
      try {
        const session = JSON.parse(saved);
        const u = session.user || { id: session.sub, email: session.email };
        setUser(u);
      } catch (e) {}
    }
    setLoading(false);

    // Écoute les changements d'auth
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        const u = session.user || { id: session.sub, email: session.email };
        setUser(u);
      } else {
        setUser(null);
      }
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
