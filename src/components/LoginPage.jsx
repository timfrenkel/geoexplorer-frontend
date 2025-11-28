// frontend/src/components/LoginPage.jsx
import React, { useState } from 'react';
import api from '../api';

const LoginPage = ({ onLogin }) => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

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
    }
  };

  return (
    <div className="auth-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          E-Mail oder Benutzername
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
        <button type="submit" className="btn-primary">
          Einloggen
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
