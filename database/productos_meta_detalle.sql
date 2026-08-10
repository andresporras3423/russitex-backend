-- ============================================================
--  productos_meta — columnas para la PÁGINA DE DETALLE
--
--  Alegra no guarda nada de esto (description viene null en los 39
--  productos), así que vive acá, junto con la categoría y la imagen.
--
--  Fuente de verdad por campo:
--    nombre, precio         -> Alegra
--    categoría, imagen      -> productos_meta
--    descripción, usos,
--    detalles, colores      -> productos_meta  (estas columnas)
--
--  TODAS son opcionales: la página de detalle oculta la sección que
--  esté vacía, así podés ir llenando producto por producto sin que
--  se rompa nada.
--
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================

alter table productos_meta
  -- Párrafo corto bajo el precio (2-3 líneas).
  add column if not exists descripcion       text,

  -- Texto del acordeón "Descripción". Si está vacío se usa `descripcion`.
  add column if not exists descripcion_larga text,

  -- Chips de "Usos recomendados".
  --   ["Cuellos de camisa", "Puños", "Pretinas"]
  add column if not exists usos              jsonb default '[]'::jsonb,

  -- Filas de "Detalles del material", en orden.
  --   [{"etiqueta":"Composición","valor":"Mezcla textil / poliéster"}]
  add column if not exists detalles          jsonb default '[]'::jsonb,

  -- Nota de cuidados (una frase).
  add column if not exists cuidados          text,

  -- Colores disponibles. VACÍO = la página muestra "Presentación única"
  -- en vez del selector de color.
  --   [{"nombre":"Negro","hex":"#1a1a1a"}, {"nombre":"Blanco","hex":"#f5f5f5"}]
  add column if not exists colores           jsonb default '[]'::jsonb,

  -- Texto al lado de "Presentación única" cuando NO hay colores.
  --   'Blanco — 50 tizas por caja'
  add column if not exists presentacion      text,

  -- Fotos adicionales para las miniaturas de la galería (URLs).
  -- La principal sigue siendo imagen_url; estas se agregan después.
  add column if not exists imagenes          jsonb default '[]'::jsonb;


-- ------------------------------------------------------------
--  Contenido de ejemplo: los dos productos que ya venían escritos
--  en los mockups (russitex-detalle.html y russitex-detalle-tiza.html).
--
--  OJO: los alegra_id de abajo son los que corresponden a esos dos
--  productos hoy. Si no coinciden, ajustalos mirando la tabla.
-- ------------------------------------------------------------

update productos_meta set
  descripcion = 'Material ideal para dar estructura y soporte a prendas sin perder flexibilidad. Se adhiere con plancha y proporciona un refuerzo equilibrado en cuellos, puños, solapas y pretinas.',
  descripcion_larga = 'La entretela doble punto es un material de refuerzo que da estructura interna a una prenda sin hacerla rígida. Su tejido de punto le otorga elasticidad en ambos sentidos, haciéndola compatible con telas de mayor movimiento. Se adhiere con calor a través de plancha.',
  usos = '["Cuellos de camisa","Puños","Pretinas","Solapas","Refuerzos internos","Acabados de confección"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"Mezcla textil / poliéster"},
               {"etiqueta":"Textura","valor":"Flexible, tejido de punto"},
               {"etiqueta":"Adhesión","valor":"Fusionable con plancha"},
               {"etiqueta":"Colores disponibles","valor":"Negro, Blanco, Beige"}]'::jsonb,
  cuidados = 'Mantener en lugar seco. Hacer prueba en retazo antes de fusionar en la prenda definitiva.',
  colores = '[{"nombre":"Negro","hex":"#1a1a1a"},
              {"nombre":"Blanco","hex":"#f5f5f5"},
              {"nombre":"Beige","hex":"#d4b896"}]'::jsonb
where nombre_cache ilike '%doble punto%' and nombre_cache not ilike '%90%';

update productos_meta set
  descripcion = 'Tiza de sastre blanca para marcar telas claras y oscuras con trazos nítidos. Ideal para transferir patrones, marcar líneas de corte y señalar ajustes. Se retira fácilmente con cepillado o lavado. Caja con 50 unidades.',
  descripcion_larga = 'La tiza de sastre blanca es un clásico para marcar telas con precisión. Se desliza con facilidad sobre la mayoría de los tejidos, deja una línea visible y nítida, y se retira sin dejar rastro con un cepillado o lavado suave. Cada caja trae 50 unidades, ideal para taller o uso continuo.',
  usos = '["Marcar líneas de corte","Transferir patrones","Señalar pinzas y dobladillos","Marcar ajustes de prueba","Trazos sobre telas oscuras","Uso continuo en taller"]'::jsonb,
  detalles = '[{"etiqueta":"Composición","valor":"Tiza de sastre (carbonato cálcico)"},
               {"etiqueta":"Textura","valor":"Sólida, traza nítida"},
               {"etiqueta":"Aplicación","valor":"Marca y se retira fácilmente"},
               {"etiqueta":"Presentación","valor":"Caja × 50 uds. — Blanco"}]'::jsonb,
  cuidados = 'Mantener en lugar seco. Probar en un retazo si la tela es muy clara o delicada.',
  colores = '[]'::jsonb,
  presentacion = 'Blanco — 50 tizas por caja'
where nombre_cache ilike '%tiza%' and nombre_cache ilike '%blanca%';


-- ------------------------------------------------------------
--  Para revisar qué quedó cargado:
--
--    select alegra_id, nombre_cache,
--           (descripcion is not null) as tiene_descripcion,
--           jsonb_array_length(colores) as n_colores
--    from productos_meta order by nombre_cache;
-- ------------------------------------------------------------
