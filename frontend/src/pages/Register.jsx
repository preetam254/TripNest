import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Register = () => {
  const { register: registerUser, isAuthenticated } = useAuth();
  const [status, setStatus] = useState(null); // { type: 'success' | 'danger', message: string }
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      role: 'guest',
    },
  });

  const password = watch('password');

  // Redirect if logged in
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (data) => {
    setSubmitting(true);
    setStatus(null);
    const result = await registerUser(data.name, data.email, data.password, data.role);
    if (result.success) {
      setStatus({
        type: 'success',
        message: result.message || 'Registration successful! Please check your email to verify your account.',
      });
    } else {
      setStatus({
        type: 'danger',
        message: result.error,
      });
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '60px auto', padding: '30px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '8px' }}>Create an Account</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', marginBottom: '24px' }}>
        Unlock vacation rental listings, planning routes, and hosting boards.
      </p>

      {status && (
        <div className={`alert alert-${status.type}`} style={{ fontSize: '0.85rem', padding: '10px 14px' }}>
          {status.type === 'success' ? '✅' : '⚠️'} {status.message}
        </div>
      )}

      {status?.type !== 'success' && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-control"
              placeholder="John Doe"
              {...register('name', { required: 'Name is required' })}
            />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="john@example.com"
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
            <label className="form-label">Account Role</label>
            <select className="form-control" style={{ cursor: 'pointer' }} {...register('role', { required: true })}>
              <option value="guest">Guest (I want to book stays)</option>
              <option value="host">Host (I want to list properties)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
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
            <label className="form-label">Confirm Password</label>
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
            {submitting ? 'Registering...' : 'Register'}
          </button>
        </form>
      )}

      <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        Already have an account? <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 700 }}>Log in</Link>
      </p>
    </div>
  );
};

export default Register;
