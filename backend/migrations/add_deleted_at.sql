 -- Migration: Add soft delete support to legal_requests table
-- Run this on existing databases to add the deleted_at column

ALTER TABLE legal_requests ADD COLUMN deleted_at TEXT;
CREATE INDEX IF NOT EXISTS idx_legal_requests_deleted ON legal_requests(deleted_at);
