// frontend/src/components/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = ({ user, onLogout }) => {
  const initial =
    user?.username?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    'U';

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <span className="logo">Travel Badges</span>

        {user && (
          <div className="navbar-greeting">
            <div className="navbar-avatar">{initial}</div>
            <div className="navbar-greeting-text">
              <span className="navbar-hello">Hey, {user.username}</span>
              <span className="navbar-tagline">
                Sammle heute noch ein neues Badge ✨
              </span>
            </div>
          </div>
        )}
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
            <Link to="/register">Registrieren</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
