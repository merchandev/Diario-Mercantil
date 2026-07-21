CREATE TABLE IF NOT EXISTS legal_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  legal_request_id INT NOT NULL,
  ref VARCHAR(100),
  date DATE NOT NULL,
  bank VARCHAR(100),
  type VARCHAR(50),
  amount_bs DECIMAL(15,2) NOT NULL,
  status VARCHAR(50),
  mobile_phone VARCHAR(50),
  comment TEXT,
  created_at DATETIME NOT NULL,
  FOREIGN KEY(legal_request_id) REFERENCES legal_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
