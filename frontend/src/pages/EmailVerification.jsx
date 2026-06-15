import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const EmailVerification = () => {
  const { token } = useParams();
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [errorMsg, setErrorMsg] = useState('');
  const verifiedRef = useRef(false);

  useEffect(() => {
    // Avoid double verification triggers in React 18 strict mode
    if (verifiedRef.current) return;
    verifiedRef.current = true;

    const performVerification = async () => {
      const result = await verifyEmail(token);
      if (result && result.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMsg(result?.error || 'Email verification failed or token expired.');
      }
    };

    performVerification();
  }, [token]);

  return (
    <div style={{ maxWidth: '400px', margin: '80px auto', padding: '40px 30px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', textAlign: 'center' }}>
      {status === 'loading' && (
        <div>
          <div style={{ border: '4px solid var(--border-color)', borderTop: '4px solid var(--brand)', borderRadius: '50%', width: '40px', height: '40px', margin: '0 auto 20px auto', animation: 'spin 1s linear infinite' }}></div>
          <h2 style={{ fontWeight: 800, fontSize: '1.5rem', marginBottom: '8px' }}>Verifying your email...</h2>
          <p style={{ color: 'var(--text-secondary)' }}>This will only take a moment.</p>
        </div>
      )}

      {status === 'success' && (
        <div>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>🎉</span>
          <h2 style={{ fontWeight: 800, fontSize: '1.6rem', color: 'var(--accent-color)', marginBottom: '8px' }}>Email Verified!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Congratulations! Your account has been verified and you are now logged in.
          </p>
          <Link to="/user-dashboard" className="btn btn-brand" style={{ padding: '12px 24px' }}>
            Go to Dashboard
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>❌</span>
          <h2 style={{ fontWeight: 800, fontSize: '1.6rem', color: 'var(--danger-color)', marginBottom: '8px' }}>Verification Failed</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            {errorMsg}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <Link to="/login" className="btn btn-secondary">Log In</Link>
            <Link to="/" className="btn btn-brand">Go Home</Link>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EmailVerification;
