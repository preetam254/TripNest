import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Load User profile on startup if cookies exist
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (data.success) {
          setUser(data.user);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Login action
  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.success) {
        setUser(data.user);
        // Redirect based on role
        if (data.user.role === 'admin') {
          navigate('/admin');
        } else if (data.user.role === 'host') {
          navigate('/host-dashboard');
        } else {
          navigate('/user-dashboard');
        }
        return { success: true };
      }
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || 'Login failed',
      };
    } finally {
      setLoading(false);
    }
  };

  // Register action
  const register = async (name, email, password, role) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { name, email, password, role });
      return { success: true, message: data.message };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || 'Registration failed',
      };
    } finally {
      setLoading(false);
    }
  };

  // Verify Email action
  const verifyEmail = async (token) => {
    try {
      const { data } = await api.post(`/auth/verify-email/${token}`);
      if (data.success) {
        setUser(data.user);
        navigate('/user-dashboard');
        return { success: true };
      }
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || 'Verification failed',
      };
    }
  };

  // Logout action
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err.message);
    } finally {
      setUser(null);
      navigate('/');
    }
  };

  // Update profile info
  const updateProfile = async (name, email) => {
    try {
      const { data } = await api.put('/users/profile', { name, email });
      if (data.success) {
        setUser(data.user);
        return { success: true };
      }
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || 'Failed to update profile',
      };
    }
  };

  // Update Profile Image
  const updateAvatar = async (formData) => {
    try {
      const { data } = await api.post('/users/profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (data.success) {
        setUser(data.user);
        return { success: true, avatar: data.avatar };
      }
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error || 'Failed to upload image',
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        verifyEmail,
        logout,
        updateProfile,
        updateAvatar,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
