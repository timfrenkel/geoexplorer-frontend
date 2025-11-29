// frontend/src/components/AdminDashboard.jsx
import React, { useState } from 'react';
import AdminLocations from './AdminLocations';
import AdminStats from './AdminStats';

const AdminDashboard = () => {
  const [tab, setTab] = useState('locations');

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h2 className="page-title">Admin-Dashboard</h2>
        <p className="page-subtitle">
          Verwalte Sehenswürdigkeiten und behalte Check-in-Statistiken im Blick.
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Bereiche</h3>
        </div>
        <div className="tabs">
          <button
            className={tab === 'locations' ? 'tab active' : 'tab'}
            onClick={() => setTab('locations')}
          >
            Sehenswürdigkeiten
          </button>
          <button
            className={tab === 'stats' ? 'tab active' : 'tab'}
            onClick={() => setTab('stats')}
          >
            Statistiken
          </button>
        </div>
      </div>

      <div className="slide-up">
        {tab === 'locations' && <AdminLocations />}
        {tab === 'stats' && <AdminStats />}
      </div>
    </div>
  );
};

export default AdminDashboard;
