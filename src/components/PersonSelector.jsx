import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { createPerson, joinPersonByTag, deletePerson, unlinkPerson } from '../lib/supabase';
import '../styles/person-selector.css';

// ── Modal confirmation suppression ───────────────────────────────────────────
function DeleteModal({ person, onConfirm, onCancel }) {
  const isOwner = person.role === 'owner';
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const valid = isOwner ? input === 'SUPPRIMER' : true;

  async function handle() {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title" style={{ color: 'var(--danger)' }}>
            {isOwner ? 'Supprimer le profil' : 'Se retirer du profil'}
          </div>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>

        {isOwner ? (
          <>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Tu es sur le point de supprimer définitivement le profil de <strong>{person.display_name}</strong> ainsi que tous ses pictogrammes mémorisés. Cette action est irréversible.
            </p>
            <div className="field">
              <label>Tape <strong>SUPPRIMER</strong> pour confirmer</label>
              <input
                type="text"
                placeholder="SUPPRIMER"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoFocus
              />
            </div>
          </>
        ) : (
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
            Tu vas retirer ton accès au profil de <strong>{person.display_name}</strong>. Le profil ne sera pas supprimé.
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Annuler</button>
          <button
            className="btn btn-danger btn-sm"
            onClick={handle}
            disabled={!valid || loading}
          >
            {loading ? '...' : isOwner ? 'Supprimer définitivement' : 'Me retirer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Carte personne ────────────────────────────────────────────────────────────
function PersonCard({ person, onSelect, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="person-card-wrapper">
      <button className="person-card" onClick={() => onSelect(person)}>
        <div className="person-avatar">
          {person.display_name.charAt(0).toUpperCase()}
        </div>
        <div className="person-info">
          <div className="person-name">{person.display_name}</div>
          <div className="person-tag">{person.username}#{person.tag}</div>
        </div>
        <div className="person-role">
          {person.role === 'owner' ? 'Propriétaire' : 'Aidant'}
        </div>
      </button>
      <button
        className="person-menu-btn"
        onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}
        title="Options"
      >
        ···
      </button>
      {showMenu && (
        <div className="person-menu">
          <button
            className="person-menu-item danger"
            onClick={() => { setShowMenu(false); onDelete(person); }}
          >
            {person.role === 'owner' ? '🗑 Supprimer le profil' : '↩ Se retirer'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Modal ajout personne ──────────────────────────────────────────────────────
function AddPersonModal({ onClose, onAdded }) {
  const { user } = useAuth();
  const [mode, setMode] = useState(null);
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  async function handleCreate() {
    if (!name.trim()) return setError('Entre un prénom.');
    setLoading(true); setError('');
    const { data, error } = await createPerson(user.id, name.trim());
    setLoading(false);
    if (error) return setError(error.message);
    setCreated(data);
  }

  async function handleJoin() {
    if (!tag.trim()) return setError('Entre un tag.');
    setLoading(true); setError('');
    const { data, error } = await joinPersonByTag(user.id, tag.trim());
    setLoading(false);
    if (error) return setError(error.message);
    onAdded(data);
  }

  if (created) {
    return (
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-box">
          <div className="created-success">
            <div className="created-avatar">{created.display_name.charAt(0).toUpperCase()}</div>
            <h3>{created.display_name} a été créé !</h3>
            <div className="created-tag-box">
              <span className="created-tag-label">Tag à partager</span>
              <span className="created-tag">{created.username}#{created.tag}</span>
            </div>
            <p className="created-hint">Ce tag permet à d'autres aidants de rejoindre ce profil.</p>
            <button className="btn btn-primary" onClick={() => onAdded(created)}>Accéder au profil</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div className="modal-title">Ajouter une personne</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {!mode && (
          <div className="add-mode-choice">
            <button className="mode-btn" onClick={() => setMode('create')}>
              <div className="mode-icon">✦</div>
              <div className="mode-label">Créer un profil</div>
              <div className="mode-sub">Pour une nouvelle personne</div>
            </button>
            <button className="mode-btn" onClick={() => setMode('join')}>
              <div className="mode-icon">#</div>
              <div className="mode-label">Rejoindre via un tag</div>
              <div className="mode-sub">Ex : lea#6262</div>
            </button>
          </div>
        )}
        {mode === 'create' && (
          <div className="add-form">
            <button className="btn-back" onClick={() => { setMode(null); setError(''); }}>← Retour</button>
            <div className="field">
              <label>Prénom</label>
              <input type="text" placeholder="Ex : Léa" value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()} autoFocus />
            </div>
            {error && <div className="add-error">{error}</div>}
            <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
              {loading ? 'Création...' : 'Créer le profil'}
            </button>
          </div>
        )}
        {mode === 'join' && (
          <div className="add-form">
            <button className="btn-back" onClick={() => { setMode(null); setError(''); }}>← Retour</button>
            <div className="field">
              <label>Tag de la personne</label>
              <input type="text" placeholder="Ex : lea#6262" value={tag}
                onChange={(e) => setTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()} autoFocus />
            </div>
            {error && <div className="add-error">{error}</div>}
            <button className="btn btn-primary" onClick={handleJoin} disabled={loading}>
              {loading ? 'Recherche...' : 'Rejoindre'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function PersonSelector() {
  const { persons, selectPerson, loadPersons } = useProfile();
  const { user } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function handleAdded(person) {
    setShowAdd(false);
    await loadPersons();
    await selectPerson(person);
  }

  async function handleDelete(person) {
    setDeleteTarget(person);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.role === 'owner') {
      await deletePerson(deleteTarget.id);
    } else {
      await unlinkPerson(user.id, deleteTarget.id);
    }
    setDeleteTarget(null);
    await loadPersons();
  }

  async function logout() {
    const { supabase } = await import('../lib/supabase');
    await supabase.auth.signOut();
  }

  return (
    <div className="person-selector">
      <div className="selector-header">
        <div className="selector-logo">Picto ✦</div>
        <button className="btn btn-ghost btn-sm" onClick={logout}>Déconnexion</button>
      </div>

      <div className="selector-body">
        {persons.length === 0 ? (
          <div className="selector-empty">
            <div className="empty-icon">👤</div>
            <h2>Aucun profil rattaché</h2>
            <p>Créez un profil pour une personne ou rejoignez un profil existant via son tag.</p>
          </div>
        ) : (
          <>
            <h2 className="selector-title">Choisir un profil</h2>
            <div className="persons-list">
              {persons.map((p) => (
                <PersonCard
                  key={p.id}
                  person={p}
                  onSelect={selectPerson}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </>
        )}
        <button className="btn-add" onClick={() => setShowAdd(true)}>
          + Ajouter une personne
        </button>
      </div>

      {showAdd && (
        <AddPersonModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />
      )}

      {deleteTarget && (
        <DeleteModal
          person={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}