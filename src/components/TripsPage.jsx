// frontend/src/components/TripsPage.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });

const emptyTripForm = {
  id: null,
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  isPublic: true,
  coverImageUrl: ''
};

const TripsPage = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyTripForm);
  const [saving, setSaving] = useState(false);

  // Locations & Trip-Details
  const [locations, setLocations] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [tripLocations, setTripLocations] = useState([]);
  const [detailError, setDetailError] = useState('');

  const [addLocForm, setAddLocForm] = useState({
    locationId: '',
    note: '',
    dayIndex: ''
  });

  const loadTrips = () => {
    setLoading(true);
    setError('');
    api
      .get('/trips')
      .then((res) => {
        setTrips(res.data.trips || []);
      })
      .catch((err) => {
        console.error(err);
        setError('Fehler beim Laden deiner Trips.');
      })
      .finally(() => setLoading(false));
  };

  const loadLocations = () => {
    api
      .get('/locations')
      .then((res) => {
        setLocations(res.data.locations || []);
      })
      .catch((err) => {
        console.error(err);
        // kein Hard-Error im UI; nur Konsole
      });
  };

  const loadTripDetails = (tripId) => {
    if (!tripId) return;
    setDetailError('');
    api
      .get(`/trips/${tripId}`)
      .then((res) => {
        setSelectedTrip(res.data.trip);
        setTripLocations(res.data.locations || []);
      })
      .catch((err) => {
        console.error(err);
        setDetailError('Fehler beim Laden der Trip-Details.');
      });
  };

  useEffect(() => {
    loadTrips();
    loadLocations();
  }, []);

  const handleFormChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setForm(emptyTripForm);
  };

  const handleEditTrip = (trip) => {
    setForm({
      id: trip.id,
      name: trip.name || '',
      description: trip.description || '',
      startDate: trip.start_date
        ? String(trip.start_date).slice(0, 10)
        : '',
      endDate: trip.end_date ? String(trip.end_date).slice(0, 10) : '',
      isPublic: trip.is_public,
      coverImageUrl: trip.cover_image_url || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTrip = async (tripId) => {
    if (!window.confirm('Diesen Trip wirklich löschen?')) return;
    try {
      await api.delete(`/trips/${tripId}`);
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
      if (form.id === tripId) {
        resetForm();
      }
      if (selectedTrip && selectedTrip.id === tripId) {
        setSelectedTrip(null);
        setTripLocations([]);
      }
    } catch (err) {
      console.error(err);
      alert('Fehler beim Löschen des Trips.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Ein Name für den Trip ist erforderlich.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      isPublic: form.isPublic,
      coverImageUrl: form.coverImageUrl.trim() || null
    };

    try {
      let res;
      if (form.id) {
        res = await api.put(`/trips/${form.id}`, payload);
        setTrips((prev) =>
          prev.map((t) => (t.id === form.id ? res.data.trip : t))
        );
        if (selectedTrip && selectedTrip.id === form.id) {
          setSelectedTrip(res.data.trip);
        }
      } else {
        res = await api.post('/trips', payload);
        setTrips((prev) => [res.data.trip, ...prev]);
      }
      resetForm();
    } catch (err) {
      console.error(err);
      setError('Fehler beim Speichern des Trips.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLocFormChange = (field, value) => {
    setAddLocForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddLocationToTrip = async (e) => {
    e.preventDefault();
    if (!selectedTrip) return;
    if (!addLocForm.locationId) {
      alert('Bitte eine Location auswählen.');
      return;
    }

    try {
      const payload = {
        locationId: Number(addLocForm.locationId),
        note: addLocForm.note.trim(),
        dayIndex: addLocForm.dayIndex
          ? Number(addLocForm.dayIndex)
          : null
      };
      const res = await api.post(
        `/trips/${selectedTrip.id}/locations`,
        payload
      );
      setTripLocations((prev) => [...prev, res.data.tripLocation]);
      setAddLocForm({
        locationId: '',
        note: '',
        dayIndex: ''
      });
    } catch (err) {
      console.error(err);
      alert('Fehler beim Hinzufügen der Location zum Trip.');
    }
  };

  const handleRemoveLocationFromTrip = async (tripLocationId) => {
    if (!selectedTrip) return;
    if (!window.confirm('Diesen Ort aus dem Trip entfernen?')) return;

    try {
      await api.delete(
        `/trips/${selectedTrip.id}/locations/${tripLocationId}`
      );
      setTripLocations((prev) =>
        prev.filter((tl) => tl.id !== tripLocationId)
      );
    } catch (err) {
      console.error(err);
      alert('Fehler beim Entfernen der Location.');
    }
  };

  return (
    <div className="page">
      <h2>Deine Trips</h2>

      {/* Formular Trip erstellen/bearbeiten */}
      <div className="card">
        <h3>{form.id ? 'Trip bearbeiten' : 'Neuen Trip erstellen'}</h3>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              required
              placeholder="z.B. Sommer-Roadtrip durch Italien"
            />
          </label>
          <label>
            Beschreibung
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                handleFormChange('description', e.target.value)
              }
              placeholder="Was macht diesen Trip besonders?"
            />
          </label>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <label style={{ flex: '1 1 130px' }}>
              Startdatum
              <input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  handleFormChange('startDate', e.target.value)
                }
              />
            </label>
            <label style={{ flex: '1 1 130px' }}>
              Enddatum
              <input
                type="date"
                value={form.endDate}
                onChange={(e) =>
                  handleFormChange('endDate', e.target.value)
                }
              />
            </label>
          </div>
          <label>
            Cover-Bild URL (optional)
            <input
              type="url"
              value={form.coverImageUrl}
              onChange={(e) =>
                handleFormChange('coverImageUrl', e.target.value)
              }
              placeholder="https://… oder du wählst unten eine Datei"
            />
          </label>
          <label>
            Cover-Bild-Datei hochladen
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const dataUrl = await fileToDataUrl(file);
                  handleFormChange('coverImageUrl', dataUrl);
                } catch (err) {
                  console.error(err);
                  alert('Bild konnte nicht gelesen werden.');
                }
              }}
            />
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.9rem',
              marginTop: '0.25rem'
            }}
          >
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) =>
                handleFormChange('isPublic', e.target.checked)
              }
            />
            Trip ist öffentlich sichtbar
          </label>

          {error && (
            <div className="error" style={{ marginTop: '0.5rem' }}>
              {error}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '0.75rem'
            }}
          >
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving
                ? form.id
                  ? 'Speichere...'
                  : 'Erstelle...'
                : form.id
                ? 'Trip speichern'
                : 'Trip erstellen'}
            </button>
            {form.id && (
              <button
                type="button"
                className="btn-small"
                onClick={resetForm}
              >
                Abbrechen
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Liste der Trips */}
      <div className="card">
        <h3>Deine gespeicherten Trips</h3>
        {loading && <p>Lade Trips…</p>}
        {!loading && trips.length === 0 && (
          <p>Du hast noch keine Trips angelegt.</p>
        )}
        {!loading && trips.length > 0 && (
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
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    marginLeft: '0.5rem'
                  }}
                >
                  <button
                    type="button"
                    className="btn-small"
                    onClick={() => handleEditTrip(trip)}
                  >
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    className="btn-small"
                    onClick={() => {
                      loadTripDetails(trip.id);
                    }}
                  >
                    Details
                  </button>
                  <button
                    type="button"
                    className="btn-small btn-danger"
                    onClick={() => handleDeleteTrip(trip.id)}
                  >
                    Löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Trip-Details: verbundene Locations */}
      {selectedTrip && (
        <div className="card">
          <h3>Trip-Details: {selectedTrip.name}</h3>
          {detailError && (
            <div className="error" style={{ marginBottom: '0.5rem' }}>
              {detailError}
            </div>
          )}

          <p>
            <strong>Beschreibung:</strong>{' '}
            {selectedTrip.description || 'Keine Beschreibung.'}
          </p>
          <p>
            <strong>Zeitraum:</strong>{' '}
            {selectedTrip.start_date
              ? new Date(selectedTrip.start_date).toLocaleDateString()
              : '–'}{' '}
            bis{' '}
            {selectedTrip.end_date
              ? new Date(selectedTrip.end_date).toLocaleDateString()
              : '–'}
          </p>

          <h4 style={{ marginTop: '0.75rem' }}>Orte in diesem Trip</h4>
          {tripLocations.length === 0 && (
            <p>Noch keine Orte im Trip – füge welche hinzu! 🗺️</p>
          )}
          {tripLocations.length > 0 && (
            <ul className="badge-list">
              {tripLocations.map((tl) => (
                <li key={tl.id} className="badge-item">
                  <div className="badge-icon">📍</div>
                  <div className="badge-content">
                    <strong>
                      {tl.location_name || `Location #${tl.location_id}`}
                    </strong>
                    <br />
                    {tl.day_index != null && (
                      <small>Tag {tl.day_index}</small>
                    )}
                    {tl.note && (
                      <>
                        <br />
                        <small>{tl.note}</small>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-small btn-danger"
                    onClick={() =>
                      handleRemoveLocationFromTrip(tl.id)
                    }
                  >
                    Entfernen
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h4 style={{ marginTop: '0.75rem' }}>
            Ort zum Trip hinzufügen
          </h4>
          <form
            className="auth-form"
            onSubmit={handleAddLocationToTrip}
            style={{ marginTop: '0.5rem' }}
          >
            <label>
              Location
              <select
                value={addLocForm.locationId}
                onChange={(e) =>
                  handleAddLocFormChange('locationId', e.target.value)
                }
              >
                <option value="">Bitte auswählen…</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.category ? `(${loc.category})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tag im Trip (optional)
              <input
                type="number"
                min="1"
                value={addLocForm.dayIndex}
                onChange={(e) =>
                  handleAddLocFormChange('dayIndex', e.target.value)
                }
                placeholder="z.B. 1, 2, 3…"
              />
            </label>
            <label>
              Notiz (optional)
              <textarea
                rows={2}
                value={addLocForm.note}
                onChange={(e) =>
                  handleAddLocFormChange('note', e.target.value)
                }
                placeholder="Was machst du an diesem Ort?"
              />
            </label>
            <button type="submit" className="btn-primary">
              Ort hinzufügen
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default TripsPage;
