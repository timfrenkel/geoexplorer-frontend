// frontend/src/components/ProfilePage.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';

/**
 * Level-System:
 * Level 1: 0–3 Punkte
 * Level 2: 3–9 Punkte       (+6)
 * Level 3: 9–18 Punkte      (+9)
 * Level 4: 18–30 Punkte     (+12)
 * ...
 *
 * Jedes neue Level benötigt 3 Punkte mehr als das vorherige Level.
 */
const getLevelInfo = (points) => {
  let level = 1;

  let currentLevelStart = 0; // Startpunkt dieses Levels (inklusive)
  let increment = 1; // Punkte, die man für dieses Level braucht

  while (points >= currentLevelStart + increment) {
    currentLevelStart += increment;
    level += 1;
    increment += 1;
  }

  const currentLevelEnd = currentLevelStart + increment; // Exklusive Grenze
  const pointsIntoLevel = points - currentLevelStart;
  const neededForNext = Math.max(0, currentLevelEnd - points);
  const perLevel = increment;

  let title = 'Anfänger';
  if (level === 2 || level === 3) {
    title = 'Stadterkunder';
  } else if (level === 4 || level === 5) {
    title = 'Weltenbummler';
  } else if (level >= 6) {
    title = 'Legendärer Explorer';
  }

  return {
    level,
    title,
    perLevel,
    currentLevelStart,
    currentLevelEnd,
    pointsIntoLevel,
    neededForNext
  };
};

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        setProfile(res.data);
      })
      .catch((err) => {
        console.error(err);
        setError('Fehler beim Laden des Profils.');
      });
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!profile) return <div className="center">Lade Profil…</div>;

  const { user, points, badges } = profile;
  const {
    level,
    title,
    perLevel,
    pointsIntoLevel,
    neededForNext
  } = getLevelInfo(points);

  const levelProgressPercent =
    perLevel > 0
      ? Math.min(100, Math.round((pointsIntoLevel / perLevel) * 100))
      : 0;

  const initial =
    user?.username?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    'U';

  return (
    <div className="page">
      {/* Hero Card */}
      <div className="card profile-hero">
        <div className="profile-hero-main">
          <div className="profile-avatar">{initial}</div>
          <div>
            <h2 className="profile-name">{user.username}</h2>
            <p className="profile-email">{user.email}</p>
          </div>
        </div>
        <div className="profile-level-pill">
          <div>Level {level}</div>
          <div>{title}</div>
        </div>
      </div>

      {/* Progress Card */}
      <div className="card profile-progress-card">
        <p>
          <strong>Gesamtpunkte:</strong> {points}
        </p>
        <p>
          <strong>Fortschritt zu Level {level + 1}:</strong>{' '}
          {pointsIntoLevel}/{perLevel} ({levelProgressPercent}%)
        </p>
        <div className="overlay-progress-bar" style={{ marginTop: '0.35rem' }}>
          <div
            className="overlay-progress-fill"
            style={{ width: `${levelProgressPercent}%` }}
          />
        </div>
        <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#4b5563' }}>
          Dir fehlen noch{' '}
          <strong>{neededForNext}</strong> Check-in
          {neededForNext !== 1 ? 's' : ''} für Level {level + 1}. 🗺️
        </p>
      </div>

      {/* Badges */}
      <h3>Deine Badges</h3>
      {badges.length === 0 ? (
        <p>Noch keine Badges gesammelt – geh auf Entdeckungstour!</p>
      ) : (
        <ul className="badge-list">
          {badges.map((b) => (
            <li key={b.id} className="badge-item">
              <strong>{b.name}</strong>
              {b.category && <span> ({b.category})</span>}
              <br />
              <small>
                Eingesammelt am: {new Date(b.created_at).toLocaleString()}
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ProfilePage;
