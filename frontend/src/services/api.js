import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send credentials (cookies) with requests
});

// Response Interceptor to gracefully handle token issues or API errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If unauthorized error, it means JWT expired or is invalid
    if (error.response && error.response.status === 401) {
      // We can optionally clear local cache or redirect to login
      console.warn('API returned 401 Unauthorized. Session expired.');
    }
    return Promise.reject(error);
  }
);

export default api;
