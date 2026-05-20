import { useState, useEffect } from 'react';
import { useProfile } from '../context/ProfileContext';
import { supabase } from '../lib/supabase';
import { toast } from './Toast';

export default function ManageChoices({ onClose }) {
  const { currentPerson, loadChoices } = useProfile();
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChoices();
  }, []);

  async function fetchChoices() {
    setLoading(true);
    const r = await fetch(
      `https://mtjvzikhalwdpglaxmeb.supabase.co/rest/v1/pictogram_choices?person_id=eq.${currentPerson.id}&select=*&order=word.asc`,
      { headers: {
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10anZ6aWtoYWx3ZHBnbGF4bWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTQ4NzYsImV4cCI6MjA5NDY5MDg3Nn0.3LrRsWIcYNNnx4xxuOkRjz95izUjkSG6QdaRSSZl4Cw',
        Authorization: 'Bearer ' + JSON.parse(localStorage.getItem('caa-session'))?.access_token
      }}
    );
    const data = await r.json();
    setList(data || []);
    setLoading(false);
  }

  async function deleteChoice(id, word) {
    await supabase.from('pictogram_choices').delete().eq('id', id);
    setList(l => l.filter(c => c.id !== id));
    // Recharger dans le contexte ET la liste locale
    await loadChoices(currentPerson.id);
    toast(`Picto "${word}" supprimé`);
  }

  const filtered = list.filter(c => c.word.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Pictogrammes mémorisés</div>
            <div className="modal-sub">{list.length} picto{list.length > 1 ? 's' : ''} enregistré{list.length > 1 ? 's' : ''} pour {currentPerson.display_name}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="choices-search">
          <input
            type="text"
            placeholder="Rechercher un mot..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Chargement...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            {search ? 'Aucun résultat' : 'Aucun picto mémorisé'}
          </div>
        ) : (
          <div className="choices-list">
            {filtered.map(c => (
              <div key={c.id} className="choice-row">
                <img
                  src={`https://api.arasaac.org/v1/pictograms/${c.arasaac_id}?download=false`}
                  alt={c.word}
                />
                <span className="choice-word">{c.word}</span>
                <button className="choice-delete" onClick={() => deleteChoice(c.id, c.word)} title="Supprimer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}