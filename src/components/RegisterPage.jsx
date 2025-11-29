// frontend/src/components/RegisterPage.jsx
import React, { useState } from 'react';
import api from '../api';

const RegisterPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/auth/register', {
        email,
        username,
        password
      });
      onLogin(res.data.token, res.data.user);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Registrierung fehlgeschlagen.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container fade-in">
      <h2>Account erstellen ✨</h2>
      <p className="auth-subtitle">
        Lege deinen Travel Badges Account an, sammle Sehenswürdigkeiten
        und verfolge deinen Fortschritt auf der Karte.
      </p>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form slide-up">
        <label>
          E-Mail
          <input
            type="email"
            placeholder="deinname@mail.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Benutzername
          <input
            type="text"
            placeholder="z.B. cityexplorer"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <small style={{ color: '#6b7280', fontSize: '0.8rem' }}>
            Dein Benutzername wird anderen angezeigt, wenn du Badges sammelst.
          </small>
        </label>

        <label>
          Passwort
          <input
            type="password"
            minLength={6}
            placeholder="Mindestens 6 Zeichen"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <small style={{ color: '#6b7280', fontSize: '0.8rem' }}>
            Verwende ein sicheres Passwort, das du nur hier benutzt.
          </small>
        </label>

        <button
          type="submit"
          className="btn-primary"
          disabled={submitting}
        >
          {submitting ? 'Wird erstellt…' : 'Account erstellen'}
        </button>
      </form>
    </div>
  );
};

export default RegisterPage;
