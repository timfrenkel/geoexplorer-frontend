// frontend/src/components/AdminStats.jsx
import React, { useEffect, useState } from 'react';
import api from '../api';

const AdminStats = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/admin/stats/summary')
      .then((res) => setStats(res.data))
      .catch((err) => {
        console.error(err);
        setError('Fehler beim Laden der Statistiken.');
      });
  }, []);

  if (error) return <div className="error">{error}</div>;
  if (!stats) return <div className="center">Lade Statistiken...</div>;

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Überblick</h3>
        </div>
        <p>
          <strong>Benutzer insgesamt:</strong> {stats.userCount}
        </p>
        <p>
          <strong>Check-ins insgesamt:</strong> {stats.totalCheckins}
        </p>
      </div>

      <div className="card slide-up">
        <div className="card-header">
          <h3 className="card-title">Check-ins pro Sehenswürdigkeit</h3>
          <p className="card-subtitle">
            Zeigt, welche Orte besonders beliebt sind.
          </p>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Check-ins</th>
            </tr>
          </thead>
          <tbody>
            {stats.locations.map((loc) => (
              <tr key={loc.id}>
                <td>{loc.name}</td>
                <td>{loc.checkins}</td>
              </tr>
            ))}
            {stats.locations.length === 0 && (
              <tr>
                <td colSpan={2}>Noch keine Daten vorhanden.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminStats;
