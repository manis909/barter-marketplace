import { useState } from 'react';
import './RenterAdmin.css';
import { ReportsPanel } from '../features/verification/AdminVerification';

export default function RenterAdmin() {
  const [activeTab, setActiveTab] = useState('reports');

  return (
    <div className="renter-admin-page">
      <div className="renter-admin-header">
        <h1>Renter Admin</h1>
      </div>

      <div className="apr-tabs" aria-label="Rental admin tabs">
        <button
          type="button"
          className={`apr-tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
      </div>

      {activeTab === 'reports' && <ReportsPanel type="rental" />}
    </div>
  );
}