import { useEffect, useRef, useState } from 'react';
import PictoGrid from '../components/PictoGrid';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { searchPictograms, pictogramUrl } from '../lib/arasaac';
import '../styles/App.css';

const MAX_PICTOS = 15;
const DISPLAY_SPEED = 3000;

function fallbackAnalysis(text) {
  const stop = ['le','la','les','un','une','des','je','tu','il','elle','nous','vous','ils','elles','et','ou','mais','donc','or','ni','car','que','qui','quoi','dont','où','se','sa','son','ses','mon','ma','mes','ton','ta','tes'];
  return text.toLowerCase().split(/\s+/)
    .map(w => w.replace(/[.,!?;:'"()]/g, ''))
    .filter(w => w.length > 2 && !stop.includes(w))
    .slice(0, 5)
    .map(w => ({ word: w, category: 'noun' }));
}

export default function LandingPage({ onLoginClick }) {
  const [pictograms, setPictograms] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [modal, setModal] = useState(null);
  const recognitionRef = useRef(null);
  const timeoutsRef = useRef({});
  const modalResolveRef = useRef(null);

  function toggleListening() {
    if (isListening) stopListening();
    else startListening();
  }

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Utilisez Chrome ou Edge pour la reconnaissance vocale.');
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'fr-FR';
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e) => {
      const text = e.results[e.results.length - 1][0].transcript;
      processTranscript(text);
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') alert('Autorisez le microphone.');
    };
    rec.onend = () => {
      if (recognitionRef.current) rec.start();
    };
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
    setTranscript(text);
    setTimeout(() => setTranscript(''), 7000);
    const words = fallbackAnalysis(text);
    for (const item of words) {
      await addPicto(item.word);
    }
  }

  async function addPicto(word) {
    const options = await searchPictograms(word);
    if (!options.length) return;

    let url;
    if (options.length > 1) {
      const idx = await showModal(word, options);
      if (idx === -1) return;
      url = options[idx].url;
    } else {
      url = options[0].url;
    }

    const id = Date.now() + Math.random();
    setPictograms((prev) => [{ word, url, id }, ...prev].slice(0, MAX_PICTOS));

    timeoutsRef.current[id] = setTimeout(() => {
      setPictograms((prev) => prev.filter((p) => p.id !== id));
      delete timeoutsRef.current[id];
    }, DISPLAY_SPEED);
  }

  function showModal(word, options) {
    return new Promise((resolve) => {
      modalResolveRef.current = resolve;
      setModal({ word, options });
    });
  }

  function handleModalSelect(idx) {
    setModal(null);
    if (modalResolveRef.current) {
      modalResolveRef.current(idx);
      modalResolveRef.current = null;
    }
  }

  function handleModalClose() {
    setModal(null);
    if (modalResolveRef.current) {
      modalResolveRef.current(-1);
      modalResolveRef.current = null;
    }
  }

  function clearAll() {
    Object.values(timeoutsRef.current).forEach(clearTimeout);
    timeoutsRef.current = {};
    setPictograms([]);
  }

  useEffect(() => {
    return () => {
      stopListening();
      Object.values(timeoutsRef.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-logo">Picto ✦</div>
        <div className="topbar-actions">
          <button className="btn btn-primary btn-sm" onClick={onLoginClick}>
            Se connecter
          </button>
        </div>
      </header>

      <div className="demo-banner">
        <span>Mode démo — vos choix ne sont pas sauvegardés.</span>
        <button className="demo-banner-cta" onClick={onLoginClick}>
          Créer un compte gratuit →
        </button>
      </div>

      <main className="main">
        <div className="controls">
          <button
            className={`btn btn-listen ${isListening ? 'listening' : ''}`}
            onClick={toggleListening}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
            {isListening ? "Arrêter l'écoute" : "Démarrer l'écoute"}
          </button>
          <button className="btn btn-clear" onClick={clearAll}>
            Effacer
          </button>
        </div>

        {isListening && (
          <div className="status-bar">
            <div className="status-dot" />
            <span>En écoute...</span>
          </div>
        )}

        {transcript && (
          <div className="transcript-bar">
            Détecté : <strong>{transcript}</strong>
          </div>
        )}

        <div className="picto-section">
          <PictoGrid pictograms={pictograms} />
        </div>
      </main>

      {modal && (
        <Modal
          word={modal.word}
          options={modal.options}
          onSelect={handleModalSelect}
          onClose={handleModalClose}
        />
      )}

      <Toast />
    </div>
  );
}
