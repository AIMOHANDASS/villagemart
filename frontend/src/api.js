import axios from "axios";

// 🔗 Base API URL (Production)
// 👉 CHANGE THIS AFTER DEPLOYMENT
export const API_BASE_URL = "http://localhost:5000/api";

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
