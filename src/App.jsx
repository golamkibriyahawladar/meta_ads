import React, { useState, useEffect } from 'react';

function App() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // In a real scenario, Facebook SDK would check login status here.
    // We'll mock the check and load leads if authenticated.
    if (isAuthenticated) {
      fetchLeads();
    }
  }, [isAuthenticated]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      // Calls our Netlify Serverless Function
      const res = await fetch('/api/leads');
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    // Mock login
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="glass-card login-card">
          <div className="logo-placeholder"></div>
          <h1>Meta Ads Dashboard</h1>
          <p>Sign in to view your campaign leads securely.</p>
          <button className="fb-login-btn" onClick={handleLogin}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z" />
            </svg>
            Login with Facebook
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="glass-header">
        <div className="header-content">
          <h1>Leads Dashboard</h1>
          <div className="user-profile">
            <span>Welcome, Admin</span>
            <div className="avatar"></div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="dashboard-stats">
          <div className="glass-card stat-card">
            <h3>Total Leads</h3>
            <p className="stat-number">{leads.length}</p>
          </div>
          <div className="glass-card stat-card">
            <h3>New Today</h3>
            <p className="stat-number">{leads.filter(l => new Date(l.created_time).toDateString() === new Date().toDateString()).length || 0}</p>
          </div>
          <div className="glass-card stat-card">
            <h3>Conversion Rate</h3>
            <p className="stat-number">12.5%</p>
          </div>
        </div>

        <div className="glass-card table-container">
          <div className="table-header">
            <h2>Recent Leads</h2>
            <button className="refresh-btn" onClick={fetchLeads} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>

          {loading ? (
            <div className="loader-container"><div className="spinner"></div></div>
          ) : leads.length === 0 ? (
            <div className="empty-state">No leads available.</div>
          ) : (
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Lead ID</th>
                  <th>Form ID</th>
                  <th>Page ID</th>
                  <th>Status</th>
                  <th>Date Created</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.id}</td>
                    <td>{lead.form_id}</td>
                    <td>{lead.page_id}</td>
                    <td><span className={`status-badge ${lead.status.toLowerCase()}`}>{lead.status}</span></td>
                    <td>{new Date(lead.created_time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
