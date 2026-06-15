import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import api from '../services/api.js';

const ForgotPassword = () => {
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setSubmitting(true);
    setStatus(null);
    try {
      const response = await api.post('/auth/forgot-password', { email: data.email });
      if (response.data.success) {
        setStatus({
          type: 'success',
          message: 'Password reset link has been sent to your email address.',
        });
      }
    } catch (err) {
      setStatus({
        type: 'danger',
        message: err.response?.data?.error || 'Something went wrong. Please try again.',
      });
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', padding: '30px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '8px' }}>Forgot Password</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', marginBottom: '24px' }}>
        Enter your email address and we'll send you a link to reset your password.
      </p>

      {status && (
        <div className={`alert alert-${status.type}`} style={{ fontSize: '0.85rem', padding: '10px 14px' }}>
          {status.type === 'success' ? '✉️' : '⚠️'} {status.message}
        </div>
      )}

      {status?.type !== 'success' && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="name@example.com"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                  message: 'Invalid email address',
                },
              })}
            />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>

          <button type="submit" className="btn btn-brand" style={{ width: '100%', padding: '12px', marginTop: '10px' }} disabled={submitting}>
            {submitting ? 'Sending link...' : 'Send Recovery Link'}
          </button>
        </form>
      )}

      <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        Back to <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 700 }}>Log in</Link>
      </p>
    </div>
  );
};

export default ForgotPassword;
