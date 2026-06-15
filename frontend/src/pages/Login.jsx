import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // If already logged in, redirect home
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (data) => {
    setSubmitting(true);
    setApiError('');
    const result = await login(data.email, data.password);
    if (!result.success) {
      setApiError(result.error);
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '60px auto', padding: '30px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '8px' }}>Welcome Back</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', marginBottom: '24px' }}>
        Log in to access stays and booking calendars.
      </p>

      {apiError && (
        <div className="alert alert-danger" style={{ fontSize: '0.85rem', padding: '10px 14px' }}>
          ⚠️ {apiError}
        </div>
      )}

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

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label className="form-label" style={{ margin: 0 }}>Password</label>
            <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--brand)', fontWeight: 600 }}>Forgot password?</Link>
          </div>
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

        <button type="submit" className="btn btn-brand" style={{ width: '100%', padding: '12px', marginTop: '10px' }} disabled={submitting}>
          {submitting ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        Don't have an account? <Link to="/register" style={{ color: 'var(--brand)', fontWeight: 700 }}>Sign up</Link>
      </p>
    </div>
  );
};

export default Login;
