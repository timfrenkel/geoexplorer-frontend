// frontend/src/components/RegisterPage.jsx
import React, { useState } from 'react';
import api from '../api';

const RegisterPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/register', {
        email,
        username,
        password
      });

      const { token, user } = res.data || {};

      if (!token || !user) {
        setError('Unerwartete Antwort vom Server.');
        setLoading(false);
        return;
      }

      // Direkt einloggen: Token speichern
      localStorage.setItem('token', token);

      if (onLogin) {
        onLogin(user);
      }
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.message ||
        'Registrierung fehlgeschlagen. Bitte versuche es erneut.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <h2>Account erstellen</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          E-Mail
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Nutzername
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label>
          Passwort
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Erstelle Account…' : 'Account erstellen'}
        </button>
      </form>
    </div>
  );
};

export default RegisterPage;
