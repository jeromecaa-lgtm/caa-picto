import { useState } from 'react';
import { useProfile } from '../context/ProfileContext';
import { toast } from './Toast';

export default function RenamePersonModal({ onClose }) {
  const { currentPerson, savePerson } = useProfile();
  const [name, setName] = useState(currentPerson?.display_name || '');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await savePerson({ display_name: name.trim() });
    setSaving(false);
    if (error) toast('Erreur lors du renommage');
    else { toast('Nom mis à jour ✓'); onClose(); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <div className="modal-title">Renommer le profil</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="field">
          <label>Nouveau prénom</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            autoFocus
          />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || !name.trim()}>
            {saving ? '...' : 'Renommer'}
          </button>
        </div>
      </div>
    </div>
  );
}