// frontend/src/components/ProfilePage.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';

// Base64-Helfer für Bild-Upload (als Data-URL)
const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });

// Level-System
const getLevelInfo = (points) => {
  let level = 1;
  let currentLevelStart = 0;
  let increment = 3;

  while (points >= currentLevelStart + increment) {
    currentLevelStart += increment;
    level += 1;
    increment += 3;
  }

  const perLevel = increment;
  const pointsIntoLevel = points - currentLevelStart;

  let title = 'Neuer Entdecker';
  if (level >= 3 && level < 6) title = 'Reiselustig';
  if (level >= 6 && level < 10) title = 'Globetrotter';
  if (level >= 10) title = 'Legendärer Explorer';

  return {
    level,
    title,
    perLevel,
    pointsIntoLevel
  };
};

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

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

  // Trips
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripsError, setTripsError] = useState('');

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => {
        setProfile(res.data);
        const u = res.data.user;

        setForm({
          profileImageUrl: u.profileImageUrl || u.profile_image_url || '',
          bannerImageUrl: u.bannerImageUrl || u.banner_image_url || '',
          bio: u.bio || '',
          moodEmoji: u.moodEmoji || u.mood_emoji || '',
          homeCity: u.homeCity || u.home_city || '',
          homeCountry: u.homeCountry || u.home_country || '',
          customStatus: u.customStatus || u.custom_status || '',
          isProfilePublic:
            typeof u.isProfilePublic === 'boolean'
              ? u.isProfilePublic
              : u.is_profile_public ?? true,
          isFeedPublic:
            typeof u.isFeedPublic === 'boolean'
              ? u.isFeedPublic
              : u.is_feed_public ?? true
        });

        loadTrips();
      })
      .catch((err) => {
        console.error(err);
        setError('Fehler beim Laden des Profils.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTrips = () => {
    setTripsLoading(true);
    setTripsError('');
    api
      .get('/trips')
      .then((res) => {
        setTrips(res.data.trips || []);
      })
      .catch((err) => {
        console.error(err);
        setTripsError('Fehler beim Laden deiner Trips.');
      })
      .finally(() => setTripsLoading(false));
  };

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

  const { user, points = 0, badges = [] } = profile;
  const streak = user.checkinStreakDays || user.checkin_streak_days || 0;
  const lastCheckinDate = user.lastCheckinDate
    ? new Date(user.lastCheckinDate)
    : user.last_checkin_date
    ? new Date(user.last_checkin_date)
    : null;

  const {
    level,
    title,
    perLevel,
    pointsIntoLevel
  } = getLevelInfo(points);

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
        profileImageUrl: form.profileImageUrl || '',
        bannerImageUrl: form.bannerImageUrl || '',
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

  const displayProfileImage =
    form.profileImageUrl || user.profileImageUrl || user.profile_image_url;
  const displayBannerImage =
    form.bannerImageUrl || user.bannerImageUrl || user.banner_image_url;

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
            background: displayBannerImage
              ? `url(${displayBannerImage}) center/cover no-repeat`
              : 'linear-gradient(135deg, #0f172a, #1d4ed8)',
            position: 'relative',
            zIndex: 1
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            padding: '0 1rem 0.75rem',
            gap: '0.75rem',
            marginTop: '-32px',
            position: 'relative',
            zIndex: 2
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
              fontSize:
                displayProfileImage || form.moodEmoji ? '1.7rem' : '1.2rem',
              color: 'white',
              position: 'relative',
              zIndex: 3
            }}
          >
            {displayProfileImage ? (
              <img
                src={displayProfileImage}
                alt={user.username}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              (form.moodEmoji ||
                user.moodEmoji ||
                user.mood_emoji ||
                user.username[0] ||
                'U')
            )}
          </div>

          {/* Name / Emoji / Level / Ort rechtsbündig */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}
          >
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
              {(user.moodEmoji || user.mood_emoji || form.moodEmoji) && (
                <span style={{ fontSize: '1.3rem' }}>
                  {form.moodEmoji ||
                    user.moodEmoji ||
                    user.mood_emoji}
                </span>
              )}
            </div>

            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  padding: '0.1rem 0.5rem',
                  borderRadius: '999px',
                  background: '#eef2ff',
                  color: '#4338ca',
                  display: 'inline-block',
                  marginBottom: '0.2rem'
                }}
              >
                Level {level} · {title}
              </span>
              {(user.homeCity ||
                user.home_city ||
                form.homeCity ||
                user.homeCountry ||
                user.home_country ||
                form.homeCountry) && (
                <div
                  style={{ fontSize: '0.8rem', color: '#4b5563' }}
                >
                  🏡 {form.homeCity || user.homeCity || user.home_city}
                  {(form.homeCity ||
                    user.homeCity ||
                    user.home_city) &&
                  (form.homeCountry ||
                    user.homeCountry ||
                    user.home_country)
                    ? ', '
                    : ''}
                  {form.homeCountry ||
                    user.homeCountry ||
                    user.home_country}
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
          className={`tab ${
            activeTab === 'gamification' ? 'active' : ''
          }`}
          onClick={() => setActiveTab('gamification')}
        >
          Missions & Erfolge
        </button>
      </div>

      {/* Tab: Übersicht */}
      {activeTab === 'overview' && (
        <>
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
              {user.isProfilePublic ||
              user.is_profile_public
                ? 'Öffentlich'
                : 'Nur für Freunde'}
              {' · '}
              <strong>Feed:</strong>{' '}
              {user.isFeedPublic || user.is_feed_public
                ? 'Öffentlich für Freunde'
                : 'Nur du'}
            </p>
          </div>

          <div className="card">
            <h3>Über dich</h3>
            <p style={{ whiteSpace: 'pre-wrap', marginTop: '0.25rem' }}>
              {user.bio && user.bio.trim().length > 0
                ? user.bio
                : 'Du hast noch keine Bio hinzugefügt.'}
            </p>
          </div>

          <div className="card">
            <h3>Deine Trips</h3>
            {tripsLoading && <p>Lade Trips…</p>}
            {tripsError && <div className="error">{tripsError}</div>}
            {!tripsLoading && !tripsError && trips.length === 0 && (
              <p>
                Du hast noch keine Trips angelegt. Erstelle deinen ersten
                Trip unter „Trips“! 🧳
              </p>
            )}
            {!tripsLoading && !tripsError && trips.length > 0 && (
              <ul className="badge-list">
                {trips.map((trip) => (
                  <li key={trip.id} className="badge-item">
                    {trip.cover_image_url && (
                      <div className="badge-icon">
                        <img
                          src={trip.cover_image_url}
                          alt={trip.name}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '0.5rem',
                            objectFit: 'cover'
                          }}
                        />
                      </div>
                    )}
                    <div className="badge-content">
                      <strong>{trip.name}</strong>
                      <br />
                      {trip.description && (
                        <small>{trip.description}</small>
                      )}
                      <br />
                      <small>
                        {trip.start_date &&
                          `Ab ${new Date(
                            trip.start_date
                          ).toLocaleDateString()}`}
                        {trip.start_date && trip.end_date && ' – '}
                        {trip.end_date &&
                          `Bis ${new Date(
                            trip.end_date
                          ).toLocaleDateString()}`}
                      </small>
                      <br />
                      <small>
                        Sichtbarkeit:{' '}
                        {trip.is_public ? 'Öffentlich' : 'Privat'}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

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
                        {new Date(
                          b.created_at
                        ).toLocaleString()}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* Tab: Profil bearbeiten */}
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
                placeholder="https://… oder du wählst eine Datei unten"
              />
            </label>
            <label>
              Profilbild-Datei hochladen
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const dataUrl = await fileToDataUrl(file);
                    handleFormChange('profileImageUrl', dataUrl);
                  } catch (err) {
                    console.error(err);
                    alert('Bild konnte nicht gelesen werden.');
                  }
                }}
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
                placeholder="https://… oder du wählst eine Datei unten"
              />
            </label>
            <label>
              Banner-Datei hochladen
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const dataUrl = await fileToDataUrl(file);
                    handleFormChange('bannerImageUrl', dataUrl);
                  } catch (err) {
                    console.error(err);
                    alert('Bild konnte nicht gelesen werden.');
                  }
                }}
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

      {/* Tab: Gamification */}
      {activeTab === 'gamification' && (
        <div className="card">
          <h3>Missions & Erfolge</h3>

          {gamLoading && <p>Lade Gamification-Daten…</p>}
          {gamError && <div className="error">{gamError}</div>}

          {!gamLoading && !gamError && (
            <>
              <h4>Aktive Missions</h4>
              {missions.length === 0 && (
                <p>Aktuell sind noch keine Missions definiert.</p>
              )}
              {missions.length > 0 && (
                <div className="missions-grid">
                  {missions.map((m) => {
                    const goal = m.target_value ?? 0;
                    const current = m.progress_value ?? 0;
                    const done =
                      m.is_completed || m.completed_at != null;
                    const percent =
                      goal > 0
                        ? Math.min(
                            100,
                            Math.round((current / goal) * 100)
                          )
                        : 0;

                    return (
                      <div
                        key={m.id}
                        className={`mission-card ${
                          done ? 'mission-complete' : ''
                        }`}
                      >
                        <div className="mission-header">
                          <span className="mission-badge">
                            {m.target_type === 'TOTAL_CHECKINS'
                              ? 'Check-ins'
                              : m.target_type === 'STREAK_DAYS'
                              ? 'Streak'
                              : 'Mission'}
                          </span>
                          {done && (
                            <span className="mission-status">
                              ✅ Abgeschlossen
                            </span>
                          )}
                        </div>
                        <div className="mission-title">{m.name}</div>
                        <div className="mission-description">
                          {m.description}
                        </div>
                        <div className="mission-progress-wrapper">
                          <div className="mission-progress-bar">
                            <div
                              className="mission-progress-fill"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="mission-progress-label">
                            {current} / {goal}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                            ? new Date(
                                a.unlocked_at
                              ).toLocaleString()
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
