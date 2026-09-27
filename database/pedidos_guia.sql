-- ============================================================
--  pedidos.guia
--
--  Guía de envío que se crea en Envia.com cuando se aprueba el pago:
--  { ambiente, carrier, servicio, numeroGuia, envioId, etiquetaUrl,
--    rastreoUrl, costo, creadaEn }
--
--  El webhook la guarda apenas se crea, y si Wompi reintenta el aviso no
--  crea otra (cada guía real cuesta).
--
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================

alter table pedidos add column if not exists guia jsonb;
