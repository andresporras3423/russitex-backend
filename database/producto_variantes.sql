-- ============================================================
--  VARIANTES E IMÁGENES DE PRODUCTO
--
--  Cubre los tres escenarios de las fichas de producto:
--
--   1) Producto sin variantes  (caja tiza)
--      productos_meta.variante_etiqueta = NULL, cero filas en
--      producto_variantes. La ficha muestra "Presentación única".
--
--   2) Producto con colores    (entretela doble punto)
--      variante_etiqueta = 'Color', una fila por color.
--
--   3) Producto con estampados (forro estampado)
--      variante_etiqueta = 'Diseño de la tela', una fila por diseño.
--
--  Los escenarios 2 y 3 son el MISMO mecanismo: solo cambia la
--  etiqueta del selector.
--
--  REGLA IMPORTANTE (decidida con Oscar, 2026-08-23):
--  una variante NO tiene precio propio. Alegra no maneja variantes:
--  factura un solo ítem por producto. Si dos opciones valen distinto,
--  entonces NO son variantes — cada una es su propio producto en
--  Alegra, con su propia fila en productos_meta.
--
--  Como Alegra no conoce las variantes, el agotado por variante se
--  marca A MANO en `disponible`. No llega solo desde ningún lado.
--
--  Ejecutar en: Supabase -> SQL Editor -> New query -> Run
-- ============================================================


-- ------------------------------------------------------------
--  1. Columnas nuevas en productos_meta
-- ------------------------------------------------------------
alter table productos_meta
  -- Texto del selector en la ficha: 'Color', 'Diseño de la tela'...
  -- NULL = el producto no tiene variantes.
  add column if not exists variante_etiqueta text,

  -- Agotado del producto completo. Solo se usa cuando NO hay variantes;
  -- si las hay, el producto se considera agotado cuando todas lo están
  -- (lo calcula el backend, no se escribe acá).
  add column if not exists disponible boolean not null default true;


-- ------------------------------------------------------------
--  2. Variantes
-- ------------------------------------------------------------
create table if not exists producto_variantes (
  id          bigint generated always as identity primary key,

  alegra_id   text not null references productos_meta(alegra_id) on delete cascade,

  -- Lo que ve el cliente: 'Negro', 'Arabesco', 'Puntos grandes'.
  nombre      text not null,

  -- Chip del selector. Si está vacío se usa `hex`; si tampoco,
  -- la primera imagen de la variante.
  swatch_url  text,

  -- Solo para colores planos. En estampados va NULL.
  hex         text,

  -- Agotado de ESTA variante. Se marca a mano.
  disponible  boolean not null default true,

  orden       int not null default 0,
  actualizado timestamptz default now(),

  -- Evita duplicar la misma variante y hace repetible este script.
  unique (alegra_id, nombre)
);

create index if not exists producto_variantes_alegra_idx
  on producto_variantes (alegra_id);


-- ------------------------------------------------------------
--  3. Imágenes (galería de la ficha)
--
--  UNA sola tabla para los dos casos, gracias a que variante_id
--  admite NULL:
--    variante_id = NULL  -> imagen del producto (vale para todas)
--    variante_id = <id>  -> imagen de esa variante
--
--  Así las fotos genéricas (el rollo, el empaque) se cargan una vez
--  en vez de repetirse en cada variante.
--
--  La imagen grande de la ficha es la de menor `orden`; las demás
--  son las miniaturas de abajo.
--
--  OJO: productos_meta.imagen_url NO se migra acá. Esa sigue siendo
--  la foto de la tarjeta del catálogo, y le sirve a la ficha como
--  último respaldo si no hay ninguna imagen cargada todavía.
-- ------------------------------------------------------------
create table if not exists producto_imagenes (
  id          bigint generated always as identity primary key,

  alegra_id   text not null references productos_meta(alegra_id) on delete cascade,
  variante_id bigint references producto_variantes(id) on delete cascade,

  url         text not null,
  alt         text,          -- descripción para lectores de pantalla
  orden       int not null default 0,
  actualizado timestamptz default now()
);

create index if not exists producto_imagenes_alegra_idx
  on producto_imagenes (alegra_id);
create index if not exists producto_imagenes_variante_idx
  on producto_imagenes (variante_id);


-- ------------------------------------------------------------
--  4. Permisos (RLS) — lectura pública, igual que productos_meta
-- ------------------------------------------------------------
alter table producto_variantes enable row level security;
drop policy if exists "producto_variantes lectura publica" on producto_variantes;
create policy "producto_variantes lectura publica"
  on producto_variantes for select using (true);

alter table producto_imagenes enable row level security;
drop policy if exists "producto_imagenes lectura publica" on producto_imagenes;
create policy "producto_imagenes lectura publica"
  on producto_imagenes for select using (true);

-- Sin política de INSERT/UPDATE a propósito: con la clave publicable
-- nadie puede escribir. Para cargar datos, este editor SQL o el panel.


