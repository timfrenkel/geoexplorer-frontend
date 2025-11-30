// frontend/src/components/FriendsPage.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';

const FriendsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [loadingLists, setLoadingLists] = useState(true);
  const [listError, setListError] = useState('');

  // Listen laden
  const loadLists = () => {
    setLoadingLists(true);
    setListError('');
    Promise.all([api.get('/friends'), api.get('/friends/requests')])
      .then(([friendsRes, reqRes]) => {
        setFriends(friendsRes.data.friends || []);
        setRequests({
          incoming: reqRes.data.incoming || [],
          outgoing: reqRes.data.outgoing || []
        });
      })
      .catch((err) => {
        console.error(err);
        setListError('Fehler beim Laden der Freunde/Anfragen.');
      })
      .finally(() => setLoadingLists(false));
  };

  useEffect(() => {
    loadLists();
  }, []);

  // Suche
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    setSearchError('');
    try {
      const res = await api.get('/friends/search', {
        params: { q: searchQuery.trim() }
      });
      setSearchResults(res.data.results || []);
    } catch (err) {
      console.error(err);
      setSearchError('Fehler bei der Suche.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Anfrage senden
  const handleSendRequest = async (userId) => {
    try {
      await api.post('/friends/requests', { friendId: userId });
      // Listen & Suchergebnisse neu laden
      loadLists();
      handleRefreshSearchRow(userId);
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.message ||
          'Fehler beim Senden der Freundschaftsanfrage.'
      );
    }
  };

  // Anfrage annehmen
  const handleAcceptRequest = async (requestId) => {
    try {
      await api.post(`/friends/requests/${requestId}/accept`);
      loadLists();
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.message ||
          'Fehler beim Annehmen der Anfrage.'
      );
    }
  };

  // Anfrage ablehnen / zurückziehen
  const handleRejectRequest = async (requestId) => {
    if (!window.confirm('Diese Anfrage entfernen?')) return;
    try {
      await api.post(`/friends/requests/${requestId}/reject`);
      loadLists();
    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.message ||
          'Fehler beim Ändern der Anfrage.'
      );
    }
  };

  // Nach dem Senden einer Anfrage die Suche aktualisieren (Status ändern)
  const handleRefreshSearchRow = async (userId) => {
    if (!searchQuery.trim()) return;
    try {
      const res = await api.get('/friends/search', {
        params: { q: searchQuery.trim() }
      });
      setSearchResults(res.data.results || []);
    } catch {
      // ignore
    }
  };

  const renderRelationLabel = (relation) => {
    switch (relation) {
      case 'friends':
        return 'Freunde ✅';
      case 'pending_outgoing':
        return 'Anfrage gesendet ⏳';
      case 'pending_incoming':
        return 'Anfrage erhalten ⏳';
      default:
        return 'Kein Kontakt';
    }
  };

  return (
    <div className="page">
      <h2>Freunde</h2>

      {/* Suche */}
      <div className="card">
        <h3>Freunde suchen</h3>
        <form
          className="auth-form"
          onSubmit={handleSearch}
          style={{ marginBottom: '0.5rem' }}
        >
          <label>
            Nutzername
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Benutzername eingeben..."
            />
          </label>
          <button
            type="submit"
            className="btn-primary"
            disabled={searchLoading}
          >
            {searchLoading ? 'Suche...' : 'Suchen'}
          </button>
        </form>
        {searchError && (
          <div className="error" style={{ marginTop: '0.5rem' }}>
            {searchError}
          </div>
        )}

        {searchResults.length > 0 && (
          <ul className="badge-list">
            {searchResults.map((u) => (
              <li key={u.id} className="badge-item">
                <div className="badge-icon">👤</div>
                <div className="badge-content">
                  <strong>{u.username}</strong>
                  <br />
                  <small>{renderRelationLabel(u.relation)}</small>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {u.relation === 'none' && (
                    <button
                      type="button"
                      className="btn-small"
                      onClick={() => handleSendRequest(u.id)}
                    >
                      Anfrage senden
                    </button>
                  )}
                  {u.relation === 'pending_incoming' && u.requestId && (
                    <>
                      <button
                        type="button"
                        className="btn-small"
                        onClick={() => handleAcceptRequest(u.requestId)}
                      >
                        Annehmen
                      </button>
                      <button
                        type="button"
                        className="btn-small btn-danger"
                        onClick={() => handleRejectRequest(u.requestId)}
                      >
                        Ablehnen
                      </button>
                    </>
                  )}
                  {u.relation === 'pending_outgoing' && (
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      Anfrage ausstehend
                    </span>
                  )}
                  {u.relation === 'friends' && (
                    <span style={{ fontSize: '0.8rem', color: '#16a34a' }}>
                      Ihr seid Freunde
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Listen */}
      <div className="card">
        <h3>Deine Kontakte</h3>
        {loadingLists && <p>Lade Freunde und Anfragen…</p>}
        {listError && <div className="error">{listError}</div>}

        {!loadingLists && !listError && (
          <>
            <h4>Eingehende Anfragen</h4>
            {requests.incoming.length === 0 && (
              <p>Keine offenen Anfragen.</p>
            )}
            {requests.incoming.length > 0 && (
              <ul className="badge-list">
                {requests.incoming.map((r) => (
                  <li key={r.id} className="badge-item">
                    <div className="badge-icon">📩</div>
                    <div className="badge-content">
                      <strong>{r.fromUsername}</strong>
                      <br />
                      <small>
                        angefragt am{' '}
                        {new Date(r.createdAt).toLocaleString()}
                      </small>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4
                      }}
                    >
                      <button
                        type="button"
                        className="btn-small"
                        onClick={() => handleAcceptRequest(r.id)}
                      >
                        Annehmen
                      </button>
                      <button
                        type="button"
                        className="btn-small btn-danger"
                        onClick={() => handleRejectRequest(r.id)}
                      >
                        Ablehnen
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <h4 style={{ marginTop: '1rem' }}>Ausgehende Anfragen</h4>
            {requests.outgoing.length === 0 && (
              <p>Du hast keine ausstehenden Anfragen gesendet.</p>
            )}
            {requests.outgoing.length > 0 && (
              <ul className="badge-list">
                {requests.outgoing.map((r) => (
                  <li key={r.id} className="badge-item">
                    <div className="badge-icon">📤</div>
                    <div className="badge-content">
                      <strong>{r.toUsername}</strong>
                      <br />
                      <small>
                        gesendet am{' '}
                        {new Date(r.createdAt).toLocaleString()}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="btn-small btn-danger"
                      onClick={() => handleRejectRequest(r.id)}
                    >
                      Zurückziehen
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <h4 style={{ marginTop: '1rem' }}>Freunde</h4>
            {friends.length === 0 && <p>Du hast noch keine Freunde hinzugefügt.</p>}
            {friends.length > 0 && (
              <ul className="badge-list">
                {friends.map((f) => (
                  <li key={f.id} className="badge-item">
                    <div className="badge-icon">🤝</div>
                    <div className="badge-content">
                      <strong>{f.username}</strong>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;
