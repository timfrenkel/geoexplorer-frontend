// frontend/src/components/FriendsPage.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';

const FriendsPage = () => {
  const [friends, setFriends] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const loadFriends = async () => {
    setLoadingFriends(true);
    setError('');
    try {
      const res = await api.get('/friends');
      setFriends(res.data.friends || []);
    } catch (err) {
      console.error(err);
      setError('Fehler beim Laden deiner Freunde.');
    } finally {
      setLoadingFriends(false);
    }
  };

  useEffect(() => {
    loadFriends();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setStatus('');
    setError('');
    setSearching(true);
    setSearchResults([]);

    const q = searchTerm.trim();
    if (!q) {
      setSearching(false);
      return;
    }

    try {
      const res = await api.get('/friends/search', {
        params: { q }
      });
      setSearchResults(res.data.users || []);
    } catch (err) {
      console.error(err);
      setError('Fehler bei der Freundes-Suche.');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (userId) => {
    setStatus('');
    setError('');
    try {
      const res = await api.post(`/friends/request/${userId}`);
      setStatus(res.data.message || 'Freundschaftsanfrage gesendet.');

      // Status im UI aktualisieren (damit nicht weiter "Anfrage senden" steht)
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, status: 'pending' } : u
        )
      );
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || 'Fehler beim Versenden der Anfrage.'
      );
    }
  };

  return (
    <div className="page">
      <h2>Freunde</h2>

      {/* Eigene Freundesliste */}
      <div className="card">
        <h3>Deine Freunde</h3>
        {loadingFriends && <div>Lade Freunde...</div>}
        {!loadingFriends && friends.length === 0 && (
          <p>Noch keine Freunde – such dir ein paar Mit-Explorer 👀</p>
        )}
        <ul className="badge-list">
          {friends.map((f) => (
            <li key={f.id} className="badge-item">
              <strong>{f.username}</strong>
            </li>
          ))}
        </ul>
      </div>

      {/* Suche */}
      <div className="card">
        <h3>Freunde suchen</h3>
        <form onSubmit={handleSearch} className="auth-form">
          <label>
            Benutzername
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="z. B. tim_frenkel"
            />
          </label>
          <button type="submit" className="btn-primary" disabled={searching}>
            {searching ? 'Suche...' : 'Suchen'}
          </button>
        </form>

        {searching && <div>Lade Suchergebnisse...</div>}

        {searchResults.length > 0 && (
          <ul className="badge-list" style={{ marginTop: '0.5rem' }}>
            {searchResults.map((u) => (
              <li key={u.id} className="badge-item">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    width: '100%'
                  }}
                >
                  <span>{u.username}</span>

                  {u.status === 'accepted' ? (
                    <span style={{ color: '#16a34a', fontSize: '0.85rem' }}>
                      ✓ Bereits befreundet
                    </span>
                  ) : u.status === 'pending' ? (
                    <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}>
                      ⏳ Anfrage gesendet
                    </span>
                  ) : (
                    <button
                      className="btn-small"
                      type="button"
                      onClick={() => handleSendRequest(u.id)}
                    >
                      Anfrage senden
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {status && <div className="status">{status}</div>}
      {error && <div className="error">{error}</div>}
    </div>
  );
};

export default FriendsPage;
