// frontend/src/components/Navbar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = ({ user, onLogout }) => {
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === path ? 'nav-link active' : 'nav-link';

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <span className="logo">Travel Badges</span>
      </div>
      <div className="navbar-right">
        {user ? (
          <>
            <Link className={isActive('/')} to="/">
              Karte
            </Link>
            <Link className={isActive('/feed')} to="/feed">
              Feed
            </Link>
            <Link className={isActive('/friends')} to="/friends">
              Freunde
            </Link>
            <Link className={isActive('/profile')} to="/profile">
              Profil
            </Link>
            {user.isAdmin && (
              <Link className={isActive('/admin')} to="/admin">
                Admin
              </Link>
            )}
            <button className="btn-link" onClick={onLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link className={isActive('/login')} to="/login">
              Login
            </Link>
            <Link className={isActive('/register')} to="/register">
              Registrieren
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
