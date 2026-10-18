-- ============================================================
--  pedidos.cancelacion
--
--  Cuando la tienda cancela un pedido YA PAGADO (p. ej. un producto se
--  agotó) y devuelve el dinero:
--  { motivo, agotados[], monto, estadoReembolso ('en_proceso' | 'reembolsado'),
--    canceladoEn, reembolsadoEn }
--
--  El estado del pago sigue APROBADO. Se maneja con
--  scripts/cancelar-pedido.js y el cliente lo ve en /pedido-cancelado.
--
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================

alter table pedidos add column if not exists cancelacion jsonb;
