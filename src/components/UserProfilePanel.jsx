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
    const r = await authFetch(
      `user_persons?id=eq.${access.id}`,
      { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(perms) }
    );
    setSaving(false);
    if (r.ok) { onUpdate(perms); toast('Permissions mises à jour ✓'); }
    else toast('Erreur lors de la mise à jour');
  }

  function setPerm(key, value) {
    setPerms(p => ({ ...p, [key]: value }));
  }

  return (
    <div className="access-row">
      <div className="access-row-header" onClick={() => setExpanded(v => !v)}>
        <div className="access-avatar">{(access.user_name || '?').charAt(0).toUpperCase()}</div>
        <div className="access-info">
          <div className="access-name">{access.user_name || access.user_email}</div>
          {access.user_context && <div className="access-context">{access.user_context}</div>}
        </div>
        <div className={`access-badge ${access.is_admin ? 'admin' : 'helper'}`}>
          {access.is_admin ? 'Admin' : 'Aidant'}
        </div>
        {!isCurrentUser && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s', flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        )}
      </div>

      {expanded && !isCurrentUser && (
        <div className="access-perms">
          <div className="toggle-row">
            <span style={{ fontWeight: 600 }}>Accès admin complet</span>
            <Toggle value={!!perms.is_admin} onChange={v => setPerm('is_admin', v)} />
          </div>
          {!perms.is_admin && (
            <div className="access-perms-detail">
              {PERMISSIONS.map(p => (
                <div key={p.key} className="toggle-row">
                  <div>
                    <div style={{ fontSize: 14 }}>{p.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.desc}</div>
                  </div>
                  <Toggle value={!!perms[p.key]} onChange={v => setPerm(p.key, v)} />
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 12, justifyContent: 'space-between' }}>
            <button className="btn btn-danger btn-sm" onClick={() => onRevoke(access.id)}>
              Révoquer l'accès
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

export default function UserProfilePanel({ onClose }) {
  const { user, userProfile, updateUserProfile } = useAuth();
  const { currentPerson } = useProfile();
  const [form, setForm] = useState({
    first_name: userProfile?.first_name || '',
    last_name: userProfile?.last_name || '',
    context: userProfile?.context || '',
  });
  const [saving, setSaving] = useState(false);
  const [accesses, setAccesses] = useState([]);
  const [loadingAccess, setLoadingAccess] = useState(true);

  useEffect(() => {
    if (currentPerson) loadAccesses();
  }, [currentPerson]);

  async function loadAccesses() {
    setLoadingAccess(true);
    const r = await authFetch(
      `user_persons?person_id=eq.${currentPerson.id}&select=*,user:users(first_name,last_name,email,context)`
    );
    const data = await r.json();
    setAccesses(data.map(row => ({
      ...row,
      user_name: row.user ? `${row.user.first_name || ''} ${row.user.last_name || ''}`.trim() || row.user.email : '',
      user_email: row.user?.email,
      user_context: row.user?.context,
    })));
    setLoadingAccess(false);
  }

  async function saveProfile() {
    setSaving(true);
    const { error } = await updateUserProfile(form);
    setSaving(false);
    if (error) toast('Erreur lors de la sauvegarde');
    else toast('Profil mis à jour ✓');
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

  const isOwner = accesses.find(a => a.user_id === user?.id)?.role === 'owner';

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div className="modal-title">Mon profil</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Infos personnelles */}
        <div className="profile-section">
          <h3 className="profile-section-title">Mes informations</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field">
              <label>Prénom</label>
              <input type="text" value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
            </div>
            <div className="field">
              <label>Nom</label>
              <input type="text" value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
            </div>
          </div>
          <div className="field">
            <label>Contexte</label>
            <input type="text" value={form.context} placeholder="Ex : Père, Orthophoniste..."
              onChange={e => setForm(f => ({ ...f, context: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={saveProfile} disabled={saving}>
              {saving ? 'Sauvegarde...' : 'Enregistrer'}
            </button>
          </div>
        </div>

        {/* Accès partagés — visible uniquement pour le owner */}
        {currentPerson && isOwner && (
          <div className="profile-section">
            <h3 className="profile-section-title">
              Accès au profil de {currentPerson.display_name}
            </h3>
            {loadingAccess ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Chargement...</div>
            ) : (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}