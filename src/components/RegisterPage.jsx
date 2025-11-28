// frontend/src/components/RegisterPage.jsx
import React, { useState } from 'react';
import api from '../api';

const RegisterPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

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
    }
  };

  return (
    <div className="auth-container">
      <h2>Registrieren</h2>
      <form onSubmit={handleSubmit} className="auth-form">
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
          Benutzername
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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit" className="btn-primary">
          Account erstellen
        </button>
      </form>
    </div>
  );
};

export default RegisterPage;
