// frontend/src/components/MapPage.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Haversine-Distanz in km
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Marker Icons
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

// Kategorien
const CATEGORY_OPTIONS = [
  { id: 'all', label: 'Alle' },
  { id: 'landmark', label: 'Wahrzeichen' },
  { id: 'culture', label: 'Kultur' },
  { id: 'nature', label: 'Natur' },
  { id: 'park', label: 'Parks' },
  { id: 'water', label: 'Wasser' },
  { id: 'urban', label: 'Stadt' },
  { id: 'unique', label: 'Besondere Orte' }
];

// Map-Focus Komponente
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

  // Multi-Filter: ausgewählte Kategorien
  const [selectedCategories, setSelectedCategories] = useState(['all']);
  // Für Slide-Up Animation der Filterleiste
  const [filterVisible, setFilterVisible] = useState(false);

  // Check-in Modal
  const [checkinModal, setCheckinModal] = useState({
    open: false,
    location: null,
    message: '',
    imageUrl: '',
    submitting: false
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const locRes = await api.get('/locations');
        setLocations(locRes.data.locations || []);

        const meRes = await api.get('/auth/me');
        const badges = meRes.data.badges || [];
        setVisitedIds(new Set(badges.map((b) => b.location_id)));
      } catch (err) {
        console.error(err);
        setStatus('Fehler beim Laden der Daten.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter-Leiste „slidet“ beim Mount hoch
  useEffect(() => {
    setFilterVisible(true);
  }, []);

  const openCheckinModal = (location) => {
    setGeoError('');
    setStatus('');
    setCheckinModal({
      open: true,
      location,
      message: '',
      imageUrl: '',
      submitting: false
    });
  };

  const closeCheckinModal = () => {
    setCheckinModal((p) => ({ ...p, open: false }));
  };

  const handleConfirmCheckin = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation wird nicht unterstützt.');
      return;
    }

    setCheckinModal((p) => ({ ...p, submitting: true }));

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await api.post(
            `/locations/${checkinModal.location.id}/checkin`,
            {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              message: checkinModal.message.trim(),
              imageUrl: checkinModal.imageUrl.trim()
            }
          );

          setVisitedIds((prev) => new Set([...prev, checkinModal.location.id]));
          setStatus(res.data.message || 'Check-in erfolgreich!');
          closeCheckinModal();
        } catch (err) {
          console.error(err);
          setStatus(
            err.response?.data?.message || 'Check-in fehlgeschlagen.'
          );
        } finally {
          setCheckinModal((p) => ({ ...p, submitting: false }));
        }
      },
      (err) => {
        console.error(err);
        setGeoError('Standort konnte nicht ermittelt werden.');
        setCheckinModal((p) => ({ ...p, submitting: false }));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Nächste Ziele (unabhängig vom Filter – immer global)
  const handleFindNearest = () => {
    setGeoError('');
    setNearestTargets([]);
    setLocatingNearest(true);

    if (!navigator.geolocation) {
      setGeoError('Browser unterstützt keine Standortdaten.');
      setLocatingNearest(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const unvisited = locations.filter((l) => !visitedIds.has(l.id));

        const withDist = unvisited
          .map((l) => ({
            loc: l,
            distanceKm: getDistanceKm(
              pos.coords.latitude,
              pos.coords.longitude,
              l.latitude,
              l.longitude
            )
          }))
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, 3);

        setNearestTargets(withDist);
        setLocatingNearest(false);
      },
      (err) => {
        console.error(err);
        setGeoError('Standort konnte nicht ermittelt werden.');
        setLocatingNearest(false);
      }
    );
  };

  // Multi-Filter Handler
  const handleToggleCategory = (id) => {
    // „Alle“ = Reset
    if (id === 'all') {
      setSelectedCategories(['all']);
      return;
    }

    setSelectedCategories((prev) => {
      // Wenn bisher „all“ aktiv war → entferne „all“ und starte mit aktuellem
      if (prev.includes('all')) {
        return [id];
      }

      // Kategorie toggeln
      if (prev.includes(id)) {
        const next = prev.filter((c) => c !== id);
        // Keine Kategorie mehr ausgewählt → wieder „all“
        return next.length === 0 ? ['all'] : next;
      } else {
        return [...prev, id];
      }
    });
  };

  // Gefilterte Locations: wenn „all“ ausgewählt → alle
  const filteredLocations =
    selectedCategories.includes('all')
      ? locations
      : locations.filter((l) => selectedCategories.includes(l.category));

  const total = locations.length;
  const visibleCount = filteredLocations.length;
  const progress =
    total > 0 ? Math.round((visitedIds.size / total) * 100) : 0;

  return (
    <div className="page page-full">
      <div className="map-wrapper">
        {/* TOP OVERLAY */}
        <div className="map-overlay-top">
          <div className="overlay-card overlay-progress">
            <p className="overlay-title">Dein Fortschritt</p>
            <p className="overlay-text">
              {visitedIds.size} / {total} Orte · {progress}%
            </p>
            <div className="overlay-progress-bar">
              <div
                className="overlay-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="overlay-card overlay-nearest">
            <button
              className="btn-small btn-overlay"
              onClick={handleFindNearest}
              disabled={locatingNearest}
            >
              {locatingNearest ? 'Suche...' : 'Nächste Ziele'}
            </button>

            {nearestTargets.length > 0 && (
              <ul className="nearest-list-overlay">
                {nearestTargets.map(({ loc, distanceKm }) => (
                  <li
                    key={loc.id}
                    className="nearest-item-clickable"
                    onClick={() => setFocusedLocation(loc)}
                  >
                    <strong>{loc.name}</strong>
                    <br />
                    ~{distanceKm.toFixed(1)} km entfernt
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* MAP */}
        {loading ? (
          <div className="center">Lade Karte…</div>
        ) : (
          <MapContainer
            center={[52.52, 13.405]}
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
              const visited = visitedIds.has(loc.id);
              return (
                <Marker
                  key={loc.id}
                  position={[loc.latitude, loc.longitude]}
                  icon={visited ? visitedIcon : unvisitedIcon}
                >
                  <Popup>
                    <strong>{loc.name}</strong>
                    <br />
                    {loc.category && (
                      <>
                        Kategorie: {loc.category}
                        <br />
                      </>
                    )}
                    <button
                      className="btn-primary btn-small"
                      disabled={visited}
                      onClick={() => openCheckinModal(loc)}
                    >
                      {visited ? 'Bereits eingecheckt' : 'Check-in'}
                    </button>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}

        {/* BOTTOM FILTER BAR – Multi-Filter + Slide-Up */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: filterVisible
              ? 'translateX(-50%) translateY(0)'
              : 'translateX(-50%) translateY(120%)',
            opacity: filterVisible ? 1 : 0,
            transition: 'transform 0.35s ease-out, opacity 0.35s ease-out',
            zIndex: 1000,
            background: 'rgba(15,23,42,0.78)',
            padding: '0.5rem',
            borderRadius: '12px',
            display: 'flex',
            gap: '0.35rem',
            overflowX: 'auto',
            maxWidth: '90vw',
            backdropFilter: 'blur(6px)'
          }}
        >
          {CATEGORY_OPTIONS.map((cat) => {
            const active = selectedCategories.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleToggleCategory(cat.id)}
                className="btn-small"
                style={{
                  borderRadius: '999px',
                  padding: '0.25rem 0.7rem',
                  fontSize: '0.8rem',
                  border: active ? '1px solid #38bdf8' : '1px solid #4b5563',
                  background: active
                    ? 'rgba(56,189,248,0.18)'
                    : 'rgba(31,41,55,0.6)',
                  color: active ? '#e0f2fe' : '#e5e7eb',
                  whiteSpace: 'nowrap'
                }}
              >
                {cat.label}
              </button>
            );
          })}
          <span
            style={{
              fontSize: '0.75rem',
              color: '#9ca3af',
              marginLeft: '0.35rem',
              whiteSpace: 'nowrap'
            }}
          >
            {selectedCategories.includes('all')
              ? `Alle (${visibleCount})`
              : `Gefiltert: ${visibleCount}/${total}`}
          </span>
        </div>

        {/* Status & Fehler */}
        <div className="map-messages">
          {geoError && <div className="error">{geoError}</div>}
          {status && <div className="status">{status}</div>}
        </div>

        {/* CHECK-IN MODAL */}
        {checkinModal.open && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000
            }}
          >
            <div className="card" style={{ maxWidth: 420, width: '100%' }}>
              <h3>Check-in bei {checkinModal.location?.name}</h3>

              <div className="auth-form">
                <label>
                  Nachricht
                  <textarea
                    rows={3}
                    value={checkinModal.message}
                    onChange={(e) =>
                      setCheckinModal((p) => ({
                        ...p,
                        message: e.target.value
                      }))
                    }
                  />
                </label>
                <label>
                  Bild-URL
                  <input
                    type="url"
                    value={checkinModal.imageUrl}
                    onChange={(e) =>
                      setCheckinModal((p) => ({
                        ...p,
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
                  gap: '0.5rem'
                }}
              >
                <button className="btn-small btn-danger" onClick={closeCheckinModal}>
                  Abbrechen
                </button>
                <button
                  className="btn-primary"
                  onClick={handleConfirmCheckin}
                  disabled={checkinModal.submitting}
                >
                  {checkinModal.submitting ? 'Bitte warten…' : 'Bestätigen'}
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
