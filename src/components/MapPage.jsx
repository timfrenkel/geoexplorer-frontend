// frontend/src/components/MapPage.jsx
import React, { useEffect, useState } from 'react';
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

// Labels für Achievement-Toasts
const ACHIEVEMENT_LABELS = {
  FIRST_CHECKIN: 'Erster Check-in',
  CHECKINS_5: '5 Orte besucht',
  CHECKINS_10: '10 Orte besucht',
  STREAK_3: '3 Tage in Folge aktiv',
  STREAK_7: '7 Tage in Folge aktiv'
};

// Hilfskomponente zum sanften Zentrieren der Karte
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

  // Gamification: aktuelle Mission (z.B. "5 Orte entdecken")
  const [missionInfo, setMissionInfo] = useState(null);
  const [missionError, setMissionError] = useState('');

  // Kleine Toast-Popups (Achievements, Punkte, Streak)
  const [toasts, setToasts] = useState([]);

  const defaultCenter = [52.52, 13.405]; // Berlin als Startansicht

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
      setMissionError('');
      const res = await api.get('/gamification/overview');
      const missions = res.data.missions || [];

      // Bevorzugt eine TOTAL_CHECKINS-Mission, die noch nicht fertig ist
      let mission =
        missions.find(
          (m) => m.target_type === 'TOTAL_CHECKINS' && !m.is_completed
        ) ||
        missions.find((m) => m.target_type === 'TOTAL_CHECKINS') ||
        missions[0];

      if (!mission) {
        setMissionInfo(null);
        return;
      }

      const target = mission.target_value || 1;
      const progressValue = mission.progress_value || 0;
      const remaining = Math.max(0, target - progressValue);
      const percent = Math.min(
        100,
        Math.round((progressValue / target) * 100)
      );

      setMissionInfo({
        name: mission.name,
        description: mission.description,
        progressValue,
        target,
        remaining,
        percent
      });
    } catch (err) {
      console.error('Gamification load error:', err);
      setMissionError('Gamification-Daten konnten nicht geladen werden.');
      setMissionInfo(null);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1) Aktive Locations
        const locRes = await api.get('/locations');
        setLocations(locRes.data.locations || []);

        // 2) Profil + Badges für besuchte Orte
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

          // Punkte / Streak in der Map-UI aktualisieren
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

          // Nach Check-in Missions-Fortschritt neu laden
          await loadGamification();
        } catch (err) {
          console.error(err);
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

  // "Nächste Ziele" – nur unbesuchte Orte, sortiert nach Distanz zum aktuellen Standort
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

        setNearestTargets(withDistance.slice(0, 3)); // Top 3
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

  // Karte auf einen Ort zentrieren
  const handleFocusLocation = (loc) => {
    setFocusedLocation(loc);
  };

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

        {/* Overlay oben über der Karte: Fortschritt + Nächste Ziele + Mission */}
        <div className="map-overlay-top">
          {/* Fortschritt + XP + Mission */}
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
                  <>
                    ⭐ Punkte: {stats.points}
                  </>
                )}
                {stats.points != null && stats.streakDays != null && ' · '}
                {stats.streakDays != null && (
                  <>🔥 Streak: {stats.streakDays} Tage</>
                )}
              </p>
            )}

            {missionInfo && (
              <div className="mission-snippet">
                <div className="mission-header">
                  <span className="mission-label">
                    🎯 Mission: {missionInfo.name}
                  </span>
                </div>
                <div className="mission-progress-bar">
                  <div
                    className="mission-progress-fill"
                    style={{ width: `${missionInfo.percent}%` }}
                  />
                </div>
                <p className="overlay-text-small">
                  Fortschritt: {missionInfo.progressValue} /{' '}
                  {missionInfo.target} · dir fehlen noch{' '}
                  {missionInfo.remaining} Check-ins
                </p>
              </div>
            )}
            {missionError && (
              <p className="overlay-text-small error-inline">
                {missionError}
              </p>
            )}
          </div>

          {/* Nächste Ziele Button + Liste */}
          <div className="overlay-card overlay-nearest">
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
          <MapContainer
            center={defaultCenter}
            zoom={4}
            scrollWheelZoom={true}
            className="map-container"
          >
            {/* Controller für Zentrierung */}
            <MapController target={focusedLocation} />

            {/* Deutsch-orientierte OSM-Karte */}
            <TileLayer
              attribution="&copy; OpenStreetMap-Mitwirkende"
              url="https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png"
            />

            {locations.map((loc) => {
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
                  className="badge-marker"
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
        )}

        {/* Fehler / Status unterhalb der Karte (aber noch im Sichtfeld) */}
        <div className="map-messages">
          {geoError && <div className="error">{geoError}</div>}
          {status && <div className="status">{status}</div>}
        </div>
      </div>
    </div>
  );
};

export default MapPage;
