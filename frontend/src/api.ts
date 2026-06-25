import { apiClient } from "./api/apiClient";

export { API_BASE_URL, apiClient } from "./api/apiClient";

/* ===========================
   USER SIGNUP
=========================== */

export const signupUser = async (userData: any) => {
  return apiClient.post("/user/signup", userData);
};

/* ===========================
   USER LOGIN
=========================== */

export const loginUser = async (credentials: any) => {
  const data: any = await apiClient.post("/auth/login", credentials);

  if (data.token) {
    localStorage.setItem("jwt_token", data.token);
    localStorage.setItem("user_role", data.role);
  }

  return data;
};

/* ===========================
   PRODUCTS
=========================== */

export const getProducts = async () => {
  return apiClient.get("/products");
};

/* ===========================
   CART
=========================== */

export const addToCart = async (cartData: {
  user_id: number;
  product_id: number;
  quantity: number;
}) => {
  return apiClient.post("/cart", cartData);
};

/* ===========================
   CREATE ORDER
=========================== */

export const createOrder = async (orderData: any) => {
  return apiClient.post("/orders", orderData);
};

/* ===========================
   USER ORDERS
=========================== */

export const getUserOrders = async (userId: number) => {
  return apiClient.get(`/orders/user/${userId}`);
};

/* ===========================
   NOTIFICATIONS
=========================== */

export const getUserNotifications = async (userId: number) => {
  return apiClient.get(`/notifications/${userId}`);
};

/* ===========================
   STORED USER
=========================== */

export const getStoredUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

/* ===========================
   LOGOUT
=========================== */

export const logout = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("jwt_token");
  localStorage.removeItem("user_role");
};