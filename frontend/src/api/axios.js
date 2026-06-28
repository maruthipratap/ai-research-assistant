import axios from "axios";

// In dev (npm run dev), VITE_API_URL is unset, so this falls back to
// localhost - same as before. In Docker/production, VITE_API_URL gets
// baked in at build time, pointing at wherever the backend actually lives.
// Hardcoding "localhost:5000" would silently break in any environment
// other than your own laptop - this is the actual reason environment
// variables exist in production systems.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Attaches the JWT (if we have one stored) to every outgoing request.
// This is the standard pattern for talking to a protected REST API.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
