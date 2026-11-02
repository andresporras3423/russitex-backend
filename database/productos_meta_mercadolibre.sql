-- ============================================================
--  productos_meta — datos que pide Mercado Libre para publicar
--
--  Cada categoría de Mercado Libre exige algunos atributos:
--    Rollos de Tela (forros, entretelas, guatas): Fabricante, Tipo de producto
--    Mercería > Otros / Costura > Otros:          Fabricante, Marca
--    Botones:                                     Marca, Material
--    Fundas para Ropa (portavestidos):            Marca, Modelo, Color, Ancho, Altura
--
--  ml_unidades_paquete: Mercado Libre no deja publicar por menos de $2.900.
--  Lo que cuesta menos (botones, hombrera de espuma) se publica en paquete:
--  precio en Mercado Libre = precio de la web x unidades del paquete.
--
--  Se llenan desde el panel de administrador (Información del producto).
--  Los usa scripts/mercadolibre-reporte.js.
--
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================

alter table productos_meta
  add column if not exists ml_marca          text,
  add column if not exists ml_fabricante     text,
  add column if not exists ml_tipo_producto  text,     -- Rollo, Retazo o Tapiz (lista de Mercado Libre)
  add column if not exists ml_material       text,
  add column if not exists ml_modelo         text,
  add column if not exists ml_color          text,
  add column if not exists ml_ancho_cm       numeric,
  add column if not exists ml_alto_cm        numeric,
  add column if not exists ml_unidades_paquete integer;   -- vacío = se publica de a 1
