import { useState, useEffect } from 'react';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import AccessManager from './AccessManager';
import { toast } from './Toast';
import '../styles/settings.css';

const VOICE_TYPES = [
  { value: 'female', label: 'Femme', emoji: '👩' },
  { value: 'male', label: 'Homme', emoji: '👨' },
  { value: 'girl', label: 'Fille', emoji: '👧' },
  { value: 'boy', label: 'Garçon', emoji: '👦' },
];

const DEFAULTS = {
  show_core: true,
  show_verbs: true,
  show_qualifiers: false,
  use_ai: false,
  auto_select: false,
  colorblind_mode: false,
  background_color: '#F0EDE8',
  display_speed_ms: 3000,
  max_pictograms: 15,
  complexity: 'intermediate',
  picto_size: 'medium',
  voice_type: 'female',
};

const COMPLEXITY_PRESETS = {
  simple: {
    label: 'Simple',
    description: 'Noms uniquement → "piscine"',
    show_core: true, show_verbs: false, show_qualifiers: false,
  },
  intermediate: {
    label: 'Intermédiaire',
    description: 'Noms + Verbes → "vouloir piscine"',
    show_core: true, show_verbs: true, show_qualifiers: false,
  },
  advanced: {
    label: 'Avancé',
    description: 'Tout → "vouloir aller piscine chaud"',
    show_core: true, show_verbs: true, show_qualifiers: true,
  },
};

const PICTO_SIZES = [
  { value: 'small', label: 'Petit', size: 48 },
  { value: 'medium', label: 'Moyen', size: 72 },
  { value: 'large', label: 'Grand', size: 100 },
  { value: 'xlarge', label: 'Très grand', size: 140 },
];

function Toggle({ value, onChange }) {
  return <div className={`toggle ${value ? 'on' : ''}`} onClick={() => onChange(!value)} />;
}

function Section({ title, summary, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`settings-section ${open ? 'open' : ''}`}>
      <button className="settings-section-header" onClick={() => setOpen(v => !v)}>
        <div>
          <div className="settings-section-title">{title}</div>
          {!open && summary && <div className="settings-section-summary">{summary}</div>}
        </div>
        <svg className="settings-section-chevron" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && <div className="settings-section-body">{children}</div>}
    </div>
  );
}

