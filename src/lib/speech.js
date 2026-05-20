// Synthèse vocale française avec choix de voix

const VOICE_TYPES = {
  female: { name: 'Femme', filter: (v) => v.lang.startsWith('fr') && v.name.toLowerCase().includes('female') || (v.lang.startsWith('fr') && !v.name.toLowerCase().includes('male')) },
  male: { name: 'Homme', filter: (v) => v.lang.startsWith('fr') && v.name.toLowerCase().includes('male') },
  girl: { name: 'Fille', filter: (v) => v.lang.startsWith('fr') }, // voix française par défaut
  boy: { name: 'Garçon', filter: (v) => v.lang.startsWith('fr') },
};

function getFrenchVoices() {
  return window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('fr'));
}

export function speak(text, voiceType = 'female') {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR';
  utterance.rate = 0.9;
  utterance.pitch = voiceType === 'girl' || voiceType === 'female' ? 1.2 : 0.8;

  const voices = getFrenchVoices();
  if (voices.length > 0) {
    // Essayer de trouver une voix correspondante
    let voice = null;
    if (voiceType === 'female' || voiceType === 'girl') {
      voice = voices.find(v => v.name.toLowerCase().includes('amelie') || v.name.toLowerCase().includes('marie') || v.name.toLowerCase().includes('stephanie') || v.name.toLowerCase().includes('aurelie')) || voices[0];
    } else {
      voice = voices.find(v => v.name.toLowerCase().includes('thomas') || v.name.toLowerCase().includes('pierre') || v.name.toLowerCase().includes('nicolas')) || voices[voices.length - 1];
    }
    if (voice) utterance.voice = voice;
  }

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

export function isSpeaking() {
  return window.speechSynthesis?.speaking || false;
}