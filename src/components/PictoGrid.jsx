import PictoCard from './PictoCard';

export default function PictoGrid({ pictograms, pictoSize = 72 }) {
  if (!pictograms.length) {
    return (
      <div className="picto-empty">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
        <p>Démarrez l'écoute pour voir apparaître les pictogrammes</p>
      </div>
    );
  }

  return (
    <div className="picto-grid">
      {pictograms.map((p) => (
        <PictoCard key={p.id} word={p.word} url={p.url} size={pictoSize} />
      ))}
    </div>
  );
}