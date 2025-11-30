// frontend/src/components/FeedPage.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';

const FeedPage = ({ currentUser }) => {
  const [feed, setFeed] = useState([]);
  const [tab, setTab] = useState('all'); // all | friends
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFeed = async () => {
    setLoading(true);
    setError('');
    try {
      // Backend liefert: eigener + Freunde-Feed in einem
      const res = await api.get('/feed');
      setFeed(res.data.feed || []);
    } catch (err) {
      console.error(err);
      setError('Fehler beim Laden des Feeds.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const filteredFeed =
    tab === 'friends' && currentUser
      ? feed.filter((item) => item.user_id !== currentUser.id)
      : feed;

  return (
    <div className="page">
      <h2>Aktivitäten-Feed</h2>

      <div className="tabs">
        <button
          className={tab === 'all' ? 'tab active' : 'tab'}
          onClick={() => setTab('all')}
        >
          Du & Freunde
        </button>
        <button
          className={tab === 'friends' ? 'tab active' : 'tab'}
          onClick={() => setTab('friends')}
        >
          Nur Freunde
        </button>
      </div>

      {loading && <div>Lade Feed...</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && filteredFeed.length === 0 && (
        <div className="card">
          Noch keine Aktivitäten im Feed.  
          <br />
          Check-in auf der Karte oder füge Freunde hinzu!
        </div>
      )}

      {!loading &&
        !error &&
        filteredFeed.map((item) => (
          <div key={item.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{item.username}</strong>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                {new Date(item.created_at).toLocaleString()}
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0.25rem' }}>
              hat bei <strong>{item.location_name}</strong> eingecheckt
            </p>

            {item.message && (
              <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                „{item.message}“
              </p>
            )}

            {item.image_url && (
              <div
                style={{
                  marginTop: '0.4rem',
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                  maxHeight: '220px'
                }}
              >
                <img
                  src={item.image_url}
                  alt={item.location_name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              </div>
            )}
          </div>
        ))}
    </div>
  );
};

export default FeedPage;
