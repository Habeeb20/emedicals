import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api`,
  timeout: 20000,
});

// Attach the token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Expired or invalid token: clear it and tell the app (the auth context will listen for this)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

// Pull a readable message out of any axios error
export const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || 'Something went wrong';

export default api;














