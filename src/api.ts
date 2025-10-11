export const API_BASE = "http://localhost:5000/api";

import axios from "axios";
export const API = axios.create({
  baseURL: API_BASE,
});
