// frontend/src/components/ProfilePage.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';

// Level-System:
// Level 1: 0–3 Punkte
// Level 2: 3–9 Punkte (+6)
// Level 3: 9–18 Punkte (+9)
// Level 4: 18–30 Punkte (+12)
// Jedes Level braucht 3 Punkte mehr als das vorherige.
const getLevelInfo = (points) => {
  let level = 1;
  let currentLevelStart = 0;
  let increment = 3; // Level 1 -> 3 Punkte, dann +3 je Level

  while (points >= currentLevelStart + increment) {
    currentLevelStart += increment;
    level += 1;
    increment += 3;
  }

  const perLevel = increment;
  const pointsIntoLevel = points - currentLevelStart;
  const neededForNext = Math.max(0, currentLevelStart + perLevel - points);

  let title = 'Neuer Entdecker';
  if (level >= 3 && level < 6) title = 'Reiselustig';
  if (level >= 6 && level < 10) title = 'Globetrotter';
  if (level >= 10) title = 'Legendärer Explorer';

  return {
    level,
    title,
    perLevel,
    pointsIntoLevel,
    neededForNext
  };
};

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Form-State für Profilbearbeitung
  const [form, setForm] = useState({
    profileImageUrl: '',
    bannerImageUrl: '',
    bio: '',
    moodEmoji: '',
    homeCity: '',
    homeCountry: '',
    customStatus: '',
    isProfilePublic: true,
    isFeedPublic: true
  });

  // Gamification
  const [missions, setMissions] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [gamLoading, setGamLoading] = useState(false);
  const [gamError, setGamError] = useState('');
  const [gamLoaded, setGamLoaded] = useState(false);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        setProfile(res.data);
        const u = res.data.user;
        setForm({
          profileImageUrl: u.profileImageUrl || '',
          bannerImageUrl: u.bannerImageUrl || '',
          bio: u.bio || '',
          moodEmoji: u.moodEmoji || '',
          homeCity: u.homeCity || '',
          homeCountry: u.homeCountry || '',
          customStatus: u.customStatus || '',
          isProfilePublic:
            typeof u.isProfilePublic === 'boolean' ? u.isProfilePublic : true,
          isFeedPublic:
            typeof u.isFeedPublic === 'boolean' ? u.isFeedPublic : true
        });
      })
      .catch((err) => {
        console.error(err);
        setError('Fehler beim Laden des Profils.');
      });
  }, []);

  // Gamification lazy nachladen
  useEffect(() => {
    if (activeTab !== 'gamification' || gamLoaded) return;

    setGamLoading(true);
    setGamError('');
    api
      .get('/gamification/overview')
      .then((res) => {
        setMissions(res.data.missions || []);
        setAchievements(res.data.achievements || []);
        setGamLoaded(true);
      })
      .catch((err) => {
        console.error(err);
        setGamError(
          'Gamification-Daten konnten nicht geladen werden (Feature evtl. noch nicht aktiv).'
        );
      })
      .finally(() => setGamLoading(false));
  }, [activeTab, gamLoaded]);

  if (error) return <div className="error">{error}</div>;
  if (!profile) return <div>Lade Profil...</div>;

  const { user, points, badges } = profile;
  const {
    level,
    title,
    perLevel,
    pointsIntoLevel,
    neededForNext
  } = getLevelInfo(points || 0);

  const levelProgressPercent =
    perLevel > 0
      ? Math.min(100, Math.round((pointsIntoLevel / perLevel) * 100))
      : 0;

  const handleFormChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage('');
    setError('');

    try {
      const payload = {
        profileImageUrl: form.profileImageUrl.trim(),
        bannerImageUrl: form.bannerImageUrl.trim(),
        bio: form.bio,
        moodEmoji: form.moodEmoji,
        homeCity: form.homeCity,
        homeCountry: form.homeCountry,
        customStatus: form.customStatus,
        isProfilePublic: form.isProfilePublic,
        isFeedPublic: form.isFeedPublic
      };

      const res = await api.put('/auth/me', payload);
      setProfile((prev) => ({
        ...prev,
        user: res.data.user
      }));
      setSaveMessage('Profil aktualisiert.');
    } catch (err) {
      console.error(err);
      setError('Fehler beim Aktualisieren des Profils.');
    } finally {
      setSaving(false);
    }
  };

  const streak = user.checkinStreakDays || 0;
  const lastCheckinDate = user.lastCheckinDate
    ? new Date(user.lastCheckinDate)
    : null;

  return (
    <div className="page">
      <h2>Profil</h2>

      {/* Header mit Banner & Avatar */}
      <div
        className="card"
        style={{ padding: 0, overflow: 'hidden', marginBottom: '1rem' }}
      >
        <div
          style={{
            height: '110px',
            background:
              form.bannerImageUrl || user.bannerImageUrl
                ? `url(${form.bannerImageUrl || user.bannerImageUrl}) center/cover no-repeat`
                : 'linear-gradient(135deg, #0f172a, #1d4ed8)',
            position: 'relative'
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            padding: '0 1rem 0.75rem',
            gap: '0.75rem',
            marginTop: '-32px'
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '999px',
              border: '3px solid #e5e7eb',
              backgroundColor: '#0f172a',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: form.moodEmoji || user.moodEmoji ? '1.7rem' : '1.2rem',
              color: 'white'
            }}
          >
            {form.profileImageUrl || user.profileImageUrl ? (
              <img
                src={form.profileImageUrl || user.profileImageUrl}
                alt={user.username}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              (form.moodEmoji || user.moodEmoji || user.username[0] || 'U')
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                flexWrap: 'wrap'
              }}
            >
              <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                {user.username}
              </span>
              {user.moodEmoji && (
                <span style={{ fontSize: '1.3rem' }}>{user.moodEmoji}</span>
              )}
              <span
                style={{
                  fontSize: '0.8rem',
                  padding: '0.1rem 0.5rem',
                  borderRadius: '999px',
                  background: '#eef2ff',
                  color: '#4338ca'
                }}
              >
                Level {level} · {title}
              </span>
              {streak > 0 && (
                <span
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.1rem 0.5rem',
                    borderRadius: '999px',
                    background: '#f97316',
                    color: 'white',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <span role="img" aria-label="Streak">
                    🔥
                  </span>
                  {streak} Tage
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: 4 }}>
              {user.customStatus && (
                <div style={{ marginBottom: 2 }}>{user.customStatus}</div>
              )}
              {(user.homeCity || user.homeCountry) && (
                <div>
                  🏡 {user.homeCity}
                  {user.homeCity && user.homeCountry ? ', ' : ''}
                  {user.homeCountry}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          type="button"
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Übersicht
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'edit' ? 'active' : ''}`}
          onClick={() => setActiveTab('edit')}
        >
          Profil bearbeiten
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'gamification' ? 'active' : ''}`}
          onClick={() => setActiveTab('gamification')}
        >
          Missions & Erfolge
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Level & Statistik */}
          <div className="card">
            <p>
              <strong>E-Mail:</strong> {user.email}
            </p>
            <p>
              <strong>Punkte:</strong> {points}
            </p>
            <p>
              <strong>Level:</strong> {level} – {title}
            </p>
            <p>
              <strong>Fortschritt zu Level {level + 1}:</strong>{' '}
              {pointsIntoLevel} / {perLevel} Punkte
            </p>
            <div className="progress">
              <div
                className="progress-bar"
                style={{ width: `${levelProgressPercent}%` }}
              />
            </div>
            {streak > 0 && (
              <p style={{ marginTop: '0.5rem' }}>
                <strong>Streak:</strong> 🔥 {streak} Tage
                {lastCheckinDate && (
                  <>
                    {' '}
                    (letzter Check-in:{' '}
                    {lastCheckinDate.toLocaleDateString()})
                  </>
                )}
              </p>
            )}
            <p style={{ marginTop: '0.5rem' }}>
              <strong>Profil-Sichtbarkeit:</strong>{' '}
              {user.isProfilePublic ? 'Öffentlich' : 'Nur für Freunde'}
              {' · '}
              <strong>Feed:</strong>{' '}
              {user.isFeedPublic ? 'Öffentlich für Freunde' : 'Nur du'}
            </p>
          </div>

          {/* Bio */}
          <div className="card">
            <h3>Über dich</h3>
            <p style={{ whiteSpace: 'pre-wrap', marginTop: '0.25rem' }}>
              {user.bio && user.bio.trim().length > 0
                ? user.bio
                : 'Du hast noch keine Bio hinzugefügt.'}
            </p>
          </div>

          {/* Badges */}
          <div className="card">
            <h3>Gesammelte Badges</h3>
            {(!badges || badges.length === 0) && (
              <p>Noch keine Badges gesammelt – ab auf die Karte! 🗺️</p>
            )}
            {badges && badges.length > 0 && (
              <ul className="badge-list">
                {badges.map((b) => (
                  <li key={b.id} className="badge-item">
                    <div className="badge-icon">🏅</div>
                    <div className="badge-content">
                      <strong>{b.name}</strong>
                      {b.category && <span> ({b.category})</span>}
                      <br />
                      <small>
                        Eingesammelt am:{' '}
                        {new Date(b.created_at).toLocaleString()}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {activeTab === 'edit' && (
        <div className="card">
          <h3>Profil bearbeiten</h3>
          <form className="auth-form" onSubmit={handleSaveProfile}>
            <label>
              Profilbild-URL
              <input
                type="url"
                value={form.profileImageUrl}
                onChange={(e) =>
                  handleFormChange('profileImageUrl', e.target.value)
                }
                placeholder="https://…"
              />
            </label>
            <label>
              Banner-URL
              <input
                type="url"
                value={form.bannerImageUrl}
                onChange={(e) =>
                  handleFormChange('bannerImageUrl', e.target.value)
                }
                placeholder="https://…"
              />
            </label>
            <label>
              Emoji / Stimmung
              <input
                type="text"
                value={form.moodEmoji}
                onChange={(e) =>
                  handleFormChange('moodEmoji', e.target.value)
                }
                placeholder="z.B. 🌍 😎 ✈️"
              />
            </label>
            <label>
              Ort (Stadt)
              <input
                type="text"
                value={form.homeCity}
                onChange={(e) =>
                  handleFormChange('homeCity', e.target.value)
                }
                placeholder="z.B. Berlin"
              />
            </label>
            <label>
              Land
              <input
                type="text"
                value={form.homeCountry}
                onChange={(e) =>
                  handleFormChange('homeCountry', e.target.value)
                }
                placeholder="z.B. Deutschland"
              />
            </label>
            <label>
              Custom Status
              <input
                type="text"
                value={form.customStatus}
                onChange={(e) =>
                  handleFormChange('customStatus', e.target.value)
                }
                placeholder="z.B. Auf der Jagd nach neuen Badges!"
              />
            </label>
            <label>
              Bio
              <textarea
                rows={4}
                value={form.bio}
                onChange={(e) => handleFormChange('bio', e.target.value)}
                placeholder="Erzähl etwas über deine Lieblingsreisen, Ziele und Träume."
              />
            </label>

            <div style={{ marginTop: '0.5rem', fontSize: '0.88rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.isProfilePublic}
                  onChange={(e) =>
                    handleFormChange('isProfilePublic', e.target.checked)
                  }
                />
                Profil ist öffentlich sichtbar (Name, Avatar, Stats)
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 4
                }}
              >
                <input
                  type="checkbox"
                  checked={form.isFeedPublic}
                  onChange={(e) =>
                    handleFormChange('isFeedPublic', e.target.checked)
                  }
                />
                Check-ins im Feed für Freunde sichtbar
              </label>
            </div>

            {error && (
              <div className="error" style={{ marginTop: '0.5rem' }}>
                {error}
              </div>
            )}
            {saveMessage && (
              <div className="status" style={{ marginTop: '0.5rem' }}>
                {saveMessage}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
              style={{ marginTop: '0.75rem' }}
            >
              {saving ? 'Speichere...' : 'Profil speichern'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'gamification' && (
        <div className="card">
          <h3>Missions & Erfolge</h3>

          {gamLoading && <p>Lade Gamification-Daten…</p>}
          {gamError && <div className="error">{gamError}</div>}

          {!gamLoading && !gamError && (
            <>
              <h4>Missions</h4>
              {missions.length === 0 && (
                <p>Aktuell sind noch keine Missions definiert.</p>
              )}
              {missions.length > 0 && (
                <ul className="badge-list">
                  {missions.map((m) => {
                    const goal = m.goal_value ?? m.target_value ?? 0;
                    const current =
                      m.current_value ?? m.progress_value ?? 0;
                    const done =
                      m.is_completed ??
                      (m.completed_at != null) ??
                      false;
                    return (
                      <li key={m.id} className="badge-item">
                        <div className="badge-icon">
                          {done ? '✅' : '🎯'}
                        </div>
                        <div className="badge-content">
                          <strong>{m.name}</strong>
                          <br />
                          <small>{m.description}</small>
                          <br />
                          <small>
                            Fortschritt: {current}/{goal}
                          </small>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <h4 style={{ marginTop: '1rem' }}>Erfolge</h4>
              {achievements.length === 0 && (
                <p>Noch keine Erfolge freigeschaltet.</p>
              )}
              {achievements.length > 0 && (
                <ul className="badge-list">
                  {achievements.map((a) => (
                    <li key={a.id} className="badge-item">
                      <div className="badge-icon">
                        {a.icon || '🏆'}
                      </div>
                      <div className="badge-content">
                        <strong>{a.name}</strong>
                        <br />
                        <small>{a.description}</small>
                        <br />
                        <small>
                          Freigeschaltet am:{' '}
                          {a.unlocked_at
                            ? new Date(a.unlocked_at).toLocaleString()
                            : 'Unbekannt'}
                        </small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
