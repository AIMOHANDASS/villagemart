export interface OrderItem {
  product_name: string;
  unit_price: number;
  weight: number;
  total_price: number;
  image: string;
}

export interface Order {
  orderId: number;
  username: string;
  total_amount: number;
  status: string;
  payment_method?: string;
  tracking_status?: string;
  delivery_status?: string;
  cancel_reason?: string;
  created_at: string;
  picked_at?: string;
  out_for_delivery_at?: string;
  delivered_at?: string;
  garland_delivery_at?: string;
  garland_reminder_sent?: number;
  garland_last_reminder_at?: string;
  items: OrderItem[];
}

export interface TransportBooking {
  id: number;
  username: string;
  customer_name: string;
  customer_phone: string;
  from_address: string;
  from_lat?: number;
  from_lng?: number;
  to_address: string;
  to_lat?: number;
  to_lng?: number;
  distance_km: number;
  charge_amount: number;
  fare?: number;
  vehicle_type?: string;
  vehicle?: string;
  status: string;
  ride_status?: string;
  notes?: string;
  created_at: string;
}

export interface PartyHallBooking {
  id: number;
  username: string;
  customer_name: string;
  customer_phone: string;
  event_date: string;
  start_time: string;
  end_time: string;
  person_count: number;
  snacks_count: number;
  water_count: number;
  cake_count: number;
  add_ons_json?: string;
  notes?: string;
  total_charge: number;
  status: string;
  created_at: string;
}

export interface Product {
  id: number;
  E_name: string;
  T_name: string;
  MRP: number;
  s_price: number;
  GST: number;
  imageurl: string;
  category: string;
  product_type: "solid" | "liquid";
  weight_volume_unit: string;
  inStock: number;
  outStock: number;
  isOrganic: boolean | number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  phone?: string;
  created_at: string;
}
