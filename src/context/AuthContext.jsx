import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('caa-session');
    if (saved) {
      try {
        const session = JSON.parse(saved);
        const u = session.user || { id: session.sub, email: session.email };
        setUser(u);
        loadUserProfile(u.id);
      } catch (e) {}
    }
    setLoading(false);

    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        const u = session.user || { id: session.sub, email: session.email };
        setUser(u);
        loadUserProfile(u.id);
      } else {
        setUser(null);
        setUserProfile(null);
      }
    });
  }, []);

  async function loadUserProfile(userId) {
    const r = await fetch(
      `https://mtjvzikhalwdpglaxmeb.supabase.co/rest/v1/users?id=eq.${userId}&select=*`,
      { headers: {
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10anZ6aWtoYWx3ZHBnbGF4bWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTQ4NzYsImV4cCI6MjA5NDY5MDg3Nn0.3LrRsWIcYNNnx4xxuOkRjz95izUjkSG6QdaRSSZl4Cw',
        Authorization: 'Bearer ' + JSON.parse(localStorage.getItem('caa-session'))?.access_token
      }}
    );
    const data = await r.json();
    if (data?.[0]) setUserProfile(data[0]);
  }

  async function updateUserProfile(updates) {
    const r = await fetch(
      `https://mtjvzikhalwdpglaxmeb.supabase.co/rest/v1/users?id=eq.${user.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
          apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10anZ6aWtoYWx3ZHBnbGF4bWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTQ4NzYsImV4cCI6MjA5NDY5MDg3Nn0.3LrRsWIcYNNnx4xxuOkRjz95izUjkSG6QdaRSSZl4Cw',
          Authorization: 'Bearer ' + JSON.parse(localStorage.getItem('caa-session'))?.access_token
        },
        body: JSON.stringify(updates)
      }
    );
    if (r.ok) setUserProfile(p => ({ ...p, ...updates }));
    return { error: r.ok ? null : { message: await r.text() } };
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, loadUserProfile, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}