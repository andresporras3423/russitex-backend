-- ============================================================
--  pedidos.logistica_procesada_en
--
--  Marca cuándo el webhook de Wompi ya disparó la logística post-pago
--  (descontar stock, pedir recolección a MiPaquete, factura en Alegra).
--
--  Antes el webhook usaba estado = 'APROBADO' para detectar duplicados,
--  pero /api/pagos/verificar también pone APROBADO cuando el cliente
--  vuelve de Wompi. Si el cliente volvía antes de que llegara el webhook
--  (lo normal), el webhook creía que era un duplicado y nunca pedía el
--  envío ni la factura.
--
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================

alter table pedidos add column if not exists logistica_procesada_en timestamptz;
