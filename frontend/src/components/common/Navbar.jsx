import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const { notifications } = useSocket();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
  };

  const getDashboardPath = () => {
    if (!user) return '/';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'host') return '/host-dashboard';
    return '/user-dashboard';
  };

  return (
    <header className="header-glass">
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1.8rem' }}>🏠</span>
        <span style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--brand)', letterSpacing: '-0.5px' }}>TripNest</span>
      </Link>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <Link to="/" style={{ fontWeight: 600, color: 'var(--text-secondary)' }} className="nav-link">Home</Link>
        <Link to="/search" style={{ fontWeight: 600, color: 'var(--text-secondary)' }} className="nav-link">Find Stays</Link>
        <Link to="/ai-planner" style={{ fontWeight: 600, color: 'var(--text-secondary)' }} className="nav-link">AI Planner</Link>
        <Link to="/ai-assistant" style={{ fontWeight: 600, color: 'var(--text-secondary)' }} className="nav-link">AI Assistant</Link>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
        {/* Dark Mode Switcher */}
        <button
          onClick={toggleTheme}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', padding: '6px' }}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        {/* Notifications badge for logged in users */}
        {isAuthenticated && unreadCount > 0 && (
          <Link to="/user-dashboard" style={{ position: 'relative', padding: '6px' }}>
            <span style={{ fontSize: '1.2rem' }}>🔔</span>
            <span style={{
              position: 'absolute',
              top: '0',
              right: '0',
              backgroundColor: 'var(--brand)',
              color: 'white',
              fontSize: '0.65rem',
              fontWeight: 800,
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>{unreadCount}</span>
          </Link>
        )}

        {/* Auth status buttons */}
        {isAuthenticated ? (
          <div>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-full)',
                padding: '4px 8px 4px 12px',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{user.name.split(' ')[0]}</span>
              <img
                src={user.avatar}
                alt={user.name}
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
              />
            </button>

            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '50px',
                right: '0',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '8px 0',
                width: '180px',
                zIndex: 100
              }}>
                <Link
                  to={getDashboardPath()}
                  onClick={() => setDropdownOpen(false)}
                  style={{ display: 'block', padding: '10px 16px', fontSize: '0.9rem', fontWeight: 500 }}
                  className="dropdown-item"
                >
                  Dashboard
                </Link>
                <Link
                  to="/user-dashboard?tab=wishlist"
                  onClick={() => setDropdownOpen(false)}
                  style={{ display: 'block', padding: '10px 16px', fontSize: '0.9rem', fontWeight: 500 }}
                  className="dropdown-item"
                >
                  My Wishlist
                </Link>
                <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--brand)',
                    cursor: 'pointer'
                  }}
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link to="/login" className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: 'var(--border-radius-sm)', fontSize: '0.875rem' }}>Log In</Link>
            <Link to="/register" className="btn btn-brand" style={{ padding: '8px 16px', borderRadius: 'var(--border-radius-sm)', fontSize: '0.875rem' }}>Sign Up</Link>
          </div>
        )}
      </div>

      <style>{`
        .nav-link {
          transition: color 0.2s;
        }
        .nav-link:hover {
          color: var(--brand) !important;
        }
        .dropdown-item:hover {
          background-color: var(--bg-tertiary);
          color: var(--brand);
        }
      `}</style>
    </header>
  );
};

export default Navbar;
