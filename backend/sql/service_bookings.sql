-- Transport booking table
CREATE TABLE IF NOT EXISTS transport_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(25) NOT NULL,
  from_address TEXT NOT NULL,
  from_lat DOUBLE NOT NULL,
  from_lng DOUBLE NOT NULL,
  to_address TEXT NOT NULL,
  to_lat DOUBLE NOT NULL,
  to_lng DOUBLE NOT NULL,
  distance_km DECIMAL(10,2) NOT NULL,
  charge_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'BOOKED',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_transport_user (user_id),
  INDEX idx_transport_created (created_at),
  CONSTRAINT fk_transport_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Party hall booking table
CREATE TABLE IF NOT EXISTS party_hall_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(25) NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  person_count INT NOT NULL,
  snacks_count INT NOT NULL DEFAULT 0,
  water_count INT NOT NULL DEFAULT 0,
  cake_count INT NOT NULL DEFAULT 0,
  add_ons_json JSON NULL,
  notes TEXT NULL,
  base_charge DECIMAL(10,2) NOT NULL,
  add_on_charge DECIMAL(10,2) NOT NULL,
  total_charge DECIMAL(10,2) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'BOOKED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_partyhall_user (user_id),
  INDEX idx_partyhall_date (event_date),
  CONSTRAINT fk_partyhall_user FOREIGN KEY (user_id) REFERENCES users(id)
);
