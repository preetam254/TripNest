import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Carousel from '../components/common/Carousel.jsx';
import Map from '../components/common/Map.jsx';

// Dynamically load external scripts (Razorpay Checkout SDK)
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const PropertyDetails = () => {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking parameters state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [guestsCount, setGuestsCount] = useState(1);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityMsg, setAvailabilityMsg] = useState(null); // { type: 'success'|'danger', text: string }
  const [paying, setPaying] = useState(false);

  // Review submission state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  
  // Checks if guest has booked this property to show review form
  const [hasCompletedBooking, setHasCompletedBooking] = useState(false);

  const fetchPropertyData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Property details
      const propRes = await api.get(`/properties/${id}`);
      if (propRes.data.success) {
        setProperty(propRes.data.property);
      }

      // 2. Fetch Property reviews
      const revRes = await api.get(`/reviews/properties/${id}`);
      if (revRes.data.success) {
        setReviews(revRes.data.reviews);
      }

      // 3. Fetch recommendations
      const recRes = await api.get(`/ai/recommend/${id}`);
      if (recRes.data.success) {
        setRecommendations(recRes.data.recommendations);
      }

      // 4. Verify completed stay to toggle review block
      if (isAuthenticated) {
        const bookingsRes = await api.get('/bookings/my-bookings');
        if (bookingsRes.data.success) {
          const matchingBooking = bookingsRes.data.bookings.find(
            (b) =>
              b.property._id === id &&
              (b.status === 'confirmed' || b.status === 'completed')
          );
          if (matchingBooking) {
            // Check if already reviewed
            const alreadyReviewed = revRes.data.reviews.some((r) => r.guest._id === user.id);
            setHasCompletedBooking(!alreadyReviewed ? matchingBooking : null);
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load property details');
    } finally {
      setLoading(false);
    }
  }, [id, isAuthenticated, user?.id]);

  useEffect(() => {
    fetchPropertyData();
  }, [fetchPropertyData]);

  const handleCheckAvailability = async () => {
    if (!startDate || !endDate) return;
    setCheckingAvailability(true);
    setAvailabilityMsg(null);
    try {
      const { data } = await api.post('/bookings/check-availability', {
        propertyId: id,
        startDate,
        endDate,
      });

      if (data.available) {
        setAvailabilityMsg({ type: 'success', text: 'Stays dates are available! You can proceed to payment.' });
      } else {
        setAvailabilityMsg({ type: 'danger', text: 'Stays dates conflict with another booking. Try other ranges.' });
      }
    } catch (err) {
      setAvailabilityMsg({ type: 'danger', text: err.response?.data?.error || 'Failed to check availability' });
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handlePayAndBook = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!startDate || !endDate) {
      setAvailabilityMsg({ type: 'danger', text: 'Select dates first.' });
      return;
    }

    setPaying(true);
    setAvailabilityMsg(null);

    try {
      // 1. Create Pending Booking
      const bookingRes = await api.post('/bookings', {
        propertyId: id,
        startDate,
        endDate,
        guests: guestsCount,
      });

      if (!bookingRes.data.success) {
        throw new Error(bookingRes.data.error || 'Failed to register booking');
      }

      const booking = bookingRes.data.booking;

      // 2. Create Razorpay Order
      const orderRes = await api.post('/payments/order', { bookingId: booking._id });
      if (!orderRes.data.success) {
        throw new Error(orderRes.data.error || 'Failed to initiate Razorpay order');
      }

      const { order, paymentId } = orderRes.data;

      // 3. Load Razorpay Script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK. Check connection.');
      }

      // 4. Open Razorpay Modal options
      const options = {
        key: 'rzp_test_mockkey', // In prod loads from backend or window env
        amount: order.amount,
        currency: order.currency,
        name: 'TripNest Stay Booking',
        description: `Stays reservation at ${property.title}`,
        order_id: order.id,
        handler: async (response) => {
          // Cryptographic Verify on backend
          try {
            const verifyRes = await api.post('/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              bookingId: booking._id,
            });

            if (verifyRes.data.success) {
              navigate('/user-dashboard?tab=bookings', {
                state: { alertMsg: 'Stay booking paid and confirmed successfully!' },
              });
            }
          } catch (err) {
            setAvailabilityMsg({
              type: 'danger',
              text: err.response?.data?.error || 'Payment signature validation failed',
            });
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        notes: {
          bookingId: booking._id,
        },
        theme: {
          color: '#ff385c',
        },
      };

      // If mock payment, directly send verification webhook simulation
      if (order.id.startsWith('order_mock_')) {
        const confirmMock = window.confirm(
          `[DEVELOPMENT MOCK MODE]\n\nSimulate payment verification for Order ID: ${order.id}?`
        );
        if (confirmMock) {
          const verifyRes = await api.post('/payments/verify', {
            razorpayOrderId: order.id,
            bookingId: booking._id,
          });
          if (verifyRes.data.success) {
            navigate('/user-dashboard?tab=bookings', {
              state: { alertMsg: 'Mock payment verified successfully! Booking Confirmed.' },
            });
            return;
          }
        } else {
          // Cancel booking
          await api.put(`/bookings/${booking._id}/cancel`);
          setAvailabilityMsg({ type: 'danger', text: 'Transaction cancelled by user.' });
          setPaying(false);
          return;
        }
      }

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setAvailabilityMsg({ type: 'danger', text: err.message || 'Payment pipeline crashed.' });
    } finally {
      setPaying(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!comment) return;

    setSubmittingReview(true);
    setReviewError('');

    try {
      const { data } = await api.post('/reviews', {
        propertyId: id,
        bookingId: hasCompletedBooking._id,
        rating,
        comment,
      });

      if (data.success) {
        // Reload reviews and property
        setComment('');
        setHasCompletedBooking(false);
        fetchPropertyData();
      }
    } catch (err) {
      setReviewError(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <div style={{ border: '4px solid var(--border-color)', borderTop: '4px solid var(--brand)', borderRadius: '50%', width: '45px', height: '45px', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="container-pad" style={{ textAlign: 'center', padding: '60px 0' }}>
        <span style={{ fontSize: '3rem' }}>⚠️</span>
        <h2 style={{ fontWeight: 800, marginTop: '20px' }}>Stays Detail Error</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{error || 'Stay detail failed to load'}</p>
        <Link to="/search" className="btn btn-brand" style={{ marginTop: '20px' }}>Back to Stays Search</Link>
      </div>
    );
  }

  // Calculate pricing simulation
  const nightsCount =
    startDate && endDate ? Math.ceil(Math.abs(new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) || 1 : 0;

  return (
    <div className="container-pad">
      {/* Title & Ratings Header */}
      <div style={{ marginBottom: '24px' }}>
        <span className="property-card-category" style={{ fontSize: '0.85rem' }}>{property.category}</span>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', marginBottom: '8px' }}>
          {property.title}
        </h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.9rem', fontWeight: 500 }}>
            <span>⭐ {property.rating > 0 ? `${property.rating.toFixed(1)} / 5.0` : 'New Stay'} ({property.numReviews} Reviews)</span>
            <span>📍 {property.location}, {property.city}, {property.country}</span>
          </div>

          {/* Quick Chat Link to Host */}
          {isAuthenticated && user.id !== property.host._id && (
            <Link
              to={`/ai-assistant?chatHost=${property.host._id}`}
              className="btn btn-outline"
              style={{ padding: '6px 14px', borderRadius: 'var(--border-radius-full)', fontSize: '0.8rem' }}
            >
              💬 Chat with Host {property.host.name}
            </Link>
          )}
        </div>
      </div>

      {/* Images Showcase */}
      <div style={{ height: '420px', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', marginBottom: '40px', boxShadow: 'var(--shadow-md)' }}>
        <Carousel images={property.images} />
      </div>

      {/* Grid: 2 Columns - Specs (left) vs Calendar card (right) */}
      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        {/* Left Specification Column */}
        <div style={{ flex: '2 1 600px' }}>
          {/* Stay Meta specs */}
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-color)', paddingBottom: '24px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '16px 20px', borderRadius: 'var(--border-radius-md)', flexGrow: 1, textAlign: 'center' }}>
              <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '4px' }}>👥</span>
              <strong style={{ fontSize: '1.1rem', fontWeight: 800 }}>{property.maxGuests} Guests</strong>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Capacity limit</span>
            </div>
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '16px 20px', borderRadius: 'var(--border-radius-md)', flexGrow: 1, textAlign: 'center' }}>
              <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '4px' }}>🛏️</span>
              <strong style={{ fontSize: '1.1rem', fontWeight: 800 }}>{property.bedrooms} Bedrooms</strong>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{property.beds} Beds</span>
            </div>
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '16px 20px', borderRadius: 'var(--border-radius-md)', flexGrow: 1, textAlign: 'center' }}>
              <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '4px' }}>🛁</span>
              <strong style={{ fontSize: '1.1rem', fontWeight: 800 }}>{property.bathrooms} Baths</strong>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Baths count</span>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '12px' }}>About this space</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.975rem', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
              {property.description}
            </p>
          </div>

          {/* Amenities grid */}
          <div style={{ borderBottom: '1px solid var(--border-color)', borderTop: '1px solid var(--border-color)', padding: '30px 0', marginBottom: '30px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '16px' }}>What this stays offers</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
              {property.amenities.map((amenity) => (
                <div key={amenity} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  <span>🌟</span>
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Host Profile info */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', marginBottom: '40px' }}>
            <img src={property.host.avatar} alt={property.host.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, uppercase: 'true' }}>YOUR HOST</span>
              <h4 style={{ fontWeight: 800, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {property.host.name}
                {property.host.isVerified && <span title="Verified Host" style={{ fontSize: '1rem' }}>🛡️</span>}
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Contact details: {property.host.email}
              </p>
            </div>
          </div>

          {/* Map Location */}
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '16px' }}>Where you'll be</h3>
            <Map lat={property.latitude} lng={property.longitude} zoom={13} />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              Coordinates: Lat {property.latitude.toFixed(4)}, Lng {property.longitude.toFixed(4)}
            </p>
          </div>
        </div>

        {/* Right Booking Selection Column */}
        <div style={{ flex: '1 1 350px' }}>
          <div style={{
            position: 'sticky',
            top: '100px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-lg)',
            padding: '30px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                INR {property.pricePerNight.toLocaleString()}
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>/night</span>
              </span>
            </div>

            {availabilityMsg && (
              <div className={`alert alert-${availabilityMsg.type}`} style={{ fontSize: '0.8rem', padding: '10px 12px', marginBottom: '16px' }}>
                {availabilityMsg.text}
              </div>
            )}

            {/* Date Pickers */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ width: '50%', padding: '10px 12px', borderRight: '1px solid var(--border-color)' }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>CHECK-IN</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '4px' }}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div style={{ width: '50%', padding: '10px 12px' }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>CHECK-OUT</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '4px' }}
                    min={startDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              <div style={{ padding: '10px 12px' }}>
                <label style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>GUESTS</label>
                <select
                  value={guestsCount}
                  onChange={(e) => setGuestsCount(parseInt(e.target.value))}
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '4px', cursor: 'pointer' }}
                >
                  {Array.from({ length: property.maxGuests }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Check/Book Actions */}
            <button
              onClick={handleCheckAvailability}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '12px', marginBottom: '10px' }}
              disabled={checkingAvailability || paying || !startDate || !endDate}
            >
              {checkingAvailability ? 'Checking dates...' : 'Check Availability'}
            </button>

            <button
              onClick={handlePayAndBook}
              className="btn btn-brand"
              style={{ width: '100%', padding: '14px' }}
              disabled={paying || checkingAvailability || !startDate || !endDate}
            >
              {paying ? 'Processing Checkout...' : 'Reserve Stay (Pay via Razorpay)'}
            </button>

            {/* Pricing Breakdown preview */}
            {nightsCount > 0 && (
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  <span>INR {property.pricePerNight.toLocaleString()} x {nightsCount} nights</span>
                  <span>INR {(property.pricePerNight * nightsCount).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  <span>Taxes & Service fees</span>
                  <span>INR 0</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                  <span>Total</span>
                  <span>INR {(property.pricePerNight * nightsCount).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reviews & Submission Area */}
      <section style={{ marginTop: '60px', borderTop: '1px solid var(--border-color)', paddingTop: '40px' }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '24px' }}>
          ⭐ {property.rating > 0 ? `${property.rating.toFixed(1)} / 5.0` : 'No reviews'} ({reviews.length} feedback)
        </h3>

        {/* Review form (visible if verified guest booking) */}
        {hasCompletedBooking && (
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', marginBottom: '30px' }}>
            <h4 style={{ fontWeight: 800, marginBottom: '16px' }}>Leave a review</h4>
            {reviewError && <div className="alert alert-danger" style={{ fontSize: '0.8rem', padding: '8px 12px' }}>⚠️ {reviewError}</div>}
            
            <form onSubmit={handleSubmitReview}>
              <div className="form-group">
                <label className="form-label">Rating Stars</label>
                <select className="form-control" style={{ width: '120px' }} value={rating} onChange={(e) => setRating(parseInt(e.target.value))}>
                  <option value="5">5 ⭐ (Excellent)</option>
                  <option value="4">4 ⭐ (Very Good)</option>
                  <option value="3">3 ⭐ (Average)</option>
                  <option value="2">2 ⭐ (Poor)</option>
                  <option value="1">1 ⭐ (Terrible)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Review Comment</label>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Share your stay experience at this property..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-brand" disabled={submittingReview}>
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>
        )}

        {/* Review Comments list */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {reviews.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No reviews yet. Be the first to rate your stay!</p>
          ) : (
            reviews.map((rev) => (
              <div key={rev._id} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: 'var(--border-radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={rev.guest.avatar} alt={rev.guest.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '0.875rem' }}>{rev.guest.name}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(rev.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--warning-color)' }}>{'⭐'.repeat(rev.rating)}</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {rev.comment}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Similar Stays Recommendations (AI Features) */}
      <section style={{ marginTop: '60px', borderTop: '1px solid var(--border-color)', paddingTop: '40px' }}>
        <span style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)', padding: '4px 10px', borderRadius: 'var(--border-radius-full)', fontSize: '0.7rem', fontWeight: 700 }}>
          RECOMMENDED
        </span>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '8px', marginBottom: '24px' }}>Stays Similar to this Spot</h3>
        
        {recommendations.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading recommendations...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
            {recommendations.map((rec) => (
              <div key={rec._id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden', backgroundColor: 'var(--bg-secondary)' }}>
                <div style={{ height: '150px' }}>
                  <img src={rec.images[0]} alt={rec.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ padding: '15px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--brand)', fontWeight: 700 }}>{rec.category}</span>
                  <Link to={`/property/${rec._id}`} onClick={() => window.scrollTo(0, 0)} style={{ display: 'block', fontWeight: 700, fontSize: '0.9rem', margin: '4px 0', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {rec.title}
                  </Link>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginTop: '8px' }}>
                    <strong>INR {rec.pricePerNight.toLocaleString()}/night</strong>
                    <span>⭐ {rec.rating > 0 ? rec.rating.toFixed(1) : 'New'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PropertyDetails;
