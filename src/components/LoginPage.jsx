// frontend/src/components/LoginPage.jsx
import React, { useState } from 'react';
import api from '../api';

const LoginPage = ({ onLogin }) => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        emailOrUsername,
        password
      });

      const { token, user } = res.data || {};

      if (!token || !user) {
        setError('Unerwartete Antwort vom Server.');
        setLoading(false);
        return;
      }

      // 🔐 Einheitlich: Token unter "token" speichern
      localStorage.setItem('token', token);

      if (onLogin) {
        onLogin(user);
      }
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.message ||
        'Login fehlgeschlagen. Bitte prüfe deine Eingaben.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page auth-page">
      <h2>Login</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          E-Mail oder Nutzername
          <input
            type="text"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
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
          {loading ? 'Logge ein…' : 'Einloggen'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
