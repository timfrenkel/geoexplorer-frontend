// frontend/src/components/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = ({ user, onLogout }) => {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <span className="logo">Travel Badges</span>
      </div>
      <div className="navbar-right">
        {user ? (
          <>
            <Link to="/">Karte</Link>
            <Link to="/feed">Feed</Link>
            <Link to="/trips">Trips</Link>
            <Link to="/friends">Freunde</Link>
            <Link to="/profile">Profil</Link>
            {user.isAdmin && <Link to="/admin">Admin</Link>}
            <button type="button" onClick={onLogout}>
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
