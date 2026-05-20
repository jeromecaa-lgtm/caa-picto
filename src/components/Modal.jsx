export default function Modal({ word, options, onSelect, onClose }) {
  if (!word) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div>
            <div className="modal-title">
              Choisir pour : <span className="modal-word">{word}</span>
            </div>
            <div className="modal-sub">Ce choix sera mémorisé</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-grid">
          {options.map((opt, i) => (
            <button key={i} className="modal-picto" onClick={() => onSelect(i)}>
              <img src={opt.url} alt={opt.keywords} loading="lazy" />
              <p>{opt.keywords}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
