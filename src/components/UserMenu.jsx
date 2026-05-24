import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import UserProfilePanel from './UserProfilePanel';

export default function UserMenu() {
  const { userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const menuRef = useRef(null);

  const displayName = userProfile?.first_name || userProfile?.email?.split('@')[0] || 'Mon compte';

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <>
      <div className="user-menu-wrapper" ref={menuRef}>
        <button className="user-menu-btn" onClick={() => setOpen(v => !v)}>
          <div className="user-menu-avatar">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <span className="user-menu-name">{displayName}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {open && (
          <div className="user-menu-dropdown">
            <div className="user-menu-header">
              <div className="user-menu-fullname">
                {userProfile?.first_name} {userProfile?.last_name}
              </div>
              {userProfile?.context && (
                <div className="user-menu-context">{userProfile.context}</div>
              )}
            </div>
            <div className="user-menu-divider" />
            <button className="user-menu-item" onClick={() => { setOpen(false); setShowProfile(true); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Mon profil
            </button>
            <div className="user-menu-divider" />
            <button className="user-menu-item danger" onClick={logout}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Se déconnecter
            </button>
          </div>
        )}
      </div>

      {showProfile && <UserProfilePanel onClose={() => setShowProfile(false)} />}
    </>
  );
}