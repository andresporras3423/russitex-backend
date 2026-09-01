-- ============================================================
--  Producto nuevo: "Entretela cuello camisa dama" (alegra_id 44)
--
--  Apareció en Alegra el 2026-08-23 y no tenía fila en
--  productos_meta, así que la web lo mostraba en la categoría
--  "otros", sin imagen ni descripción.
--
--  Recordá que Alegra manda en nombre y precio ($13.000 por metro);
--  acá va solo lo que Alegra no puede guardar.
--
--  OJO: la descripción y los usos son un BORRADOR redactado a partir
--  del nombre. Revisalos con quien conoce el almacén.
--
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================

insert into productos_meta (
  alegra_id, nombre_cache, categoria, unidad, orden,
  descripcion, descripcion_larga, usos, detalles, cuidados, disponible
) values (
  '44',
  'Entretela cuello camisa dama',
  'entretelas',
  'Por metro',
  0,
  'Entretela liviana pensada para cuellos y puños de camisa de dama. Da forma sin endurecer la prenda, para que el cuello se mantenga bien puesto pero conserve la caída suave que pide una blusa.',
  'La entretela para cuello de camisa de dama es más delgada y flexible que la de camisa clásica de hombre. Se fusiona con plancha y aporta la firmeza justa: sostiene el cuello y los puños sin que la prenda pierda liviandad ni se sienta acartonada. Es la opción indicada cuando la tela exterior es delgada y una entretela rígida se notaría por el derecho.',
  '["Cuellos de blusa","Puños de blusa","Portezuelas","Vistas delanteras","Prendas de tela liviana"]'::jsonb,
  '[{"etiqueta":"Composición","valor":"Mezcla textil fusionable"},
    {"etiqueta":"Textura","valor":"Liviana y flexible"},
    {"etiqueta":"Adhesión","valor":"Fusionable con plancha"},
    {"etiqueta":"Uso recomendado","valor":"Camisería de dama"}]'::jsonb,
  'Fusionar con plancha a temperatura media. Probar antes en un retazo: al ser una tela delgada, el calor excesivo puede marcarla por el derecho.',
  true
)
on conflict (alegra_id) do update
  set nombre_cache      = excluded.nombre_cache,
      categoria         = excluded.categoria,
      unidad            = excluded.unidad,
      descripcion       = excluded.descripcion,
      descripcion_larga = excluded.descripcion_larga,
      usos              = excluded.usos,
      detalles          = excluded.detalles,
      cuidados          = excluded.cuidados;


-- ------------------------------------------------------------
--  FALTA LA FOTO
--
--  El bucket 'productos_russitex' tiene una imagen por producto,
--  nombrada con el id de Alegra (18.jpg, 22.jpg...). Para el 44 no
--  hay ninguna, así que la web usa la imagen por defecto.
--
--  Cuando subas 44.jpg al bucket, corré esto:
--
--    update productos_meta
--       set imagen_url = 'https://yggxhnpcjxemwjnwxibc.supabase.co/storage/v1/object/public/productos_russitex/44.jpg'
--     where alegra_id = '44';
-- ------------------------------------------------------------


-- ------------------------------------------------------------
--  Comprobar que quedó bien:
--
--    select alegra_id, nombre_cache, categoria, unidad,
--           left(descripcion, 50) as descripcion,
--           jsonb_array_length(usos) as n_usos,
--           imagen_url is not null as tiene_foto
--      from productos_meta
--     where alegra_id = '44';
--
--  Y ver si hay MÁS productos sin ficha (por si aparecen otros):
--    -- se revisa desde el backend, comparando Alegra con esta tabla.
-- ------------------------------------------------------------
