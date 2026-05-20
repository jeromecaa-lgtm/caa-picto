import { useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import SettingsPanel from '../components/SettingsPanel';
import ManageChoices from '../components/ManageChoices';
import RenamePersonModal from '../components/RenamePersonModal';
import Toast from '../components/Toast';
import { useProfile } from '../context/ProfileContext';
import { searchPictograms, pictogramUrl } from '../lib/arasaac';
import { speak, stopSpeaking } from '../lib/speech';

async function analyzeWithAI(text, categories) {
  try {
    const r = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, categories }),
    });
    const data = await r.json();
    return data.words || [];
  } catch (e) {
    return [];
  }
}
import '../styles/app.css';

const PICTO_SIZES = { small: 48, medium: 72, large: 100, xlarge: 140 };

// Ref globale hors composant — toujours à jour même dans les callbacks async
const _choicesRef = { current: {} };

function fallbackAnalysis(text) {
  const CORE = ['bonjour','merci','oui','non','pardon','bravo','stop','aide','au revoir','allô','salut','bonsoir'];
  const VERBS = ['veux','veut','voulez','voulons','veulent','mange','manges','mangez','mangeons','mangent','aime','aimes','aimez','aimons','aiment','peux','peut','pouvez','pouvons','peuvent','vais','vas','va','allons','allez','vont','suis','est','sont','sommes','êtes','fais','fait','faites','faisons','font','viens','vient','venez','venons','viennent','dors','dort','dormez','dormons','dorment','joue','joues','jouez','jouons','jouent','bois','boit','buvez','buvons','boivent','prends','prend','prenez','prenons','prennent','aller','manger','boire','dormir','jouer','vouloir','pouvoir','aimer','faire','venir','prendre'];
  const QUALIFIERS = ['grand','grande','petit','petite','beau','belle','bon','bonne','mauvais','mauvaise','chaud','chaude','froid','froide','heureux','heureuse','énervé','énervée','gentil','gentille','gros','grosse','vieux','vieille','jeune','nouveau','nouvelle','triste','content','contente','fatigué','fatiguée','malade','calme','fort','forte'];
  const SKIP = ['le','la','les','un','une','des','et','ou','mais','donc','or','ni','car','que','qui','quoi','dont','où','sa','son','ses','mon','ma','mes','ton','ta','tes','ce','cet','cette','ces','au','aux','du','de','en','dans','sur','sous','avec','sans','pour','par','je','tu','il','elle','nous','vous','ils','elles','me','te','se','on'];

  return text.toLowerCase().split(/\s+/)
    .map(w => w.replace(/[.,!?;:'"()]/g, ''))
    .filter(w => w.length > 1 && !SKIP.includes(w))
    .slice(0, 8)
    .map(w => {
      if (CORE.includes(w)) return { word: w, category: 'core' };
      if (VERBS.includes(w)) return { word: w, category: 'verb' };
      if (QUALIFIERS.includes(w)) return { word: w, category: 'qualifier' };
      return { word: w, category: 'core' };
    });
}

export default function AppPage() {
  const { currentPerson, choices, saveChoice } = useProfile();
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showManageChoices, setShowManageChoices] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [modal, setModal] = useState(null);
  const [speaking, setSpeaking] = useState(false);

  const recognitionRef = useRef(null);
  const modalResolveRef = useRef(null);
  const currentPersonRef = useRef(currentPerson);
  const currentRef = useRef(null);

  useEffect(() => { currentPersonRef.current = currentPerson; }, [currentPerson]);

  const pictoSize = PICTO_SIZES[currentPerson?.picto_size] || 72;
  const historySize = Math.round(pictoSize * 0.55);

  function toggleListening() {
    if (isListening) stopListening();
    else startListening();
  }

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Utilisez Chrome ou Edge.'); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'fr-FR';
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e) => {
      const text = e.results[e.results.length - 1][0].transcript;
      processTranscript(text);
    };
    rec.onerror = (e) => { if (e.error === 'not-allowed') alert('Autorisez le microphone.'); };
    rec.onend = () => { if (recognitionRef.current) rec.start(); };
    rec.start();
    recognitionRef.current = rec;
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }

  async function processTranscript(text) {
    const person = currentPersonRef.current;
    const cats = [];
    if (person?.show_core !== false) cats.push('core');
    if (person?.show_verbs) cats.push('verb');
    if (person?.show_qualifiers) cats.push('qualifier');

    let orderedWords = [];
    if (person?.use_ai) {
      const aiWords = await analyzeWithAI(text, cats);
      orderedWords = aiWords.filter(item => cats.includes(item.category));
    }
    if (!orderedWords.length) {
      const words = fallbackAnalysis(text);
      orderedWords = words.filter(item => cats.includes(item.category));
    }

    if (currentRef.current) {
      setHistory(h => [currentRef.current, ...h].slice(0, 3));
    }

    const newEntry = { id: Date.now(), text, pictos: [] };
    currentRef.current = newEntry;
    setCurrent({ ...newEntry });

    const pictos = await Promise.all(orderedWords.map(item => resolvePicto(item.word)));
    const filled = { ...newEntry, pictos: pictos.filter(Boolean) };
    currentRef.current = filled;
    setCurrent(filled);
  }

  async function resolvePicto(word) {
    const key = word.toLowerCase();
    const currentChoices = _choicesRef.current;
    const person = currentPersonRef.current;
    let url;
    if (currentChoices[key]) {
      url = pictogramUrl(currentChoices[key]);
    } else {
      const options = await searchPictograms(word);
      if (!options.length) return null;
      if (options.length > 1 && !person?.auto_select) {
        const idx = await showModal(word, options);
        if (idx === -1) return null;
        // Mettre à jour le ref immédiatement sans attendre le re-render
        _choicesRef.current = { ..._choicesRef.current, [key]: options[idx].id };
        await saveChoice(word, options[idx].id);
        url = options[idx].url;
      } else {
        _choicesRef.current = { ..._choicesRef.current, [key]: options[0].id };
        await saveChoice(word, options[0].id);
        url = options[0].url;
      }
    }
    return { word, url, id: Date.now() + Math.random() };
  }

  function showModal(word, options) {
    return new Promise((resolve) => {
      modalResolveRef.current = resolve;
      setModal({ word, options });
    });
  }
  function handleModalSelect(idx) {
    setModal(null);
    if (modalResolveRef.current) { modalResolveRef.current(idx); modalResolveRef.current = null; }
  }
  function handleModalClose() {
    setModal(null);
    if (modalResolveRef.current) { modalResolveRef.current(-1); modalResolveRef.current = null; }
  }

  function clearAll() {
    setCurrent(null);
    setHistory([]);
    currentRef.current = null;
    stopSpeaking();
  }

  function handleSpeak(text) {
    if (speaking) { stopSpeaking(); setSpeaking(false); return; }
    setSpeaking(true);
    speak(text, currentPersonRef.current?.voice_type || 'female');
    // Estimer la durée
    const duration = Math.max(1500, text.length * 80);
    setTimeout(() => setSpeaking(false), duration);
  }

  useEffect(() => { return () => { stopListening(); stopSpeaking(); }; }, []);

  return (
    <div className="app">
      <Header
        onSettingsToggle={() => setShowSettings(v => !v)}
        onRename={() => setShowRename(true)}
      />

      <main className="main">
        {showSettings && (
          <SettingsPanel
            onClose={() => setShowSettings(false)}
            onManageChoices={() => { setShowSettings(false); setShowManageChoices(true); }}
          />
        )}

        {/* CONTROLS */}
        <div className="controls">
          <button className={`btn btn-listen ${isListening ? 'listening' : ''}`} onClick={toggleListening}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
            {isListening ? "Arrêter l'écoute" : "Démarrer l'écoute"}
          </button>
          <button className="btn btn-clear" onClick={clearAll}>Effacer</button>
        </div>

        {isListening && (
          <div className="status-bar">
            <div className="status-dot" />
            <span>En écoute...</span>
          </div>
        )}

        {/* PHRASE EN COURS */}
        <div className={`current-zone ${!current ? 'empty' : ''}`}>
          {!current ? (
            <div className="current-empty">
              {isListening ? (
                <>
                  <div className="listening-indicator">
                    <div className="listening-dot" />
                    <div className="listening-dot" />
                    <div className="listening-dot" />
                  </div>
                  <p>En écoute...</p>
                </>
              ) : (
                <>
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                  <p>Démarrez l'écoute pour voir apparaître les pictogrammes</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="current-text">
                {isListening && <span className="current-dot" />}
                <span className="current-text-content">"{current.text}"</span>
                <button
                  className={`btn-speak ${speaking ? 'speaking' : ''}`}
                  onClick={() => handleSpeak(current.text)}
                  title="Lire à voix haute"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  </svg>
                </button>
              </div>
              <div className="current-pictos">
                {current.pictos.map(p => (
                  <div key={p.id} className="picto-card" style={{ minWidth: pictoSize + 28, maxWidth: pictoSize + 28 }}>
                    <img src={p.url} alt={p.word} loading="lazy" style={{ width: pictoSize, height: pictoSize }} />
                    <div className="picto-word">{p.word}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* HISTORIQUE */}
        {history.length > 0 && (
          <div className="history-zone">
            <div className="history-label">Phrases précédentes</div>
            {history.map(entry => (
              <div key={entry.id} className="history-entry">
                <div className="history-entry-header">
                  <div className="history-text">"{entry.text}"</div>
                  <button
                    className="btn-speak-history"
                    onClick={() => speak(entry.text, currentPersonRef.current?.voice_type || 'female')}
                    title="Lire à voix haute"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    </svg>
                  </button>
                </div>
                <div className="history-pictos">
                  {entry.pictos.map(p => (
                    <div key={p.id} className="history-picto" style={{ minWidth: historySize + 16, maxWidth: historySize + 16 }}>
                      <img src={p.url} alt={p.word} loading="lazy" style={{ width: historySize, height: historySize }} />
                      <div className="history-picto-word">{p.word}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modal && (
        <Modal word={modal.word} options={modal.options} onSelect={handleModalSelect} onClose={handleModalClose} />
      )}
      {showManageChoices && <ManageChoices onClose={() => { window.location.reload(); }} />}
      {showRename && <RenamePersonModal onClose={() => setShowRename(false)} />}
      <Toast />
    </div>
  );
}