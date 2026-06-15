import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/api.js';
import Sidebar from '../../components/layout/Sidebar.jsx';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [propertiesList, setPropertiesList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [reviewsList, setReviewsList] = useState([]);

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Canvas refs
  const revenueCanvasRef = useRef(null);
  const bookingsCanvasRef = useRef(null);
  const revenueChartRef = useRef(null);
  const bookingsChartRef = useRef(null);

  const menuItems = [
    { id: 'overview', label: 'Platform Stats', icon: '📈' },
    { id: 'users', label: 'User Audits', icon: '👥' },
    { id: 'properties', label: 'Stays Verify', icon: '🛡️' },
    { id: 'bookings', label: 'Booking Audits', icon: '📝' },
    { id: 'reviews', label: 'Reviews Moderate', icon: '💬' },
  ];

  const fetchAdminData = async () => {
    setLoading(true);
    setAlert(null);
    try {
      if (activeTab === 'overview') {
        const { data } = await api.get('/admin/stats');
        if (data.success) {
          setStats(data.stats);
          renderCharts(data.stats.charts);
        }
      } else if (activeTab === 'users') {
        const { data } = await api.get('/admin/users');
        if (data.success) setUsersList(data.users);
      } else if (activeTab === 'properties') {
        const { data } = await api.get('/properties');
        if (data.success) setPropertiesList(data.properties);
      } else if (activeTab === 'bookings') {
        const { data } = await api.get('/admin/bookings');
        if (data.success) setBookingsList(data.bookings);
      } else if (activeTab === 'reviews') {
        // Load properties to pull reviews
        const { data } = await api.get('/properties');
        let allReviews = [];
        for (let prop of data.properties) {
          const revRes = await api.get(`/reviews/properties/${prop._id}`);
          if (revRes.data.success) {
            allReviews = [...allReviews, ...revRes.data.reviews.map(r => ({ ...r, propertyTitle: prop.title }))];
          }
        }
        setReviewsList(allReviews);
      }
    } catch (err) {
      setAlert({
        type: 'danger',
        text: err.response?.data?.error || 'Failed to sync platform records',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const renderCharts = (chartsData) => {
    // 1. Revenue line chart
    if (revenueCanvasRef.current) {
      if (revenueChartRef.current) revenueChartRef.current.destroy();
      const ctx = revenueCanvasRef.current.getContext('2d');
      revenueChartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartsData.months,
          datasets: [{
            label: 'Monthly Earnings (INR)',
            data: chartsData.revenue,
            borderColor: '#ff385c',
            backgroundColor: 'rgba(255,56,92,0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.3,
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    // 2. Bookings quantity bar chart
    if (bookingsCanvasRef.current) {
      if (bookingsChartRef.current) bookingsChartRef.current.destroy();
      const ctx = bookingsCanvasRef.current.getContext('2d');
      bookingsChartRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: chartsData.months,
          datasets: [{
            label: 'Reservations Volume',
            data: chartsData.bookings,
            backgroundColor: '#0f172a',
            borderRadius: 4,
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      const { data } = await api.put(`/admin/users/${userId}/role`, { role });
      if (data.success) {
        setAlert({ type: 'success', text: 'User role updated successfully!' });
        setUsersList(prev => prev.map(u => u._id === userId ? { ...u, role } : u));
      }
    } catch (err) {
      setAlert({ type: 'danger', text: err.response?.data?.error || 'Failed to update user role' });
    }
  };

  const handleVerifyProperty = async (propId, isVerified) => {
    try {
      const { data } = await api.put(`/admin/properties/${propId}/verify`, { isVerified });
      if (data.success) {
        setAlert({ type: 'success', text: isVerified ? 'Property verified successfully!' : 'Property verification revoked.' });
        setPropertiesList(prev => prev.map(p => p._id === propId ? { ...p, isVerified } : p));
      }
    } catch (err) {
      setAlert({ type: 'danger', text: err.response?.data?.error || 'Verification trigger failed' });
    }
  };

  const handleModerateReview = async (revId) => {
    const confirmMod = window.confirm('Are you sure you want to moderate and remove this review comment?');
    if (!confirmMod) return;

    try {
      const { data } = await api.delete(`/admin/reviews/${revId}`);
      if (data.success) {
        setAlert({ type: 'success', text: 'Review comment moderated and removed.' });
        setReviewsList(prev => prev.filter(r => r._id !== revId));
      }
    } catch (err) {
      setAlert({ type: 'danger', text: err.response?.data?.error || 'Failed to remove review' });
    }
  };

  const handleGenerateReport = () => {
    if (!stats) return;
    
    // Convert stats info to JSON format
    const reportData = {
      reportType: 'Platform System Audit Report',
      generatedAt: new Date().toISOString(),
      aggregateTotals: {
        totalUsers: stats.totalUsers,
        totalHosts: stats.totalHosts,
        totalGuests: stats.totalGuests,
        totalProperties: stats.totalProperties,
        totalBookings: stats.totalBookings,
        totalRevenue: stats.totalRevenue,
      },
      chartsData: stats.charts,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `tripnest_audit_report_${new Date().toISOString().substring(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <Sidebar menuItems={menuItems} activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Panel Content */}
      <main className="dashboard-body">
        {alert && (
          <div className={`alert alert-${alert.type}`} style={{ fontSize: '0.9rem', marginBottom: '24px' }}>
            {alert.text}
          </div>
        )}

        {/* Tab 1: System Stats overview */}
        {activeTab === 'overview' && stats && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Platform Audit Metrics</h3>
              <button onClick={handleGenerateReport} className="btn btn-brand">📥 Generate Audit JSON</button>
            </div>

            {/* Stats count grid */}
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Platform Gross Revenue</span>
                <span className="stat-val" style={{ color: 'var(--brand)' }}>INR {stats.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Registered Accounts</span>
                <span className="stat-val">{stats.totalUsers}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Listed Properties</span>
                <span className="stat-val">{stats.totalProperties}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Stays Booked</span>
                <span className="stat-val">{stats.totalBookings}</span>
              </div>
            </div>

            {/* Charts layouts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginHeight: '320px' }}>
              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '20px' }}>
                <h4 style={{ fontWeight: 800, marginBottom: '16px' }}>Monthly Bookings Volume</h4>
                <div style={{ height: '220px', position: 'relative' }}>
                  <canvas ref={bookingsCanvasRef} />
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '20px' }}>
                <h4 style={{ fontWeight: 800, marginBottom: '16px' }}>Platform Earnings (INR)</h4>
                <div style={{ height: '220px', position: 'relative' }}>
                  <canvas ref={revenueCanvasRef} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: User audits */}
        {activeTab === 'users' && (
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '16px' }}>Registered Account Audits</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px' }}>Name</th>
                    <th style={{ padding: '12px' }}>Email</th>
                    <th style={{ padding: '12px' }}>Verified</th>
                    <th style={{ padding: '12px' }}>Active Role</th>
                    <th style={{ padding: '12px' }}>Role Switches</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((usr) => (
                    <tr key={usr._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src={usr.avatar} alt="avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                        <span>{usr.name}</span>
                      </td>
                      <td style={{ padding: '12px' }}>{usr.email}</td>
                      <td style={{ padding: '12px' }}>{usr.isVerified ? '✅ Yes' : '❌ No'}</td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{usr.role.toUpperCase()}</td>
                      <td style={{ padding: '12px' }}>
                        <select
                          value={usr.role}
                          onChange={(e) => handleRoleChange(usr._id, e.target.value)}
                          className="form-control"
                          style={{ padding: '4px 8px', fontSize: '0.8rem', width: '120px' }}
                        >
                          <option value="guest">Guest</option>
                          <option value="host">Host</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Stays Verification */}
        {activeTab === 'properties' && (
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '16px' }}>Property Verification Queue</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px' }}>Title</th>
                    <th style={{ padding: '12px' }}>City</th>
                    <th style={{ padding: '12px' }}>Host Account</th>
                    <th style={{ padding: '12px' }}>Price / Night</th>
                    <th style={{ padding: '12px' }}>Verification Status</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {propertiesList.map((prop) => (
                    <tr key={prop._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px' }}>{prop.title}</td>
                      <td style={{ padding: '12px' }}>{prop.city}, {prop.country}</td>
                      <td style={{ padding: '12px' }}>{prop.host.name}</td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>INR {prop.pricePerNight.toLocaleString()}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 'var(--border-radius-full)',
                          backgroundColor: prop.isVerified ? 'var(--accent-light)' : '#fef3c7',
                          color: prop.isVerified ? 'var(--accent-color)' : 'var(--warning-color)'
                        }}>
                          {prop.isVerified ? 'VERIFIED' : 'PENDING'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => handleVerifyProperty(prop._id, !prop.isVerified)}
                          className={prop.isVerified ? 'btn btn-secondary' : 'btn btn-brand'}
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          {prop.isVerified ? 'Revoke Verify' : 'Approve Verify'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Bookings audits */}
        {activeTab === 'bookings' && (
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '16px' }}>System Booking Audits</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px' }}>Booking ID</th>
                    <th style={{ padding: '12px' }}>Guest Account</th>
                    <th style={{ padding: '12px' }}>Property Title</th>
                    <th style={{ padding: '12px' }}>Stays Dates</th>
                    <th style={{ padding: '12px' }}>Receipt Price</th>
                    <th style={{ padding: '12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingsList.map((booking) => (
                    <tr key={booking._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px', fontMap: 'monospace' }}>{booking._id.toString().substring(0,8).toUpperCase()}</td>
                      <td style={{ padding: '12px' }}>{booking.guest.name}</td>
                      <td style={{ padding: '12px' }}>{booking.property.title}</td>
                      <td style={{ padding: '12px' }}>
                        {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700 }}>INR {booking.totalPrice.toLocaleString()}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: booking.status === 'confirmed' ? 'var(--accent-color)' : booking.status === 'cancelled' ? 'var(--danger-color)' : 'var(--warning-color)'
                        }}>{booking.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Review Moderation */}
        {activeTab === 'reviews' && (
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '16px' }}>Reviews Moderation Panel</h3>
            {reviewsList.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No reviews listed on properties currently.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {reviewsList.map((rev) => (
                  <div key={rev._id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-primary)' }}>
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <img src={rev.guest.avatar} alt="avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                        <strong style={{ fontSize: '0.875rem' }}>{rev.guest.name}</strong>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>rated stay <strong>{rev.propertyTitle}</strong></span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>"{rev.comment}"</p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--warning-color)', fontWeight: 700, display: 'block', marginTop: '6px' }}>{'★'.repeat(rev.rating)}</span>
                    </div>

                    <button
                      onClick={() => handleModerateReview(rev._id)}
                      className="btn btn-danger"
                      style={{ padding: '8px 14px', fontSize: '0.8rem', flexShrink: 0 }}
                    >
                      Delete Review
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
