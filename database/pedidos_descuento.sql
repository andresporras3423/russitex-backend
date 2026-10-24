-- ============================================================
--  pedidos.descuento
--
--  Descuento por compra grande aplicado al pedido: { porcentaje, monto }
--  (null si no aplica). Es sobre los productos; el envío no tiene
--  descuento. Lo calcula services/descuentos.js.
--
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================

alter table pedidos add column if not exists descuento jsonb;
