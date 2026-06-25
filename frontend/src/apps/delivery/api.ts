import { apiClient } from "../../api/apiClient";

export { API_BASE_URL } from "../../api/apiClient";

// ============================
// LOGIN
// ============================

export const loginUser = async (credentials: {
  email?: string;
  phone?: string;
  password: string;
}) => {
  const payload = {
    email: credentials.email || credentials.phone,
    password: credentials.password,
  };

  const data: any = await apiClient.post("/delivery/login", payload);

  if (data.token) {
    localStorage.setItem("jwt_token_delivery", data.token);
    localStorage.setItem("role", data.role || "DELIVERY");
  }

  return data;
};

// ============================
// SIGNUP
// ============================

export const signupUser = async (partnerData: FormData | any) => {
  const isFormData = partnerData instanceof FormData;
  
  if (isFormData) {
    return apiClient.post("/delivery/signup", partnerData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }

  return apiClient.post("/delivery/signup", partnerData);
};

// ============================
// GET ORDERS
// ============================

export const getPendingOrders = async () => {
  const data: any = await apiClient.get("/delivery/orders");
  return {
    orders: data.data || [],
  };
};

// ============================
// NEARBY ORDERS
// ============================

export const getNearbyOrders = async (lat: number, lng: number) => {
  const data: any = await apiClient.get(`/delivery/nearby?lat=${lat}&lng=${lng}`);
  return {
    orders: data.data || [],
  };
};

// ============================
// ACCEPT ORDER
// ============================

export const confirmOrder = async (orderId: number) => {
  return apiClient.post(`/delivery/accept/${orderId}`);
};

// ============================
// UPDATE ORDER STATUS
// ============================

export const updateOrderStatus = async (
  orderId: number,
  status: string
) => {
  return apiClient.put(`/delivery/status-update/${orderId}`, { status });
};

// ============================
// UPDATE LOCATION
// ============================

export const updateLocation = async (lat: number, lng: number) => {
  return apiClient.post("/delivery/location", { lat, lng });
};

// ============================
// DOCUMENT UPLOAD
// ============================

export const uploadDocument = async (formData: FormData) => {
  return apiClient.post("/partner/upload-document", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// ============================
// STORED USER
// ============================

export const getStoredDeliveryUser = () => {
  const u = localStorage.getItem("delivery_user");
  return u ? JSON.parse(u) : null;
};

// ============================
// DRIVER EARNINGS
// ============================

export const getDeliveryEarnings = async () => {
  const data: any = await apiClient.get("/delivery/earnings");
  return data.data || {};
};

// ============================
// ONLINE STATUS
// ============================

export const toggleOnline = async (is_online: boolean) => {
  return apiClient.post("/delivery/toggle-online", { is_online });
};

// ============================
// OTP VERIFICATION
// ============================

export const verifyDeliveryOtp = async (orderId: number, otp: string) => {
  return apiClient.post("/delivery/verify-otp", { orderId, otp });
};