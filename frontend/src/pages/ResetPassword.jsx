import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api.js';

const ResetPassword = () => {
  const { token } = useParams();
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors }, watch } = useForm();

  const password = watch('password');

  const onSubmit = async (data) => {
    setSubmitting(true);
    setStatus(null);
    try {
      const response = await api.post(`/auth/reset-password/${token}`, { password: data.password });
      if (response.data.success) {
        setStatus({
          type: 'success',
          message: 'Your password has been reset successfully. You can now log in.',
        });
      }
    } catch (err) {
      setStatus({
        type: 'danger',
        message: err.response?.data?.error || 'Token expired or invalid. Try again.',
      });
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', padding: '30px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '8px' }}>Reset Password</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', marginBottom: '24px' }}>
        Create a strong, new password for your account.
      </p>

      {status && (
        <div className={`alert alert-${status.type}`} style={{ fontSize: '0.85rem', padding: '10px 14px' }}>
          {status.type === 'success' ? '🔑' : '⚠️'} {status.message}
        </div>
      )}

      {status?.type !== 'success' && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
            />
            {errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••"
              {...register('confirmPassword', {
                required: 'Please confirm password',
                validate: (value) => value === password || 'Passwords do not match',
              })}
            />
            {errors.confirmPassword && <p className="form-error">{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" className="btn btn-brand" style={{ width: '100%', padding: '12px', marginTop: '10px' }} disabled={submitting}>
            {submitting ? 'Resetting password...' : 'Update Password'}
          </button>
        </form>
      )}

      <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        Back to <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 700 }}>Log in</Link>
      </p>
    </div>
  );
};

export default ResetPassword;
