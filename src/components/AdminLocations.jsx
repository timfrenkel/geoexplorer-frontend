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
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const loadLocations = async () => {
    try {
      const res = await api.get('/admin/locations');
      setLocations(res.data.locations || []);
    } catch (err) {
      console.error(err);
      setError('Fehler beim Laden der Admin-Sehenswürdigkeiten.');
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const handleEdit = (loc) => {
    setForm({
      id: loc.id,
      name: loc.name,
      description: loc.description || '',
      latitude: loc.latitude,
      longitude: loc.longitude,
      radius_m: loc.radius_m,
      image_url: loc.image_url || '',
      category: loc.category || '',
      is_active: !!loc.is_active
    });
    setError('');
    setStatus('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('');

    try {
      if (form.id) {
        await api.put(`/admin/locations/${form.id}`, form);
        setStatus('Sehenswürdigkeit aktualisiert.');
      } else {
        await api.post('/admin/locations', form);
        setStatus('Sehenswürdigkeit erstellt.');
      }
      setForm(emptyForm);
      loadLocations();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Fehler beim Speichern.');
    }
  };

  const handleDeactivate = async (loc) => {
    setError('');
    setStatus('');
    try {
      await api.delete(`/admin/locations/${loc.id}`);
      setStatus('Sehenswürdigkeit deaktiviert.');
      loadLocations();
    } catch (err) {
      console.error(err);
      setError('Fehler beim Deaktivieren.');
    }
  };

  const handleReset = () => {
    setForm(emptyForm);
    setError('');
    setStatus('');
  };

  return (
    <div className="admin-layout">
      <div className="admin-form">
        <h3>{form.id ? 'Sehenswürdigkeit bearbeiten' : 'Neue Sehenswürdigkeit'}</h3>
        <form onSubmit={handleSubmit} className="admin-form-fields">
          <label>
            Name*
            <input
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
              value={form.description}
              onChange={handleChange}
              rows={3}
            />
          </label>
          <label>
            Latitude*
            <input
              name="latitude"
              type="number"
              step="0.000001"
              value={form.latitude}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Longitude*
            <input
              name="longitude"
              type="number"
              step="0.000001"
              value={form.longitude}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Radius (m)*
            <input
              name="radius_m"
              type="number"
              min="1"
              value={form.radius_m}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Bild-URL
            <input
              name="image_url"
              value={form.image_url}
              onChange={handleChange}
            />
          </label>
          <label>
            Kategorie
            <input
              name="category"
              value={form.category}
              onChange={handleChange}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
            />
            Aktiv
          </label>
          {error && <div className="error">{error}</div>}
          {status && <div className="status">{status}</div>}
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Speichern
            </button>
            <button type="button" onClick={handleReset}>
              Reset
            </button>
          </div>
        </form>
      </div>

      <div className="admin-list">
        <h3>Alle Sehenswürdigkeiten</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Koordinaten</th>
              <th>Radius</th>
              <th>Status</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((loc) => (
              <tr key={loc.id}>
                <td>{loc.name}</td>
                <td>
                  {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                </td>
                <td>{loc.radius_m}m</td>
                <td>{loc.is_active ? 'Aktiv' : 'Inaktiv'}</td>
                <td>
                  <button
                    className="btn-small"
                    onClick={() => handleEdit(loc)}
                  >
                    Bearbeiten
                  </button>
                  {loc.is_active && (
                    <button
                      className="btn-small btn-danger"
                      onClick={() => handleDeactivate(loc)}
                    >
                      Deaktivieren
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {locations.length === 0 && (
              <tr>
                <td colSpan={5}>Noch keine Sehenswürdigkeiten vorhanden.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminLocations;
