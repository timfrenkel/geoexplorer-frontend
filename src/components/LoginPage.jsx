// frontend/src/components/LoginPage.jsx
import React, { useState } from 'react';
import api from '../api';

const LoginPage = ({ onLogin }) => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/auth/login', {
        emailOrUsername,
        password
      });
      onLogin(res.data.token, res.data.user);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Login fehlgeschlagen.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container fade-in">
      <h2>Willkommen zurück 👋</h2>
      <p className="auth-subtitle">
        Logge dich ein, um deine Badges zu sehen und neue Sehenswürdigkeiten
        in deiner Stadt zu entdecken.
      </p>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form slide-up">
        <label>
          E-Mail oder Benutzername
          <input
            type="text"
            placeholder="z.B. max@mail.de oder max123"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            required
          />
          <small style={{ color: '#6b7280', fontSize: '0.8rem' }}>
            Du kannst dich entweder mit deiner E-Mail-Adresse oder deinem
            Benutzernamen einloggen.
          </small>
        </label>

        <label>
          Passwort
          <input
            type="password"
            placeholder="Dein Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button
          type="submit"
          className="btn-primary"
          disabled={submitting}
        >
          {submitting ? 'Wird eingeloggt…' : 'Einloggen'}
        </button>

        <p
          style={{
            marginTop: '0.75rem',
            fontSize: '0.8rem',
            color: '#6b7280'
          }}
        >
          Nach dem Login wirst du direkt zur Karte weitergeleitet.
        </p>
      </form>
    </div>
  );
};

export default LoginPage;
