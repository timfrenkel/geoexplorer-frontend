// frontend/src/components/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = ({ user, onLogout }) => {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <span className="logo">
          <span className="logo-emoji" aria-hidden="true">🌍</span>
          Travel Badges
        </span>
      </div>
      <div className="navbar-right">
        {user ? (
          <>
            <Link to="/">Karte</Link>
            <Link to="/profile">Profil</Link>
            {user.isAdmin && <Link to="/admin">Admin</Link>}
            <button className="btn-link" onClick={onLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="nav-link-primary">
              Registrieren
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
