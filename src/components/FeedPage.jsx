// frontend/src/components/FeedPage.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const FeedPage = () => {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get('/feed')
      .then((res) => {
        setFeed(res.data.feed || []);
      })
      .catch((err) => {
        console.error(err);
        setError('Fehler beim Laden des Feeds.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <h2>Dein Travel-Feed</h2>

      <div className="card">
        {loading && <p>Lade Feed…</p>}
        {error && <div className="error">{error}</div>}
        {!loading && !error && feed.length === 0 && (
          <p>
            Dein Feed ist noch leer. Mach deinen ersten Check-in oder füge
            Freunde hinzu! ✈️
          </p>
        )}

        {!loading && !error && feed.length > 0 && (
          <ul className="badge-list">
            {feed.map((item) => (
              <li key={item.id} className="badge-item">
                {/* Avatar */}
                <div className="badge-icon">
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '999px',
                      backgroundColor: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      color: 'white',
                      fontSize: '1.2rem'
                    }}
                  >
                    {item.profile_image_url ? (
                      <img
                        src={item.profile_image_url}
                        alt={item.username}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : item.mood_emoji ? (
                      item.mood_emoji
                    ) : (
                      (item.username && item.username[0]) || 'U'
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="badge-content">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '0.5rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    <Link
                      to={`/friends/${item.user_id}`}
                      style={{
                        fontWeight: 600,
                        textDecoration: 'none',
                        color: '#111827'
                      }}
                    >
                      {item.username}
                    </Link>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.9rem', marginTop: 2 }}>
                    {item.custom_status && (
                      <div style={{ color: '#6b7280' }}>
                        {item.custom_status}
                      </div>
                    )}
                    {(item.home_city || item.home_country) && (
                      <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                        🏡 {item.home_city}
                        {item.home_city && item.home_country ? ', ' : ''}
                        {item.home_country}
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '0.25rem' }}>
                    <strong>📍 {item.location_name}</strong>
                    {item.location_category && (
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {' '}
                        · {item.location_category}
                      </span>
                    )}
                  </div>

                  {item.message && (
                    <p
                      style={{
                        marginTop: '0.25rem',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {item.message}
                    </p>
                  )}

                  {(item.image_url || item.location_image) && (
                    <div style={{ marginTop: '0.35rem' }}>
                      <img
                        src={item.image_url || item.location_image}
                        alt={item.location_name}
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

export default FeedPage;
