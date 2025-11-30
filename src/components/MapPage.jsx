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

// Badge-Icons als DivIcons (Emoji)
const visitedIcon = L.divIcon({
  className: 'badge-marker badge-marker-visited',
  html: '🏅',
  iconSize: [26, 26],
  iconAnchor: [13, 26]
});

const unvisitedIcon = L.divIcon({
  className: 'badge-marker badge-marker-unvisited',
  html: '📍',
  iconSize: [24, 24],
  iconAnchor: [12, 24]
});

// Hilfskomponente, die die Karte bei Änderung von "target" zentriert
const MapController = ({ target }) => {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.setView([target.latitude, target.longitude], 13, { animate: true });
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

  // Check-in Dialog
  const [checkinModal, setCheckinModal] = useState({
    open: false,
    location: null,
    message: '',
    imageUrl: '',
    submitting: false
  });

  const defaultCenter = [52.52, 13.405]; // Berlin als Startansicht

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
      } catch (err) {
        console.error(err);
        setStatus('Fehler beim Laden der Karte oder des Profils.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const openCheckinModal = (location) => {
    setStatus('');
    setGeoError('');
    setCheckinModal({
      open: true,
      location,
      message: '',
      imageUrl: '',
      submitting: false
    });
  };

  const closeCheckinModal = () => {
    setCheckinModal((prev) => ({ ...prev, open: false }));
  };

  const handleConfirmCheckin = () => {
    if (!checkinModal.location) return;
    setStatus('');
    setGeoError('');

    if (!navigator.geolocation) {
      setGeoError('Geolocation wird von deinem Browser nicht unterstützt.');
      return;
    }

    setCheckinModal((prev) => ({ ...prev, submitting: true }));

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          const res = await api.post(
            `/locations/${checkinModal.location.id}/checkin`,
            {
              latitude,
              longitude,
              // werden vom Backend genutzt oder ignoriert, je nach Implementierung
              message: checkinModal.message.trim() || '',
              imageUrl: checkinModal.imageUrl.trim() || ''
            }
          );

          setStatus(res.data.message || 'Check-in erfolgreich!');
          setVisitedIds((prev) => {
            const next = new Set(prev);
            next.add(checkinModal.location.id);
            return next;
          });
          setCheckinModal((prev) => ({ ...prev, open: false, submitting: false }));
        } catch (err) {
          console.error(err);
          setStatus(
            err.response?.data?.message || 'Check-in fehlgeschlagen.'
          );
          setCheckinModal((prev) => ({ ...prev, submitting: false }));
        }
      },
      (err) => {
        console.error(err);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Standortfreigabe verweigert. Bitte erlaube den Zugriff.');
        } else {
          setGeoError('Fehler beim Abrufen deines Standorts.');
        }
        setCheckinModal((prev) => ({ ...prev, submitting: false }));
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

        const unvisited = locations.filter((loc) => !visitedIds.has(loc.id));
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
          setGeoError('Standortfreigabe verweigert. Bitte erlaube den Zugriff.');
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
  const progress = total > 0 ? Math.round((visitedCount / total) * 100) : 0;

  return (
    <div className="page page-full">
      <div className="map-wrapper">
        {/* Overlay oben über der Karte: Fortschritt + Nächste Ziele */}
        <div className="map-overlay-top">
          {/* Fortschritt */}
          <div className="overlay-card overlay-progress">
            <p className="overlay-title">Dein Fortschritt</p>
            <p className="overlay-text">
              {visitedCount} von {total} Orten gesammelt ({progress}%)
            </p>
            <div className="overlay-progress-bar">
              <div
                className="overlay-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Nächste Ziele Button + Liste */}
          <div className="overlay-card overlay-nearest">
            <button
              className="btn-small btn-overlay"
              onClick={handleFindNearest}
              disabled={locatingNearest || locations.length === 0}
            >
              {locatingNearest ? 'Suche in deiner Nähe…' : 'Nächste Ziele finden'}
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
          <div className="center">Lade Sehenswürdigkeiten.</div>
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={4}
            scrollWheelZoom={true}
            className="map-container"
          >
            {/* Controller für Zentrierung */}
            <MapController target={focusedLocation} />

            {/* Deutsch-orientierte OSM-Karte (openstreetmap.de) */}
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
                  icon={isVisited ? visitedIcon : unvisitedIcon}
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
                      <span style={{ color: '#16a34a', fontSize: '0.85rem' }}>
                        ✅ Badge bereits gesammelt
                        <br />
                      </span>
                    )}
                    <button
                      className="btn-primary btn-small"
                      onClick={() => openCheckinModal(loc)}
                      disabled={isVisited}
                    >
                      {isVisited ? 'Schon eingecheckt' : 'Check-in'}
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

        {/* Check-in Modal */}
        {checkinModal.open && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000
            }}
          >
            <div
              className="card"
              style={{
                maxWidth: '420px',
                width: '100%',
                margin: '0 1rem'
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                Check-in bei {checkinModal.location?.name}
              </h3>
              <p style={{ fontSize: '0.85rem', marginTop: 0 }}>
                Optional: kurze Nachricht und ein Bild-Link zu deinem Erlebnis.
              </p>
              <div className="auth-form">
                <label>
                  Nachricht (optional)
                  <textarea
                    rows={3}
                    value={checkinModal.message}
                    onChange={(e) =>
                      setCheckinModal((prev) => ({
                        ...prev,
                        message: e.target.value
                      }))
                    }
                  />
                </label>
                <label>
                  Bild-URL (optional)
                  <input
                    type="url"
                    placeholder="https://…"
                    value={checkinModal.imageUrl}
                    onChange={(e) =>
                      setCheckinModal((prev) => ({
                        ...prev,
                        imageUrl: e.target.value
                      }))
                    }
                  />
                </label>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.5rem',
                  marginTop: '0.5rem'
                }}
              >
                <button
                  className="btn-small btn-danger"
                  type="button"
                  onClick={closeCheckinModal}
                  disabled={checkinModal.submitting}
                >
                  Abbrechen
                </button>
                <button
                  className="btn-primary"
                  type="button"
                  onClick={handleConfirmCheckin}
                  disabled={checkinModal.submitting}
                >
                  {checkinModal.submitting ? 'Check-in läuft…' : 'Check-in bestätigen'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapPage;
