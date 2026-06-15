import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import Sidebar from '../../components/layout/Sidebar.jsx';
import PropertyCard from '../../components/property/PropertyCard.jsx';

const UserDashboard = () => {
  const { user, updateProfile, updateAvatar, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Find active tab from URL queries or default to profile
  const [activeTab, setActiveTab] = useState(() => {
    const query = new URLSearchParams(location.search);
    return query.get('tab') || 'profile';
  });

  // Data states
  const [bookings, setBookings] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null); // { type: 'success'|'danger', text: string }

  // Form states
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const menuItems = [
    { id: 'profile', label: 'My Profile', icon: '👤' },
    { id: 'bookings', label: 'Stays Bookings', icon: '📅' },
    { id: 'wishlist', label: 'My Wishlist', icon: '❤️' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
  ];

  // Load alert messages sent from page redirects (e.g., payment success)
  useEffect(() => {
    if (location.state && location.state.alertMsg) {
      setAlert({ type: 'success', text: location.state.alertMsg });
      // Clear location state history
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Load tab specific data
  useEffect(() => {
    setAlert(null);
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'bookings') {
          const { data } = await api.get('/bookings/my-bookings');
          if (data.success) setBookings(data.bookings);
        } else if (activeTab === 'wishlist') {
          const { data } = await api.get('/wishlist');
          if (data.success) setWishset(data.wishlist);
        } else if (activeTab === 'notifications') {
          await fetchNotifications();
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeTab, user]);

  const setWishset = (data) => {
    setWishlist(data);
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadNotifCount(data.unreadCount);
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setAlert(null);
    const result = await updateProfile(profileName, profileEmail);
    if (result.success) {
      setAlert({ type: 'success', text: 'Profile information updated successfully!' });
    } else {
      setAlert({ type: 'danger', text: result.error });
    }
    setProfileLoading(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProfileLoading(true);
    setAlert(null);
    const formData = new FormData();
    formData.append('avatar', file);

    const result = await updateAvatar(formData);
    if (result.success) {
      setAlert({ type: 'success', text: 'Profile avatar updated successfully!' });
    } else {
      setAlert({ type: 'danger', text: result.error });
    }
    setProfileLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    setProfileLoading(true);
    setAlert(null);
    try {
      const { data } = await api.post('/auth/change-password', { currentPassword, newPassword });
      if (data.success) {
        setAlert({ type: 'success', text: 'Password changed successfully!' });
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch (err) {
      setAlert({ type: 'danger', text: err.response?.data?.error || 'Password update failed' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    const confirmCancel = window.confirm('Are you sure you want to cancel this booking stay?');
    if (!confirmCancel) return;

    try {
      const { data } = await api.put(`/bookings/${bookingId}/cancel`);
      if (data.success) {
        setAlert({ type: 'success', text: 'Booking stay cancelled. Refund is processing.' });
        // Reload list
        const reload = await api.get('/bookings/my-bookings');
        setBookings(reload.data.bookings);
      }
    } catch (err) {
      setAlert({ type: 'danger', text: err.response?.data?.error || 'Failed to cancel booking' });
    }
  };

  const handleMarkNotifRead = async (id) => {
    try {
      const { data } = await api.put(`/notifications/${id}/read`);
      if (data.success) {
        fetchNotifications();
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleMarkAllNotifRead = async () => {
    try {
      const { data } = await api.put('/notifications/read-all');
      if (data.success) {
        fetchNotifications();
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleWishlistToggle = (propId, isAdded) => {
    if (!isAdded) {
      setWishlist((prev) => prev.filter((p) => p._id !== propId));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'var(--accent-color)';
      case 'cancelled': return 'var(--danger-color)';
      case 'completed': return 'var(--text-secondary)';
      default: return 'var(--warning-color)';
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar navigation */}
      <Sidebar menuItems={menuItems} activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main dashboard body panels */}
      <main className="dashboard-body">
        {alert && (
          <div className={`alert alert-${alert.type}`} style={{ fontSize: '0.9rem', marginBottom: '24px' }}>
            {alert.text}
          </div>
        )}

        {/* Tab 1: Profile management */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
            {/* Column A: Edit info */}
            <div style={{ flex: '1 1 400px', backgroundColor: 'var(--bg-secondary)', padding: '30px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '24px' }}>Profile Settings</h3>
              
              <form onSubmit={handleUpdateProfile}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-brand" disabled={profileLoading}>
                  {profileLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>

              {/* Password update box */}
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '40px', marginBottom: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '30px' }}>
                Update Password
              </h3>
              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-dark" disabled={profileLoading}>
                  {profileLoading ? 'Updating...' : 'Change Password'}
                </button>
              </form>
            </div>

            {/* Column B: Avatar / Role badge */}
            <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', padding: '30px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', height: 'fit-content' }}>
              <img
                src={user?.avatar}
                alt={user?.name}
                style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--brand)', marginBottom: '16px' }}
              />
              <label className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '12px' }}>
                Upload photo
                <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
              </label>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <h4 style={{ fontWeight: 800 }}>{user?.name}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{user?.email}</p>
                
                <span style={{
                  display: 'inline-block',
                  backgroundColor: 'var(--brand-light)',
                  color: 'var(--brand)',
                  padding: '4px 12px',
                  borderRadius: 'var(--border-radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  marginTop: '12px'
                }}>
                  Role: {user?.role}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Bookings History */}
        {activeTab === 'bookings' && (
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '24px' }}>My Stays Bookings</h3>
            
            {loading ? (
              <p>Loading bookings...</p>
            ) : bookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '2.5rem' }}>📅</span>
                <h4 style={{ fontWeight: 700, marginTop: '15px' }}>No bookings found</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>You haven't reserved any nests yet.</p>
                <button onClick={() => navigate('/search')} className="btn btn-brand" style={{ marginTop: '16px' }}>Find Stays</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {bookings.map((booking) => (
                  <div key={booking._id} style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '20px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: '20px',
                    alignItems: 'center'
                  }}>
                    {/* Stay photo */}
                    <img
                      src={booking.property.images[0]}
                      alt={booking.property.title}
                      style={{ width: '120px', height: '80px', borderRadius: 'var(--border-radius-sm)', objectFit: 'cover' }}
                    />
                    
                    {/* Stay details */}
                    <div style={{ flexGrow: 1 }}>
                      <Link to={`/property/${booking.property._id}`} style={{ fontWeight: 800, fontSize: '1.1rem', hover: { color: 'var(--brand)' } }}>
                        {booking.property.title}
                      </Link>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                        📍 {booking.property.city}, {booking.property.country}
                      </p>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        Dates: {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()} ({booking.guests} guest{booking.guests > 1 ? 's' : ''})
                      </p>
                    </div>

                    {/* Pricing and status badge */}
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <strong style={{ fontSize: '1.1rem' }}>INR {booking.totalPrice.toLocaleString()}</strong>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: getStatusColor(booking.status),
                      }}>{booking.status}</span>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', borderLeft: '1px solid var(--border-color)', paddingLeft: '20px' }} className="booking-act-pane">
                      {booking.status === 'confirmed' && (
                        <a
                          href={`/api/bookings/${booking._id}/invoice`}
                          download
                          className="btn btn-secondary"
                          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                        >
                          📄 Invoice PDF
                        </a>
                      )}
                      
                      {/* Review stay link */}
                      {(booking.status === 'confirmed' || booking.status === 'completed') && (
                        <Link
                          to={`/property/${booking.property._id}`}
                          className="btn btn-outline"
                          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                        >
                          ⭐ Rate Stay
                        </Link>
                      )}

                      {/* Cancel stay */}
                      {(booking.status === 'pending' || booking.status === 'confirmed') && (
                        <button
                          onClick={() => handleCancelBooking(booking._id)}
                          className="btn btn-danger"
                          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                        >
                          Cancel Stays
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Wishlist */}
        {activeTab === 'wishlist' && (
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '24px' }}>My Liked stays</h3>
            {loading ? (
              <p>Loading wishlist...</p>
            ) : wishlist.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No liked stays. Add properties to your wishlist by clicking the heart button on stay cards.</p>
            ) : (
              <div className="grid-layout">
                {wishlist.map((item) => (
                  <PropertyCard
                    key={item._id}
                    property={item}
                    initialIsWishlisted={true}
                    onWishlistToggle={handleWishlistToggle}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Notifications alerts */}
        {activeTab === 'notifications' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>In-App Notifications ({unreadNotifCount} unread)</h3>
              {unreadNotifCount > 0 && (
                <button onClick={handleMarkAllNotifRead} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  Mark all as read
                </button>
              )}
            </div>

            {loading ? (
              <p>Loading alerts...</p>
            ) : notifications.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No alerts listed.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {notifications.map((notif) => (
                  <div
                    key={notif._id}
                    onClick={() => !notif.isRead && handleMarkNotifRead(notif._id)}
                    style={{
                      backgroundColor: notif.isRead ? 'var(--bg-secondary)' : 'var(--brand-light)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--border-radius-sm)',
                      padding: '16px 20px',
                      cursor: notif.isRead ? 'default' : 'pointer',
                      transition: 'background-color 0.2s',
                      position: 'relative'
                    }}
                  >
                    {!notif.isRead && (
                      <span style={{
                        position: 'absolute',
                        top: '16px',
                        right: '20px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--brand)'
                      }} />
                    )}
                    <h4 style={{ fontWeight: 800, fontSize: '0.95rem', color: notif.isRead ? 'var(--text-primary)' : 'var(--brand)', marginBottom: '4px' }}>
                      {notif.title}
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {notif.message}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      <style>{`
        @media(max-width: 768px) {
          .booking-act-pane {
            border-left: none !important;
            padding-left: 0 !important;
            width: 100%;
            margin-top: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default UserDashboard;
