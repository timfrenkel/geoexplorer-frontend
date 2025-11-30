// frontend/src/api.js
import axios from 'axios';

// In Development: localhost
// In Produktion: VITE_API_BASE_URL (z.B. von Render)
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_BASE_URL
});

// 🔐 Request-Interceptor: Token anhängen
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // Einheitlich: 'token'
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 🔁 Response-Interceptor: Bei 401 sauber ausloggen + Redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token aus dem Storage entfernen
      localStorage.removeItem('token');

      // Nur umleiten, wenn wir nicht schon auf Login/Register sind
      const path = window.location.pathname;
      if (
        !path.startsWith('/login') &&
        !path.startsWith('/register')
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
