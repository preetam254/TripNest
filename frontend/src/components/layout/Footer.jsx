import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;

    try {
      const { data } = await api.post('/newsletter', { email });
      if (data.success) {
        setStatus({ type: 'success', message: data.message });
        setEmail('');
      }
    } catch (err) {
      setStatus({
        type: 'danger',
        message: err.response?.data?.error || 'Subscription failed',
      });
    }
  };

  return (
    <footer style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', padding: '60px 4% 30px 4%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px', marginBottom: '40px' }}>
        {/* Brand column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.5rem' }}>🏠</span>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--brand)' }}>TripNest</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            AI-powered vacation accommodation booking platform. Find stunning stays, plan perfect travel routes, and explore luxury destinations globally.
          </p>
        </div>

        {/* Categories column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Stays Categories</h4>
          <Link to="/search?category=Beachfront" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }} className="foot-link">Beachfront Houses</Link>
          <Link to="/search?category=Cabin" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }} className="foot-link">Cozy Cabins</Link>
          <Link to="/search?category=Modern" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }} className="foot-link">Modern Apartments</Link>
          <Link to="/search?category=Villa" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }} className="foot-link">Luxury Villas</Link>
        </div>

        {/* Explore column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Explore</h4>
          <Link to="/search" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }} className="foot-link">Browse Rentals</Link>
          <Link to="/ai-planner" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }} className="foot-link">AI Travel Planner</Link>
          <Link to="/ai-assistant" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }} className="foot-link">AI Assistant</Link>
        </div>

        {/* Newsletter column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Join Newsletter</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Get the latest travel ideas, stay discounts, and AI itineraries directly in your inbox.
          </p>
          <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="form-control"
              style={{ padding: '8px 12px', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem' }}
            />
            <button type="submit" className="btn btn-brand" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Join</button>
          </form>
          {status && (
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: status.type === 'success' ? 'var(--accent-color)' : 'var(--danger-color)' }}>
              {status.message}
            </p>
          )}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        <span>&copy; {new Date().getFullYear()} TripNest Inc. All rights reserved.</span>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="#" className="foot-link">Privacy Policy</a>
          <a href="#" className="foot-link">Terms of Service</a>
        </div>
      </div>

      <style>{`
        .foot-link {
          transition: color 0.2s;
        }
        .foot-link:hover {
          color: var(--brand) !important;
        }
      `}</style>
    </footer>
  );
};

export default Footer;
