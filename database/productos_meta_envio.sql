-- ============================================================
--  productos_meta — columnas de PESO y VOLUMEN (para cotizar envíos)
--
--  La transportadora cobra por el MAYOR entre el peso real y el peso
--  volumétrico, así que para cotizar un envío necesitamos, por cada
--  producto, cuánto pesa y cuánto ocupa POR UNIDAD DE VENTA.
--
--  "Unidad de venta" = lo que dice la columna `unidad`:
--    telas   -> por metro   (peso y volumen de 1 metro empacado)
--    tizas   -> por caja
--    hombreras -> por par
--    cierres -> por unidad
--
--  El cálculo del paquete de un pedido será:
--    peso_total    = Σ (cantidad × peso_unit)      + empaque
--    volumen_total = Σ (cantidad × volumen_unit)   × 1.15  (holgura)
--    -> se elige una bolsa/caja estándar que quepa
--    -> se cotiza con (largo, ancho, alto, peso_total)
--
--  OJO: los valores de abajo son PLACEHOLDERS realistas por categoría,
--  puestos para no dejar nada en null. Hay que reemplazarlos por las
--  medidas reales producto por producto (pesar 1 metro / 1 caja, etc.).
--
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================

alter table productos_meta
  -- Peso por unidad de venta, en KILOGRAMOS.
  --   0.18 = 180 gramos por metro, por ejemplo.
  add column if not exists peso_unit    numeric,

  -- Volumen por unidad de venta, en CENTÍMETROS CÚBICOS (cm³).
  --   1200 = lo que ocupa 1 metro de tela doblado como se despacha.
  add column if not exists volumen_unit numeric;


-- ------------------------------------------------------------
--  Placeholders realistas por categoría.
--  (kg por unidad, cm³ por unidad). Reemplazar por datos reales luego.
--
--  Criterio de los valores inventados:
--    - telas (forros/entretelas): livianas pero voluminosas por metro
--    - guatas: muy voluminosas y muy livianas (rellenos)
--    - hombreras: livianas, ocupan aire (van por par)
--    - tizas: pesadas y compactas (caja de 50 uds.)
--    - cierres: casi nada de peso y volumen (por unidad)
--    - otros: valor intermedio genérico
-- ------------------------------------------------------------

update productos_meta set peso_unit = 0.18, volumen_unit = 1200 where categoria = 'forros';
update productos_meta set peso_unit = 0.15, volumen_unit = 1000 where categoria = 'entretelas';
update productos_meta set peso_unit = 0.12, volumen_unit = 3500 where categoria = 'guatas';
update productos_meta set peso_unit = 0.06, volumen_unit = 700  where categoria = 'hombreras';
update productos_meta set peso_unit = 1.40, volumen_unit = 7500 where categoria = 'tizas';
update productos_meta set peso_unit = 0.02, volumen_unit = 60   where categoria = 'cierres';
update productos_meta set peso_unit = 0.20, volumen_unit = 800  where categoria = 'otros';

-- Red de seguridad: cualquier fila sin categoría (o categoría nueva) queda
-- con un valor genérico en vez de null, para que la cotización no falle.
update productos_meta
  set peso_unit    = coalesce(peso_unit, 0.20),
      volumen_unit = coalesce(volumen_unit, 800)
  where peso_unit is null or volumen_unit is null;


-- ------------------------------------------------------------
--  Para revisar qué quedó cargado:
--
--    select categoria, nombre_cache, unidad, peso_unit, volumen_unit
--    from productos_meta
--    order by categoria, nombre_cache;
-- ------------------------------------------------------------
