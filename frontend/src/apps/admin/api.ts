import { apiClient } from "../../api/apiClient";

export { API_BASE_URL } from "../../api/apiClient";

/* ===========================
   AUTH
=========================== */

export const loginAdmin = async (credentials: {
  username?: string;
  phone?: string;
  password: string;
}) => {
  const payload = {
    username: credentials.username || credentials.phone,
    password: credentials.password,
  };

  const data: any = await apiClient.post("/admin/login", payload);

  if (data.token) {
    localStorage.setItem("jwt_token_admin", data.token);
    localStorage.setItem("user_role_admin", data.role);
  }

  return data;
};

/* ===========================
   ADMIN PANEL
=========================== */

export const getAdminPanelData = async () => {
  return apiClient.get("/orders/admin/panel-data");
};

export const getAdminDashboardStats = async () => {
  return apiClient.get("/admin/dashboard");
};

/* ===========================
   ORDER MANAGEMENT
=========================== */

export const confirmOrder = async (orderId: number) => {
  return apiClient.put(`/orders/${orderId}/status`, {
    status: "ACCEPTED",
    delivery_status: "PENDING_PICKUP",
  });
};

export const updateOrderStatus = async (orderId: number, status: string) => {
  return apiClient.put(`/orders/${orderId}/status`, {
    status: status,
    delivery_status: status,
  });
};

export const cancelOrder = async (orderId: number, reason: string) => {
  return apiClient.post(`/orders/admin-cancel/${orderId}`, { reason });
};

export const sendGarlandReminder = async (orderId: number) => {
  return apiClient.post(`/orders/garland/reminder/${orderId}`);
};

/* ===========================
   TRANSPORT
=========================== */

export const confirmTransportBooking = async (bookingId: number) => {
  return apiClient.post(`/transport/confirm/${bookingId}`);
};

/* ===========================
   PARTY HALL
=========================== */

export const confirmPartyHallBooking = async (bookingId: number) => {
  return apiClient.post(`/party-hall/confirm/${bookingId}`);
};

/* ===========================
   PRODUCTS
=========================== */

export const getAllProducts = async () => {
  return apiClient.get("/products");
};

export const createProduct = async (productData: any) => {
  return apiClient.post("/products/add", productData);
};

export const updateProduct = async (productId: number, updateData: any) => {
  return apiClient.put(`/products/${productId}`, updateData);
};

export const deleteProduct = async (productId: number) => {
  return apiClient.delete(`/products/${productId}`);
};

/* ===========================
   USERS
=========================== */

export const getAllUsers = async () => {
  return apiClient.get("/users");
};

/* ===========================
   PARTNERS
=========================== */

export const getDeliveryPartners = async () => {
  return apiClient.get("/admin/delivery-partners");
};

export const getTransportPartners = async () => {
  return apiClient.get("/admin/transport-partners");
};

export const approvePartner = async (
  type: "delivery" | "transport",
  id: number
) => {
  return apiClient.put(`/admin/approve/${type}/${id}`);
};

export const rejectPartner = async (
  type: "delivery" | "transport",
  id: number
) => {
  return apiClient.put(`/admin/reject/${type}/${id}`);
};
export const blockPartner = async (partnerRole: string, partnerId: number) => {
  return apiClient.post("/admin/block-partner", { partnerRole, partnerId });
};

export const unblockPartner = async (partnerRole: string, partnerId: number) => {
  return apiClient.post("/admin/unblock-partner", { partnerRole, partnerId });
};

export const forceReloadApps = async () => {
  return apiClient.post("/admin/force-reload");
};

export const getAdminStats = async () => {
  return apiClient.get("/admin/stats");
};

/* ===========================
   HELPER
=========================== */

export const getStoredAdmin = () => {
  const user = localStorage.getItem("admin_user");
  return user ? JSON.parse(user) : null;
};