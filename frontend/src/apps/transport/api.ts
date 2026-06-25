import { apiClient } from "../../api/apiClient";
export { apiClient };

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

  const data: any = await apiClient.post("/transport/login", payload);

  if (data.token) {
    localStorage.setItem("jwt_token_transport", data.token);
    localStorage.setItem("role", data.role || "TRANSPORT");
  }

  return data;
};

// ============================
// SIGNUP
// ============================

export const signupUser = async (partnerData: FormData | any) => {
  const isFormData = partnerData instanceof FormData;

  if (isFormData) {
    return apiClient.post("/transport/signup", partnerData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }

  return apiClient.post("/transport/signup", partnerData);
};

// ============================
// BOOKINGS
// ============================

export const getTransportBookings = async () => {
  const data: any = await apiClient.get("/transport/bookings");
  return data.data || [];
};

// ============================
// NEARBY RIDES
// ============================

export const getNearbyTransportRides = async (lat: number, lng: number) => {
  const data: any = await apiClient.get(`/transport/nearby?lat=${lat}&lng=${lng}`);
  return data.data || [];
};

// ============================
// MY ACTIVE RIDE
// ============================

export const getMyActiveTransportRide = async () => {
  const data: any = await apiClient.get("/transport/my-active-ride");
  return data.data || null;
};

// ============================
// ACCEPT BOOKING
// ============================

export const confirmTransportBooking = async (bookingId: number) => {
  return apiClient.post(`/transport/accept/${bookingId}`);
};

// ============================
// UPDATE STATUS
// ============================

export const updateRideStatus = async (rideId: number, status: string) => {
  return apiClient.put(`/transport/status/${rideId}`, { status });
};

// ============================
// UPDATE LOCATION
// ============================

export const updateLocation = async (lat: number, lng: number) => {
  return apiClient.post("/transport/location", { lat, lng });
};

// ============================
// DRIVER EARNINGS
// ============================

export const getDriverEarnings = async () => {
  const data: any = await apiClient.get("/transport/earnings");
  return data.data || {};
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

export const getStoredTransportUser = () => {
  const u = localStorage.getItem("transport_user");
  return u ? JSON.parse(u) : null;
};

// ============================
// ONLINE STATUS
// ============================

export const toggleOnline = async (is_online: boolean) => {
  return apiClient.post("/transport/toggle-online", { is_online });
};