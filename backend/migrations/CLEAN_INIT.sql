-- ============================================
-- CLEAN DATABASE INITIALIZATION
-- Complete fresh start with verified hashes
-- ============================================

-- Drop and recreate database
DROP DATABASE IF EXISTS diario_mercantil;
CREATE DATABASE diario_mercantil CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE diario_mercantil;

-- ============================================
-- TABLE: files
-- ============================================
CREATE TABLE files (
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
  updated_at DATETIME NOT NULL,
  INDEX idx_status (status),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: file_events
-- ============================================
CREATE TABLE file_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_id INT NOT NULL,
  ts DATETIME NOT NULL,
  type VARCHAR(50) NOT NULL,
  message TEXT,
  FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE,
  INDEX idx_file_id (file_id),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'solicitante',
  phone VARCHAR(50),
  email VARCHAR(255),
  person_type VARCHAR(50) DEFAULT 'natural',
  avatar_url VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_document (document),
  INDEX idx_role (role),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: auth_tokens
-- ============================================
CREATE TABLE auth_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: superadmins
-- ============================================
CREATE TABLE superadmins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: superadmin_tokens
-- ============================================
CREATE TABLE superadmin_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  superadmin_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  FOREIGN KEY(superadmin_id) REFERENCES superadmins(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: payment_methods
-- ============================================
CREATE TABLE payment_methods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50),
  bank VARCHAR(100),
  account VARCHAR(50),
  holder VARCHAR(255),
  rif VARCHAR(50),
  phone VARCHAR(50),
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: legal_requests
-- ============================================
CREATE TABLE legal_requests (
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
  created_at DATETIME NOT NULL,
  INDEX idx_status (status),
  INDEX idx_user (user_id),
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: editions
-- ============================================
CREATE TABLE editions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  edition_no INT NOT NULL,
  orders_count INT DEFAULT 0,
  file_id INT,
  file_name VARCHAR(255),
  created_at DATETIME NOT NULL,
  UNIQUE INDEX idx_code (code),
  INDEX idx_status (status),
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: edition_orders
-- ============================================
CREATE TABLE edition_orders (
  edition_id INT NOT NULL,
  order_id INT NOT NULL,
  PRIMARY KEY (edition_id, order_id),
  FOREIGN KEY (edition_id) REFERENCES editions(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES legal_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: payments
-- ============================================
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  legal_request_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reference VARCHAR(255),
  payment_date DATE,
  payment_method_id INT,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (legal_request_id) REFERENCES legal_requests(id) ON DELETE CASCADE,
  INDEX idx_request (legal_request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: directory_users
-- ============================================
CREATE TABLE directory_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  document VARCHAR(50) NOT NULL UNIQUE,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: directory_areas
-- ============================================
CREATE TABLE directory_areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: directory_colleges
-- ============================================
CREATE TABLE directory_colleges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: pages
-- ============================================
CREATE TABLE pages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  published TINYINT(1) DEFAULT 1,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: settings
-- ============================================
CREATE TABLE settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(255) NOT NULL UNIQUE,
  value TEXT,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INITIAL DATA - SUPERADMIN
-- Password: G0ku*1896
-- ============================================
INSERT INTO superadmins (username, password_hash) VALUES
('merchandev', '$2y$12$6w/gMIs9L.sMVHGinLX9e.h2Uo63jt3/7qRnxdDwE1GFjnMykvkGu');

-- ============================================
-- INITIAL DATA - USERS
-- Admin: V12345678 / Admin#2025!
-- Solicitante: J000111222 / Test#2025!
-- ============================================
INSERT INTO users (document, name, password_hash, role, person_type, status, created_at, updated_at) VALUES
('V12345678', 'Administrador Sistema', '$2y$12$1mZJCGJoMCO6MpLFP4Ktnr5NQW8F9quQ9LCnU.CP', 'admin', 'natural', 'active', NOW(), NOW()),
('J000111222', 'Solicitante Demo', '$2y$12$b816kHP6TWueqKjItlMLGVyz/6zYkxu.bdIuRGst', 'solicitante', 'natural', 'active', NOW(), NOW());

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'Database initialized successfully' AS status;
SELECT COUNT(*) AS total_tables FROM information_schema.tables WHERE table_schema = 'diario_mercantil';
SELECT 'Users table' AS table_name, COUNT(*) AS record_count FROM users
UNION ALL
SELECT 'Superadmins table', COUNT(*) FROM superadmins;