-- ------------------------------------------------------------
--  5. Migrar lo que había en productos_meta.colores
--     (hoy solo la entretela doble punto)
-- ------------------------------------------------------------
insert into producto_variantes (alegra_id, nombre, hex, orden)
select m.alegra_id,
       c->>'nombre',
       c->>'hex',
       (ord - 1)::int
from productos_meta m,
     lateral jsonb_array_elements(coalesce(m.colores, '[]'::jsonb))
       with ordinality as t(c, ord)
where jsonb_typeof(coalesce(m.colores, '[]'::jsonb)) = 'array'
  and jsonb_array_length(coalesce(m.colores, '[]'::jsonb)) > 0
on conflict (alegra_id, nombre) do nothing;

-- A los que traían colores, ponerles la etiqueta del selector.
update productos_meta
   set variante_etiqueta = 'Color'
 where variante_etiqueta is null
   and jsonb_typeof(coalesce(colores, '[]'::jsonb)) = 'array'
   and jsonb_array_length(coalesce(colores, '[]'::jsonb)) > 0;


-- ------------------------------------------------------------
--  6. Migrar productos_meta.imagenes a producto_imagenes
--     (imágenes del producto, sin variante)
-- ------------------------------------------------------------
insert into producto_imagenes (alegra_id, variante_id, url, orden)
select m.alegra_id, null, i #>> '{}', (ord - 1)::int
from productos_meta m,
     lateral jsonb_array_elements(coalesce(m.imagenes, '[]'::jsonb))
       with ordinality as t(i, ord)
where jsonb_typeof(coalesce(m.imagenes, '[]'::jsonb)) = 'array'
  and jsonb_array_length(coalesce(m.imagenes, '[]'::jsonb)) > 0;


-- ------------------------------------------------------------
--  7. Datos de los tres productos de los mockups
-- ------------------------------------------------------------

-- 7.1  Caja tiza blanca × 50 uds. (id 22) — SIN variantes
update productos_meta
   set variante_etiqueta = null,
       disponible = true          -- ponelo en false para ver la ficha agotada
 where alegra_id = '22';


-- 7.2  Entretela doble punto (id 1) — 3 colores
--      Los colores ya entraron en el paso 5; acá solo se ordenan.
update productos_meta set variante_etiqueta = 'Color' where alegra_id = '1';

update producto_variantes set orden = 0 where alegra_id = '1' and nombre = 'Negro';
update producto_variantes set orden = 1 where alegra_id = '1' and nombre = 'Blanco';
update producto_variantes set orden = 2 where alegra_id = '1' and nombre = 'Beige';


-- 7.3  Forro estampado (id 13) — diseños de tela
--      En el mockup se llama "Forro grabado"; en Alegra y en el catálogo
--      el nombre es "Forro estampado". Manda Alegra.
update productos_meta set variante_etiqueta = 'Diseño de la tela' where alegra_id = '13';

insert into producto_variantes (alegra_id, nombre, orden) values
  ('13', 'Puntos',          0),
  ('13', 'Rombos',          1),
  ('13', 'Diagonal',        2),
  ('13', 'Hojas',           3),
  ('13', 'Puntos grandes',  4),
  ('13', 'Unicolor',        5),
  ('13', 'Rombos grandes',  6),
  ('13', 'Cuadros',         7)
on conflict (alegra_id, nombre) do nothing;

-- ── POR QUÉ SON 8 Y NO 10 ────────────────────────────────────
-- El mockup dibuja dos estampados más, "Arabesco" y "Valencina",
-- pero NO van acá: los dos ya existen como productos propios y con
-- otro precio.
--
--   Forro estampado : $10.000   (este producto, id 13)
--   Forro arabesco  : $12.000   (id 14)
--   Valencina       : $8.500    (id 34)
--
-- Decidido con Oscar el 2026-08-23, y vale como regla general:
-- si dos opciones tienen precios distintos NO son variantes del
-- mismo producto, porque Alegra factura un ítem por precio.
-- No agregarlos como variantes.
-- ─────────────────────────────────────────────────────────────


-- ------------------------------------------------------------
--  8. Revisar cómo quedó
-- ------------------------------------------------------------
--  select m.alegra_id, m.nombre_cache, m.variante_etiqueta, m.disponible,
--         count(v.id) as variantes,
--         count(*) filter (where v.disponible is false) as agotadas
--    from productos_meta m
--    left join producto_variantes v on v.alegra_id = m.alegra_id
--   group by m.alegra_id, m.nombre_cache, m.variante_etiqueta, m.disponible
--   having count(v.id) > 0 or m.variante_etiqueta is not null
--   order by m.nombre_cache;


-- ------------------------------------------------------------
--  9. LIMPIEZA — ejecutar SOLO después de comprobar que la web
--     muestra bien las variantes. Elimina las columnas jsonb que
--     quedaron duplicadas en las tablas nuevas.
-- ------------------------------------------------------------
-- alter table productos_meta drop column if exists colores;
-- alter table productos_meta drop column if exists imagenes;
