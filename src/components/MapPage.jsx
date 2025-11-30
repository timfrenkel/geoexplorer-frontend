// frontend/src/components/MapPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import api from '../api';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Haversine-Distanz in km (für "Nächste Ziele")
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Achievement-Labels für Toasts
const ACHIEVEMENT_LABELS = {
  FIRST_CHECKIN: 'Erster Check-in',
  CHECKINS_5: '5 Orte besucht',
  CHECKINS_10: '10 Orte besucht',
  STREAK_3: '3 Tage in Folge aktiv',
  STREAK_7: '7 Tage in Folge aktiv'
};

// Sanftes Zentrieren der Karte auf ein Ziel
const MapController = ({ target }) => {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.setView([target.latitude, target.longitude], 13, {
      animate: true
    });
  }, [target, map]);

  return null;
};

const MapPage = () => {
  const [locations, setLocations] = useState([]);
  const [visitedIds, setVisitedIds] = useState(new Set());
  const [status, setStatus] = useState('');
  const [geoError, setGeoError] = useState('');
  const [loading, setLoading] = useState(true);

  const [nearestTargets, setNearestTargets] = useState([]);
  const [locatingNearest, setLocatingNearest] = useState(false);
  const [focusedLocation, setFocusedLocation] = useState(null);

  // Gamification: Punkte & Streak
  const [stats, setStats] = useState({
    points: null,
    streakDays: null
  });

  // Gamification: Missions-Liste (max. 3 anzeigen)
  const [missions, setMissions] = useState([]);
  const [missionsError, setMissionsError] = useState('');

  // Toasts
  const [toasts, setToasts] = useState([]);

  // Filter
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeCategories, setActiveCategories] = useState([]);

  const defaultCenter = [52.52, 13.405]; // Berlin

  const showToast = ({ type, title, message }) => {
    const id = Date.now() + Math.random();
    const toast = { id, type, title, message };

    setToasts((prev) => [...prev, toast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const loadGamification = async () => {
    try {
      setMissionsError('');
      const res = await api.get('/gamification/overview');
      const list = res.data.missions || [];
      setMissions(list);
    } catch (err) {
      console.error('Gamification load error:', err);
      // Wenn nicht eingeloggt oder Backend noch nicht bereit
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      setMissionsError('Gamification-Daten konnten nicht geladen werden.');
      setMissions([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1) Locations
        const locRes = await api.get('/locations');
        setLocations(locRes.data.locations || []);

        // 2) Profil / Punkte / bereits besuchte Orte
        const meRes = await api.get('/auth/me');
        const badges = meRes.data.badges || [];
        const ids = new Set(badges.map((b) => b.location_id));
        setVisitedIds(ids);

        if (typeof meRes.data.points === 'number') {
          setStats((prev) => ({
            ...prev,
            points: meRes.data.points
          }));
        }

        // 3) Missions laden
        await loadGamification();
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }
        setStatus('Fehler beim Laden der Karte oder des Profils.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCheckin = (location) => {
    setStatus('');
    setGeoError('');

    if (!navigator.geolocation) {
      setGeoError('Geolocation wird von deinem Browser nicht unterstützt.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          const res = await api.post(`/locations/${location.id}/checkin`, {
            latitude,
            longitude
          });

          const {
            message,
            points,
            streakDays,
            newAchievements = []
          } = res.data || {};

          setStatus(message || 'Check-in erfolgreich!');

          // Besuchten Ort markieren
          setVisitedIds((prev) => {
            const next = new Set(prev);
            next.add(location.id);
            return next;
          });

          // Punkte / Streak aktualisieren
          setStats((prev) => ({
            points:
              typeof points === 'number' ? points : prev.points,
            streakDays:
              typeof streakDays === 'number'
                ? streakDays
                : prev.streakDays
          }));

          // XP / Punkte-Toast
          if (typeof points === 'number') {
            showToast({
              type: 'points',
              title: '+1 Check-in',
              message: `Du hast jetzt ${points} Punkte.`
            });
          }

          // Streak-Toast
          if (typeof streakDays === 'number' && streakDays > 0) {
            showToast({
              type: 'streak',
              title: `🔥 Streak: ${streakDays} Tage`,
              message:
                streakDays === 1
                  ? 'Du hast eine neue Streak gestartet!'
                  : 'Bleib dran, um deine Serie nicht zu verlieren!'
            });
          }

          // Achievement-Toasts
          if (Array.isArray(newAchievements)) {
            newAchievements.forEach((code) => {
              const label = ACHIEVEMENT_LABELS[code] || code;
              showToast({
                type: 'achievement',
                title: '🏆 Erfolg freigeschaltet',
                message: label
              });
            });
          }

          // Missions neu laden
          await loadGamification();
        } catch (err) {
          console.error(err);
          if (err.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
            return;
          }
          setStatus(
            err.response?.data?.message || 'Check-in fehlgeschlagen.'
          );
        }
      },
      (err) => {
        console.error(err);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError(
            'Standortfreigabe verweigert. Bitte erlaube den Zugriff.'
          );
        } else {
          setGeoError('Fehler beim Abrufen deines Standorts.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    );
  };

  // "Nächste Ziele" – nur unbesuchte Orte
  const handleFindNearest = () => {
    setGeoError('');
    setStatus('');
    setNearestTargets([]);
    setLocatingNearest(true);

    if (!navigator.geolocation) {
      setGeoError('Geolocation wird von deinem Browser nicht unterstützt.');
      setLocatingNearest(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        const unvisited = locations.filter(
          (loc) => !visitedIds.has(loc.id)
        );
        const withDistance = unvisited.map((loc) => ({
          loc,
          distanceKm: getDistanceKm(
            latitude,
            longitude,
            loc.latitude,
            loc.longitude
          )
        }));

        withDistance.sort((a, b) => a.distanceKm - b.distanceKm);

        setNearestTargets(withDistance.slice(0, 3));
        setLocatingNearest(false);
      },
      (err) => {
        console.error(err);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError(
            'Standortfreigabe verweigert. Bitte erlaube den Zugriff.'
          );
        } else {
          setGeoError('Fehler beim Abrufen deines Standorts.');
        }
        setLocatingNearest(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    );
  };

  // Karte auf einen Ort fokussieren
  const handleFocusLocation = (loc) => {
    setFocusedLocation(loc);
  };

  // Kategorien aus allen Locations
  const categories = useMemo(() => {
    const set = new Set();
    locations.forEach((loc) => {
      if (loc.category) set.add(loc.category);
    });
    return Array.from(set).sort();
  }, [locations]);

  const toggleCategory = (cat) => {
    setActiveCategories((prev) => {
      if (prev.includes(cat)) {
        return prev.filter((c) => c !== cat);
      }
      return [...prev, cat];
    });
  };

  const clearFilters = () => {
    setActiveCategories([]);
  };

  // Gefilterte Locations für Marker
  const filteredLocations = useMemo(() => {
    if (activeCategories.length === 0) return locations;
    return locations.filter((loc) =>
      activeCategories.includes(loc.category)
    );
  }, [locations, activeCategories]);

  const total = locations.length;
  const visitedCount = visitedIds.size;
  const progress =
    total > 0 ? Math.round((visitedCount / total) * 100) : 0;

  return (
    <div className="page page-full">
      <div className="map-wrapper">
        {/* Toasts oben rechts */}
        <div className="toast-container">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`toast toast-${t.type || 'default'}`}
            >
              <div className="toast-title">{t.title}</div>
              <div className="toast-message">{t.message}</div>
            </div>
          ))}
        </div>

        {/* Overlay oben über der Karte: Fortschritt + Missions kompakt + Nächste Ziele */}
        <div className="map-overlay-top">
          {/* Fortschritt + XP */}
          <div className="overlay-card overlay-progress">
            <p className="overlay-title">Dein Fortschritt</p>
            <p className="overlay-text">
              {visitedCount} von {total} Orten gesammelt ({progress}
              %)
            </p>
            <div className="overlay-progress-bar">
              <div
                className="overlay-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>

            {(stats.points != null || stats.streakDays != null) && (
              <p className="overlay-text-small">
                {stats.points != null && (
                  <>⭐ Punkte: {stats.points}</>
                )}
                {stats.points != null &&
                  stats.streakDays != null &&
                  ' · '}
                {stats.streakDays != null && (
                  <>🔥 Streak: {stats.streakDays} Tage</>
                )}
              </p>
            )}
          </div>

          {/* Rechts: Missions als kleines Dropdown + Nächste Ziele */}
          <div className="overlay-card overlay-nearest">
            {/* Missions kompakt als Dropdown */}
            {missions.length > 0 && (
              <details className="mission-dropdown">
                <summary>🎯 Missions anzeigen</summary>
                <ul className="mission-dropdown-list">
                  {missions.slice(0, 3).map((m) => {
                    const goal = m.target_value ?? 0;
                    const current = m.progress_value ?? 0;
                    const done =
                      m.is_completed || m.completed_at != null;
                    return (
                      <li key={m.id}>
                        <strong>
                          {m.name}
                          {done ? ' ✅' : ''}
                        </strong>
                        <br />
                        <span>
                          Fortschritt: {current} / {goal}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </details>
            )}
            {missionsError && (
              <p className="overlay-text-small error-inline">
                {missionsError}
              </p>
            )}

            {/* Button + Liste "Nächste Ziele" */}
            <button
              className="btn-small btn-overlay"
              onClick={handleFindNearest}
              disabled={locatingNearest || locations.length === 0}
            >
              {locatingNearest
                ? 'Suche in deiner Nähe…'
                : 'Nächste Ziele finden'}
            </button>

            {nearestTargets.length > 0 && (
              <ul className="nearest-list-overlay">
                {nearestTargets.map(({ loc, distanceKm }) => (
                  <li
                    key={loc.id}
                    className="nearest-item-clickable"
                    onClick={() => handleFocusLocation(loc)}
                  >
                    <strong>{loc.name}</strong>
                    <br />
                    <span>
                      ~{distanceKm.toFixed(1)} km entfernt
                      {loc.category ? ` · ${loc.category}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {loading ? (
          <div className="center">Lade Sehenswürdigkeiten...</div>
        ) : (
          <>
            <MapContainer
              center={defaultCenter}
              zoom={4}
              scrollWheelZoom={true}
              className="map-container"
            >
              <MapController target={focusedLocation} />

              <TileLayer
                attribution="&copy; OpenStreetMap-Mitwirkende"
                url="https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png"
              />

              {filteredLocations.map((loc) => {
                const isVisited = visitedIds.has(loc.id);

                return (
                  <Marker
                    key={loc.id}
                    position={[loc.latitude, loc.longitude]}
                    icon={
                      new L.Icon({
                        iconUrl: isVisited
                          ? 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x-green.png'
                          : 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowUrl:
                          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                        shadowSize: [41, 41]
                      })
                    }
                  >
                    <Popup>
                      <strong>{loc.name}</strong>
                      <br />
                      {loc.description && (
                        <>
                          {loc.description}
                          <br />
                        </>
                      )}
                      {loc.category && (
                        <>
                          Kategorie: {loc.category}
                          <br />
                        </>
                      )}
                      Radius: {loc.radius_m}m
                      <br />
                      {isVisited && (
                        <span
                          style={{
                            color: '#16a34a',
                            fontSize: '0.85rem'
                          }}
                        >
                          ✅ Badge bereits gesammelt
                          <br />
                        </span>
                      )}
                      <button
                        className="btn-primary btn-small"
                        onClick={() => handleCheckin(loc)}
                        disabled={isVisited}
                      >
                        {isVisited
                          ? 'Schon eingecheckt'
                          : 'Check-in'}
                      </button>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Filter unten an der Karte */}
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 500
              }}
            >
              <div
                style={{
                  pointerEvents: 'auto',
                  maxWidth: 600,
                  width: '90%',
                  borderRadius: '999px',
                  background: 'rgba(15,23,42,0.95)',
                  boxShadow:
                    '0 16px 40px rgba(15,23,42,0.75)',
                  padding: '0.35rem 0.6rem',
                  transform: filterOpen
                    ? 'translateY(0)'
                    : 'translateY(56%)',
                  transition:
                    'transform 0.18s ease-out',
                  color: '#e5e7eb'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                  }}
                >
                  <button
                    type="button"
                    className="btn-small"
                    onClick={() =>
                      setFilterOpen((o) => !o)
                    }
                  >
                    Filter {filterOpen ? 'schließen' : 'öffnen'}
                  </button>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      opacity: 0.85
                    }}
                  >
                    Kategorien:{' '}
                    {activeCategories.length === 0
                      ? 'Alle'
                      : activeCategories.join(', ')}
                  </span>
                  {activeCategories.length > 0 && (
                    <button
                      type="button"
                      className="btn-small btn-secondary"
                      onClick={clearFilters}
                    >
                      Zurücksetzen
                    </button>
                  )}
                </div>

                {filterOpen && categories.length > 0 && (
                  <div
                    style={{
                      marginTop: '0.4rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.35rem'
                    }}
                  >
                    {categories.map((cat) => {
                      const active =
                        activeCategories.includes(
                          cat
                        );
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() =>
                            toggleCategory(cat)
                          }
                          style={{
                            borderRadius:
                              '999px',
                            padding:
                              '0.15rem 0.55rem',
                            fontSize: '0.78rem',
                            border: '1px solid rgba(148,163,184,0.6)',
                            backgroundColor: active
                              ? 'rgba(59,130,246,0.25)'
                              : 'rgba(15,23,42,0.9)',
                            color: '#e5e7eb',
                            cursor: 'pointer'
                          }}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Fehler / Status unterhalb der Karte */}
        <div className="map-messages">
          {geoError && <div className="error">{geoError}</div>}
          {status && <div className="status">{status}</div>}
        </div>
      </div>
    </div>
  );
};

export default MapPage;
