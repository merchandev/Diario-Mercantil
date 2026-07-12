-- 003_p0_hardening.sql
-- Migraciones de endurecimiento y seguridad P0

-- 1. Una solicitud no puede estar en más de una edición
ALTER TABLE edition_orders ADD CONSTRAINT unique_legal_request UNIQUE (legal_request_id);

-- 2. Integridad relacional (Ediciones y Órdenes)
-- Restringimos el borrado de una solicitud si está asociada a una edición
ALTER TABLE edition_orders
ADD CONSTRAINT fk_eo_legal_request
FOREIGN KEY (legal_request_id) REFERENCES legal_requests(id)
ON DELETE RESTRICT;

-- Si se borra una edición (solo posible si es borrador), se borran sus asociaciones
ALTER TABLE edition_orders
ADD CONSTRAINT fk_eo_edition
FOREIGN KEY (edition_id) REFERENCES editions(id)
ON DELETE CASCADE;

-- 3. Integridad relacional (Pagos)
ALTER TABLE legal_payments
ADD CONSTRAINT fk_lp_legal_request
FOREIGN KEY (legal_request_id) REFERENCES legal_requests(id)
ON DELETE CASCADE;
