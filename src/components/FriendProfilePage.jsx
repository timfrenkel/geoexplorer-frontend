// frontend/src/components/FriendProfilePage.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';

// Gleiches Level-System wie im eigenen Profil
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

const FriendProfilePage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null); // { user, relation, isFriend, isSelf, canSeeFeed, points, achievements, checkins }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadProfile = () => {
    setLoading(true);
    setError('');
    api
      .get(`/friends/${id}/profile`)
      .then((res) => {
        setData(res.data);
      })
      .catch((err) => {
        console.error(err);
        setError(
          err.response?.data?.message ||
            'Fehler beim Laden des Profils.'
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSendRequest = async () => {
    if (!data?.user?.id) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.post('/friends/requests', { friendId: data.user.id });
      loadProfile();
    } catch (err) {
      console.error(err);
      setActionError(
        err.response?.data?.message ||
          'Fehler beim Senden der Anfrage.'
      );
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!data?.requestId) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/friends/requests/${data.requestId}/accept`);
      loadProfile();
    } catch (err) {
      console.error(err);
      setActionError(
        err.response?.data?.message ||
          'Fehler beim Annehmen der Anfrage.'
      );
      setActionLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!data?.requestId) return;
    if (!window.confirm('Diese Anfrage entfernen?')) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/friends/requests/${data.requestId}/reject`);
      loadProfile();
    } catch (err) {
      console.error(err);
      setActionError(
        err.response?.data?.message ||
          'Fehler beim Bearbeiten der Anfrage.'
      );
      setActionLoading(false);
    }
  };

  const renderRelationLabel = () => {
    if (!data) return '';
    if (data.isSelf) return 'Das bist du 👀';
    switch (data.relation) {
      case 'friends':
        return 'Ihr seid Freunde ✅';
      case 'pending_outgoing':
        return 'Anfrage gesendet ⏳';
      case 'pending_incoming':
        return 'Anfrage erhalten ⏳';
      case 'none':
      default:
        return 'Noch keine Verbindung';
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="center">Lade Profil…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page">
        <div className="error">
          {error || 'Profil konnte nicht geladen werden.'}
        </div>
      </div>
    );
  }

  const {
    user,
    canSeeFeed,
    checkins,
    points = 0,
    achievements = []
  } = data;

  const streak = user.checkinStreakDays || 0;
  const lastCheckinDate = user.lastCheckinDate
    ? new Date(user.lastCheckinDate)
    : null;

  const { level, title, perLevel, pointsIntoLevel } = getLevelInfo(points);
  const levelProgressPercent =
    perLevel > 0
      ? Math.min(100, Math.round((pointsIntoLevel / perLevel) * 100))
      : 0;

  const displayProfileImage = user.profileImageUrl;
  const displayBannerImage = user.bannerImageUrl;

  return (
    <div className="page">
      <h2>Profil von {user.username}</h2>

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
              color: 'white',
              fontSize:
                displayProfileImage || user.moodEmoji ? '1.7rem' : '1.2rem',
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
              (user.moodEmoji || user.username[0] || 'U')
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

      {/* Beziehung & Stats */}
      <div className="card">
        <h3>Beziehung & Stats</h3>
        <p>{renderRelationLabel()}</p>

        {!data.isSelf && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginTop: '0.5rem'
            }}
          >
            {data.relation === 'none' && (
              <button
                type="button"
                className="btn-primary"
                onClick={handleSendRequest}
                disabled={actionLoading}
              >
                {actionLoading ? 'Sende…' : 'Freundschaftsanfrage senden'}
              </button>
            )}
            {data.relation === 'pending_incoming' && (
              <>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAcceptRequest}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Bitte warten…' : 'Anfrage annehmen'}
                </button>
                <button
                  type="button"
                  className="btn-small btn-danger"
                  onClick={handleRejectRequest}
                  disabled={actionLoading}
                >
                  Ablehnen
                </button>
              </>
            )}
            {data.relation === 'pending_outgoing' && (
              <button
                type="button"
                className="btn-small btn-danger"
                onClick={handleRejectRequest}
                disabled={actionLoading}
              >
                Anfrage zurückziehen
              </button>
            )}
          </div>
        )}

        {actionError && (
          <div className="error" style={{ marginTop: '0.5rem' }}>
            {actionError}
          </div>
        )}

        <div style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
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
        </div>

        <p style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <strong>Profil-Sichtbarkeit:</strong>{' '}
          {user.isProfilePublic ? 'Öffentlich' : 'Nur für Freunde'}
          {' · '}
          <strong>Feed:</strong>{' '}
          {user.isFeedPublic ? 'Für Freunde sichtbar' : 'Privat'}
        </p>
      </div>

      {/* Bio */}
      <div className="card">
        <h3>Über {user.username}</h3>
        <p style={{ whiteSpace: 'pre-wrap', marginTop: '0.25rem' }}>
          {user.bio && user.bio.trim().length > 0
            ? user.bio
            : 'Keine Bio hinterlegt.'}
        </p>
      </div>

      {/* Erfolge */}
      <div className="card">
        <h3>Erfolge</h3>
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
      </div>

      {/* Reise-Aktivität */}
      <div className="card">
        <h3>Reise-Aktivität</h3>
        {!canSeeFeed && (
          <p>Der Feed dieses Nutzers ist privat.</p>
        )}

        {canSeeFeed && checkins.length === 0 && (
          <p>Noch keine Check-ins oder Aktivitäten sichtbar.</p>
        )}

        {canSeeFeed && checkins.length > 0 && (
          <ul className="badge-list">
            {checkins.map((c) => (
              <li key={c.id} className="badge-item">
                <div className="badge-icon">📍</div>
                <div className="badge-content">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '0.5rem'
                    }}
                  >
                    <strong>{c.location_name}</strong>
                    <span
                      style={{ fontSize: '0.8rem', color: '#6b7280' }}
                    >
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  {c.location_category && (
                    <small style={{ color: '#6b7280' }}>
                      Kategorie: {c.location_category}
                    </small>
                  )}
                  {c.message && (
                    <p
                      style={{
                        marginTop: '0.25rem',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {c.message}
                    </p>
                  )}
                  {(c.image_url || c.location_image) && (
                    <div style={{ marginTop: '0.35rem' }}>
                      <img
                        src={c.image_url || c.location_image}
                        alt={c.location_name}
                        style={{
                          maxWidth: '100%',
                          borderRadius: '0.75rem',
                          maxHeight: 220,
                          objectFit: 'cover'
                        }}
                      />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FriendProfilePage;
