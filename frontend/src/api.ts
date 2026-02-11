// frontend/src/api.ts

// ✅ Base backend URL
export const API_BASE_URL = "https://villagesmart.in/api";

/* =========================
   USER AUTH APIs
========================= */

// Signup
export const signupUser = async (userData: any) => {
  const res = await fetch(`${API_BASE_URL}/users/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Signup failed");
  }

  return data;
};

// Login
export const loginUser = async (credentials: any) => {
  const res = await fetch(`${API_BASE_URL}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Login failed");
  }

  return data;
};

/* =========================
   ORDER APIs
========================= */

// Create Order
export const createOrder = async (orderData: any) => {
  const res = await fetch(`${API_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderData),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Order creation failed");
  }

  return data;
};

// Admin – Get all orders
export const getAllOrders = async () => {
  const res = await fetch(`${API_BASE_URL}/orders`);

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch orders");
  }

  return data;
};

/* =========================
   HELPER
========================= */

// Get logged-in user from localStorage
export const getStoredUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};
