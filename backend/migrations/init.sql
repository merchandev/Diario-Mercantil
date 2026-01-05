-- MySQL Init Script

SET FOREIGN_KEY_CHECKS=0;

CREATE TABLE IF NOT EXISTS files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  path VARCHAR(255) DEFAULT NULL,
  size BIGINT NOT NULL,
  type VARCHAR(50) NOT NULL,
  checksum VARCHAR(64),
  version INT DEFAULT 1,
  status VARCHAR(50) NOT NULL,
  owner VARCHAR(255),
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS file_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_id INT NOT NULL,
  ts DATETIME NOT NULL,
  type VARCHAR(50) NOT NULL,
  message TEXT,
  FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Auth tables
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  phone VARCHAR(50),
  email VARCHAR(255),
  person_type VARCHAR(50) DEFAULT 'natural',
  avatar_url VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Payment methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50),
  bank VARCHAR(100),
  account VARCHAR(50),
  holder VARCHAR(255),
  rif VARCHAR(50),
  phone VARCHAR(50),
  created_at DATETIME NOT NULL
);

-- Legal directory requests
CREATE TABLE IF NOT EXISTS legal_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  status VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  document VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  order_no VARCHAR(50),
  publish_date DATE,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  folios INT DEFAULT 1,
  comment TEXT,
  user_id INT,
  pub_type VARCHAR(50) DEFAULT 'Documento',
  meta TEXT,
  deleted_at DATETIME,
  created_at DATETIME NOT NULL
);

-- Editions
CREATE TABLE IF NOT EXISTS editions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  edition_no INT NOT NULL,
  orders_count INT DEFAULT 0,
  file_id INT,
  file_name VARCHAR(255),
  created_at DATETIME NOT NULL
);

-- Link table Edition -> Legal Requests
CREATE TABLE IF NOT EXISTS edition_orders (
  edition_id INT NOT NULL,
  legal_request_id INT NOT NULL,
  PRIMARY KEY (edition_id, legal_request_id),
  FOREIGN KEY(edition_id) REFERENCES editions(id) ON DELETE CASCADE,
  FOREIGN KEY(legal_request_id) REFERENCES legal_requests(id)
);

-- Payments linked to legal requests
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
);

-- Files linked to legal requests
CREATE TABLE IF NOT EXISTS legal_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  legal_request_id INT NOT NULL,
  kind VARCHAR(50) NOT NULL,
  file_id INT NOT NULL,
  created_at DATETIME NOT NULL,
  FOREIGN KEY(legal_request_id) REFERENCES legal_requests(id) ON DELETE CASCADE,
  FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Directory Legal profiles
CREATE TABLE IF NOT EXISTS directory_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phones VARCHAR(255),
  state VARCHAR(100),
  areas TEXT,
  colegio VARCHAR(100),
  socials TEXT,
  inpre_photo_file_id INT,
  profile_photo_file_id INT,
  status VARCHAR(50) DEFAULT 'pendiente',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS directory_areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS directory_colleges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- Publications
CREATE TABLE IF NOT EXISTS publications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'published',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- CMS Pages
CREATE TABLE IF NOT EXISTS pages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  header_html TEXT,
  body_json LONGTEXT,
  footer_html TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'published',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME NOT NULL
);

-- Seed defaults
INSERT IGNORE INTO settings(`key`,value,updated_at) VALUES
 ('bcv_rate','203.74',NOW()),
 ('price_per_folio_usd','1.50',NOW()),
 ('convocatoria_usd','10.00',NOW()),
 ('iva_percent','16',NOW()),
 ('raptor_mini_preview_enabled','1',NOW());

SET FOREIGN_KEY_CHECKS=1;
