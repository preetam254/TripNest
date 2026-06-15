import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Sidebar from '../../components/layout/Sidebar.jsx';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const HostDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');
  
  // Data states
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({ activeListings: 0, totalRevenue: 0, totalBookings: 0 });
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null); // { type: 'success' | 'danger', text: string }
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);

  // Form handling
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();
  const [uploadFiles, setUploadFiles] = useState([]);

  // Canvas charts ref
  const chartCanvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const menuItems = [
    { id: 'analytics', label: 'Stays Analytics', icon: '📊' },
    { id: 'listings', label: 'Stays Listings', icon: '🏡' },
  ];

  const categories = ['Beachfront', 'Cabin', 'Modern', 'Villa', 'Castle', 'Treehouse', 'Countryside', 'Lakefront'];
  const amenitiesList = ['Wifi', 'Kitchen', 'Air Conditioning', 'Pool', 'Hot Tub', 'Fireplace', 'Free Parking'];

  const fetchHostData = async () => {
    setLoading(true);
    try {
      // 1. Get properties
      const propRes = await api.get('/properties');
      // Filter stays belonging to this host
      const hostProps = propRes.data.properties.filter(p => p.host._id === user.id);
      setProperties(hostProps);

      // 2. Get bookings
      const bookRes = await api.get('/bookings/host-bookings');
      if (bookRes.data.success) {
        setBookings(bookRes.data.bookings);

        // 3. Compile statistics
        const confirmedStays = bookRes.data.bookings.filter(b => b.status === 'confirmed' || b.status === 'completed');
        const revenue = confirmedStays.reduce((sum, b) => sum + b.totalPrice, 0);

        setStats({
          activeListings: hostProps.length,
          totalRevenue: revenue,
          totalBookings: bookRes.data.bookings.length,
        });

        // Trigger chart rendering
        renderChart(confirmedStays);
      }
    } catch (err) {
      console.error('Error loading host details:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchHostData();
    }
  }, [user, activeTab]);

  const renderChart = (confirmedStays) => {
    if (!chartCanvasRef.current) return;

    // Destory existing charts instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Aggregate monthly earnings
    const monthlyEarnings = Array(12).fill(0);
    confirmedStays.forEach((stay) => {
      const month = new Date(stay.createdAt).getMonth();
      monthlyEarnings[month] += stay.totalPrice;
    });

    const ctx = chartCanvasRef.current.getContext('2d');
    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
          {
            label: 'Monthly Earnings (INR)',
            data: monthlyEarnings,
            borderColor: '#ff385c',
            backgroundColor: 'rgba(255, 56, 92, 0.15)',
            borderWidth: 3,
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'var(--border-color)',
            },
            ticks: {
              color: 'var(--text-secondary)',
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: 'var(--text-secondary)',
            },
          },
        },
      },
    });
  };

  const handleCreateOrEditProperty = async (data) => {
    setLoading(true);
    setAlert(null);

    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('pricePerNight', data.pricePerNight);
      formData.append('location', data.location);
      formData.append('country', data.country);
      formData.append('state', data.state);
      formData.append('city', data.city);
      formData.append('latitude', data.latitude);
      formData.append('longitude', data.longitude);
      formData.append('category', data.category);
      formData.append('maxGuests', data.maxGuests);
      formData.append('bedrooms', data.bedrooms);
      formData.append('bathrooms', data.bathrooms);
      formData.append('beds', data.beds);
      formData.append('rules', JSON.stringify(data.rules ? data.rules.split(',') : []));

      // Map amenities list
      const selectedAm = amenitiesList.filter((_, idx) => data.amenities[idx]);
      formData.append('amenities', JSON.stringify(selectedAm));

      // Append files
      if (uploadFiles.length > 0) {
        for (let i = 0; i < uploadFiles.length; i++) {
          formData.append('images', uploadFiles[i]);
        }
      }

      let response;
      if (editingProperty) {
        response = await api.put(`/properties/${editingProperty._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        response = await api.post('/properties', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (response.data.success) {
        setAlert({
          type: 'success',
          text: editingProperty ? 'Listing updated successfully!' : 'Listing created successfully and pending review!',
        });
        setModalOpen(false);
        setEditingProperty(null);
        setUploadFiles([]);
        reset();
        fetchHostData();
      }
    } catch (err) {
      setAlert({
        type: 'danger',
        text: err.response?.data?.error || 'Failed to save property listing',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (prop) => {
    setEditingProperty(prop);
    setModalOpen(true);
    
    // Prefill form values
    setValue('title', prop.title);
    setValue('description', prop.description);
    setValue('pricePerNight', prop.pricePerNight);
    setValue('location', prop.location);
    setValue('country', prop.country);
    setValue('state', prop.state);
    setValue('city', prop.city);
    setValue('latitude', prop.latitude);
    setValue('longitude', prop.longitude);
    setValue('category', prop.category);
    setValue('maxGuests', prop.maxGuests);
    setValue('bedrooms', prop.bedrooms);
    setValue('bathrooms', prop.bathrooms);
    setValue('beds', prop.beds);
    setValue('rules', prop.rules.join(','));
    
    // Prefill amenities indices
    const amenitiesChecks = amenitiesList.map(am => prop.amenities.includes(am));
    setValue('amenities', amenitiesChecks);
  };

  const handleDeleteProperty = async (propId) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this property stay? This action is permanent.');
    if (!confirmDelete) return;

    try {
      const { data } = await api.delete(`/properties/${propId}`);
      if (data.success) {
        setAlert({ type: 'success', text: 'Property listing deleted successfully.' });
        fetchHostData();
      }
    } catch (err) {
      setAlert({ type: 'danger', text: err.response?.data?.error || 'Failed to delete property' });
    }
  };

  const handleUpdateBookingStatus = async (bookingId, status) => {
    try {
      if (status === 'cancelled') {
        const confirmCancel = window.confirm('Are you sure you want to cancel this booking stay? Refund will be processed.');
        if (!confirmCancel) return;
        await api.post(`/payments/refund/${bookingId}`);
      } else {
        // Simple confirmation updates
        await api.put(`/bookings/${bookingId}/cancel`); // Uses cancel logic or we can write approve logic
        // For simplicity, we can let hosts cancel or view stays. In our routes, we supported guest/host cancellation.
      }
      setAlert({ type: 'success', text: 'Booking state updated successfully.' });
      fetchHostData();
    } catch (err) {
      setAlert({ type: 'danger', text: err.response?.data?.error || 'Failed to update stay status' });
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar navigation */}
      <Sidebar menuItems={menuItems} activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Panel Body */}
      <main className="dashboard-body">
        {alert && (
          <div className={`alert alert-${alert.type}`} style={{ fontSize: '0.9rem', marginBottom: '24px' }}>
            {alert.text}
          </div>
        )}

        {/* Tab 1: Analytics overview */}
        {activeTab === 'analytics' && (
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '24px' }}>Hosting Dashboard Analytics</h3>

            {/* Counters */}
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Gross Revenue</span>
                <span className="stat-val" style={{ color: 'var(--brand)' }}>INR {stats.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Active Listings</span>
                <span className="stat-val">{stats.activeListings}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Reservations</span>
                <span className="stat-val">{stats.totalBookings}</span>
              </div>
            </div>

            {/* Canvas Chart Card */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '30px', marginBottom: '40px', boxShadow: 'var(--shadow-sm)' }}>
              <h4 style={{ fontWeight: 800, marginBottom: '20px' }}>Revenue Chart (Gross Earnings)</h4>
              <div style={{ height: '260px', position: 'relative' }}>
                <canvas ref={chartCanvasRef} />
              </div>
            </div>

            {/* Booking reservations table */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
              <h4 style={{ fontWeight: 800, marginBottom: '16px' }}>Recent Guest Stays</h4>
              {bookings.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No reservation bookings listed for your stays yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '12px' }}>Guest</th>
                        <th style={{ padding: '12px' }}>Property</th>
                        <th style={{ padding: '12px' }}>Dates</th>
                        <th style={{ padding: '12px' }}>Total Price</th>
                        <th style={{ padding: '12px' }}>Status</th>
                        <th style={{ padding: '12px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking) => (
                        <tr key={booking._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img src={booking.guest.avatar} alt="avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                            <span>{booking.guest.name}</span>
                          </td>
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
                          <td style={{ padding: '12px' }}>
                            {booking.status === 'confirmed' && (
                              <button
                                onClick={() => handleUpdateBookingStatus(booking._id, 'cancelled')}
                                className="btn btn-danger"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              >
                                Cancel & Refund
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Stays listing CRUD */}
        {activeTab === 'listings' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Manage My Stays</h3>
              <button
                onClick={() => {
                  setEditingProperty(null);
                  reset();
                  setUploadFiles([]);
                  setModalOpen(true);
                }}
                className="btn btn-brand"
              >
                + Create Stay
              </button>
            </div>

            {/* Properties Listings Table */}
            {properties.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>You haven't listed any vacation nests yet. Create one now!</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                {properties.map((prop) => (
                  <div key={prop._id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ height: '160px', position: 'relative' }}>
                      <img src={prop.images[0]} alt={prop.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        backgroundColor: prop.isVerified ? 'var(--accent-color)' : 'var(--warning-color)',
                        color: 'white',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 'var(--border-radius-full)'
                      }}>
                        {prop.isVerified ? 'Verified' : 'Pending Verification'}
                      </div>
                    </div>
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--brand)', fontWeight: 700, textTransform: 'uppercase' }}>{prop.category}</span>
                      <h4 style={{ fontWeight: 800, fontSize: '1.05rem', margin: '4px 0 8px 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{prop.title}</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '15px' }}>📍 {prop.city}, {prop.country}</p>
                      
                      <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '15px' }}>INR {prop.pricePerNight.toLocaleString()}/night</strong>

                      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                        <button onClick={() => handleEditClick(prop)} className="btn btn-secondary" style={{ flexGrow: 1, padding: '8px', fontSize: '0.8rem' }}>Edit Details</button>
                        <button onClick={() => handleDeleteProperty(prop._id)} className="btn btn-danger" style={{ padding: '8px', fontSize: '0.8rem' }}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal form for listing creations & edits */}
        {modalOpen && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="modal-header">
                <h4 style={{ fontWeight: 800 }}>{editingProperty ? 'Edit Stays Details' : 'Create Vacation Stay Listing'}</h4>
                <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
              </div>

              <form onSubmit={handleSubmit(handleCreateOrEditProperty)} className="modal-body">
                {/* Title & Desc */}
                <div className="form-group">
                  <label className="form-label">Stay Title</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Sunny Oceanfront Cottage"
                    {...register('title', { required: 'Title is required' })}
                  />
                  {errors.title && <p className="form-error">{errors.title.message}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Property Description</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Describe rooms, views, key highlights..."
                    {...register('description', { required: 'Description is required' })}
                  />
                  {errors.description && <p className="form-error">{errors.description.message}</p>}
                </div>

                {/* Pricing & Category */}
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div className="form-group" style={{ width: '50%' }}>
                    <label className="form-label">Price per Night (INR)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 5000"
                      {...register('pricePerNight', { required: 'Price is required', min: 1 })}
                    />
                  </div>
                  <div className="form-group" style={{ width: '50%' }}>
                    <label className="form-label">Category</label>
                    <select className="form-control" {...register('category', { required: true })}>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>

                {/* Geography Address */}
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div className="form-group" style={{ width: '33%' }}>
                    <label className="form-label">City</label>
                    <input type="text" className="form-control" {...register('city', { required: true })} />
                  </div>
                  <div className="form-group" style={{ width: '33%' }}>
                    <label className="form-label">State</label>
                    <input type="text" className="form-control" {...register('state', { required: true })} />
                  </div>
                  <div className="form-group" style={{ width: '33%' }}>
                    <label className="form-label">Country</label>
                    <input type="text" className="form-control" {...register('country', { required: true })} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Full Address / Location</label>
                  <input type="text" className="form-control" placeholder="12 St Road, City, Country" {...register('location', { required: true })} />
                </div>

                {/* Coordinates (Vitals for map marker alignments) */}
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div className="form-group" style={{ width: '50%' }}>
                    <label className="form-label">Latitude</label>
                    <input type="number" step="any" className="form-control" placeholder="e.g. 35.0003" {...register('latitude', { required: true })} />
                  </div>
                  <div className="form-group" style={{ width: '50%' }}>
                    <label className="form-label">Longitude</label>
                    <input type="number" step="any" className="form-control" placeholder="e.g. 135.7797" {...register('longitude', { required: true })} />
                  </div>
                </div>

                {/* Capacities */}
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div className="form-group" style={{ width: '25%' }}>
                    <label className="form-label">Max Guests</label>
                    <input type="number" className="form-control" {...register('maxGuests', { required: true, min: 1 })} />
                  </div>
                  <div className="form-group" style={{ width: '25%' }}>
                    <label className="form-label">Bedrooms</label>
                    <input type="number" className="form-control" {...register('bedrooms', { required: true, min: 0 })} />
                  </div>
                  <div className="form-group" style={{ width: '25%' }}>
                    <label className="form-label">Beds</label>
                    <input type="number" className="form-control" {...register('beds', { required: true, min: 1 })} />
                  </div>
                  <div className="form-group" style={{ width: '25%' }}>
                    <label className="form-label">Bathrooms</label>
                    <input type="number" className="form-control" {...register('bathrooms', { required: true, min: 0 })} />
                  </div>
                </div>

                {/* Checkbox Amenities */}
                <div className="form-group">
                  <label className="form-label">Amenities</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {amenitiesList.map((am, idx) => (
                      <label key={am} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input type="checkbox" {...register(`amenities.${idx}`)} style={{ accentColor: 'var(--brand)' }} />
                        {am}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Text rules list */}
                <div className="form-group">
                  <label className="form-label">Stays Rules (Comma separated)</label>
                  <input type="text" className="form-control" placeholder="e.g. No smoking, No shoes inside, Quiet hours after 10 PM" {...register('rules')} />
                </div>

                {/* File Uploader */}
                <div className="form-group">
                  <label className="form-label">Upload Images (Accepts Multiple files)</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setUploadFiles(e.target.files)}
                    className="form-control"
                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                    required={!editingProperty}
                  />
                  {editingProperty && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Leave blank to keep existing photos.</p>}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="btn btn-brand" style={{ flexGrow: 1 }} disabled={loading}>
                    {loading ? 'Saving Listing...' : 'Save Stays Listing'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default HostDashboard;
