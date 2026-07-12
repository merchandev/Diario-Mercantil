-- Script de Migración P1 (Endurecimiento de flujo de estados)
-- Ejecutar en la base de datos de producción

-- 1. Añadir columnas a legal_requests
ALTER TABLE legal_requests ADD COLUMN submitted_at DATETIME NULL;
ALTER TABLE legal_requests ADD COLUMN verification_date DATETIME NULL;

-- 2. Limpiar duplicados de order_no antes de aplicar Unique Key
UPDATE legal_requests SET order_no = NULL WHERE order_no = '';

-- 3. Limpiar duplicados de legal_request_id en edition_orders
-- (Opcional) Retiene solo el más reciente si existiera duplicado:
-- DELETE e1 FROM edition_orders e1 INNER JOIN edition_orders e2 
-- WHERE e1.legal_request_id = e2.legal_request_id AND e1.edition_id < e2.edition_id;

-- 4. Aplicar llaves únicas
ALTER TABLE legal_requests ADD CONSTRAINT uq_legal_order_no UNIQUE (order_no);
ALTER TABLE edition_orders ADD CONSTRAINT uq_edition_orders_request UNIQUE (legal_request_id);
