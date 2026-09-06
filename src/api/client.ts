import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el token expira o es invalido, regresamos al login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Cliente para el formulario público (sin token, sin redirect a /login):
// lo usa el cliente final en /reportar-siniestro/:token, que nunca está autenticado,
// así que no debe llevar Authorization ni disparar el interceptor de 401 de arriba.
export const apiPublico = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});