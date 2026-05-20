import { useState } from 'react';
import { supabase } from '../lib/supabase';
import '../styles/auth.css';

export default function AuthPage({ onBack }) {
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  function showMsg(text, type = 'error') {
    setMessage({ text, type });
  }

  async function login() {
    if (!loginEmail || !loginPassword) return showMsg('Remplis tous les champs.');
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoading(false);
    if (error) {
      const msg =
        error.message === 'Email not confirmed'
          ? 'Email non confirmé — vérifie ta boîte mail.'
          : error.message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect.'
          : error.message;
      showMsg(msg);
    }
  }

  async function signup() {
    if (!signupName || !signupEmail || !signupPassword)
      return showMsg('Remplis tous les champs.');
    if (signupPassword.length < 8)
      return showMsg('Mot de passe trop court (8 caractères min).');
    setLoading(true);
    setMessage(null);
    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
    });
    if (error) {
      setLoading(false);
      return showMsg(error.message);
    }
    if (data?.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: signupEmail,
        name: signupName,
      });
    }
    setLoading(false);
    setConfirmedEmail(signupEmail);
    setConfirmed(true);
  }

  async function forgotPassword() {
    if (!loginEmail) return showMsg('Entre ton email ci-dessus.');
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail);
    if (error) showMsg(error.message);
    else showMsg('Email de réinitialisation envoyé !', 'success');
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        {onBack && (
          <button className="btn-back" onClick={onBack}>← Retour</button>
        )}
        <div className="auth-logo">Picto ✦</div>
        <p className="auth-sub">Aide à la communication par pictogrammes</p>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setMessage(null); }}
          >
            Connexion
          </button>
          <button
            className={`auth-tab ${tab === 'signup' ? 'active' : ''}`}
            onClick={() => { setTab('signup'); setMessage(null); setConfirmed(false); }}
          >
            Créer un compte
          </button>
        </div>

        {message && (
          <div className={`auth-message ${message.type}`}>{message.text}</div>
        )}

        {tab === 'login' && (
          <div className="auth-form">
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="vous@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && login()}
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label>Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && login()}
                autoComplete="current-password"
              />
            </div>
            <button className="btn btn-primary" onClick={login} disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
            <button className="btn-forgot" onClick={forgotPassword}>
              Mot de passe oublié ?
            </button>
          </div>
        )}

        {tab === 'signup' && !confirmed && (
          <div className="auth-form">
            <div className="field">
              <label>Prénom</label>
              <input
                type="text"
                placeholder="Ex : Léa"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && signup()}
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="vous@email.com"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && signup()}
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label>Mot de passe</label>
              <input
                type="password"
                placeholder="8 caractères minimum"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && signup()}
                autoComplete="new-password"
              />
            </div>
            <button className="btn btn-primary" onClick={signup} disabled={loading}>
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </div>
        )}

        {tab === 'signup' && confirmed && (
          <div className="auth-confirmed">
            <div className="confirmed-icon">📬</div>
            <h3>Vérifie ta boîte mail</h3>
            <p>
              Un email a été envoyé à <strong>{confirmedEmail}</strong>.<br />
              Clique sur le lien pour activer ton compte.
            </p>
            <button className="btn btn-ghost" onClick={() => setTab('login')}>
              Aller à la connexion
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
