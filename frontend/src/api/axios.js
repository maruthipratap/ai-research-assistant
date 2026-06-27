import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
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
