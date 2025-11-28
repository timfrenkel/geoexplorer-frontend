// frontend/src/components/AdminDashboard.jsx
import React, { useState } from 'react';
import AdminLocations from './AdminLocations';
import AdminStats from './AdminStats';

const AdminDashboard = () => {
  const [tab, setTab] = useState('locations');

  return (
    <div className="page">
      <h2>Admin-Dashboard</h2>
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

      {tab === 'locations' && <AdminLocations />}
      {tab === 'stats' && <AdminStats />}
    </div>
  );
};

export default AdminDashboard;
