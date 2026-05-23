import React, { useState, useEffect } from 'react';

function App() {
  const [pages, setPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userToken, setUserToken] = useState('');
  const [error, setError] = useState(null);
  const [expandedLead, setExpandedLead] = useState(null);

  // Initialize Facebook SDK
  useEffect(() => {
    window.fbAsyncInit = function() {
      window.FB.init({
        appId: import.meta.env.VITE_FACEBOOK_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v25.0'
      });
      
      // Check if user is already logged in
      window.FB.getLoginStatus((response) => {
        if (response.status === 'connected') {
          setIsAuthenticated(true);
          setUserToken(response.authResponse.accessToken);
        }
      });
    };

    // Load SDK asynchronously
    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }, []);

  // Fetch pages and leads once authenticated
  useEffect(() => {
    if (isAuthenticated && userToken) {
      fetchPagesAndLeads();
    }
  }, [isAuthenticated, userToken]);

  const fetchPagesAndLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      // Send User Access Token to backend to get pages and subscribe them
      const res = await fetch(`/api/leads?user_token=${userToken}`);
      const data = await res.json();
      
      if (data.success) {
        setPages(data.pages || []);
        if (data.pages && data.pages.length > 0) {
          // Default to first page
          const firstPage = data.pages[0].id;
          setSelectedPageId(firstPage);
          setLeads(data.leadsByPage[firstPage] || []);
        } else {
          setError('No Facebook Pages found for this account.');
        }
      } else {
        setError(data.error || 'Failed to fetch pages and leads.');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Network error. Could not load data.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (!window.FB) {
      setError('Facebook SDK not loaded yet. Please try again in a moment.');
      return;
    }
    
    window.FB.login((response) => {
      if (response.authResponse) {
        setIsAuthenticated(true);
        setUserToken(response.authResponse.accessToken);
      } else {
        setError('User cancelled login or did not fully authorize the app.');
      }
    }, {
      // Request required permissions for Lead Ads retrieval and subscription
      scope: 'pages_read_engagement,pages_show_list,pages_manage_metadata,leads_retrieval'
    });
  };

  const handlePageChange = (e) => {
    const pageId = e.target.value;
    setSelectedPageId(pageId);
    
    // Dynamically query backend or extract from loaded pages
    // Since we returned leads grouped by page, we can switch instantly
    setLoading(true);
    fetch(`/api/leads?user_token=${userToken}&page_id=${pageId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLeads(data.leads || []);
        } else {
          setError(data.error || 'Failed to fetch leads for this page.');
        }
      })
      .catch(err => {
        console.error(err);
        setError('Failed to switch page.');
      })
      .finally(() => setLoading(false));
  };

  const toggleExpand = (leadId) => {
    setExpandedLead(expandedLead === leadId ? null : leadId);
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="glass-card login-card">
          <div className="login-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1>Meta Ads Dashboard</h1>
          <p>Login with your Facebook account to view your lead ads data automatically.</p>
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
          <div className="header-left">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#hgrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="hgrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <h1>Leads Dashboard</h1>
          </div>
          <div className="user-profile">
            {pages.length > 0 && (
              <select className="page-select" value={selectedPageId} onChange={handlePageChange}>
                {pages.map(page => (
                  <option key={page.id} value={page.id}>{page.name}</option>
                ))}
              </select>
            )}
            <div className="avatar"></div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Stats Cards */}
        <div className="dashboard-stats">
          <div className="glass-card stat-card">
            <div className="stat-icon stat-icon-total">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h3>Total Leads</h3>
            <p className="stat-number">{leads.length}</p>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-icon stat-icon-today">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <h3>New Today</h3>
            <p className="stat-number">
              {leads.filter(l => new Date(l.created_time).toDateString() === new Date().toDateString()).length}
            </p>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-icon stat-icon-forms">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <h3>Active Forms</h3>
            <p className="stat-number">{[...new Set(leads.map(l => l.form_id))].length}</p>
          </div>
        </div>

        {error && (
          <div className="glass-card error-card">
            <p>⚠️ {error}</p>
          </div>
        )}

        <div className="glass-card table-container">
          <div className="table-header">
            <h2>Recent Leads</h2>
            <button className="refresh-btn" onClick={fetchPagesAndLeads} disabled={loading}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? 'spin' : ''}>
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {loading ? (
            <div className="loader-container"><div className="spinner"></div></div>
          ) : leads.length === 0 ? (
            <div className="empty-state">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <p>No leads found for this page.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="leads-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Campaign</th>
                    <th>Platform</th>
                    <th>Date</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <React.Fragment key={lead.id}>
                      <tr className={expandedLead === lead.id ? 'row-expanded' : ''}>
                        <td className="td-name">{lead.full_name}</td>
                        <td className="td-email">{lead.email}</td>
                        <td className="td-phone">{lead.phone_number}</td>
                        <td>{lead.city}</td>
                        <td><span className="campaign-badge">{lead.campaign_name}</span></td>
                        <td><span className="platform-badge">{lead.platform}</span></td>
                        <td>{new Date(lead.created_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td>
                          <button className="expand-btn" onClick={() => toggleExpand(lead.id)}>
                            {expandedLead === lead.id ? '▲' : '▼'}
                          </button>
                        </td>
                      </tr>
                      {expandedLead === lead.id && (
                        <tr className="expanded-row">
                          <td colSpan="8">
                            <div className="expanded-content">
                              <div className="detail-grid">
                                <div className="detail-item"><span className="detail-label">Lead ID</span><span className="detail-value">{lead.id}</span></div>
                                <div className="detail-item"><span className="detail-label">Form</span><span className="detail-value">{lead.form_name}</span></div>
                                <div className="detail-item"><span className="detail-label">Ad Name</span><span className="detail-value">{lead.ad_name}</span></div>
                                <div className="detail-item"><span className="detail-label">Organic</span><span className="detail-value">{lead.is_organic ? 'Yes' : 'No'}</span></div>
                                {lead.all_fields && Object.entries(lead.all_fields).map(([key, value]) => (
                                  <div className="detail-item" key={key}>
                                    <span className="detail-label">{key.replace(/_/g, ' ')}</span>
                                    <span className="detail-value">{value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
