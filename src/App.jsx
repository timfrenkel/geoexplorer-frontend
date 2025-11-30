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
import TripsPage from './components/TripsPage';
import FriendsPage from './components/FriendsPage';
import FriendProfilePage from './components/FriendProfilePage';
import FeedPage from './components/FeedPage';

const App = () => {
  const [auth, setAuth] = useState({
    user: null,
    loading: true
  });

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setAuth({ user: null, loading: false });
      return;
    }

    api
      .get('/auth/me')
      .then((res) => {
        setAuth({
          user: res.data.user,
          loading: false
        });
      })
      .catch(() => {
        localStorage.removeItem('authToken');
        setAuth({ user: null, loading: false });
      });
  }, []);

  const handleLogin = (user) => {
    setAuth({ user, loading: false });
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setAuth({ user: null, loading: false });
    navigate('/login');
  };

  if (auth.loading) {
    return (
      <div className="app">
        <Navbar user={null} onLogout={handleLogout} />
        <div className="main-container">
          <div className="center">Lade...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar user={auth.user} onLogout={handleLogout} />
      <div className="main-container">
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
            path="/feed"
            element={
              <ProtectedRoute user={auth.user}>
                <FeedPage />
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
            path="/trips"
            element={
              <ProtectedRoute user={auth.user}>
                <TripsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/friends"
            element={
              <ProtectedRoute user={auth.user}>
                <FriendsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/friends/:id"
            element={
              <ProtectedRoute user={auth.user}>
                <FriendProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute user={auth.user} requireAdmin={true}>
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
