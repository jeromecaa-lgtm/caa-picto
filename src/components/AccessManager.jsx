import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { toast } from './Toast';

const SUPABASE_URL = 'https://mtjvzikhalwdpglaxmeb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10anZ6aWtoYWx3ZHBnbGF4bWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTQ4NzYsImV4cCI6MjA5NDY5MDg3Nn0.3LrRsWIcYNNnx4xxuOkRjz95izUjkSG6QdaRSSZl4Cw';

function authFetch(path, opts = {}) {
  const token = JSON.parse(localStorage.getItem('caa-session'))?.access_token;
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      ...opts.headers,
    },
  });
}

const PERMISSIONS = [
  { key: 'can_edit_pictos', label: 'Pictos', desc: 'Valider et modifier les pictos' },
  { key: 'can_edit_complexity', label: 'Complexité', desc: 'Changer le niveau de complexité' },
  { key: 'can_edit_display', label: 'Affichage', desc: 'Modifier la durée et le nombre de pictos' },
  { key: 'can_edit_accessibility', label: 'Accessibilité', desc: 'Modifier les couleurs et le mode daltonien' },
];

function Toggle({ value, onChange }) {
  return <div className={`toggle ${value ? 'on' : ''}`} onClick={() => onChange(!value)} />;
}

function AccessRow({ access, onUpdate, onRevoke, isCurrentUser }) {
  const [expanded, setExpanded] = useState(false);
  const [perms, setPerms] = useState(access);
  const [saving, setSaving] = useState(false);

  async function savePerms() {
    setSaving(true);
    const ALLOWED = ['is_admin','can_edit_pictos','can_edit_complexity','can_edit_display','can_edit_accessibility'];
    const clean = Object.fromEntries(Object.entries(perms).filter(([k]) => ALLOWED.includes(k)));
    const r = await authFetch(
      `user_persons?id=eq.${access.id}`,
      { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(clean) }
    );
    setSaving(false);
    if (r.ok) { onUpdate(perms); toast('Permissions mises à jour ✓'); }
    else toast('Erreur lors de la mise à jour');
  }

  return (
    <div className="access-row">
      <div className="access-row-header" onClick={() => !isCurrentUser && access.role !== 'owner' && setExpanded(v => !v)}>
        <div className="access-avatar">
          {(access.user_name || '?').charAt(0).toUpperCase()}
        </div>
        <div className="access-info">
          <div className="access-name">{access.user_name || access.user_email}</div>
          {access.user_context && <div className="access-context">{access.user_context}</div>}
        </div>
        <div className={`access-badge ${access.role === 'owner' ? 'owner' : access.is_admin ? 'admin' : 'helper'}`}>
          {access.role === 'owner' ? 'Propriétaire' : access.is_admin ? 'Admin' : 'Aidant'}
        </div>
        {!isCurrentUser && access.role !== 'owner' && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s', flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        )}
      </div>

      {expanded && !isCurrentUser && access.role !== 'owner' && (
        <div className="access-perms">
          <div className="toggle-row">
            <span style={{ fontWeight: 600 }}>Accès admin complet</span>
            <Toggle value={!!perms.is_admin} onChange={v => setPerms(p => ({ ...p, is_admin: v }))} />
          </div>
          {!perms.is_admin && (
            <div className="access-perms-detail">
              {PERMISSIONS.map(p => (
                <div key={p.key} className="toggle-row">
                  <div>
                    <div style={{ fontSize: 14 }}>{p.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.desc}</div>
                  </div>
                  <Toggle value={!!perms[p.key]} onChange={v => setPerms(prev => ({ ...prev, [p.key]: v }))} />
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 12, justifyContent: 'space-between' }}>
            <button className="btn btn-danger btn-sm" onClick={() => onRevoke(access.id)}>
              Révoquer
            </button>
            <button className="btn btn-primary btn-sm" onClick={savePerms} disabled={saving}>
              {saving ? '...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccessManager() {
  const { user } = useAuth();
  const { currentPerson } = useProfile();
  const [accesses, setAccesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentPerson) loadAccesses();
  }, [currentPerson?.id]);

  async function loadAccesses() {
    setLoading(true);
    // 1. Charger les liens user_persons
    const r = await authFetch(
      `user_persons?person_id=eq.${currentPerson.id}&select=*`
    );
    const links = await r.json();

    // 2. Charger les infos des users en parallèle
    const userIds = links.map(l => l.user_id);
    const usersRes = await authFetch(
      `users?id=in.(${userIds.join(',')})&select=id,email,first_name,last_name,context`
    );
    const users = await usersRes.json();
    const usersMap = {};
    users.forEach(u => { usersMap[u.id] = u; });

    setAccesses(links.map(row => {
      const u = usersMap[row.user_id] || {};
      const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || '';
      return {
        ...row,
        user_name: name,
        user_email: u.email,
        user_context: u.context,
      };
    }));
    setLoading(false);
  }

  async function revokeAccess(userPersonId) {
    if (!confirm('Révoquer cet accès ?')) return;
    await authFetch(`user_persons?id=eq.${userPersonId}`, { method: 'DELETE' });
    setAccesses(a => a.filter(x => x.id !== userPersonId));
    toast('Accès révoqué');
  }

  function updateAccess(updated) {
    setAccesses(a => a.map(x => x.id === updated.id ? { ...x, ...updated } : x));
  }

  if (loading) return <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '8px 0' }}>Chargement...</div>;

  return (
    <div className="accesses-list">
      {accesses.map(a => (
        <AccessRow
          key={a.id}
          access={a}
          onUpdate={updateAccess}
          onRevoke={revokeAccess}
          isCurrentUser={a.user_id === user?.id}
        />
      ))}
    </div>
  );
}