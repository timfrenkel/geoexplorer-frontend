// frontend/src/App.jsx
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';

import api from './api';
import Navbar from './components/Navbar';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import MapPage from './components/MapPage';
import ProfilePage from './components/ProfilePage';
import AdminDashboard from './components/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
  const [auth, setAuth] = useState({
    user: null,
    loading: true,
    error: ''
  });
  const navigate = useNavigate();

  // Initial: Token prüfen + /auth/me laden
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setAuth({ user: null, loading: false, error: '' });
      return;
    }

    api
      .get('/auth/me')
      .then((res) => {
        setAuth({
          user: res.data.user,
          loading: false,
          error: ''
        });
      })
      .catch((err) => {
        console.error(err);
        // Wenn Token ungültig -> aufräumen
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
        }
        setAuth({ user: null, loading: false, error: '' });
      });
  }, []);

  const handleLogin = (user) => {
    setAuth({ user, loading: false, error: '' });
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setAuth({ user: null, loading: false, error: '' });
    navigate('/login');
  };

  if (auth.loading) {
    return (
      <div className="app-root">
        <div className="app-inner">
          <Navbar user={auth.user} onLogout={handleLogout} />
          <div className="page">
            <div className="center">Lade…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <div className="app-inner">
        <Navbar user={auth.user} onLogout={handleLogout} />
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute user={auth.user}>
                <MapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute user={auth.user}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute user={auth.user} requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={
              auth.user ? (
                <Navigate to="/" replace />
              ) : (
                <LoginPage onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/register"
            element={
              auth.user ? (
                <Navigate to="/" replace />
              ) : (
                <RegisterPage onLogin={handleLogin} />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
