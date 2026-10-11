-- ============================================================
--  pedidos.factura
--
--  Factura de Alegra creada cuando se aprueba el pago:
--  { id, numero, estado ('borrador' | 'emitida'), estadoDian, creadaEn }
--
--  Con ella el webhook (y el script de reintento) saben que el pedido ya
--  se facturó y no crean otra.
--
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================

alter table pedidos add column if not exists factura jsonb;