export default function SettingsPanel({ onClose, onManageChoices }) {
  const { currentPerson, savePerson, persons } = useProfile();
  const { user } = useAuth();

  // Trouver les permissions du login courant sur cette personne
  const myAccess = persons?.find ? null : null; // sera chargé via context
  const isOwner = currentPerson?.role === 'owner';
  const isAdmin = isOwner || currentPerson?.is_admin;

  function canEdit(key) {
    if (isOwner || isAdmin) return true;
    return !!currentPerson?.[key];
  }
  const [form, setForm] = useState({ ...DEFAULTS, ...currentPerson });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ ...DEFAULTS, ...currentPerson });
  }, [currentPerson?.id]);

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }));
    if (key === 'background_color') {
      document.documentElement.style.setProperty('--bg', value);
    }
  }

  function applyComplexity(level) {
    const preset = COMPLEXITY_PRESETS[level];
    setForm(f => ({ ...f, complexity: level, ...preset }));
  }

  async function save() {
    setSaving(true);
    const { error } = await savePerson(form);
    setSaving(false);
    if (error) toast('Erreur lors de la sauvegarde');
    else { toast('Paramètres sauvegardés ✓'); onClose(); }
  }

  const complexityLabel = COMPLEXITY_PRESETS[form.complexity]?.label || 'Personnalisé';
  const speedLabel = `${(form.display_speed_ms || 3000) / 1000}s`;
  const sizeLabel = PICTO_SIZES.find(s => s.value === form.picto_size)?.label || 'Moyen';

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Paramètres</h2>
      </div>

      <div className="settings-sections">

        <Section title="Niveau de complexité" summary={complexityLabel} locked={!canEdit('can_edit_complexity')}>
          <div className="complexity-presets">
            {Object.entries(COMPLEXITY_PRESETS).map(([key, preset]) => (
              <button key={key}
                className={`complexity-btn ${form.complexity === key ? 'active' : ''}`}
                onClick={() => applyComplexity(key)}>
                <div className="complexity-label">{preset.label}</div>
                <div className="complexity-desc">{preset.description}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Taille des pictogrammes" summary={sizeLabel} locked={!canEdit('can_edit_display')}>
          <div className="size-presets">
            {PICTO_SIZES.map(s => (
              <button key={s.value}
                className={`size-btn ${form.picto_size === s.value ? 'active' : ''}`}
                onClick={() => set('picto_size', s.value)}>
                <div className="size-preview">
                  <div style={{ width: s.size / 2, height: s.size / 2, background: 'var(--accent-light)', borderRadius: 6, border: '1.5px solid var(--accent)' }} />
                </div>
                <div className="size-label">{s.label}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Affichage" summary={`Durée ${speedLabel} · Max ${form.max_pictograms} pictos`} locked={!canEdit('can_edit_display')}>
          <div className="slider-row">
            <label>Durée d'affichage <span>{speedLabel}</span></label>
            <input type="range" min="2000" max="10000" step="500"
              value={form.display_speed_ms || 3000}
              onChange={(e) => set('display_speed_ms', parseInt(e.target.value))} />
          </div>
          <div className="slider-row">
            <label>Nombre max de pictos <span>{form.max_pictograms || 15}</span></label>
            <input type="range" min="5" max="30" step="5"
              value={form.max_pictograms || 15}
              onChange={(e) => set('max_pictograms', parseInt(e.target.value))} />
          </div>
        </Section>

        <Section title="Accessibilité" summary={form.colorblind_mode ? 'Mode daltonien activé' : ''} locked={!canEdit('can_edit_accessibility')}>
          <div className="color-row">
            <label>Couleur de fond</label>
            <input type="color" value={form.background_color || '#F0EDE8'}
              onChange={(e) => set('background_color', e.target.value)} />
          </div>
          <div className="toggle-row">
            <span>Mode daltonien</span>
            <Toggle value={!!form.colorblind_mode} onChange={(v) => set('colorblind_mode', v)} />
          </div>
        </Section>

        <Section title="Voix" summary={VOICE_TYPES.find(v => v.value === form.voice_type)?.label || 'Femme'}>
          <div className="voice-presets">
            {VOICE_TYPES.map(v => (
              <button key={v.value}
                className={`voice-btn ${form.voice_type === v.value ? 'active' : ''}`}
                onClick={() => set('voice_type', v.value)}>
                <span className="voice-emoji">{v.emoji}</span>
                <span className="voice-label">{v.label}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Comportement" summary={form.auto_select ? 'Sélection auto activée' : ''}>
          <div className="toggle-row">
            <span>Sélection automatique du picto</span>
            <Toggle value={!!form.auto_select} onChange={(v) => set('auto_select', v)} />
          </div>
          <div className="toggle-row">
            <span>Utiliser l'IA</span>
            <Toggle value={!!form.use_ai} onChange={(v) => set('use_ai', v)} />
          </div>
        </Section>

        <Section title="Pictogrammes mémorisés" summary="Voir et gérer les choix enregistrés" locked={!canEdit('can_edit_pictos')}>
          <button className="btn btn-ghost" style={{ width: '100%', marginTop: 4 }} onClick={onManageChoices}>
            Gérer les pictogrammes mémorisés →
          </button>
        </Section>

      </div>

        {isOwner && (
          <Section title={`Accès partagés — ${currentPerson?.display_name}`} summary="Gérer qui a accès à ce profil">
            <AccessManager />
          </Section>
        )}

      <div className="settings-footer">
        <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  );
}