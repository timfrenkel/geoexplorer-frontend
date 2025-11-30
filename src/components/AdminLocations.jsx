// frontend/src/components/AdminLocations.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';

const emptyForm = {
  id: null,
  name: '',
  description: '',
  latitude: '',
  longitude: '',
  radius_m: 100,
  image_url: '',
  category: '',
  is_active: true
};

const AdminLocations = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  // Bulk Import states
  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const loadLocations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/locations');
      setLocations(res.data.locations || []);
    } catch (err) {
      console.error(err);
      setError('Fehler beim Laden der Sehenswürdigkeiten.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEdit = (loc) => {
    setForm({
      id: loc.id,
      name: loc.name || '',
      description: loc.description || '',
      latitude: loc.latitude?.toString() || '',
      longitude: loc.longitude?.toString() || '',
      radius_m: loc.radius_m ?? 100,
      image_url: loc.image_url || '',
      category: loc.category || '',
      is_active: loc.is_active
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sehenswürdigkeit wirklich deaktivieren?')) return;
    setStatus('');
    setError('');
    try {
      await api.delete(`/admin/locations/${id}`);
      setStatus('Sehenswürdigkeit wurde deaktiviert.');
      await loadLocations();
    } catch (err) {
      console.error(err);
      setError('Fehler beim Deaktivieren der Sehenswürdigkeit.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');
    setError('');

    if (!form.name || form.latitude === '' || form.longitude === '') {
      setError('Name, Latitude und Longitude sind erforderlich.');
      return;
    }

    const payload = {
      name: form.name,
      description: form.description,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      radius_m: Number(form.radius_m) || 100,
      image_url: form.image_url,
      category: form.category,
      is_active: form.is_active
    };

    try {
      if (form.id == null) {
        await api.post('/admin/locations', payload);
        setStatus('Sehenswürdigkeit angelegt.');
      } else {
        await api.put(`/admin/locations/${form.id}`, payload);
        setStatus('Sehenswürdigkeit aktualisiert.');
      }

      resetForm();
      await loadLocations();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          'Fehler beim Speichern der Sehenswürdigkeit.'
      );
    }
  };

  // BULK IMPORT

  const handleBulkParse = () => {
    setBulkStatus('');
    setBulkErrors([]);
    setBulkPreview([]);

    const text = bulkText.trim();
    if (!text) {
      setBulkErrors(['Keine Zeilen zum Import vorhanden.']);
      return;
    }

    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const preview = [];
    const errors = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      // Format:
      // name; latitude; longitude; radius_m; category?; image_url?; description?
      const parts = line.split(';').map((p) => p.trim());

      if (parts.length < 4) {
        errors.push(
          `Zeile ${lineNumber}: Mindestens 4 Felder erwartet (Name; Latitude; Longitude; Radius).`
        );
        return;
      }

      const [name, latStr, lonStr, radiusStr, category, image_url, description] =
        parts;

      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);
      const radius = radiusStr ? Number(radiusStr) : 100;

      if (!name) {
        errors.push(`Zeile ${lineNumber}: Name fehlt.`);
        return;
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        errors.push(`Zeile ${lineNumber}: Ungültige Koordinaten.`);
        return;
      }

      preview.push({
        name,
        latitude: lat,
        longitude: lon,
        radius_m: radius || 100,
        category: category || '',
        image_url: image_url || '',
        description: description || ''
      });
    });

    setBulkPreview(preview);
    setBulkErrors(errors);
    if (preview.length > 0) {
      setBulkStatus(
        `${preview.length} gültige Zeile(n) erkannt. Bitte prüfen und dann "Alle speichern" klicken.`
      );
    }
  };

  const handleBulkSave = async () => {
    setBulkStatus('');
    setBulkErrors((prev) => [...prev]);
    if (bulkPreview.length === 0) {
      setBulkErrors((prev) => [...prev, 'Keine gültigen Zeilen zum Speichern.']);
      return;
    }

    setBulkSubmitting(true);
    try {
      const res = await api.post('/admin/locations/bulk', {
        locations: bulkPreview
      });

        setBulkStatus(
        res.data.message ||
          `Bulk-Import abgeschlossen. Angelegt: ${res.data.inserted}.`
      );
      if (Array.isArray(res.data.errors) && res.data.errors.length > 0) {
        setBulkErrors(res.data.errors);
      }

      setBulkPreview([]);
      setBulkText('');
      await loadLocations();
    } catch (err) {
      console.error(err);
      setBulkErrors([
        err.response?.data?.message || 'Fehler beim Bulk-Import.'
      ]);
    } finally {
      setBulkSubmitting(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h3>Sehenswürdigkeit anlegen / bearbeiten</h3>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Beschreibung
            <textarea
              name="description"
              rows={3}
              value={form.description}
              onChange={handleChange}
            />
          </label>
          <div className="form-row">
            <label>
              Latitude
              <input
                type="number"
                name="latitude"
                step="0.000001"
                value={form.latitude}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Longitude
              <input
                type="number"
                name="longitude"
                step="0.000001"
                value={form.longitude}
                onChange={handleChange}
                required
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Radius (m)
              <input
                type="number"
                name="radius_m"
                value={form.radius_m}
                onChange={handleChange}
              />
            </label>
            <label>
              Kategorie
              <input
                type="text"
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="z. B. Wahrzeichen, Museum..."
              />
            </label>
          </div>
          <label>
            Bild-URL
            <input
              type="url"
              name="image_url"
              value={form.image_url}
              onChange={handleChange}
              placeholder="https://..."
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
            />
            Aktiv
          </label>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="submit" className="btn-primary">
              {form.id == null ? 'Anlegen' : 'Speichern'}
            </button>
            {form.id != null && (
              <button
                type="button"
                className="btn-small btn-secondary"
                onClick={resetForm}
              >
                Abbrechen
              </button>
            )}
          </div>
        </form>

        {status && <div className="status">{status}</div>}
        {error && <div className="error">{error}</div>}
      </div>

      <div className="card">
        <h3>Sehenswürdigkeiten (Liste)</h3>
        {loading ? (
          <div>Lade Liste...</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Koordinaten</th>
                  <th>Radius</th>
                  <th>Kategorie</th>
                  <th>Aktiv</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id}>
                    <td>{loc.id}</td>
                    <td>{loc.name}</td>
                    <td>
                      {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                    </td>
                    <td>{loc.radius_m} m</td>
                    <td>{loc.category || '-'}</td>
                    <td>{loc.is_active ? '✅' : '❌'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-small"
                        onClick={() => handleEdit(loc)}
                      >
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        className="btn-small btn-danger"
                        onClick={() => handleDelete(loc.id)}
                      >
                        Deaktivieren
                      </button>
                    </td>
                  </tr>
                ))}
                {locations.length === 0 && (
                  <tr>
                    <td colSpan={7}>Noch keine Sehenswürdigkeiten vorhanden.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Bulk-Import (viele Sehenswürdigkeiten auf einmal)</h3>
        <p style={{ fontSize: '0.85rem' }}>
          Eine Zeile pro Sehenswürdigkeit. Format:{' '}
          <code>
            Name; Latitude; Longitude; Radius_m; Kategorie?; Bild-URL?; Beschreibung?
          </code>
          <br />
          Beispiel:
          <br />
          <code>
            Brandenburger Tor; 52.516275; 13.377704; 120; Wahrzeichen; https://...; Berliner
            Wahrzeichen im Zentrum
          </code>
        </p>

        <textarea
          rows={8}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder="Jede Zeile: Name; Lat; Lon; Radius; Kategorie?; Bild-URL?; Beschreibung?"
        />

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleBulkParse}
          >
            Zeilen prüfen
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleBulkSave}
            disabled={bulkSubmitting || bulkPreview.length === 0}
          >
            {bulkSubmitting ? 'Speichere...' : 'Alle speichern'}
          </button>
        </div>

        {bulkStatus && <div className="status">{bulkStatus}</div>}

        {bulkErrors.length > 0 && (
          <div className="error">
            <div>Fehler:</div>
            <ul>
              {bulkErrors.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {bulkPreview.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <h4>Vorschau ({bulkPreview.length} Einträge)</h4>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Lat</th>
                    <th>Lon</th>
                    <th>Radius</th>
                    <th>Kategorie</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkPreview.map((loc, idx) => (
                    <tr key={idx}>
                      <td>{loc.name}</td>
                      <td>{loc.latitude}</td>
                      <td>{loc.longitude}</td>
                      <td>{loc.radius_m}</td>
                      <td>{loc.category || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLocations;
