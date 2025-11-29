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
    increment += 1; // nächstes Level braucht mehr
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

  const [privacy, setPrivacy] = useState('private');
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarStatus, setAvatarStatus] = useState('');

  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState('');
  const [newPostLocationId, setNewPostLocationId] = useState('');
  const [newPostText, setNewPostText] = useState('');
  const [newPostImage, setNewPostImage] = useState(null);
  const [newPostSubmitting, setNewPostSubmitting] = useState(false);
  const [newPostStatus, setNewPostStatus] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [friendStatus, setFriendStatus] = useState({}); // { [userId]: 'requested' | 'friends' }

  useEffect(() => {
    const loadAll = async () => {
      try {
        // Profil laden
        const res = await api.get('/auth/me');
        setProfile(res.data);

        const userPrivacy = res.data.user?.privacy || 'private';
        setPrivacy(userPrivacy);

        const avatarUrl = res.data.user?.avatar_url || null;
        setAvatarPreview(avatarUrl);
      } catch (err) {
        console.error(err);
        setError('Fehler beim Laden des Profils.');
        return;
      }

      // Feed laden (getrennt, damit Profil auch ohne Feed funktioniert)
      try {
        const feedRes = await api.get('/profile/feed');
        setFeed(feedRes.data.posts || []);
      } catch (err) {
        console.error(err);
        setFeedError('Dein persönlicher Feed konnte nicht geladen werden.');
      } finally {
        setFeedLoading(false);
      }
    };

    loadAll();
  }, []);

  const handlePrivacyChange = async (e) => {
    const value = e.target.value;
    setPrivacy(value);
    setSavingPrivacy(true);

    try {
      await api.put('/profile/privacy', { privacy: value });
    } catch (err) {
      console.error(err);
      setError('Datenschutz-Einstellung konnte nicht gespeichert werden.');
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarStatus('');
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setAvatarStatus('');
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    try {
      const res = await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.avatar_url) {
        setAvatarPreview(res.data.avatar_url);
      }
      setAvatarStatus('Profilbild aktualisiert.');
      setAvatarFile(null);
    } catch (err) {
      console.error(err);
      setAvatarStatus(
        err.response?.data?.message ||
          'Fehler beim Hochladen des Profilbilds.'
      );
    }
  };

  const handleNewPostImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewPostImage(file);
  };

  const handleNewPostSubmit = async (e) => {
    e.preventDefault();
    setNewPostStatus('');
    setNewPostSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('text', newPostText || '');
      if (newPostLocationId) {
        formData.append('locationId', newPostLocationId);
      }
      if (newPostImage) {
        formData.append('image', newPostImage);
      }

      const res = await api.post('/profile/feed', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.post) {
        setFeed((prev) => [res.data.post, ...prev]);
      }
      setNewPostText('');
      setNewPostImage(null);
      setNewPostLocationId('');
      setNewPostStatus('Beitrag erstellt.');
    } catch (err) {
      console.error(err);
      setNewPostStatus(
        err.response?.data?.message || 'Beitrag konnte nicht erstellt werden.'
      );
    } finally {
      setNewPostSubmitting(false);
    }
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchError('');
    setSearchLoading(true);
    setSearchResults([]);

    try {
      const res = await api.get('/users/search', {
        params: { q: searchQuery.trim() }
      });
      setSearchResults(res.data.users || []);
    } catch (err) {
      console.error(err);
      setSearchError('Suche konnte nicht ausgeführt werden.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendFriendRequest = async (targetUserId) => {
    try {
      await api.post('/friends/request', { userId: targetUserId });
      setFriendStatus((prev) => ({
        ...prev,
        [targetUserId]: 'requested'
      }));
    } catch (err) {
      console.error(err);
      // Kein harter Fehler im UI nötig, könnte optional ein Statusfeld bekommen
    }
  };

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

  const visitedLocations = badges || [];

  return (
    <div className="page">
      {/* Hero: Avatar, Name, Level, Privacy */}
      <div className="card profile-hero">
        <div className="profile-hero-main">
          <div className="profile-avatar-wrapper">
            <div
              className="profile-avatar"
              style={
                avatarPreview
                  ? {
                      backgroundImage: `url(${avatarPreview})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }
                  : {}
              }
            >
              {!avatarPreview && <span className="profile-avatar-initial">{initial}</span>}
            </div>
            <div className="profile-avatar-actions">
              <label className="btn-small">
                Bild wählen
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarFileChange}
                />
              </label>
              {avatarFile && (
                <button
                  type="button"
                  className="btn-small"
                  onClick={handleAvatarUpload}
                >
                  Hochladen
                </button>
              )}
            </div>
            {avatarStatus && (
              <div className="profile-avatar-status">{avatarStatus}</div>
            )}
          </div>

          <div>
            <h2 className="profile-name">{user.username}</h2>
            <p className="profile-email">{user.email}</p>
            <p className="profile-meta">
              Level {level} – {title} · {points} Punkte
            </p>
          </div>
        </div>

        <div className="profile-privacy">
          <label className="privacy-label">
            Profil-Sichtbarkeit
            <select
              value={privacy}
              onChange={handlePrivacyChange}
              disabled={savingPrivacy}
            >
              <option value="public">Öffentlich</option>
              <option value="private">Privat</option>
            </select>
          </label>
          <p className="privacy-hint">
            Öffentlich: Andere sehen dein Profil mit Feed & Bild. Privat: Nur
            Name und Profilbild sind sichtbar.
          </p>
        </div>
      </div>

      {/* Fortschritt */}
      <div className="card profile-progress-card">
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
        <p
          style={{
            marginTop: '0.5rem',
            fontSize: '0.85rem',
            color: '#4b5563'
          }}
        >
          Dir fehlen noch <strong>{neededForNext}</strong> Check-in
          {neededForNext !== 1 ? 's' : ''} für Level {level + 1}. 🗺️
        </p>
      </div>

      {/* Feed: Beitrag erstellen */}
      <div className="card profile-feed-card">
        <h3 className="profile-section-title">Dein Reise-Feed</h3>
        <p className="profile-section-subtitle">
          Schreibe etwas zu deinen Check-ins und halte besondere Momente fest.
        </p>

        <form onSubmit={handleNewPostSubmit} className="feed-form">
          <label>
            Ort (optional, nur bereits besuchte)
            <select
              value={newPostLocationId}
              onChange={(e) => setNewPostLocationId(e.target.value)}
            >
              <option value="">Kein spezifischer Ort</option>
              {visitedLocations.map((b) => (
                <option key={b.id} value={b.location_id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Text
            <textarea
              rows={3}
              placeholder="Wie war dein Erlebnis?"
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
            />
          </label>

          <label className="feed-image-input">
            Bild (optional)
            <input
              type="file"
              accept="image/*"
              onChange={handleNewPostImageChange}
            />
          </label>

          {newPostStatus && <div className="status">{newPostStatus}</div>}

          <button
            type="submit"
            className="btn-primary"
            disabled={newPostSubmitting}
          >
            {newPostSubmitting ? 'Wird erstellt…' : 'Beitrag posten'}
          </button>
        </form>

        {/* Feed-Liste */}
        {feedLoading ? (
          <p>Feed wird geladen…</p>
        ) : feedError ? (
          <div className="error">{feedError}</div>
        ) : feed.length === 0 ? (
          <p>Noch keine Beiträge – starte deine erste Reise-Story!</p>
        ) : (
          <ul className="feed-list">
            {feed.map((post) => (
              <li key={post.id} className="feed-post">
                <div className="feed-post-header">
                  <div className="feed-post-location">
                    {post.location_name ? (
                      <span>📍 {post.location_name}</span>
                    ) : (
                      <span>📌 Allgemeiner Beitrag</span>
                    )}
                  </div>
                  <div className="feed-post-date">
                    {new Date(post.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="feed-post-body">
                  {post.text && <p>{post.text}</p>}
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Reise-Erinnerung"
                      className="feed-post-image"
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* User-Suche & Freundschaft */}
      <div className="card profile-search-card">
        <h3 className="profile-section-title">Andere Explorer finden</h3>
        <p className="profile-section-subtitle">
          Suche nach Namen und schicke Freundschaftsanfragen.
        </p>

        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="text"
            placeholder="Benutzername suchen…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            type="submit"
            className="btn-small"
            disabled={searchLoading}
          >
            {searchLoading ? 'Suche…' : 'Suchen'}
          </button>
        </form>

        {searchError && <div className="error">{searchError}</div>}

        <ul className="search-results">
          {searchResults.map((u) => {
            const status = friendStatus[u.id] || u.friend_status;
            const avatarInitial =
              u.username?.charAt(0)?.toUpperCase() ||
              u.email?.charAt(0)?.toUpperCase() ||
              'U';

            return (
              <li key={u.id} className="search-result-item">
                <div className="search-user">
                  <div
                    className="search-avatar"
                    style={
                      u.avatar_url
                        ? {
                            backgroundImage: `url(${u.avatar_url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }
                        : {}
                    }
                  >
                    {!u.avatar_url && (
                      <span className="search-avatar-initial">
                        {avatarInitial}
                      </span>
                    )}
                  </div>
                  <div className="search-user-text">
                    <span className="search-username">{u.username}</span>
                    {u.email && (
                      <span className="search-email">{u.email}</span>
                    )}
                  </div>
                </div>
                <div>
                  {status === 'friends' ? (
                    <span className="search-friends-label">✅ Freunde</span>
                  ) : status === 'requested' ? (
                    <span className="search-friends-label">
                      Anfrage ausstehend
                    </span>
                  ) : (
                    <button
                      className="btn-small"
                      type="button"
                      onClick={() => handleSendFriendRequest(u.id)}
                    >
                      Freundschaftsanfrage
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Badges (wie bisher, aber unter den neuen Features) */}
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
