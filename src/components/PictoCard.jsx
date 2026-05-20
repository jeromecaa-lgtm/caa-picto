export default function PictoCard({ word, url, size = 72 }) {
  return (
    <div className="picto-card" style={{ minWidth: size + 28, maxWidth: size + 28 }}>
      <img src={url} alt={word} loading="lazy" style={{ width: size, height: size }} />
      <div className="picto-word">{word}</div>
    </div>
  );
}