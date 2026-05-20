import { useEffect, useState } from 'react';

let _setToast = null;

export function toast(msg) {
  if (_setToast) _setToast(msg);
}

export default function Toast() {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    _setToast = (msg) => {
      setMessage(msg);
      setVisible(true);
      setTimeout(() => setVisible(false), 2800);
    };
  }, []);

  return (
    <div className={`toast ${visible ? 'show' : ''}`}>
      {message}
    </div>
  );
}
